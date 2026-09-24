import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/database';
import {
  WorkoutTemplate,
  WorkoutExerciseCompleted,
  ActiveWorkoutSession,
  WorkoutLog,
} from '../../types';
import { DEFAULT_WORKOUT_SPLIT } from '../../data/workoutTemplatesData';
import {
  saveActiveSessionLocal,
  loadActiveSessionLocal,
  clearActiveSessionLocal,
  calculateNextTarget,
  getPreviousExerciseLog,
  checkRecentGripLoad,
  getWorkoutStats,
  calculateWorkoutCompletionReward,
  calculatePotentialPRs,
  recordPRs,
  checkWorkoutMilestones,
} from '../../services/workoutProgression';
import { WorkoutOverviewModal } from './WorkoutOverviewModal';
import { FullScreenWorkoutMode } from './FullScreenWorkoutMode';
import { WorkoutSummaryView } from './WorkoutSummaryView';
import { WorkoutEditorModal } from './WorkoutEditorModal';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { useGame } from '../../context/GameContext';
import { XP_CONFIG, ACTIVITY_ATTRIBUTE_MAP } from '../../services/xpService';
import {
  Dumbbell,
  Play,
  Clock,
  Plus,
  Award,
  ChevronRight,
  RotateCcw,
  Sparkles,
  Calendar,
  Flame,
  Check,
  Edit3,
  Trash2,
  Shield,
  Layers,
  Activity,
  AlertTriangle,
  Trophy,
} from 'lucide-react';

export const WorkoutTracker: React.FC = () => {
  const { player, awardActivityXp } = useGame();
  
  // Dexie live queries
  const templates = useLiveQuery(() => db.workoutTemplates.toArray()) || [];
  const logs = useLiveQuery(() => db.workoutLogs.orderBy('completedAt').reverse().limit(15).toArray()) || [];

  // Active UI States
  const [activeTab, setActiveTab] = useState<'program' | 'routines' | 'history'>('program');
  const [overviewTemplate, setOverviewTemplate] = useState<WorkoutTemplate | null>(null);
  const [activeSession, setActiveSession] = useState<ActiveWorkoutSession | null>(null);
  const [summarySession, setSummarySession] = useState<ActiveWorkoutSession | null>(null);
  const [editorTemplate, setEditorTemplate] = useState<WorkoutTemplate | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState<boolean>(false);

  // Fatigue and Stats states
  const [gripWarning, setGripWarning] = useState<string | null>(null);
  const [stats, setStats] = useState<{
    totalWorkouts: number;
    completedWorkouts: number;
    partialWorkouts: number;
    weeklyWorkouts: number;
    totalCompletedSets: number;
    totalReps: number;
    totalVolumeKg: number;
    prCount: number;
  } | null>(null);

  // Check for locally persisted active workout session on mount
  useEffect(() => {
    const saved = loadActiveSessionLocal();
    if (saved && saved.template) {
      setActiveSession(saved);
    }

    checkRecentGripLoad().then((res) => {
      if (res.warningNote) {
        setGripWarning(res.warningNote);
      }
    });

    getWorkoutStats().then((s) => setStats(s));
  }, [logs.length]);

  // Sync active session changes to local storage
  const handleUpdateSession = (updatedSession: ActiveWorkoutSession) => {
    setActiveSession(updatedSession);
    saveActiveSessionLocal(updatedSession);
  };

  // Launch pre-session overview
  const handleSelectTemplate = (template: WorkoutTemplate) => {
    setOverviewTemplate(template);
  };

  // Start Workout Session from Overview
  const handleStartWorkout = async (template: WorkoutTemplate) => {
    setOverviewTemplate(null);

    const initializedExercises: WorkoutExerciseCompleted[] = await Promise.all(
      template.exercises.map(async (ex) => {
        const prevResult = await getPreviousExerciseLog(ex.name, template.id);
        const target = calculateNextTarget(ex, prevResult ? prevResult.log : null, prevResult?.overallRpe);
        const repVal = parseInt(target.targetRepsText, 10) || parseInt(ex.targetReps || '10', 10) || 10;
        const weightVal = target.targetWeightKg || ex.targetWeightKg || 0;
        const durationVal = target.targetDurationSec || ex.targetDurationSec || 0;

        return {
          exerciseId: ex.exerciseId || ex.id,
          name: ex.name,
          sets: Array.from({ length: ex.targetSets || 3 }, (_, i) => ({
            setNumber: i + 1,
            reps: repVal,
            weightKg: weightVal,
            durationSec: durationVal,
            completed: false,
            targetRepsText: target.targetRepsText,
            targetWeightKg: weightVal,
          })),
        };
      })
    );

    const newSession: ActiveWorkoutSession = {
      template,
      exercises: initializedExercises,
      currentExerciseIndex: 0,
      currentSetIndex: 0,
      startTime: Date.now(),
      elapsedSec: 0,
      restTimerSec: null,
      restTimerMaxSec: null,
      isResting: false,
      isPaused: false,
    };

    setActiveSession(newSession);
    saveActiveSessionLocal(newSession);
  };

  // Abandon active session
  const handleAbandonWorkout = () => {
    setActiveSession(null);
    clearActiveSessionLocal();
  };

  // Trigger Summary View on Finish
  const handleTriggerSummary = (completedSession: ActiveWorkoutSession) => {
    setSummarySession(completedSession);
    setActiveSession(null);
  };

  // Ref to prevent concurrent double-saves
  const savingSessionIds = React.useRef(new Set<string>());

  // Save Workout & Award XP
  const handleSaveAndExitSummary = async (overallRpe: number, notes: string) => {
    if (!summarySession) return;

    const sessionKey = summarySession.startTime
      ? `session_${summarySession.startTime}`
      : `session_${Date.now()}`;

    // Memory guard against parallel clicks/remounts
    if (savingSessionIds.current.has(sessionKey)) return;

    // Session duplicate guard
    if (summarySession.rewardClaimed) return;

    savingSessionIds.current.add(sessionKey);
    summarySession.rewardClaimed = true;

    try {
      // Check database for duplicate sessionId
      const existingLog = await db.workoutLogs.where('sessionId').equals(sessionKey).first();
      if (existingLog) {
        clearActiveSessionLocal();
        setSummarySession(null);
        return;
      }

      const reward = calculateWorkoutCompletionReward(summarySession);
      const durationMins = Math.max(1, Math.round(summarySession.elapsedSec / 60));
      const todayStr = new Date().toISOString().split('T')[0];

      // 1. Add log to Dexie FIRST
      await db.workoutLogs.add({
        sessionId: sessionKey,
        templateId: summarySession.template.id,
        templateName: summarySession.template.name,
        date: todayStr,
        durationMins,
        exercises: summarySession.exercises,
        xpEarned: reward.xpAward,
        overallRpe,
        notes,
        completedAt: new Date().toISOString(),
        status: reward.completionState,
        completionRatio: reward.completionRatio,
        completedSetsCount: reward.completedSetsCount,
        totalPlannedSetsCount: reward.totalPlannedSetsCount,
      });

      // 2. Persist Personal Records ONLY IF meaningful effort and user explicitly saved!
      if (reward.isMeaningfulEffort) {
        const potentialPrs = await calculatePotentialPRs(summarySession);
        if (potentialPrs.length > 0) {
          await recordPRs(potentialPrs);
        }
      }

      // 3. Evaluate & unlock workout milestones (AFTER WorkoutLog is saved so total count is accurate!)
      if (reward.isMeaningfulEffort) {
        await checkWorkoutMilestones(summarySession);
      }

      // 4. Award XP via GameContext
      if (player && reward.xpAward > 0 && reward.isMeaningfulEffort) {
        const isFull = reward.completionState === 'completed';
        const attrXpRatio = reward.completionRatio;

        await awardActivityXp({
          activityType: 'workout',
          generalXp: reward.xpAward,
          attributes: {
            strength: Math.round(50 * attrXpRatio),
            endurance: Math.round(20 * attrXpRatio),
            discipline: Math.round(10 * attrXpRatio),
            health: Math.round(10 * attrXpRatio),
          },
          title: isFull
            ? `Completed Workout: ${summarySession.template.name}`
            : `Partial Workout: ${summarySession.template.name} (${reward.completedSetsCount}/${reward.totalPlannedSetsCount} sets)`,
          subtitle: `${durationMins} mins • RPE ${overallRpe}/10 • +${reward.xpAward} XP`,
          category: 'Training',
        });
      }

      // 5. Record session entry in Chronicle (distinguish full vs partial, skip abandoned)
      if (reward.isMeaningfulEffort) {
        try {
          await db.chronicle.add({
            title: reward.completionState === 'completed'
              ? `Completed Workout: ${summarySession.template.name}`
              : `Partially Completed: ${summarySession.template.name}`,
            subtitle: `${durationMins} mins • ${reward.completedSetsCount}/${reward.totalPlannedSetsCount} sets (${Math.round(reward.completionRatio * 100)}%) • RPE ${overallRpe}/10`,
            category: 'workout',
            date: todayStr,
            icon: 'Dumbbell',
            details: reward.completionState === 'completed'
              ? `Logged 100% full workout completion (+${reward.xpAward} XP)`
              : `Logged partial completion (+${reward.xpAward} XP)`,
          });
        } catch (e) {
          console.error('Error logging workout to Chronicle:', e);
        }
      }

      // Refresh statistics
      const updatedStats = await getWorkoutStats();
      setStats(updatedStats);
    } catch (err) {
      console.error('Error saving workout summary:', err);
    } finally {
      clearActiveSessionLocal();
      setSummarySession(null);
      savingSessionIds.current.delete(sessionKey);
    }
  };

  // Custom Routine Management
  const handleSaveCustomTemplate = async (template: WorkoutTemplate) => {
    if (template.id) {
      await db.workoutTemplates.put(template);
    } else {
      await db.workoutTemplates.add(template);
    }
  };

  const handleDeleteTemplate = async (id?: number) => {
    if (!id) return;
    await db.workoutTemplates.delete(id);
  };

  // Split program templates (Day 1..5) vs custom templates
  const displaySplit = templates.filter((t) => t.dayNumber || !t.isCustom);
  const displayCustom = templates.filter((t) => t.isCustom);

  const activeSplitToUse = displaySplit.length > 0 ? displaySplit : DEFAULT_WORKOUT_SPLIT;

  return (
    <div className="space-y-6 text-left">
      
      {/* ACTIVE RESUME SESSION BANNER */}
      {activeSession && (
        <div className="bg-gradient-to-r from-[#D4AF37]/20 via-[#1A2130] to-[#0D111A] border border-[#D4AF37] rounded-2xl p-4 shadow-[0_0_30px_rgba(212,175,55,0.2)] flex items-center justify-between animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/20 border border-[#D4AF37] text-[#D4AF37] flex items-center justify-center">
              <Dumbbell className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-mono font-bold uppercase text-[#D4AF37] tracking-wider block">
                ACTIVE WORKOUT IN PROGRESS
              </span>
              <h3 className="text-sm font-bold text-white">{activeSession.template.name}</h3>
            </div>
          </div>

          <Button
            onClick={() => {}} // session is already rendering if non-null
            variant="gold"
            size="sm"
            className="flex items-center gap-1.5"
          >
            <span>RESUME</span>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* FULL-SCREEN WORKOUT MODE */}
      {activeSession && (
        <FullScreenWorkoutMode
          session={activeSession}
          onUpdateSession={handleUpdateSession}
          onFinishWorkout={handleTriggerSummary}
          onAbandonWorkout={handleAbandonWorkout}
        />
      )}

      {/* WORKOUT SUMMARY CELEBRATION VIEW */}
      {summarySession && (
        <WorkoutSummaryView
          session={summarySession}
          onSaveAndExit={handleSaveAndExitSummary}
        />
      )}

      {/* WORKOUT HEADER */}
      <div data-system-guide="workout-training-header" className="bg-[var(--forge-surface)] border border-[var(--forge-border)] rounded-2xl p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold uppercase tracking-widest text-[var(--forge-text-accent)] bg-[var(--forge-primary)]/10 px-2.5 py-0.5 rounded-full border border-[var(--forge-border-accent)]">
                TRAINING ENGINE
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold font-serif text-[var(--forge-text-primary)] mt-1 tracking-tight">
              Forge Workout System
            </h1>
            <p className="text-xs text-[var(--forge-text-secondary)] mt-0.5">
              Dedicated home-equipment training program with progressive overload & full set logging.
            </p>
          </div>

          <button
            type="button"
            data-system-guide="workout-create-routine-btn"
            onClick={() => {
              setEditorTemplate(null);
              setIsEditorOpen(true);
            }}
            className="min-h-[44px] px-4 py-2 bg-[var(--forge-primary)] text-[var(--forge-button-text,#000)] font-sans font-bold text-xs rounded-2xl border border-[var(--forge-border-accent)] shadow-xs hover:brightness-105 transition-all flex items-center justify-center gap-2 cursor-pointer self-start sm:self-auto shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Create Routine</span>
          </button>
        </div>

        {/* FORGE WORKOUT SYSTEM — EXACTLY 3 CATEGORIES IN A SYMMETRICAL GRID */}
        <div
          id="workout-system-category-grid"
          className="grid grid-cols-3 gap-2 sm:gap-3 border-t border-[var(--forge-border)] pt-4 w-full"
        >
          {/* CATEGORY 1: 5-Day Program */}
          <button
            type="button"
            id="workout-category-program"
            onClick={() => setActiveTab('program')}
            className={`min-h-[52px] sm:min-h-[56px] px-2 sm:px-3 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl border transition-all cursor-pointer flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 select-none text-center ${
              activeTab === 'program'
                ? 'bg-[var(--forge-primary)] text-[var(--forge-button-text,#000)] border-[var(--forge-border-accent)] shadow-xs font-bold'
                : 'bg-[var(--forge-surface-interactive)] text-[var(--forge-text-secondary)] hover:text-[var(--forge-text-primary)] border-[var(--forge-border)] hover:border-[var(--forge-border-accent)]'
            }`}
          >
            <Layers className="w-4 h-4 shrink-0" />
            <span className="text-xs sm:text-sm font-sans font-semibold leading-tight whitespace-normal sm:whitespace-nowrap">
              5-Day Program
            </span>
          </button>

          {/* CATEGORY 2: My Routine */}
          <button
            type="button"
            id="workout-category-routines"
            onClick={() => setActiveTab('routines')}
            className={`min-h-[52px] sm:min-h-[56px] px-2 sm:px-3 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl border transition-all cursor-pointer flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 select-none text-center ${
              activeTab === 'routines'
                ? 'bg-[var(--forge-primary)] text-[var(--forge-button-text,#000)] border-[var(--forge-border-accent)] shadow-xs font-bold'
                : 'bg-[var(--forge-surface-interactive)] text-[var(--forge-text-secondary)] hover:text-[var(--forge-text-primary)] border-[var(--forge-border)] hover:border-[var(--forge-border-accent)]'
            }`}
          >
            <Dumbbell className="w-4 h-4 shrink-0" />
            <span className="text-xs sm:text-sm font-sans font-semibold leading-tight whitespace-normal sm:whitespace-nowrap">
              My Routine
            </span>
          </button>

          {/* CATEGORY 3: History */}
          <button
            type="button"
            id="workout-category-history"
            onClick={() => setActiveTab('history')}
            className={`min-h-[52px] sm:min-h-[56px] px-2 sm:px-3 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl border transition-all cursor-pointer flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 select-none text-center ${
              activeTab === 'history'
                ? 'bg-[var(--forge-primary)] text-[var(--forge-button-text,#000)] border-[var(--forge-border-accent)] shadow-xs font-bold'
                : 'bg-[var(--forge-surface-interactive)] text-[var(--forge-text-secondary)] hover:text-[var(--forge-text-primary)] border-[var(--forge-border)] hover:border-[var(--forge-border-accent)]'
            }`}
          >
            <Activity className="w-4 h-4 shrink-0" />
            <span className="text-xs sm:text-sm font-sans font-semibold leading-tight whitespace-normal sm:whitespace-nowrap">
              History
            </span>
          </button>
        </div>
      </div>

      {/* TAB 1: 5-DAY PROGRAM SPLIT */}
      {activeTab === 'program' && (
        <div className="space-y-4">
          {gripWarning && (
            <div className="bg-amber-950/20 border border-amber-500/40 p-3.5 rounded-2xl flex items-center gap-3 text-amber-300 text-xs">
              <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
              <div>
                <span className="font-mono font-bold uppercase text-xs text-amber-400 block">
                  TRAINING FATIGUE SIGNAL:
                </span>
                <span>{gripWarning}</span>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--forge-text-secondary)] flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[var(--forge-text-accent)]" />
              Structured 5-Day Training Split (Barbell, Plates, Mat, Jump Rope)
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeSplitToUse.map((tpl, idx) => (
              <Card
                key={tpl.id || idx}
                className="bg-[var(--forge-surface)] border border-[var(--forge-border)] hover:border-[var(--forge-border-accent)] transition-all p-4 sm:p-5 rounded-2xl flex flex-col justify-between group space-y-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-[var(--forge-text-accent)] bg-[var(--forge-primary)]/10 px-2.5 py-0.5 rounded-full border border-[var(--forge-border-accent)] uppercase">
                      Day {tpl.dayNumber || idx + 1}
                    </span>
                    <span className="text-xs font-mono text-[var(--forge-text-muted)] flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-[var(--forge-text-accent)]" /> ~{tpl.estimatedDurationMins}m
                    </span>
                  </div>

                  <h3 className="text-base font-bold font-serif text-[var(--forge-text-primary)] group-hover:text-[var(--forge-text-accent)] transition-colors">
                    {tpl.name}
                  </h3>

                  <p className="text-xs text-[var(--forge-text-secondary)] line-clamp-2">
                    {tpl.trainingFocus || tpl.category}
                  </p>

                  <div className="pt-2 border-t border-[var(--forge-border)]">
                    <span className="text-xs font-mono text-[var(--forge-text-muted)] uppercase block mb-1">
                      Movement Lineup ({tpl.exercises.length}):
                    </span>
                    <div className="space-y-1">
                      {tpl.exercises.slice(0, 4).map((ex, i) => (
                        <p key={i} className="text-xs text-[var(--forge-text-secondary)] truncate flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-[var(--forge-text-accent)]" />
                          {ex.name}
                        </p>
                      ))}
                      {tpl.exercises.length > 4 && (
                        <p className="text-xs text-[var(--forge-text-muted)] italic pl-3">
                          + {tpl.exercises.length - 4} more exercises...
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between border-t border-[var(--forge-border)]">
                  <span className="text-xs font-mono font-bold text-[var(--forge-text-accent)]">
                    +{tpl.xpReward || 120} XP
                  </span>

                  <button
                    type="button"
                    onClick={() => handleSelectTemplate(tpl)}
                    className="min-h-[40px] px-3.5 py-1.5 bg-[var(--forge-primary)] text-[var(--forge-button-text,#000)] font-sans font-bold text-xs rounded-2xl border border-[var(--forge-border-accent)] shadow-xs hover:brightness-105 transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>START</span>
                  </button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: MY ROUTINES (CUSTOM) */}
      {activeTab === 'routines' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--forge-text-secondary)]">
              Custom Routines
            </span>
            <button
              type="button"
              onClick={() => {
                setEditorTemplate(null);
                setIsEditorOpen(true);
              }}
              className="min-h-[38px] px-3.5 py-1.5 bg-[var(--forge-surface)] text-[var(--forge-text-accent)] hover:text-[var(--forge-text-primary)] border border-[var(--forge-border)] hover:border-[var(--forge-border-accent)] rounded-2xl text-xs font-sans font-semibold transition-all cursor-pointer"
            >
              + Create Routine
            </button>
          </div>

          {displayCustom.length === 0 ? (
            <div className="bg-[var(--forge-surface)] border border-[var(--forge-border)] rounded-2xl p-8 text-center space-y-3">
              <Dumbbell className="w-8 h-8 text-[var(--forge-text-muted)] mx-auto opacity-50" />
              <p className="text-xs text-[var(--forge-text-secondary)]">No custom routines created yet.</p>
              <button
                type="button"
                onClick={() => {
                  setEditorTemplate(null);
                  setIsEditorOpen(true);
                }}
                className="min-h-[44px] px-4 py-2 bg-[var(--forge-primary)] text-[var(--forge-button-text,#000)] font-sans font-bold text-xs rounded-2xl border border-[var(--forge-border-accent)] shadow-xs hover:brightness-105 transition-all cursor-pointer"
              >
                Create Custom Routine
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {displayCustom.map((tpl) => (
                <Card
                  key={tpl.id}
                  className="bg-[var(--forge-surface)] border border-[var(--forge-border)] hover:border-[var(--forge-border-accent)] p-4 sm:p-5 rounded-2xl flex flex-col justify-between space-y-3 transition-all"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono text-[var(--forge-text-accent)] uppercase">
                        {tpl.category}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditorTemplate(tpl);
                            setIsEditorOpen(true);
                          }}
                          className="p-1.5 text-[var(--forge-text-muted)] hover:text-[var(--forge-text-primary)] hover:bg-[var(--forge-surface-interactive)] rounded-xl transition-colors cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteTemplate(tpl.id)}
                          className="p-1.5 text-[var(--forge-text-muted)] hover:text-rose-400 hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <h3 className="text-sm font-bold font-serif text-[var(--forge-text-primary)]">{tpl.name}</h3>
                    <p className="text-xs text-[var(--forge-text-secondary)]">
                      {tpl.exercises.length} exercises • ~{tpl.estimatedDurationMins} mins
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleSelectTemplate(tpl)}
                    className="min-h-[44px] w-full flex items-center justify-center gap-2 bg-[var(--forge-primary)] text-[var(--forge-button-text,#000)] font-sans font-bold text-xs rounded-2xl border border-[var(--forge-border-accent)] shadow-xs hover:brightness-105 transition-all cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>START WORKOUT</span>
                  </button>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: WORKOUT HISTORY */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          {stats && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-7 gap-2">
              <div className="bg-[var(--forge-surface)] border border-[var(--forge-border)] p-3 rounded-2xl">
                <span className="text-xs font-mono text-[var(--forge-text-muted)] uppercase block">Total Sessions</span>
                <span className="text-lg font-bold font-mono text-[var(--forge-text-primary)] mt-0.5 block">{stats.totalWorkouts}</span>
              </div>
              <div className="bg-[var(--forge-surface)] border border-[var(--forge-border)] p-3 rounded-2xl">
                <span className="text-xs font-mono text-[var(--forge-text-muted)] uppercase block">Full / Partial</span>
                <span className="text-sm font-bold font-mono text-amber-400 mt-1 block">
                  {stats.completedWorkouts} Full • {stats.partialWorkouts} Part
                </span>
              </div>
              <div className="bg-[var(--forge-surface)] border border-[var(--forge-border)] p-3 rounded-2xl">
                <span className="text-xs font-mono text-[var(--forge-text-muted)] uppercase block">This Week</span>
                <span className="text-lg font-bold font-mono text-[var(--forge-text-accent)] mt-0.5 block">{stats.weeklyWorkouts}</span>
              </div>
              <div className="bg-[var(--forge-surface)] border border-[var(--forge-border)] p-3 rounded-2xl">
                <span className="text-xs font-mono text-[var(--forge-text-muted)] uppercase block">Completed Sets</span>
                <span className="text-lg font-bold font-mono text-[var(--forge-text-primary)] mt-0.5 block">{stats.totalCompletedSets}</span>
              </div>
              <div className="bg-[var(--forge-surface)] border border-[var(--forge-border)] p-3 rounded-2xl">
                <span className="text-xs font-mono text-[var(--forge-text-muted)] uppercase block">Total Reps</span>
                <span className="text-lg font-bold font-mono text-[var(--forge-text-primary)] mt-0.5 block">{stats.totalReps}</span>
              </div>
              <div className="bg-[var(--forge-surface)] border border-[var(--forge-border)] p-3 rounded-2xl">
                <span className="text-xs font-mono text-[var(--forge-text-muted)] uppercase block">Volume (kg)</span>
                <span className="text-lg font-bold font-mono text-[var(--forge-text-primary)] mt-0.5 block">{stats.totalVolumeKg}</span>
              </div>
              <div className="bg-[var(--forge-surface)] border border-[var(--forge-border)] p-3 rounded-2xl">
                <span className="text-xs font-mono text-[var(--forge-text-muted)] uppercase block">Records (PRs)</span>
                <span className="text-lg font-bold font-mono text-[var(--forge-text-accent)] mt-0.5 block">{stats.prCount}</span>
              </div>
            </div>
          )}

          <span className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--forge-text-secondary)] block pt-1">
            Recent Training History ({logs.length})
          </span>

          {logs.length === 0 ? (
            <div className="bg-[var(--forge-surface)] border border-[var(--forge-border)] rounded-2xl p-8 text-center space-y-2">
              <Activity className="w-8 h-8 text-[var(--forge-text-muted)] mx-auto opacity-50" />
              <p className="text-xs text-[var(--forge-text-secondary)]">No workout logs found yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="bg-[var(--forge-surface)] border border-[var(--forge-border)] rounded-2xl p-4 sm:p-5 space-y-2 text-left"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold font-serif text-[var(--forge-text-primary)]">{log.templateName}</h4>
                        {log.status === 'partially_completed' ? (
                          <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/30 uppercase">
                            PARTIAL {log.completedSetsCount ? `(${log.completedSetsCount}/${log.totalPlannedSetsCount} sets)` : ''}
                          </span>
                        ) : log.status === 'completed' ? (
                          <span className="text-xs font-mono font-bold text-[var(--forge-text-accent)] bg-[var(--forge-primary)]/10 px-2.5 py-0.5 rounded-full border border-[var(--forge-border-accent)] uppercase">
                            FULL
                          </span>
                        ) : null}
                      </div>
                      <p className="text-xs font-mono text-[var(--forge-text-muted)] mt-0.5">
                        {new Date(log.completedAt).toLocaleDateString()} • {log.durationMins} mins
                        {log.overallRpe ? ` • RPE ${log.overallRpe}/10` : ''}
                      </p>
                    </div>

                    <span className="text-xs font-mono font-bold text-[var(--forge-text-accent)] bg-[var(--forge-primary)]/10 px-2.5 py-1 rounded-full border border-[var(--forge-border-accent)]">
                      +{log.xpEarned} XP
                    </span>
                  </div>

                  {log.exercises && log.exercises.length > 0 && (
                    <div className="pt-2 border-t border-[var(--forge-border)] space-y-1">
                      {log.exercises.map((ex, i) => (
                        <p key={i} className="text-xs text-[var(--forge-text-secondary)]">
                          <span className="font-bold text-[var(--forge-text-primary)]">{ex.name}:</span>{' '}
                          {ex.sets
                            .filter((s) => s.completed)
                            .map((s) => `${s.reps || s.durationSec || 0}${s.weightKg ? `x${s.weightKg}kg` : ''}`)
                            .join(', ')}
                        </p>
                      ))}
                    </div>
                  )}

                  {log.notes && (
                    <p className="text-xs text-[var(--forge-text-secondary)] italic bg-[var(--forge-surface-interactive)] p-2.5 rounded-xl border border-[var(--forge-border)]">
                      &quot;{log.notes}&quot;
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* PRE-SESSION OVERVIEW MODAL */}
      <WorkoutOverviewModal
        isOpen={overviewTemplate !== null}
        template={overviewTemplate}
        onClose={() => setOverviewTemplate(null)}
        onStartWorkout={handleStartWorkout}
      />

      {/* CUSTOM ROUTINE EDITOR MODAL */}
      <WorkoutEditorModal
        isOpen={isEditorOpen}
        initialTemplate={editorTemplate}
        onClose={() => setIsEditorOpen(false)}
        onSaveTemplate={handleSaveCustomTemplate}
      />
    </div>
  );
};
