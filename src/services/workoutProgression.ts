import { WorkoutLog, WorkoutExerciseTemplate, WorkoutExerciseCompleted, ActiveWorkoutSession, PersonalRecord } from '../types';
import { db } from '../db/database';
import { EXERCISE_LIBRARY } from '../data/exerciseLibrary';

const ACTIVE_WORKOUT_STORAGE_KEY = 'forge_active_workout_session_v2';

export interface TargetCalculationResult {
  targetRepsText: string;
  targetWeightKg: number;
  targetDurationSec: number;
  targetRounds?: number;
  hintNote?: string;
  trend?: 'improving' | 'maintaining' | 'regressing' | 'baseline';
}

export interface WorkoutRewardCalculation {
  completionRatio: number; // 0.0 to 1.0
  rewardMultiplier: number; // e.g. 0.0, 0.6, 1.0
  xpAward: number;
  completionState: 'completed' | 'partially_completed' | 'abandoned';
  isMeaningfulEffort: boolean;
  completedSetsCount: number;
  totalPlannedSetsCount: number;
  statusText: string;
}

/**
 * Single authoritative calculation function for workout completion state and XP rewards.
 * Distinguishes full completion, partial completion, and trivial/abandoned effort.
 */
export function calculateWorkoutCompletionReward(
  session: ActiveWorkoutSession,
  customBaseXp?: number
): WorkoutRewardCalculation {
  const baseXp = customBaseXp || session.template?.xpReward || 100;

  let completedSetsCount = 0;
  let totalPlannedSetsCount = 0;

  if (session.exercises) {
    session.exercises.forEach((ex) => {
      totalPlannedSetsCount += ex.sets.length;
      completedSetsCount += ex.sets.filter((s) => s.completed).length;
    });
  }

  const completionRatio = totalPlannedSetsCount > 0 ? completedSetsCount / totalPlannedSetsCount : 0;

  // Meaningful effort threshold: At least 10% of planned sets/workload completed AND at least 1 completed set
  const isMeaningfulEffort = completedSetsCount > 0 && completionRatio >= 0.10;

  if (completedSetsCount === 0 || !isMeaningfulEffort) {
    return {
      completionRatio: Math.min(1, Math.max(0, completionRatio)),
      rewardMultiplier: 0,
      xpAward: 0,
      completionState: 'abandoned',
      isMeaningfulEffort: false,
      completedSetsCount,
      totalPlannedSetsCount,
      statusText: completedSetsCount === 0
        ? 'Session Abandoned (No sets logged)'
        : 'Below minimum completion threshold (10% workload required for XP)',
    };
  }

  // Full completion (>= 95% or all planned sets done)
  if (completionRatio >= 0.95 || completedSetsCount === totalPlannedSetsCount) {
    return {
      completionRatio: 1.0,
      rewardMultiplier: 1.0,
      xpAward: baseXp,
      completionState: 'completed',
      isMeaningfulEffort: true,
      completedSetsCount,
      totalPlannedSetsCount,
      statusText: 'WORKOUT COMPLETE (100% XP)',
    };
  }

  // Partial completion (Proportional XP reward)
  const rewardMultiplier = Math.round(completionRatio * 100) / 100;
  const xpAward = Math.round(baseXp * completionRatio);

  return {
    completionRatio: Math.round(completionRatio * 100) / 100,
    rewardMultiplier,
    xpAward,
    completionState: 'partially_completed',
    isMeaningfulEffort: true,
    completedSetsCount,
    totalPlannedSetsCount,
    statusText: `WORKOUT PARTIALLY COMPLETED (${Math.round(completionRatio * 100)}% XP)`,
  };
}

/**
 * Persist active workout state locally in localStorage for recovery across navigation/page reload.
 */
export function saveActiveSessionLocal(session: ActiveWorkoutSession): void {
  try {
    localStorage.setItem(ACTIVE_WORKOUT_STORAGE_KEY, JSON.stringify(session));
  } catch (e) {
    console.error('Failed to persist active workout session locally:', e);
  }
}

/**
 * Retrieve saved active workout session if present.
 */
export function loadActiveSessionLocal(): ActiveWorkoutSession | null {
  try {
    const raw = localStorage.getItem(ACTIVE_WORKOUT_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ActiveWorkoutSession;
  } catch (e) {
    console.error('Failed to parse active workout session:', e);
    return null;
  }
}

/**
 * Clear persisted active workout session.
 */
export function clearActiveSessionLocal(): void {
  try {
    localStorage.removeItem(ACTIVE_WORKOUT_STORAGE_KEY);
  } catch (e) {
    console.error('Failed to clear active workout session:', e);
  }
}

/**
 * Look up previous performance log for a specific exercise or template
 */
export async function getPreviousExerciseLog(
  exerciseName: string,
  templateId?: number
): Promise<{ log: WorkoutExerciseCompleted; overallRpe?: number } | null> {
  try {
    const logs = await db.workoutLogs.orderBy('completedAt').reverse().limit(20).toArray();

    for (const log of logs) {
      if (log.status === 'abandoned') continue;
      const foundEx = log.exercises.find((ex) => ex.name.toLowerCase() === exerciseName.toLowerCase());
      if (foundEx && foundEx.sets.some((s) => s.completed)) {
        return { log: foundEx, overallRpe: log.overallRpe };
      }
    }
    return null;
  } catch (e) {
    console.error('Error fetching previous exercise log:', e);
    return null;
  }
}

/**
 * Query multi-session history (up to 5 recent completed logs) for a specific exercise
 */
export async function getMultiSessionHistory(
  exerciseName: string,
  limit = 5
): Promise<Array<{ date: string; sets: WorkoutExerciseCompleted['sets']; overallRpe?: number; templateName: string }>> {
  try {
    const logs = await db.workoutLogs.orderBy('completedAt').reverse().limit(30).toArray();
    const history: Array<{ date: string; sets: WorkoutExerciseCompleted['sets']; overallRpe?: number; templateName: string }> = [];

    for (const log of logs) {
      if (log.status === 'abandoned') continue;
      const foundEx = log.exercises.find((ex) => ex.name.toLowerCase() === exerciseName.toLowerCase());
      if (foundEx && foundEx.sets.some((s) => s.completed)) {
        history.push({
          date: log.date,
          sets: foundEx.sets.filter((s) => s.completed),
          overallRpe: log.overallRpe,
          templateName: log.templateName,
        });
        if (history.length >= limit) break;
      }
    }
    return history;
  } catch (e) {
    console.error('Error fetching multi-session exercise history:', e);
    return [];
  }
}

/**
 * Get recent performance trend for an exercise across recent sessions
 */
export async function getExerciseTrend(exerciseName: string): Promise<{
  trend: 'improving' | 'maintaining' | 'regressing' | 'baseline';
  reason: string;
  avgRpe?: number;
}> {
  const history = await getMultiSessionHistory(exerciseName, 4);

  if (history.length === 0) {
    return { trend: 'baseline', reason: 'First session baseline' };
  }

  if (history.length === 1) {
    const rpe = history[0].overallRpe || 7;
    return {
      trend: 'maintaining',
      reason: `Single recent session logged (RPE ${rpe})`,
      avgRpe: rpe,
    };
  }

  const validRpes = history.map((h) => h.overallRpe).filter((r): r is number => r !== undefined);
  const avgRpe = validRpes.length > 0 ? validRpes.reduce((a, b) => a + b, 0) / validRpes.length : undefined;

  // Calculate recent volume or reps
  const latestVol = history[0].sets.reduce((acc, s) => acc + (s.reps || 0) * (s.weightKg || 1), 0);
  const prevVol = history[1].sets.reduce((acc, s) => acc + (s.reps || 0) * (s.weightKg || 1), 0);

  if (latestVol > prevVol * 1.05) {
    return {
      trend: 'improving',
      reason: `Volume increased over prior session (${latestVol} vs ${prevVol})`,
      avgRpe,
    };
  } else if (latestVol < prevVol * 0.9) {
    return {
      trend: 'regressing',
      reason: `Volume lower than prior session`,
      avgRpe,
    };
  }

  return {
    trend: 'maintaining',
    reason: `Consistent performance maintained`,
    avgRpe,
  };
}

/**
 * Calculate exercise-specific progressive overload target based on previous completed sets, RPE effort, and exercise type
 */
export function calculateNextTarget(
  exTemplate: WorkoutExerciseTemplate,
  prevLog: WorkoutExerciseCompleted | null,
  overallRpe?: number
): TargetCalculationResult {
  const defaultWeight = exTemplate.targetWeightKg || 0;
  const defaultRepsStr = exTemplate.targetReps || '10';
  const defaultDuration = exTemplate.targetDurationSec || 0;
  const defaultRounds = exTemplate.targetRounds || 3;

  // Look up exercise definition in library for accurate category & progressionType
  const exDef = EXERCISE_LIBRARY.find(
    (e) => e.name.toLowerCase() === exTemplate.name.toLowerCase() || e.id === exTemplate.exerciseId
  );

  const category = exDef?.category || 'STRENGTH';
  const movementPattern = exDef?.movementPattern || 'PUSH';
  const progressionType = exDef?.progressionType || (defaultWeight > 0 ? 'weight_reps' : defaultDuration > 0 ? 'duration' : 'bodyweight_reps');

  if (!prevLog || !prevLog.sets || prevLog.sets.length === 0) {
    return {
      targetRepsText: defaultRepsStr,
      targetWeightKg: defaultWeight,
      targetDurationSec: defaultDuration,
      targetRounds: defaultRounds,
      hintNote: 'First session baseline',
      trend: 'baseline',
    };
  }

  const completedSets = prevLog.sets.filter((s) => s.completed);
  if (completedSets.length === 0) {
    return {
      targetRepsText: defaultRepsStr,
      targetWeightKg: defaultWeight,
      targetDurationSec: defaultDuration,
      targetRounds: defaultRounds,
      hintNote: 'Previous baseline',
      trend: 'baseline',
    };
  }

  // Partial workload safeguard: if fewer sets than target were completed in previous log, do NOT increase target
  if (completedSets.length < exTemplate.targetSets) {
    const maxWeight = Math.max(...completedSets.map((s) => s.weightKg || 0));
    const maxDuration = Math.max(...completedSets.map((s) => s.durationSec || 0));
    return {
      targetRepsText: defaultRepsStr,
      targetWeightKg: maxWeight > 0 ? maxWeight : defaultWeight,
      targetDurationSec: maxDuration > 0 ? maxDuration : defaultDuration,
      targetRounds: defaultRounds,
      hintNote: `Partial session logged (${completedSets.length}/${exTemplate.targetSets} sets) — maintaining target load to consolidate volume`,
      trend: 'maintaining',
    };
  }

  const avgReps = Math.round(completedSets.reduce((acc, s) => acc + (s.reps || 0), 0) / completedSets.length);
  const maxWeight = Math.max(...completedSets.map((s) => s.weightKg || 0));
  const maxDuration = Math.max(...completedSets.map((s) => s.durationSec || 0));

  const rangeMatch = defaultRepsStr.match(/(\d+)(?:-(\d+))?/);
  const minRep = rangeMatch ? parseInt(rangeMatch[1], 10) : 8;
  const maxRep = rangeMatch && rangeMatch[2] ? parseInt(rangeMatch[2], 10) : minRep + 4;

  // RPE 10: Maximum Effort -> Maintain weight/reps/duration, do NOT increase
  if (overallRpe === 10) {
    return {
      targetRepsText: `${avgReps}`,
      targetWeightKg: maxWeight > 0 ? maxWeight : defaultWeight,
      targetDurationSec: maxDuration > 0 ? maxDuration : defaultDuration,
      targetRounds: defaultRounds,
      hintNote: `Previous RPE 10 max effort — maintaining current load (${avgReps} reps @ ${maxWeight}kg)`,
      trend: 'maintaining',
    };
  }

  // RPE 9: Very Hard -> Cautious maintenance
  if (overallRpe === 9) {
    const cautiousReps = Math.min(maxRep, avgReps + 1);
    return {
      targetRepsText: `${cautiousReps}`,
      targetWeightKg: maxWeight > 0 ? maxWeight : defaultWeight,
      targetDurationSec: maxDuration > 0 ? maxDuration : defaultDuration,
      targetRounds: defaultRounds,
      hintNote: `High RPE 9 effort — maintaining weight (${maxWeight}kg), target: ${cautiousReps} reps`,
      trend: 'maintaining',
    };
  }

  // A. BOXING & COMBAT DRILLS
  if (category === 'BOXING' || movementPattern === 'BOXING_ROUND' || progressionType === 'rounds') {
    return {
      targetRepsText: defaultRepsStr,
      targetWeightKg: 0,
      targetDurationSec: defaultDuration || 180,
      targetRounds: defaultRounds,
      hintNote: `Boxing conditioning: maintain technical form across ${defaultRounds} rounds`,
      trend: 'improving',
    };
  }

  // B. JUMP ROPE & CARDIO DRILLS
  if (category === 'CONDITIONING' || movementPattern === 'JUMP_ROPE_ROUND') {
    const nextDuration = (maxDuration > 0 ? maxDuration : defaultDuration || 30) + 5;
    return {
      targetRepsText: defaultRepsStr,
      targetWeightKg: 0,
      targetDurationSec: nextDuration,
      targetRounds: defaultRounds,
      hintNote: `Jump rope interval target increased to ${nextDuration}s`,
      trend: 'improving',
    };
  }

  // C. MOBILITY & STRETCHING
  if (category === 'MOBILITY' || category === 'STRETCHING' || movementPattern === 'MOBILITY_POSE') {
    const nextHold = (maxDuration > 0 ? maxDuration : defaultDuration || 30) + (maxDuration < 60 ? 5 : 0);
    return {
      targetRepsText: defaultRepsStr,
      targetWeightKg: 0,
      targetDurationSec: nextHold,
      hintNote: `Mobility hold extended to ${nextHold}s for deep tissue release`,
      trend: 'improving',
    };
  }

  // D. CLIMBING & ISOMETRIC GRIP
  if (category === 'CLIMBING' || movementPattern === 'ISOMETRIC') {
    if (maxDuration > 0) {
      const nextHold = Math.min(60, maxDuration + 5);
      return {
        targetRepsText: defaultRepsStr,
        targetWeightKg: maxWeight,
        targetDurationSec: nextHold,
        hintNote: `Climbing grip/hold duration target: ${nextHold}s`,
        trend: 'improving',
      };
    }
  }

  // E. PLYOMETRICS
  if (category === 'PLYOMETRIC' || movementPattern === 'PLYO') {
    const controlledReps = Math.min(10, avgReps + 1);
    return {
      targetRepsText: `${controlledReps}`,
      targetWeightKg: 0,
      targetDurationSec: 0,
      hintNote: `Plyometric focus: explosive power & soft landing (${controlledReps} reps)`,
      trend: 'improving',
    };
  }

  // F. WEIGHTED STRENGTH
  if (maxWeight > 0 || progressionType === 'weight_reps') {
    if (avgReps >= maxRep) {
      const newWeight = maxWeight + 2;
      return {
        targetRepsText: `${minRep}-${minRep + 2}`,
        targetWeightKg: newWeight,
        targetDurationSec: defaultDuration,
        hintNote: `Ceiling reached (${avgReps} reps)! Weight bumped to ${newWeight}kg`,
        trend: 'improving',
      };
    } else {
      const nextReps = Math.min(maxRep, avgReps + 1);
      return {
        targetRepsText: `${nextReps}`,
        targetWeightKg: maxWeight > 0 ? maxWeight : defaultWeight,
        targetDurationSec: defaultDuration,
        hintNote: `Target: +1 rep over previous avg (${avgReps} reps @ ${maxWeight}kg)`,
        trend: 'improving',
      };
    }
  }

  // G. BODYWEIGHT REPS
  const nextReps = avgReps + 1;
  return {
    targetRepsText: `${nextReps}`,
    targetWeightKg: 0,
    targetDurationSec: 0,
    hintNote: `Bodyweight target: ${nextReps} reps (previous avg: ${avgReps})`,
    trend: 'improving',
  };
}

/**
 * Pure calculation function: Scan completed session for potential new Personal Records (PRs) WITHOUT saving to IndexedDB.
 * Used for previewing PR achievements before workout confirmation.
 */
export async function calculatePotentialPRs(session: ActiveWorkoutSession): Promise<PersonalRecord[]> {
  const potentialPrs: PersonalRecord[] = [];
  const todayIso = new Date().toISOString();

  try {
    for (const ex of session.exercises) {
      const completedSets = ex.sets.filter((s) => s.completed);
      if (completedSets.length === 0) continue;

      const exDef = EXERCISE_LIBRARY.find((e) => e.name.toLowerCase() === ex.name.toLowerCase());
      const category = exDef?.category || 'STRENGTH';

      // 1. Weight PR (Heaviest Weight)
      const maxWeightInSession = Math.max(...completedSets.map((s) => s.weightKg || 0));
      if (maxWeightInSession > 0) {
        const prKey = `max_weight_${ex.exerciseId || ex.name}`;
        const existingPr = await db.personalRecords.where('key').equals(prKey).first();

        const prevVal = existingPr ? parseFloat(String(existingPr.value)) || 0 : 0;
        if (maxWeightInSession > prevVal) {
          potentialPrs.push({
            id: existingPr?.id || `pr_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
            key: prKey,
            title: `${ex.name} — Heaviest Load`,
            value: `${maxWeightInSession} kg`,
            unit: 'kg',
            icon: 'Dumbbell',
            updatedAt: todayIso,
          });
        }
      }

      // 2. Reps PR
      const maxRepsInSession = Math.max(...completedSets.map((s) => s.reps || 0));
      if (maxRepsInSession > 0 && maxWeightInSession === 0) {
        const prKey = `max_reps_${ex.exerciseId || ex.name}`;
        const existingPr = await db.personalRecords.where('key').equals(prKey).first();

        const prevVal = existingPr ? parseFloat(String(existingPr.value)) || 0 : 0;
        if (maxRepsInSession > prevVal) {
          potentialPrs.push({
            id: existingPr?.id || `pr_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
            key: prKey,
            title: `${ex.name} — Max Reps`,
            value: `${maxRepsInSession} reps`,
            unit: 'reps',
            icon: 'Flame',
            updatedAt: todayIso,
          });
        }
      }

      // 3. Duration Hold PR (Mobility / Climbing / Timed)
      const maxDurationInSession = Math.max(...completedSets.map((s) => s.durationSec || 0));
      if (maxDurationInSession > 0 && (category === 'MOBILITY' || category === 'CLIMBING' || category === 'CONDITIONING')) {
        const prKey = `max_duration_${ex.exerciseId || ex.name}`;
        const existingPr = await db.personalRecords.where('key').equals(prKey).first();

        const prevVal = existingPr ? parseFloat(String(existingPr.value)) || 0 : 0;
        if (maxDurationInSession > prevVal) {
          potentialPrs.push({
            id: existingPr?.id || `pr_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
            key: prKey,
            title: `${ex.name} — Longest Duration`,
            value: `${maxDurationInSession}s`,
            unit: 'seconds',
            icon: 'Clock',
            updatedAt: todayIso,
          });
        }
      }
    }
  } catch (e) {
    console.error('Error calculating potential Personal Records:', e);
  }

  return potentialPrs;
}

/**
 * Persist an array of PRs to IndexedDB upon explicit workout save confirmation.
 */
export async function recordPRs(prs: PersonalRecord[]): Promise<PersonalRecord[]> {
  const persisted: PersonalRecord[] = [];
  try {
    for (const pr of prs) {
      await db.personalRecords.put(pr);
      persisted.push(pr);
    }
  } catch (e) {
    console.error('Error recording Personal Records:', e);
  }
  return persisted;
}

/**
 * Convenience wrapper: Calculate potential PRs and persist them immediately.
 */
export async function checkAndRecordPRs(session: ActiveWorkoutSession): Promise<PersonalRecord[]> {
  const prs = await calculatePotentialPRs(session);
  return await recordPRs(prs);
}

/**
 * Pure calculation function: Calculate potential milestones that will be unlocked upon saving current workout.
 * Does NOT write to Chronicle or IndexedDB.
 */
export async function calculatePotentialMilestones(session: ActiveWorkoutSession): Promise<Array<{ title: string; description: string }>> {
  const potentialMilestones: Array<{ title: string; description: string }> = [];

  try {
    const allLogs = await db.workoutLogs.toArray();
    const validLogs = allLogs.filter((l) => l.status === 'completed' || l.status === 'partially_completed' || !l.status);
    const projectedTotal = validLogs.length + 1; // Count includes current session once saved

    const milestonesToCheck = [
      { count: 1, title: 'First Steps in the Forge', desc: 'Completed your first structured training session in the Forge.' },
      { count: 5, title: 'Building Momentum', desc: 'Completed 5 total workout sessions.' },
      { count: 10, title: 'Forge Veteran: 10 Workouts', desc: 'Reached 10 completed workouts in the training system.' },
      { count: 25, title: 'Steel & Sweat: 25 Workouts', desc: 'Logged 25 completed workout sessions.' },
      { count: 50, title: 'Iron Discipline: 50 Workouts', desc: 'Mastered 50 training sessions in the Forge.' },
    ];

    for (const m of milestonesToCheck) {
      if (projectedTotal >= m.count) {
        const existing = await db.chronicle.where('title').equals(m.title).first();
        if (!existing) {
          potentialMilestones.push({ title: m.title, description: m.desc });
        }
      }
    }
  } catch (e) {
    console.error('Error calculating potential workout milestones:', e);
  }

  return potentialMilestones;
}

/**
 * Check total workout statistics & unlock milestones to add to Chronicle AFTER current workout is persisted.
 */
export async function checkWorkoutMilestones(session: ActiveWorkoutSession): Promise<Array<{ title: string; description: string }>> {
  const unlockedMilestones: Array<{ title: string; description: string }> = [];

  try {
    const allLogs = await db.workoutLogs.toArray();
    const validLogs = allLogs.filter((l) => l.status === 'completed' || l.status === 'partially_completed' || !l.status);
    const totalLogs = validLogs.length;
    const todayStr = new Date().toISOString().split('T')[0];

    const milestonesToCheck = [
      { count: 1, title: 'First Steps in the Forge', desc: 'Completed your first structured training session in the Forge.' },
      { count: 5, title: 'Building Momentum', desc: 'Completed 5 total workout sessions.' },
      { count: 10, title: 'Forge Veteran: 10 Workouts', desc: 'Reached 10 completed workouts in the training system.' },
      { count: 25, title: 'Steel & Sweat: 25 Workouts', desc: 'Logged 25 completed workout sessions.' },
      { count: 50, title: 'Iron Discipline: 50 Workouts', desc: 'Mastered 50 training sessions in the Forge.' },
    ];

    for (const m of milestonesToCheck) {
      if (totalLogs >= m.count) {
        // Check if already in Chronicle
        const existing = await db.chronicle.where('title').equals(m.title).first();
        if (!existing) {
          await db.chronicle.add({
            title: m.title,
            subtitle: m.desc,
            category: 'milestone',
            date: todayStr,
            icon: 'Award',
            details: `Achieved upon completing workout #${totalLogs}: ${session.template.name}`,
          });
          unlockedMilestones.push({ title: m.title, description: m.desc });
        }
      }
    }
  } catch (e) {
    console.error('Error checking workout milestones:', e);
  }

  return unlockedMilestones;
}

/**
 * Check recent grip/finger load across recent workout logs to warn against forearm fatigue
 */
export async function checkRecentGripLoad(): Promise<{ highGripDays: number; warningNote?: string }> {
  try {
    const logs = await db.workoutLogs.orderBy('completedAt').reverse().limit(5).toArray();

    let highGripDays = 0;
    const today = new Date();

    for (const log of logs) {
      if (log.status === 'abandoned') continue;
      const logDate = new Date(log.completedAt || log.date);
      const diffDays = (today.getTime() - logDate.getTime()) / (1000 * 3600 * 24);

      if (diffDays <= 3) {
        const hasGripEx = log.exercises.some((ex) => {
          const def = EXERCISE_LIBRARY.find((e) => e.name.toLowerCase() === ex.name.toLowerCase());
          return def?.category === 'CLIMBING' || def?.tags?.includes('grip') || def?.tags?.includes('back');
        });
        if (hasGripEx) highGripDays++;
      }
    }

    if (highGripDays >= 2) {
      return {
        highGripDays,
        warningNote: 'High grip demand logged over consecutive days. Monitor forearm fatigue & focus on scapular engagement.',
      };
    }

    return { highGripDays };
  } catch (e) {
    console.error('Error checking grip load:', e);
    return { highGripDays: 0 };
  }
}

export interface WorkoutStatsResult {
  totalWorkouts: number;
  completedWorkouts: number;
  partialWorkouts: number;
  weeklyWorkouts: number;
  totalCompletedSets: number;
  totalReps: number;
  totalVolumeKg: number;
  prCount: number;
}

/**
 * Get aggregate workout statistics for user dashboard
 */
export async function getWorkoutStats(): Promise<WorkoutStatsResult> {
  try {
    const allLogs = await db.workoutLogs.toArray();
    const validLogs = allLogs.filter((l) => l.status === 'completed' || l.status === 'partially_completed' || !l.status);
    const prCount = await db.personalRecords.count();

    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    let completedWorkouts = 0;
    let partialWorkouts = 0;
    let weeklyWorkouts = 0;
    let totalCompletedSets = 0;
    let totalReps = 0;
    let totalVolumeKg = 0;

    for (const log of validLogs) {
      if (log.status === 'partially_completed') {
        partialWorkouts++;
      } else {
        completedWorkouts++;
      }

      const logDate = new Date(log.completedAt || log.date);
      if (logDate >= oneWeekAgo) weeklyWorkouts++;

      if (log.exercises) {
        for (const ex of log.exercises) {
          if (ex.sets) {
            for (const set of ex.sets) {
              if (set.completed) {
                totalCompletedSets++;
                const reps = set.reps || 0;
                const weight = set.weightKg || 0;
                totalReps += reps;
                totalVolumeKg += reps * weight;
              }
            }
          }
        }
      }
    }

    return {
      totalWorkouts: completedWorkouts + partialWorkouts,
      completedWorkouts,
      partialWorkouts,
      weeklyWorkouts,
      totalCompletedSets,
      totalReps,
      totalVolumeKg: Math.round(totalVolumeKg),
      prCount,
    };
  } catch (e) {
    console.error('Error computing workout stats:', e);
    return {
      totalWorkouts: 0,
      completedWorkouts: 0,
      partialWorkouts: 0,
      weeklyWorkouts: 0,
      totalCompletedSets: 0,
      totalReps: 0,
      totalVolumeKg: 0,
      prCount: 0,
    };
  }
}
