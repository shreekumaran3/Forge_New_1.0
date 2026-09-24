/**
 * KEEP WALKING - Dexie.js IndexedDB Store
 */

import Dexie, { type EntityTable } from 'dexie';
import {
  PlayerProfile,
  PlayerStatState,
  Quest,
  QuestLog,
  LifeChapter,
  AppExportData,
  UserActiveBuilds,
  Skill,
  ChronicleItem,
  LegacyMilestone,
  PersonalRecord,
  DailyReflectionLog,
  Destiny,
  UserPrinciple,
  HealthLog,
  MemoryCapsule,
  WorkoutTemplate,
  WorkoutLog,
  Routine,
  Habit,
  JournalEntry,
  Achievement,
  RecoveryLog,
  MAX_ACTIVE_QUESTS,
  PillarId,
  ForgePath,
  DailyQuestIntent,
  AIQuestConcept,
} from '../types';
import { STATS_CONFIG } from '../services/xpService';
import { INITIAL_LEGACY_MILESTONES } from '../data/legacyData';
import { INITIAL_DESTINIES, INITIAL_PRINCIPLES } from '../data/destiniesAndPrinciplesData';
import { generateDailyQuests, isSameQuestContent } from '../services/questGenerator';
import { getActiveQuestExecution } from '../services/questExecutionService';
import { parseQuestDurationMinutes } from '../services/apeEngine';
import { mergeForgePaths } from '../services/gameService';
import { syncSkillsWithForgePath, seedStarterSkills } from '../services/skillService';
import {
  reconcileDeterministicQuests,
  checkAndResetDeterministicCadences,
} from '../services/deterministicQuestService';
import {
  clearAIQuestConceptsCache,
  getCachedAIQuestConcepts,
  fetchAIQuestConcepts,
} from '../services/geminiService';
import { getHighestUnlockedBand } from '../services/masteryBandService';

import { DEFAULT_WORKOUT_SPLIT } from '../data/workoutTemplatesData';

export class KeepWalkingDB extends Dexie {
  player!: EntityTable<PlayerProfile, 'id'>;
  stats!: EntityTable<PlayerStatState, 'statId'>;
  quests!: EntityTable<Quest, 'id'>;
  questLogs!: EntityTable<QuestLog, 'id'>;
  chapters!: EntityTable<LifeChapter, 'id'>;
  activeBuilds!: EntityTable<UserActiveBuilds, 'id'>;
  skills!: EntityTable<Skill, 'id'>;
  chronicle!: EntityTable<ChronicleItem, 'id'>;
  legacyMilestones!: EntityTable<LegacyMilestone, 'id'>;
  personalRecords!: EntityTable<PersonalRecord, 'id'>;
  dailyReflections!: EntityTable<DailyReflectionLog, 'id'>;
  destinies!: EntityTable<Destiny, 'id'>;
  principles!: EntityTable<UserPrinciple, 'id'>;
  healthLogs!: EntityTable<HealthLog, 'id'>;
  healthSettings!: EntityTable<any, 'id'>;
  memoryCapsules!: EntityTable<MemoryCapsule, 'id'>;
  workoutTemplates!: EntityTable<WorkoutTemplate, 'id'>;
  workoutLogs!: EntityTable<WorkoutLog, 'id'>;
  routines!: EntityTable<Routine, 'id'>;
  habits!: EntityTable<Habit, 'id'>;
  journalEntries!: EntityTable<JournalEntry, 'id'>;
  achievements!: EntityTable<Achievement, 'id'>;
  recoveryLogs!: EntityTable<RecoveryLog, 'id'>;
  forgePath!: EntityTable<ForgePath, 'id'>;
  dailyIntents!: EntityTable<DailyQuestIntent, 'id'>;

  constructor() {
    super('KeepWalkingRPGDB');

    this.version(10).stores({
      player: '++id',
      stats: 'statId, level',
      quests: '++id, pillarId, primaryStatId, frequency, category, skillId',
      questLogs: '++id, questId, completedAt, pillarId, statId, skillId',
      chapters: '++id, startDate',
      activeBuilds: '++id, primaryBuildId',
      skills: 'id, category, pillarId, primaryStatId, level',
      chronicle: '++id, date, category',
      legacyMilestones: 'id, category',
      personalRecords: 'id, key',
      dailyReflections: '++id, date',
      destinies: 'id, pillarId',
      principles: '++id, category',
      healthLogs: '++id, date, syncedAt',
      healthSettings: '++id',
      memoryCapsules: '++id, unlockConditionType, unlockDate',
      workoutTemplates: '++id, name, category',
      workoutLogs: '++id, templateId, date, completedAt, sessionId',
      routines: '++id, name',
      habits: '++id, category',
      journalEntries: '++id, date, type, createdAt',
      achievements: 'id, category',
      recoveryLogs: '++id, activityId, date, completedAt',
    });

    this.version(11).stores({
      player: '++id',
      stats: 'statId, level',
      quests: '++id, pillarId, primaryStatId, frequency, category, skillId',
      questLogs: '++id, questId, completedAt, pillarId, statId, skillId',
      chapters: '++id, startDate',
      activeBuilds: '++id, primaryBuildId',
      skills: 'id, category, pillarId, primaryStatId, level',
      chronicle: '++id, date, category',
      legacyMilestones: 'id, category',
      personalRecords: 'id, key',
      dailyReflections: '++id, date',
      destinies: 'id, pillarId',
      principles: '++id, category',
      healthLogs: '++id, date, syncedAt',
      healthSettings: '++id',
      memoryCapsules: '++id, unlockConditionType, unlockDate',
      workoutTemplates: '++id, name, category',
      workoutLogs: '++id, templateId, date, completedAt, sessionId',
      routines: '++id, name',
      habits: '++id, category',
      journalEntries: '++id, date, type, createdAt',
      achievements: 'id, category',
      recoveryLogs: '++id, activityId, date, completedAt',
      forgePath: '++id, domain',
      dailyIntents: '++id, dateKey',
    });
  }
}

export const db = new KeepWalkingDB();

/**
 * Initialize database with baseline metadata if fresh install
 */
export async function initializeDatabase() {
  try {
    // Check active builds if configured & migrate legacy engineer builds
    const activeBuildsObj = await db.activeBuilds.toCollection().first();
    if (activeBuildsObj) {
      let needsUpdate = false;
      let newPrimary = activeBuildsObj.primaryBuildId;
      let newSecondary = activeBuildsObj.secondaryBuildIds || [];

      if ((newPrimary as string) === 'engineer') {
        newPrimary = 'builder';
        needsUpdate = true;
      }
      if (newSecondary.includes('engineer' as any)) {
        newSecondary = newSecondary.filter((id) => (id as string) !== 'engineer');
        needsUpdate = true;
      }
      if (needsUpdate && activeBuildsObj.id) {
        await db.activeBuilds.update(activeBuildsObj.id, {
          primaryBuildId: newPrimary,
          secondaryBuildIds: newSecondary,
        });
      }
    }

    // Ensure 5 deterministic starter skills (Drawing, Writing, Fitness, Cooking, Personal Finance)
    // exist in db.skills without wiping or overwriting any existing player progress
    await seedStarterSkills();

    // Ensure Legacy Milestones exist (all locked by default)
    const legacyCount = await db.legacyMilestones.count();
    if (legacyCount === 0) {
      await db.legacyMilestones.bulkPut(INITIAL_LEGACY_MILESTONES);
    } else {
      // Ensure any newly added milestone definitions (such as retention chronicle achievements) exist
      for (const m of INITIAL_LEGACY_MILESTONES) {
        const existing = await db.legacyMilestones.get(m.id);
        if (!existing) {
          await db.legacyMilestones.put(m);
        }
      }
    }

    // Sync historical retention milestones with legacyMilestones store
    try {
      const retentionRecord = await db.personalRecords.get('retention_journey_state');
      if (retentionRecord && retentionRecord.value) {
        const retentionData = typeof retentionRecord.value === 'string' ? JSON.parse(retentionRecord.value) : retentionRecord.value;
        const claimed = Array.isArray(retentionData.claimedMilestones) ? retentionData.claimedMilestones : [];
        for (const days of claimed) {
          const milestoneId = `ret_${days}_days`;
          const existing = await db.legacyMilestones.get(milestoneId);
          if (existing && !existing.isUnlocked) {
            await db.legacyMilestones.update(milestoneId, {
              isUnlocked: true,
              unlockedAt: retentionData.lastConfirmedDate || new Date().toISOString().split('T')[0],
            });
          }
        }
      }
    } catch (e) {
      console.warn('Could not sync retention milestones in database init:', e);
    }

    // Ensure Destinies exist & update legacy dest_builder if needed
    const destiniesCount = await db.destinies.count();
    if (destiniesCount === 0) {
      await db.destinies.bulkPut(INITIAL_DESTINIES);
    } else {
      const destBuilder = await db.destinies.get('dest_builder');
      if (destBuilder && destBuilder.title.includes('Software')) {
        await db.destinies.update('dest_builder', {
          title: 'Master Craftsman & Builder',
          tagline: 'Designing physical & visual works, launching projects, and mastering creative discipline.',
          description: 'Constructing meaningful works, honing creative craftsmanship, and building long-term project mastery.',
          milestones: ['Complete 5 Design Modules', 'Publish First Creative Project', 'Solve 50 Complex Design Challenges', 'Launch Original Venture'],
          icon: 'Hammer',
        });
      }
    }

    // Ensure Health Settings exist (Default manual mode active)
    const healthSettingsCount = await db.healthSettings.count();
    if (healthSettingsCount === 0) {
      await db.healthSettings.add({
        connected: false, // Health Connect temporarily disabled for manual tracking
        autoSyncEnabled: false,
        providerName: 'Manual Entry Mode',
        permissions: {
          steps: false,
          distance: false,
          activeMinutes: false,
          sleep: false,
        },
        lastSyncedAt: new Date().toISOString(),
      });
    }

    // Ensure stats exist at level 1 with 0 XP
    const existingStatsCount = await db.stats.count();
    if (existingStatsCount < STATS_CONFIG.length) {
      const defaultStats: PlayerStatState[] = STATS_CONFIG.map((stat) => ({
        statId: stat.id,
        level: 1,
        currentXp: 0,
        lifetimeXp: 0,
      }));
      await db.stats.bulkPut(defaultStats);
    }

    // Check if player profile exists
    const playerCount = await db.player.count();
    if (playerCount > 0) {
      await checkAndResetDailyQuests();
    }

    // Ensure workout templates exist
    const workoutTemplatesCount = await db.workoutTemplates.count();
    if (workoutTemplatesCount === 0) {
      await db.workoutTemplates.bulkAdd(DEFAULT_WORKOUT_SPLIT);
    }

    // Check if Forge Path exists before generating/reconciling quests.
    // Fresh install has Forge Path = none -> 0 active quests, 0 persistent skills.
    const existingForgePath = await db.forgePath.toCollection().first();
    if (existingForgePath) {
      // Ensure active quests are capped at MAX_ACTIVE_QUESTS with pillar diversity
      await reconcileAndReplenishQuests();
    } else {
      // Remove any auto-generated incomplete quests left over from legacy state with no Forge Path
      // Preserve completed history (completedToday === true or completionCount > 0) and manual quests
      const allQuests = await db.quests.toArray();
      const staleAutoActive = allQuests.filter(
        (q) => !q.completedToday && (q.completionCount || 0) === 0 && q.isAutoGenerated !== false && q.frequency !== 'custom'
      );
      for (const q of staleAutoActive) {
        if (q.id !== undefined) {
          await db.quests.delete(q.id);
        }
      }
    }
  } catch (err) {
    console.error('Error in initializeDatabase:', err);
  }
}

let isReplenishingQuests = false;

/**
 * Reconciles and replenishes active quests in Dexie so that:
 * 1. Active (incomplete) quests NEVER exceed MAX_ACTIVE_QUESTS (6).
 * 2. Active quests maximize pillar diversity.
 * 3. Completed quest history and questLogs are NEVER touched or deleted.
 */
export async function reconcileAndReplenishQuests(pinnedQuestId?: number): Promise<void> {
  if (isReplenishingQuests) return;
  isReplenishingQuests = true;
  try {
    const forgePath = await getForgePath();
    if (!forgePath) {
      // Authoritative early guard: If no Forge Path has been established, clean up any incomplete auto quests
      const allQuests = await db.quests.toArray();
      const staleAutoActive = allQuests.filter(
        (q) => !q.completedToday && (q.completionCount || 0) === 0 && q.isAutoGenerated !== false && q.frequency !== 'custom'
      );
      for (const q of staleAutoActive) {
        if (q.id !== undefined) {
          await db.quests.delete(q.id);
        }
      }
      return;
    }

    // Populate and maintain deterministic 3 quest types for each active skill
    await reconcileDeterministicQuests();
  } catch (err) {
    console.error('Error in reconcileAndReplenishQuests:', err);
  } finally {
    isReplenishingQuests = false;
  }
}

/**
 * Safely replace active quests in the database with a capped, pillar-diverse list.
 */
export async function replaceQuestsInDB(candidateQuests: Quest[]) {
  const allQuests = await db.quests.toArray();
  const completedQuests = allQuests.filter((q) => Boolean(q.completedToday));
  const questLogs = await db.questLogs.orderBy('completedAt').reverse().limit(100).toArray();

  const historyQuests = [
    ...completedQuests,
    ...questLogs.map((l) => ({ title: l.questTitle, conceptId: undefined, libraryItemId: undefined })),
  ];

  const selectedActive: Quest[] = [];
  const usedPillars = new Set<PillarId>();

  // Ensure any currently executing active quest is strictly preserved
  const currentExec = getActiveQuestExecution();
  const executingQuest = currentExec && (currentExec.status === 'ACTIVE' || currentExec.status === 'AWAITING_CONFIRMATION' || currentExec.status === 'EXTENSION')
    ? allQuests.find((q) => q.id === currentExec.questId)
    : undefined;

  if (executingQuest) {
    selectedActive.push(executingQuest);
    usedPillars.add(executingQuest.pillarId);
  }

  // Filter out candidates that are completed or duplicate completed quests/history/active execution
  const validIncompleteCandidates = candidateQuests.filter((cq) => {
    if (cq.completedToday) return false;
    if (completedQuests.some((cq2) => isSameQuestContent(cq2, cq))) return false;
    if (executingQuest && (executingQuest.id === cq.id || isSameQuestContent(executingQuest, cq))) return false;
    return true;
  });

  // Candidate quests from APE are already prioritized, balanced, and budget-constrained.
  // Add them in priority order up to MAX_ACTIVE_QUESTS.
  for (const cq of validIncompleteCandidates) {
    if (selectedActive.length < MAX_ACTIVE_QUESTS) {
      if (!selectedActive.some((s) => isSameQuestContent(s, cq))) {
        selectedActive.push({ ...cq, completedToday: false });
        usedPillars.add(cq.pillarId);
      }
    }
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const dailyIntent = await getDailyIntent(todayStr);
  const hasDailyBudget = typeof dailyIntent?.availableMinutes === 'number' && dailyIntent.availableMinutes > 0;

  // Only use history fallbacks if there is NO active daily time budget constraint
  if (!hasDailyBudget && selectedActive.length < MAX_ACTIVE_QUESTS) {
    const historyCandidates = validIncompleteCandidates.filter((cq) =>
      historyQuests.some((hq) => isSameQuestContent(hq, cq))
    );

    for (const cq of historyCandidates) {
      if (selectedActive.length < MAX_ACTIVE_QUESTS) {
        if (!selectedActive.some((s) => isSameQuestContent(s, cq))) {
          selectedActive.push({ ...cq, completedToday: false });
        }
      }
    }
  }

  // Enforce authoritative band synchronization on selected active quests
  const skillsForReplace = await db.skills.toArray();
  const highestBandForReplace = getHighestUnlockedBand(skillsForReplace);
  for (const q of selectedActive) {
    const rawBand = q.questBand || q.band || 1;
    const finalBand = Math.max(1, Math.min(highestBandForReplace, rawBand)) as 1 | 2 | 3 | 4 | 5 | 6;
    q.questBand = finalBand;
    q.band = finalBand;
    q.difficultyBand = finalBand;
  }

  await db.quests.clear();

  const toSave = [...completedQuests, ...selectedActive];
  const withId: Quest[] = [];
  const withoutId: Omit<Quest, 'id'>[] = [];

  for (const q of toSave) {
    if (q.id !== undefined && q.id !== null) {
      withId.push(q);
    } else {
      const { id, ...rest } = q;
      withoutId.push(rest);
    }
  }

  if (withId.length > 0) {
    await db.quests.bulkPut(withId as Quest[]);
  }
  if (withoutId.length > 0) {
    await db.quests.bulkAdd(withoutId as Quest[]);
  }
}

/**
 * Check if the day has turned over and reset completedToday status on daily quests, routines, habits
 */
export async function checkAndResetDailyQuests() {
  const player = await db.player.toCollection().first();
  if (!player) return;

  const todayStr = new Date().toISOString().split('T')[0];
  const lastActive = player.lastActiveDate || todayStr;

  // Run deterministic cadence resets for Daily, Weekly, and Monthly quests
  await checkAndResetDeterministicCadences();

  if (lastActive !== todayStr) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    // Reset daily status on routines & habits
    await db.routines.toCollection().modify({ completedToday: false });
    await db.habits.toCollection().modify({ completedToday: false });

    const forgePath = await getForgePath();
    if (forgePath) {
      await reconcileDeterministicQuests();
    }

    let newStreak = player.currentStreak;
    if (lastActive !== yesterdayStr) {
      newStreak = 1;
    }

    await db.player.update(player.id!, {
      lastActiveDate: todayStr,
      currentStreak: newStreak,
    });
  } else {
    // Ensure active quests remain reconciled even on same day
    await reconcileDeterministicQuests();
  }
}

import {
  createForgeBackup,
  parseAndValidateBackup,
  executeAtomicRestore,
} from '../services/backupService';

/**
 * Export full JSON data
 */
export async function exportAppData(): Promise<AppExportData> {
  const { backupPackage } = await createForgeBackup();
  return backupPackage as any;
}

/**
 * Import full JSON data
 */
export async function importAppData(data: AppExportData | string): Promise<boolean> {
  const jsonStr = typeof data === 'string' ? data : JSON.stringify(data);
  const validation = parseAndValidateBackup(jsonStr);
  if (!validation.isValid) {
    throw new Error(validation.error || 'Invalid backup JSON schema');
  }
  return await executeAtomicRestore(validation.data);
}

/**
 * Reset all data to default state
 */
export async function resetAllData(): Promise<void> {
  try {
    localStorage.clear();
    sessionStorage.clear();
  } catch (e) {
    // Ignore storage access errors
  }

  await db.transaction(
    'rw',
    [
      db.player,
      db.stats,
      db.quests,
      db.questLogs,
      db.chapters,
      db.activeBuilds,
      db.skills,
      db.chronicle,
      db.legacyMilestones,
      db.personalRecords,
      db.dailyReflections,
      db.destinies,
      db.principles,
      db.healthLogs,
      db.healthSettings,
      db.memoryCapsules,
      db.workoutTemplates,
      db.workoutLogs,
      db.routines,
      db.habits,
      db.journalEntries,
      db.achievements,
      db.recoveryLogs,
      db.forgePath,
      db.dailyIntents,
    ],
    async () => {
      await db.player.clear();
      await db.stats.clear();
      await db.quests.clear();
      await db.questLogs.clear();
      await db.chapters.clear();
      await db.activeBuilds.clear();
      await db.skills.clear();
      await db.chronicle.clear();
      await db.legacyMilestones.clear();
      await db.personalRecords.clear();
      await db.dailyReflections.clear();
      await db.destinies.clear();
      await db.principles.clear();
      await db.healthLogs.clear();
      await db.healthSettings.clear();
      await db.memoryCapsules.clear();
      await db.workoutTemplates.clear();
      await db.workoutLogs.clear();
      await db.routines.clear();
      await db.habits.clear();
      await db.journalEntries.clear();
      await db.achievements.clear();
      await db.recoveryLogs.clear();
      await db.forgePath.clear();
      await db.dailyIntents.clear();
    }
  );
  await initializeDatabase();
}

/**
 * Get active user Forge Path
 */
export async function getForgePath(): Promise<ForgePath | undefined> {
  return await db.forgePath.toCollection().first();
}

/**
 * Save or update Forge Path and ensure skill concepts and curriculum stages exist in db.skills
 * while strictly preserving existing historical progression (XP, Level, Milestones).
 */
export async function setForgePath(path: ForgePath): Promise<number> {
  clearAIQuestConceptsCache();

  // 1. Synchronize persistent skills & curriculum stages first,
  // attaching skillId, active, and activePriority to path's goalTracks
  try {
    await syncSkillsWithForgePath(path);
  } catch (skillErr) {
    console.warn('Failed to sync path with persistent skills:', skillErr);
  }

  const existing = await db.forgePath.toCollection().first();
  let resultId: number;

  if (existing && existing.id) {
    await db.forgePath.update(existing.id, {
      ...path,
      updatedAt: new Date().toISOString(),
    });
    resultId = existing.id;
  } else {
    const id = await db.forgePath.add({
      ...path,
      createdAt: path.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    resultId = Number(id);
  }

  return resultId;
}

/**
 * Get Daily Intent for a specific date (defaults to today)
 */
export async function getDailyIntent(dateKey?: string): Promise<DailyQuestIntent | undefined> {
  const targetDate = dateKey || new Date().toISOString().split('T')[0];
  return await db.dailyIntents.where('dateKey').equals(targetDate).first();
}

/**
 * Save or update Daily Intent
 */
export async function setDailyIntent(intent: DailyQuestIntent): Promise<number> {
  clearAIQuestConceptsCache();
  const targetDate = intent.dateKey || new Date().toISOString().split('T')[0];
  const existing = await db.dailyIntents.where('dateKey').equals(targetDate).first();
  if (existing && existing.id) {
    await db.dailyIntents.update(existing.id, {
      ...intent,
      dateKey: targetDate,
    });
    return existing.id;
  }
  const id = await db.dailyIntents.add({
    ...intent,
    dateKey: targetDate,
    createdAt: intent.createdAt || new Date().toISOString(),
  });
  return Number(id);
}

/**
 * Clear Daily Intent for a specific date
 */
export async function clearDailyIntent(dateKey?: string): Promise<void> {
  clearAIQuestConceptsCache();
  const targetDate = dateKey || new Date().toISOString().split('T')[0];
  await db.dailyIntents.where('dateKey').equals(targetDate).delete();
}

