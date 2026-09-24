/**
 * KEEP WALKING - Game Context & Reactive State Provider
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  db,
  initializeDatabase,
  exportAppData,
  importAppData,
  resetAllData,
  replaceQuestsInDB,
  reconcileAndReplenishQuests,
  getForgePath,
  setForgePath,
  getDailyIntent,
  setDailyIntent,
  clearDailyIntent,
} from '../db/database';
import {
  createForgeBackup,
  saveBackupFile,
  parseAndValidateBackup,
  executeAtomicRestore,
} from '../services/backupService';
import {
  PlayerProfile,
  PlayerStatState,
  Quest,
  QuestLog,
  QuestExecution,
  ForgeNotificationData,
  PillarId,
  StatId,
  AppExportData,
  UserActiveBuilds,
  Skill,
  BuildId,
  HealthLog,
  ForgePath,
  ForgePathProposal,
  ForgePathUpdate,
  DailyQuestIntent,
  AIQuestConcept,
} from '../types';
import {
  fetchAIQuestConcepts,
  getCachedAIQuestConcepts,
  clearAIQuestConceptsCache,
} from '../services/geminiService';
import {
  getPlayerXpForNextLevel,
  getPlayerXpNextLevel,
  getStatXpNextLevel,
  getSkillXpNextLevel,
  getSkillRank,
  getForgeIdentityTag,
  STATS_CONFIG,
  calculateStreakBonus,
  XP_CONFIG,
  PROGRESSION_CONFIG,
  MAX_PLAYER_LEVEL,
  calculatePlayerLevelUp,
  calculatePlayerLevelDown,
} from '../services/xpService';
import { generateDailyQuests, getQuestContentKey } from '../services/questGenerator';
import { getTodayHealthLog } from '../services/healthService';
import { calculateDynamicLifeClass } from '../services/lifeClassService';
import { getQuestRarity } from '../services/questRarityService';
import { getHighestUnlockedBand } from '../services/masteryBandService';
import {
  getActiveQuestExecution,
  saveActiveQuestExecution,
  clearActiveQuestExecution,
  addQuestExecutionHistory,
  calculateQuestReward,
  createQuestExecution,
} from '../services/questExecutionService';
import {
  scheduleQuestCompletionNotification,
  cancelQuestCompletionNotification,
  evaluateInactivityReminder,
  reconcileNotifications,
} from '../services/notificationManager';
import { playUISound } from '../services/soundManager';
import { updateForgePath as updateForgePathService } from '../services/gameService';
import { reconcileDeterministicQuests } from '../services/deterministicQuestService';

export interface GamePlayerContextType {
  player: PlayerProfile | undefined;
  isLoading: boolean;
  activeNotification: ForgeNotificationData | null;
  dismissNotification: () => void;
  setActiveNotification: (notif: ForgeNotificationData | null) => void;
  activeLevelUpReward: { newLevel: number } | null;
  triggerLevelUpCelebration: (newLevel: number) => void;
  dismissLevelUpCelebration: () => void;
  updatePlayer: (updates: Partial<PlayerProfile>) => Promise<void>;
  exportBackup: () => Promise<void>;
  importBackup: (jsonData: string) => Promise<boolean>;
  resetApp: () => Promise<void>;
}

export interface RegenerateQuestsProgress {
  stage: string;
  percent: number;
}

export interface RegenerateQuestsOptions {
  forceRefresh?: boolean;
  seed?: number;
  onProgress?: (progress: RegenerateQuestsProgress) => void;
}

export interface GameQuestsContextType {
  quests: Quest[];
  questLogs: QuestLog[];
  activeExecution: QuestExecution | null;
  forgePath: ForgePath | undefined;
  dailyIntent: DailyQuestIntent | undefined;
  startQuestExecution: (questId: number) => Promise<QuestExecution>;
  confirmQuestExecution: (executionId: string) => Promise<void>;
  completeQuestExecutionEarly: (executionId: string) => Promise<void>;
  extendQuestExecution: (executionId: string) => Promise<void>;
  finishQuestExecution: (executionId: string) => Promise<void>;
  cancelQuestExecution: (executionId: string) => Promise<void>;
  dismissCompletedExecution: () => void;
  completeQuest: (questId: number) => Promise<void>;
  uncompleteQuest: (questId: number) => Promise<void>;
  addQuest: (quest: Omit<Quest, 'id' | 'completedToday' | 'streak' | 'createdAt'>) => Promise<void>;
  deleteQuest: (questId: number) => Promise<void>;
  regenerateQuests: (options?: RegenerateQuestsOptions | number) => Promise<void>;
  updateForgePath: (path: ForgePath | ForgePathProposal | ForgePathUpdate) => Promise<void>;
  applyDailyIntent: (intent: DailyQuestIntent) => Promise<void>;
  clearTodayIntent: () => Promise<void>;
}

export interface GameProgressionContextType {
  stats: PlayerStatState[];
  skills: Skill[];
  activeBuilds: UserActiveBuilds | undefined;
  healthLog: HealthLog | undefined;
  grantXpToPlayerAndStats: (params: {
    generalXp: number;
    attributes?: Partial<Record<StatId, number>>;
    skillId?: string;
    title?: string;
    category?: string;
    primaryStatId?: StatId;
  }) => Promise<{ playerLeveledUp: boolean; statLeveledUp: boolean; skillLeveledUp: boolean }>;
  awardActivityXp: (params: {
    activityType: string;
    generalXp: number;
    attributes?: Partial<Record<StatId, number>>;
    title: string;
    subtitle?: string;
    category?: string;
  }) => Promise<void>;
  revokeActivityXp: (params: {
    generalXp: number;
    attributes?: Partial<Record<StatId, number>>;
  }) => Promise<void>;
  updateActiveBuilds: (primaryBuildId: BuildId, secondaryBuildIds: BuildId[]) => Promise<void>;
  toggleSkillMilestone: (skillId: string, milestoneId: string) => Promise<void>;
  unlockSkill: (skillId: string) => Promise<void>;
}

// Full GameContextType combining all sub-contexts
export type GameContextType = GamePlayerContextType & GameQuestsContextType & GameProgressionContextType;

const GamePlayerContext = createContext<GamePlayerContextType | undefined>(undefined);
const GameQuestsContext = createContext<GameQuestsContextType | undefined>(undefined);
const GameProgressionContext = createContext<GameProgressionContextType | undefined>(undefined);

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [activeNotification, setActiveNotification] = useState<ForgeNotificationData | null>(null);
  const [activeLevelUpReward, setActiveLevelUpReward] = useState<{ newLevel: number } | null>(null);

  const triggerLevelUpCelebration = useCallback((newLevel: number) => {
    setActiveLevelUpReward({ newLevel });
  }, []);

  const dismissLevelUpCelebration = useCallback(() => {
    setActiveLevelUpReward(null);
  }, []);

  // Initialize DB on mount
  useEffect(() => {
    initializeDatabase()
      .catch((err) => {
        console.error('Database initialization failed:', err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  // Live queries from Dexie
  const player = useLiveQuery(() => db.player.toCollection().first());
  const stats = useLiveQuery(() => db.stats.toArray()) || [];
  const quests = useLiveQuery(() => db.quests.toArray()) || [];
  const questLogs = useLiveQuery(() => db.questLogs.orderBy('completedAt').reverse().limit(20).toArray()) || [];
  const activeBuilds = useLiveQuery(() => db.activeBuilds.toCollection().first());
  const skills = useLiveQuery(() => db.skills.toArray()) || [];
  const todayStr = new Date().toISOString().split('T')[0];
  const healthLog = useLiveQuery(() => db.healthLogs.where('date').equals(todayStr).first());
  const forgePath = useLiveQuery(() => db.forgePath.toCollection().first());
  const dailyIntent = useLiveQuery(() => db.dailyIntents.where('dateKey').equals(todayStr).first());

  // Active Quest Execution State (Persisted across background / reload)
  const [activeExecution, setActiveExecution] = useState<QuestExecution | null>(() => getActiveQuestExecution());

  // Sync execution state changes across components & windows
  useEffect(() => {
    const handleSync = () => {
      setActiveExecution(getActiveQuestExecution());
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('forge_quest_execution_updated', handleSync);
      window.addEventListener('storage', handleSync);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('forge_quest_execution_updated', handleSync);
        window.removeEventListener('storage', handleSync);
      }
    };
  }, []);

  // Normalize player XP/level if currentXp exceeds required threshold under updated curve
  useEffect(() => {
    if (player && player.id && player.level < MAX_PLAYER_LEVEL) {
      const reqXp = getPlayerXpForNextLevel(player.level);
      if (player.currentXp >= reqXp) {
        const progression = calculatePlayerLevelUp(
          player.level,
          player.currentXp,
          player.lifetimeXp,
          0
        );

        if (progression.levelsGained > 0) {
          const newHighest = Math.max(player.highestRewardedLevel || player.level, progression.newLevel);
          db.player.update(player.id, {
            level: progression.newLevel,
            currentXp: progression.newCurrentXp,
            highestRewardedLevel: newHighest,
          });
        }
      }
    }
  }, [player]);

  const dismissNotification = useCallback(() => {
    setActiveNotification(null);
  }, []);

  // Helper: Grant XP to player, stats, and skills cleanly according to unified progression hierarchy
  const grantXpToPlayerAndStats = useCallback(async (params: {
    generalXp: number;
    attributes?: Partial<Record<StatId, number>>;
    skillId?: string;
    practiceSeconds?: number;
    title?: string;
    category?: string;
    primaryStatId?: StatId;
  }) => {
    const currentPlayer = await db.player.toCollection().first();
    if (!currentPlayer || !currentPlayer.id)
      return { playerLeveledUp: false, statLeveledUp: false, skillLeveledUp: false };

    const { generalXp, attributes = {}, skillId, practiceSeconds = 0 } = params;

    // 1. Calculate canonical Player Progression
    const progression = calculatePlayerLevelUp(
      currentPlayer.level,
      currentPlayer.currentXp,
      currentPlayer.lifetimeXp,
      generalXp
    );

    const playerLeveledUp = progression.levelsGained > 0;
    const newPlayerLevel = progression.newLevel;
    const newHighestRewardedLevel = Math.max(
      currentPlayer.highestRewardedLevel || currentPlayer.level,
      newPlayerLevel
    );

    let statLeveledUp = false;
    let skillLeveledUp = false;
    let newSkillLevel = 1;

    // Atomic transaction across player, stats, and skills
    try {
      await db.transaction('rw', [db.player, db.stats, db.skills], async () => {
        // A. Update Player Profile
        await db.player.update(currentPlayer.id!, {
          level: newPlayerLevel,
          currentXp: progression.newCurrentXp,
          lifetimeXp: progression.newLifetimeXp,
          highestRewardedLevel: newHighestRewardedLevel,
          lastActiveDate: new Date().toISOString().split('T')[0],
        });

        // B. Update Attributes (Stat XP & Level)
        for (const [sId, amt] of Object.entries(attributes)) {
          if (!amt || amt <= 0) continue;
          const statId = sId as StatId;
          const currentStat = await db.stats.get(statId);
          if (currentStat) {
            let newStatXp = currentStat.currentXp + amt;
            let newStatLifetimeXp = currentStat.lifetimeXp + amt;
            let currentStatLvl = currentStat.level;
            let statReqXp = getStatXpNextLevel(currentStatLvl);

            while (newStatXp >= statReqXp) {
              newStatXp -= statReqXp;
              currentStatLvl += 1;
              statLeveledUp = true;
              statReqXp = getStatXpNextLevel(currentStatLvl);
            }

            await db.stats.update(statId, {
              level: currentStatLvl,
              currentXp: newStatXp,
              lifetimeXp: newStatLifetimeXp,
            });
          }
        }

        // C. Skill XP & Level (Independent Skill progression & Practice Hours)
        if (skillId) {
          const targetSkill = await db.skills.get(skillId);
          if (targetSkill) {
            let newSkillXp = targetSkill.currentXp + generalXp;
            let newSkillLifetimeXp = targetSkill.lifetimeXp + generalXp;
            newSkillLevel = targetSkill.level;
            let reqSkillXp = getSkillXpNextLevel(newSkillLevel);

            while (newSkillXp >= reqSkillXp) {
              newSkillXp -= reqSkillXp;
              newSkillLevel += 1;
              skillLeveledUp = true;
              reqSkillXp = getSkillXpNextLevel(newSkillLevel);
            }

            const newRank = getSkillRank(newSkillLevel);
            const newTotalPracticeSeconds = (targetSkill.totalPracticeSeconds || 0) + (practiceSeconds || 0);

            await db.skills.update(skillId, {
              level: newSkillLevel,
              currentXp: newSkillXp,
              lifetimeXp: newSkillLifetimeXp,
              totalPracticeSeconds: newTotalPracticeSeconds,
              rank: newRank,
              todayProgressCount: targetSkill.todayProgressCount + 1,
              weeklyProgressCount: targetSkill.weeklyProgressCount + 1,
            });
          }
        }

        // D. Recalculate Dynamic Life Class
        const updatedStats = stats.map((s) => {
          const extra = attributes[s.statId as StatId];
          return extra && extra > 0 ? { ...s, lifetimeXp: (s.lifetimeXp || 0) + extra } : s;
        });

        const updatedSkills = skillId
          ? skills.map((sk) => (sk.id === skillId ? { ...sk, lifetimeXp: (sk.lifetimeXp || 0) + generalXp } : sk))
          : skills;

        const newLifeClass = calculateDynamicLifeClass(updatedSkills, updatedStats);

        if (currentPlayer.lifeClass !== newLifeClass) {
          await db.player.update(currentPlayer.id!, { lifeClass: newLifeClass });
        }
      });

      // Post-transaction visual & audio triggers
      if (playerLeveledUp) {
        triggerLevelUpCelebration(newPlayerLevel);
      }
    } catch (err) {
      console.error('Failed to atomically execute XP grant transaction:', err);
    }

    return { playerLeveledUp, newPlayerLevel, statLeveledUp, skillLeveledUp, newSkillLevel };
  }, [stats, skills, triggerLevelUpCelebration]);

  // Helper: Revoke XP from player, stats, and skills when activities/quests are uncompleted
  const revokeXpFromPlayerAndStats = useCallback(async (params: {
    generalXp: number;
    attributes?: Partial<Record<StatId, number>>;
    skillId?: string;
    practiceSeconds?: number;
  }) => {
    const currentPlayer = await db.player.toCollection().first();
    if (!currentPlayer || !currentPlayer.id) return;

    const { generalXp, attributes = {}, skillId, practiceSeconds = 0 } = params;

    // 1. Calculate rollback progression
    const rollback = calculatePlayerLevelDown(
      currentPlayer.level,
      currentPlayer.currentXp,
      currentPlayer.lifetimeXp,
      generalXp
    );

    const newHighest = Math.min(currentPlayer.highestRewardedLevel || currentPlayer.level, rollback.newLevel);

    try {
      await db.transaction('rw', [db.player, db.stats, db.skills], async () => {
        await db.player.update(currentPlayer.id!, {
          level: rollback.newLevel,
          currentXp: rollback.newCurrentXp,
          lifetimeXp: rollback.newLifetimeXp,
          highestRewardedLevel: newHighest,
        });

        // 2. Revoke Attributes XP
        for (const [sId, amt] of Object.entries(attributes)) {
          if (!amt || amt <= 0) continue;
          const statId = sId as StatId;
          const currentStat = await db.stats.get(statId);
          if (currentStat) {
            let newStatXp = currentStat.currentXp - amt;
            let newStatLifetimeXp = Math.max(0, currentStat.lifetimeXp - amt);
            let currentStatLvl = currentStat.level;

            while (newStatXp < 0 && currentStatLvl > 1) {
              currentStatLvl -= 1;
              const prevReqXp = getStatXpNextLevel(currentStatLvl);
              newStatXp += prevReqXp;
            }
            if (newStatXp < 0) newStatXp = 0;

            await db.stats.update(statId, {
              level: currentStatLvl,
              currentXp: newStatXp,
              lifetimeXp: newStatLifetimeXp,
            });
          }
        }

        // 3. Revoke Skill XP
        if (skillId) {
          const targetSkill = await db.skills.get(skillId);
          if (targetSkill) {
            let newSkillXp = targetSkill.currentXp - generalXp;
            let newSkillLifetimeXp = Math.max(0, targetSkill.lifetimeXp - generalXp);
            let currentSkillLvl = targetSkill.level;

            while (newSkillXp < 0 && currentSkillLvl > 1) {
              currentSkillLvl -= 1;
              const prevReqXp = getSkillXpNextLevel(currentSkillLvl);
              newSkillXp += prevReqXp;
            }
            if (newSkillXp < 0) newSkillXp = 0;

            const newRank = getSkillRank(currentSkillLvl);
            const newTotalPractice = Math.max(0, (targetSkill.totalPracticeSeconds || 0) - (practiceSeconds || 0));
            await db.skills.update(skillId, {
              level: currentSkillLvl,
              currentXp: newSkillXp,
              lifetimeXp: newSkillLifetimeXp,
              totalPracticeSeconds: newTotalPractice,
              rank: newRank,
              todayProgressCount: Math.max(0, targetSkill.todayProgressCount - 1),
            });
          }
        }
      });
    } catch (err) {
      console.error('Failed to atomically execute XP revocation transaction:', err);
    }
  }, []);

  /**
   * Action: Complete a quest with streak bonuses, attribute distribution, and level up checks
   */
  const completeQuest = useCallback(async (questId: number) => {
    // If this quest currently has an active timer execution running, complete it through execution to ensure authoritative elapsed practice time
    const currentExec = getActiveQuestExecution();
    if (currentExec && currentExec.questId === questId && (currentExec.status === 'ACTIVE' || currentExec.status === 'EXTENSION' || currentExec.status === 'AWAITING_CONFIRMATION')) {
      if (currentExec.status === 'AWAITING_CONFIRMATION') {
        await confirmQuestExecution(currentExec.executionId);
      } else {
        await completeQuestExecutionEarly(currentExec.executionId);
      }
      return;
    }

    const quest = await db.quests.get(questId);
    if (!quest || quest.completedToday) return;

    const identityTag = quest.identityTag || getForgeIdentityTag(quest.primaryStatId, quest.pillarId);
    const newStreak = (quest.streak || 0) + 1;

    // Calculate streak bonus
    const streakBonus = calculateStreakBonus(newStreak, quest.xpReward);
    const totalXpEarned = quest.xpReward + streakBonus;

    // Resolve target skill, practice duration, and quest band
    const targetSkillId = quest.skillId || skills.find(
      (s) => (quest.goalTrackId && s.goalTrackId === quest.goalTrackId) || (quest.forgePathDomain && s.domain === quest.forgePathDomain)
    )?.id;
    const practiceSecs = quest.durationMinutes ? quest.durationMinutes * 60 : 600;
    const assignedQuestBand = quest.questBand || quest.band || 1;

    // Grant General & Attribute XP and Practice Hours
    const { playerLeveledUp, newPlayerLevel, statLeveledUp, skillLeveledUp, newSkillLevel } =
      await grantXpToPlayerAndStats({
        generalXp: totalXpEarned,
        attributes: { [quest.primaryStatId]: totalXpEarned, discipline: 10 },
        skillId: targetSkillId,
        practiceSeconds: practiceSecs,
        title: quest.title,
        category: quest.category,
        primaryStatId: quest.primaryStatId,
      });

    // Update quest status
    await db.quests.update(questId, {
      completedToday: true,
      lastCompletedAt: new Date().toISOString(),
      lastXpEarned: totalXpEarned,
      streak: newStreak,
      completionCount: (quest.completionCount || 0) + 1,
    });

    // Log to QuestLogs
    const statDef = STATS_CONFIG.find((s) => s.id === quest.primaryStatId);
    await db.questLogs.add({
      questId: quest.id!,
      questTitle: quest.title,
      pillarId: quest.pillarId,
      statId: quest.primaryStatId,
      skillId: targetSkillId,
      practiceSeconds: practiceSecs,
      questBand: assignedQuestBand,
      xpEarned: totalXpEarned,
      identityTag,
      completedAt: new Date().toISOString(),
    });

    // Epic & Legendary Quests create Chronicle entries
    if (quest.category === 'epic' || quest.category === 'legendary') {
      await db.chronicle.add({
        title: quest.title,
        subtitle: `Epic Quest Mastered (${identityTag})`,
        category: 'milestone',
        date: new Date().toISOString().split('T')[0],
        icon: 'Trophy',
        xpReward: totalXpEarned,
        details: quest.description || 'Achieved through Forge progression.',
      });
    }

    // Reconcile and replenish active quests up to MAX_ACTIVE_QUESTS
    await reconcileAndReplenishQuests();

    // Check if ALL daily quests are now completed today
    const allDailyQuests = await db.quests.where('frequency').equals('daily').toArray();
    const uncompletedDaily = allDailyQuests.filter((q) => !q.completedToday && q.id !== questId);

    if (allDailyQuests.length > 0 && uncompletedDaily.length === 0) {
      // Award Daily Completion Bonus
      const bonusXp = XP_CONFIG.DAILY_BONUS_ALL_QUESTS;
      await grantXpToPlayerAndStats({
        generalXp: bonusXp,
        attributes: { discipline: 30 },
        title: 'Daily Quests Mastered',
      });
      return;
    }
  }, [grantXpToPlayerAndStats]);

  /**
   * Action: Start a Dedicated Quest Execution (Mission Accepted Flow)
   */
  const startQuestExecution = useCallback(async (questId: number): Promise<QuestExecution> => {
    const quest = await db.quests.get(questId);
    if (!quest) throw new Error(`Quest with ID ${questId} not found`);

    // Guard: Quest execution must NOT accept quests for locked Bands
    const currentSkills = await db.skills.toArray();
    const highestBand = getHighestUnlockedBand(currentSkills);
    const questBand = quest.questBand || quest.band || 1;
    if (questBand > highestBand) {
      throw new Error(`Cannot start Band ${questBand} quest: Requires Forge Band ${questBand}`);
    }

    const execution = createQuestExecution(quest);
    saveActiveQuestExecution(execution);
    setActiveExecution(execution);
    playUISound('questStart');

    // Schedule local notification for exact countdown completion time
    scheduleQuestCompletionNotification(execution).catch((err) => {
      console.warn('[GameContext] Notification scheduling note:', err);
    });

    return execution;
  }, []);

  /**
   * Action: Confirm Quest Completion on Time Complete (100% full reward)
   */
  const confirmQuestExecution = useCallback(async (executionId: string) => {
    const current = getActiveQuestExecution();
    if (!current || current.executionId !== executionId || current.rewardGranted) return;

    // Strict validation: Must have reached planned duration before granting full completion reward
    const elapsedSeconds = Math.floor((Date.now() - current.startedAt) / 1000);
    const isDurationComplete =
      current.status === 'AWAITING_CONFIRMATION' ||
      (current.status === 'ACTIVE' && elapsedSeconds >= current.durationSeconds);

    if (!isDurationComplete) {
      console.warn('[GameContext] Quest confirmation rejected: Planned countdown duration has not yet elapsed.');
      return;
    }

    const quest = await db.quests.get(current.questId);
    if (!quest) return;

    // Clear any pending quest completion notification
    cancelQuestCompletionNotification(current.questId).catch(() => {});

    const identityTag = quest.identityTag || getForgeIdentityTag(quest.primaryStatId, quest.pillarId);
    const newStreak = (quest.streak || 0) + 1;
    const streakBonus = calculateStreakBonus(newStreak, current.basePlayerXP);
    const totalXpEarned = current.basePlayerXP + streakBonus;

    // Resolve target skill and authoritative elapsed practice duration
    const targetSkillId = quest.skillId || skills.find(
      (s) => (quest.goalTrackId && s.goalTrackId === quest.goalTrackId) || (quest.forgePathDomain && s.domain === quest.forgePathDomain)
    )?.id;
    const actualPracticeSeconds = Math.max(0, Math.floor((Date.now() - current.startedAt) / 1000));
    const assignedQuestBand = quest.questBand || quest.band || 1;

    // Grant General & Attribute XP and Practice Hours
    await grantXpToPlayerAndStats({
      generalXp: totalXpEarned,
      attributes: { [quest.primaryStatId]: totalXpEarned, discipline: 10 },
      skillId: targetSkillId,
      practiceSeconds: actualPracticeSeconds,
      title: quest.title,
      category: quest.category,
      primaryStatId: quest.primaryStatId,
    });

    // Update quest status in Dexie
    await db.quests.update(current.questId, {
      completedToday: true,
      lastCompletedAt: new Date().toISOString(),
      lastXpEarned: totalXpEarned,
      streak: newStreak,
      completionCount: (quest.completionCount || 0) + 1,
    });

    // Log to QuestLogs with practice duration and band
    await db.questLogs.add({
      questId: quest.id!,
      questTitle: quest.title,
      pillarId: quest.pillarId,
      statId: quest.primaryStatId,
      skillId: targetSkillId,
      practiceSeconds: actualPracticeSeconds,
      questBand: assignedQuestBand,
      xpEarned: totalXpEarned,
      identityTag,
      completedAt: new Date().toISOString(),
    });

    // Epic & Legendary Quests create Chronicle entries
    if (quest.category === 'epic' || quest.category === 'legendary') {
      await db.chronicle.add({
        title: quest.title,
        subtitle: `Epic Quest Mastered (${identityTag})`,
        category: 'milestone',
        date: new Date().toISOString().split('T')[0],
        icon: 'Trophy',
        xpReward: totalXpEarned,
        details: quest.description || 'Achieved through Forge progression.',
      });
    }

    const completedExec: QuestExecution = {
      ...current,
      status: 'COMPLETED',
      rewardGranted: true,
      completedAt: Date.now(),
      finalPlayerXP: totalXpEarned,
      finalSkillXP: current.baseSkillXP,
      rewardMultiplier: 1.0,
      practiceSeconds: actualPracticeSeconds,
      actualPracticeSeconds: actualPracticeSeconds,
      questBand: assignedQuestBand,
    };

    addQuestExecutionHistory(completedExec);
    saveActiveQuestExecution(completedExec);
    setActiveExecution(completedExec);
    playUISound('questComplete');

    await reconcileAndReplenishQuests();
    evaluateInactivityReminder().catch(() => {});
  }, [grantXpToPlayerAndStats]);

  /**
   * Action: Complete Active Quest Execution Early
   * Allows player to mark an active quest completed before the timer finishes,
   * cleanly granting rewards and transitioning state.
   */
  const completeQuestExecutionEarly = useCallback(async (executionId: string) => {
    const current = getActiveQuestExecution();
    if (!current || current.executionId !== executionId || current.rewardGranted) return;

    const quest = await db.quests.get(current.questId);
    if (!quest) return;

    // Clear any pending notification
    cancelQuestCompletionNotification(current.questId).catch(() => {});

    const identityTag = quest.identityTag || getForgeIdentityTag(quest.primaryStatId, quest.pillarId);
    const newStreak = (quest.streak || 0) + 1;
    const streakBonus = calculateStreakBonus(newStreak, current.basePlayerXP);
    const totalXpEarned = current.basePlayerXP + streakBonus;

    // Resolve target skill and actual practice duration
    const targetSkillId = quest.skillId || skills.find(
      (s) => (quest.goalTrackId && s.goalTrackId === quest.goalTrackId) || (quest.forgePathDomain && s.domain === quest.forgePathDomain)
    )?.id;
    const actualPracticeSeconds = Math.max(0, Math.floor((Date.now() - current.startedAt) / 1000));
    const assignedQuestBand = quest.questBand || quest.band || 1;

    // Grant General & Attribute XP and Practice Hours
    await grantXpToPlayerAndStats({
      generalXp: totalXpEarned,
      attributes: { [quest.primaryStatId]: totalXpEarned, discipline: 10 },
      skillId: targetSkillId,
      practiceSeconds: actualPracticeSeconds,
      title: quest.title,
      category: quest.category,
      primaryStatId: quest.primaryStatId,
    });

    // Update quest status in Dexie
    await db.quests.update(current.questId, {
      completedToday: true,
      lastCompletedAt: new Date().toISOString(),
      lastXpEarned: totalXpEarned,
      streak: newStreak,
      completionCount: (quest.completionCount || 0) + 1,
    });

    // Log to QuestLogs with practice duration and band
    await db.questLogs.add({
      questId: quest.id!,
      questTitle: quest.title,
      pillarId: quest.pillarId,
      statId: quest.primaryStatId,
      skillId: targetSkillId,
      practiceSeconds: actualPracticeSeconds,
      questBand: assignedQuestBand,
      xpEarned: totalXpEarned,
      identityTag,
      completedAt: new Date().toISOString(),
    });

    if (quest.category === 'epic' || quest.category === 'legendary') {
      await db.chronicle.add({
        title: quest.title,
        subtitle: `Epic Quest Mastered (${identityTag})`,
        category: 'milestone',
        date: new Date().toISOString().split('T')[0],
        icon: 'Trophy',
        xpReward: totalXpEarned,
        details: quest.description || 'Achieved through Forge progression.',
      });
    }

    const completedExec: QuestExecution = {
      ...current,
      status: 'COMPLETED',
      rewardGranted: true,
      completedAt: Date.now(),
      finalPlayerXP: totalXpEarned,
      finalSkillXP: current.baseSkillXP,
      rewardMultiplier: 1.0,
      practiceSeconds: actualPracticeSeconds,
      actualPracticeSeconds: actualPracticeSeconds,
      questBand: assignedQuestBand,
    };

    addQuestExecutionHistory(completedExec);
    saveActiveQuestExecution(completedExec);
    setActiveExecution(completedExec);
    playUISound('questComplete');

    await reconcileAndReplenishQuests();
    evaluateInactivityReminder().catch(() => {});
  }, [grantXpToPlayerAndStats, skills]);

  /**
   * Action: Transition Active Quest Execution into Extension Mode
   */
  const extendQuestExecution = useCallback(async (executionId: string) => {
    const current = getActiveQuestExecution();
    if (!current || current.executionId !== executionId) return;

    cancelQuestCompletionNotification(current.questId).catch(() => {});

    const extendedExec: QuestExecution = {
      ...current,
      status: 'EXTENSION',
      extensionStartedAt: Date.now(),
    };

    saveActiveQuestExecution(extendedExec);
    setActiveExecution(extendedExec);
    playUISound('questExtend');
  }, []);

  /**
   * Action: Finish Quest Execution from Extension Mode with calculated decayed reward
   */
  const finishQuestExecution = useCallback(async (executionId: string) => {
    const current = getActiveQuestExecution();
    if (!current || current.executionId !== executionId || current.rewardGranted) return;

    const quest = await db.quests.get(current.questId);
    if (!quest) return;

    cancelQuestCompletionNotification(current.questId).catch(() => {});

    const extStart = current.extensionStartedAt || (current.startedAt + current.durationSeconds * 1000);
    const extElapsed = Math.max(0, Math.floor((Date.now() - extStart) / 1000));
    const reward = calculateQuestReward(current.basePlayerXP, current.baseSkillXP, extElapsed);

    const identityTag = quest.identityTag || getForgeIdentityTag(quest.primaryStatId, quest.pillarId);
    const newStreak = (quest.streak || 0) + 1;
    const streakBonus = calculateStreakBonus(newStreak, reward.playerXP);
    const totalXpEarned = reward.playerXP + streakBonus;

    // Resolve target skill and authoritative elapsed practice duration
    const targetSkillId = quest.skillId || skills.find(
      (s) => (quest.goalTrackId && s.goalTrackId === quest.goalTrackId) || (quest.forgePathDomain && s.domain === quest.forgePathDomain)
    )?.id;
    const actualPracticeSeconds = Math.max(0, Math.floor((Date.now() - current.startedAt) / 1000));
    const assignedQuestBand = quest.questBand || quest.band || 1;

    // Grant General & Attribute XP and Practice Hours
    await grantXpToPlayerAndStats({
      generalXp: totalXpEarned,
      attributes: { [quest.primaryStatId]: totalXpEarned, discipline: 10 },
      skillId: targetSkillId,
      practiceSeconds: actualPracticeSeconds,
      title: quest.title,
      category: quest.category,
      primaryStatId: quest.primaryStatId,
    });

    // Update quest status
    await db.quests.update(current.questId, {
      completedToday: true,
      lastCompletedAt: new Date().toISOString(),
      lastXpEarned: totalXpEarned,
      streak: newStreak,
      completionCount: (quest.completionCount || 0) + 1,
    });

    // Log to QuestLogs with practice duration and band
    await db.questLogs.add({
      questId: quest.id!,
      questTitle: quest.title,
      pillarId: quest.pillarId,
      statId: quest.primaryStatId,
      skillId: targetSkillId,
      practiceSeconds: actualPracticeSeconds,
      questBand: assignedQuestBand,
      xpEarned: totalXpEarned,
      identityTag,
      completedAt: new Date().toISOString(),
    });

    if (quest.category === 'epic' || quest.category === 'legendary') {
      await db.chronicle.add({
        title: quest.title,
        subtitle: `Epic Quest Mastered (${identityTag})`,
        category: 'milestone',
        date: new Date().toISOString().split('T')[0],
        icon: 'Trophy',
        xpReward: totalXpEarned,
        details: quest.description || 'Achieved through Forge progression.',
      });
    }

    const completedExec: QuestExecution = {
      ...current,
      status: 'COMPLETED',
      rewardGranted: true,
      completedAt: Date.now(),
      extensionSeconds: extElapsed,
      finalPlayerXP: totalXpEarned,
      finalSkillXP: reward.skillXP,
      rewardMultiplier: reward.multiplier,
      practiceSeconds: actualPracticeSeconds,
      actualPracticeSeconds: actualPracticeSeconds,
      questBand: assignedQuestBand,
    };

    addQuestExecutionHistory(completedExec);
    saveActiveQuestExecution(completedExec);
    setActiveExecution(completedExec);
    playUISound('questComplete');

    await reconcileAndReplenishQuests();
    evaluateInactivityReminder().catch(() => {});
  }, [grantXpToPlayerAndStats]);

  /**
   * Action: Cancel/Abandon Active Quest Execution (0 reward granted)
   */
  const cancelQuestExecution = useCallback(async (executionId: string) => {
    const current = getActiveQuestExecution();
    if (current && current.executionId === executionId) {
      cancelQuestCompletionNotification(current.questId).catch(() => {});
      const cancelledExec: QuestExecution = {
        ...current,
        status: 'CANCELLED',
        completedAt: Date.now(),
        finalPlayerXP: 0,
        finalSkillXP: 0,
        rewardGranted: false,
      };
      addQuestExecutionHistory(cancelledExec);
    }
    clearActiveQuestExecution();
    setActiveExecution(null);
    playUISound('questAbandon');
  }, []);

  /**
   * Dismiss completed execution celebration modal/state
   */
  const dismissCompletedExecution = useCallback(() => {
    cancelQuestCompletionNotification().catch(() => {});
    clearActiveQuestExecution();
    setActiveExecution(null);
  }, []);

  /**
   * Action: Uncomplete a quest — safely deducting XP and updating state atomically (No Duplication Bug)
   */
  const uncompleteQuest = useCallback(async (questId: number) => {
    await db.transaction(
      'rw',
      [db.player, db.stats, db.skills, db.quests, db.questLogs],
      async () => {
        const quest = await db.quests.get(questId);
        if (!quest || !quest.completedToday) return; // Prevent double XP reversal

        // Find the latest quest log for this quest
        const recentLog = await db.questLogs
          .where('questId')
          .equals(questId)
          .reverse()
          .first();

        // Exact XP to revoke: stored lastXpEarned or from matching completion log
        const xpToDeduct =
          quest.lastXpEarned && quest.lastXpEarned > 0
            ? quest.lastXpEarned
            : recentLog && recentLog.xpEarned > 0
            ? recentLog.xpEarned
            : 0; // Safely abort XP reversal if exact awarded amount is unknown

        const targetSkillId = quest.skillId || recentLog?.skillId || skills.find(
          (s) => (quest.goalTrackId && s.goalTrackId === quest.goalTrackId) || (quest.forgePathDomain && s.domain === quest.forgePathDomain)
        )?.id;
        const practiceSecsToDeduct = recentLog?.practiceSeconds || (quest.durationMinutes ? quest.durationMinutes * 60 : 600);

        if (xpToDeduct > 0) {
          // Revoke exact XP and practice hours from Player, Stats & Skills
          await revokeXpFromPlayerAndStats({
            generalXp: xpToDeduct,
            attributes: { [quest.primaryStatId]: xpToDeduct, discipline: 10 },
            skillId: targetSkillId,
            practiceSeconds: practiceSecsToDeduct,
          });
        }

        // Do NOT delete historical questLog entry to preserve historical completion records.

        // Update quest status directly by ID
        await db.quests.update(questId, {
          completedToday: false,
          lastXpEarned: 0,
          streak: Math.max(0, (quest.streak || 1) - 1),
          skipCount: (quest.skipCount || 0) + 1,
        });
      }
    );

    // Reconcile active quests to <= MAX_ACTIVE_QUESTS immediately with pinnedQuestId
    await reconcileAndReplenishQuests(questId);
  }, [revokeXpFromPlayerAndStats]);

  /**
   * Universal action to award activity XP (for Workouts, Habits, Routines, Journal, Achievements)
   */
  const awardActivityXp = useCallback(async (params: {
    activityType: string;
    generalXp: number;
    attributes?: Partial<Record<StatId, number>>;
    title: string;
    subtitle?: string;
    category?: string;
  }) => {
    const { activityType, generalXp, attributes, title, subtitle, category } = params;

    await grantXpToPlayerAndStats({
      generalXp,
      attributes,
      title,
      category,
    });
  }, [grantXpToPlayerAndStats]);

  /**
   * Universal action to revoke activity XP when unchecked or deleted
   */
  const revokeActivityXp = useCallback(async (params: {
    generalXp: number;
    attributes?: Partial<Record<StatId, number>>;
  }) => {
    await revokeXpFromPlayerAndStats(params);
  }, [revokeXpFromPlayerAndStats]);

  /**
   * Add a custom quest
   */
  const addQuest = useCallback(async (questData: Omit<Quest, 'id' | 'completedToday' | 'streak' | 'createdAt'>) => {
    const identityTag = questData.identityTag || getForgeIdentityTag(questData.primaryStatId, questData.pillarId);
    await db.quests.add({
      ...questData,
      identityTag,
      completedToday: false,
      streak: 0,
      createdAt: new Date().toISOString(),
    });
    await reconcileAndReplenishQuests();
  }, []);

  /**
   * Delete a quest
   */
  const deleteQuest = useCallback(async (questId: number) => {
    await db.quests.delete(questId);
    await reconcileAndReplenishQuests();
  }, []);

  /**
   * Update Player profile information
   */
  const updatePlayer = useCallback(async (updates: Partial<PlayerProfile>) => {
    const p = await db.player.toCollection().first();
    if (!p?.id) return;
    await db.player.update(p.id, updates);
  }, []);

  /**
   * Change user active Life Builds (Primary + Secondary)
   */
  const updateActiveBuilds = useCallback(async (primaryBuildId: BuildId, secondaryBuildIds: BuildId[]) => {
    let buildsObj = await db.activeBuilds.toCollection().first();
    const updatedData = {
      primaryBuildId,
      secondaryBuildIds,
      updatedAt: new Date().toISOString(),
    };

    if (buildsObj?.id) {
      await db.activeBuilds.update(buildsObj.id, updatedData);
    } else {
      await db.activeBuilds.add(updatedData);
      buildsObj = await db.activeBuilds.toCollection().first();
    }

    // Maintain deterministic active quests
    await reconcileDeterministicQuests();
  }, []);

  /**
   * Toggle completion of a skill tree milestone node
   * Enforces Skill Level / XP qualification + Prerequisite check (no SP required)
   */
  const toggleSkillMilestone = useCallback(async (skillId: string, milestoneId: string) => {
    try {
      await db.transaction('rw', [db.skills], async () => {
        const skill = await db.skills.get(skillId);
        if (!skill) return;

        const targetMilestone = skill.milestones.find((m) => m.id === milestoneId);
        if (!targetMilestone) return;

        const reqLevel = targetMilestone.requiredSkillLevel || Math.max(1, targetMilestone.tier);

        // If attempting to complete/master a node:
        if (!targetMilestone.completed) {
          // 1. Enforce Skill Level/XP requirement: cannot bypass insufficient Skill XP
          if (skill.level < reqLevel) {
            return;
          }

          // 2. Enforce Prerequisite requirement
          if (targetMilestone.prerequisiteId) {
            const prereq = skill.milestones.find((m) => m.id === targetMilestone.prerequisiteId);
            if (!prereq || !prereq.completed) {
              return;
            }
          }
        }

        const updatedMilestones = skill.milestones.map((m) => {
          if (m.id === milestoneId) {
            return { ...m, completed: !m.completed };
          }
          return m;
        });

        // Update unlock state of dependent prerequisites
        const finalMilestones = updatedMilestones.map((m) => {
          if (!m.prerequisiteId) return m;
          const prereq = updatedMilestones.find((p) => p.id === m.prerequisiteId);
          return { ...m, unlocked: prereq ? prereq.completed : false };
        });

        const nextUncompleted = finalMilestones.find((m) => !m.completed && m.unlocked);

        await db.skills.update(skillId, {
          milestones: finalMilestones,
          nextMilestoneTitle: nextUncompleted ? nextUncompleted.title : 'All Milestones Mastered!',
        });
      });
    } catch (err) {
      console.error('Failed to execute milestone toggle transaction:', err);
    }
  }, []);

  /**
   * Unlock a skill without requiring Skill Points
   */
  const unlockSkill = useCallback(async (skillId: string) => {
    try {
      await db.skills.update(skillId, { unlocked: true });
    } catch (err) {
      console.error('Failed to execute skill unlock:', err);
    }
  }, []);

  /**
   * Force regenerate daily quests adaptively
   */
  const regenerateQuests = useCallback(async (options?: RegenerateQuestsOptions | number) => {
    const isNumberSeed = typeof options === 'number';
    const onProgress = !isNumberSeed ? options?.onProgress : undefined;

    onProgress?.({ percent: 20, stage: 'Reconciling deterministic quests' });
    await reconcileDeterministicQuests();
    onProgress?.({ percent: 100, stage: 'Complete' });
  }, []);

  /**
   * Update active Forge Path and regenerate daily quests
   */
  const updateForgePath = useCallback(async (newPath: ForgePath | ForgePathProposal | ForgePathUpdate) => {
    clearAIQuestConceptsCache();
    await updateForgePathService(newPath);
    await regenerateQuests({ forceRefresh: true });
  }, [regenerateQuests]);

  /**
   * Apply daily quest intent and regenerate today's quests
   */
  const applyDailyIntent = useCallback(async (intent: DailyQuestIntent) => {
    clearAIQuestConceptsCache();
    await setDailyIntent(intent);
    await regenerateQuests();
  }, [regenerateQuests]);

  /**
   * Clear today's quest intent and regenerate quests based purely on Forge Path
   */
  const clearTodayIntent = useCallback(async () => {
    clearAIQuestConceptsCache();
    const today = new Date().toISOString().split('T')[0];
    await clearDailyIntent(today);
    await regenerateQuests();
  }, [regenerateQuests]);

  /**
   * Export JSON Backup
   */
  const exportBackup = useCallback(async () => {
    const { jsonString, filename } = await createForgeBackup();
    await saveBackupFile(jsonString, filename);
  }, []);

  /**
   * Import JSON Backup
   */
  const importBackup = useCallback(async (jsonString: string): Promise<boolean> => {
    try {
      const validation = parseAndValidateBackup(jsonString);
      if (!validation.isValid) {
        console.error('Backup validation failed:', validation.error);
        return false;
      }
      return await executeAtomicRestore(validation.data);
    } catch (err) {
      console.error('Failed to parse backup JSON:', err);
      return false;
    }
  }, []);

  /**
   * Reset all data
   */
  const resetApp = useCallback(async () => {
    await resetAllData();
    setActiveNotification(null);
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  }, []);

  const playerContextValue = useMemo(
    () => ({
      player,
      isLoading,
      activeNotification,
      dismissNotification,
      setActiveNotification,
      activeLevelUpReward,
      triggerLevelUpCelebration,
      dismissLevelUpCelebration,
      updatePlayer,
      exportBackup,
      importBackup,
      resetApp,
    }),
    [
      player,
      isLoading,
      activeNotification,
      dismissNotification,
      setActiveNotification,
      activeLevelUpReward,
      triggerLevelUpCelebration,
      dismissLevelUpCelebration,
      updatePlayer,
      exportBackup,
      importBackup,
      resetApp,
    ]
  );

  const questsContextValue = useMemo(
    () => ({
      quests,
      questLogs,
      activeExecution,
      forgePath,
      dailyIntent,
      startQuestExecution,
      confirmQuestExecution,
      completeQuestExecutionEarly,
      extendQuestExecution,
      finishQuestExecution,
      cancelQuestExecution,
      dismissCompletedExecution,
      completeQuest,
      uncompleteQuest,
      addQuest,
      deleteQuest,
      regenerateQuests,
      updateForgePath,
      applyDailyIntent,
      clearTodayIntent,
    }),
    [
      quests,
      questLogs,
      activeExecution,
      forgePath,
      dailyIntent,
      startQuestExecution,
      confirmQuestExecution,
      completeQuestExecutionEarly,
      extendQuestExecution,
      finishQuestExecution,
      cancelQuestExecution,
      dismissCompletedExecution,
      completeQuest,
      uncompleteQuest,
      addQuest,
      deleteQuest,
      regenerateQuests,
      updateForgePath,
      applyDailyIntent,
      clearTodayIntent,
    ]
  );

  const progressionContextValue = useMemo(
    () => ({
      stats,
      skills,
      activeBuilds,
      healthLog,
      grantXpToPlayerAndStats,
      awardActivityXp,
      revokeActivityXp,
      updateActiveBuilds,
      toggleSkillMilestone,
      unlockSkill,
    }),
    [
      stats,
      skills,
      activeBuilds,
      healthLog,
      grantXpToPlayerAndStats,
      awardActivityXp,
      revokeActivityXp,
      updateActiveBuilds,
      toggleSkillMilestone,
      unlockSkill,
    ]
  );

  return (
    <GamePlayerContext.Provider value={playerContextValue}>
      <GameQuestsContext.Provider value={questsContextValue}>
        <GameProgressionContext.Provider value={progressionContextValue}>
          {children}
        </GameProgressionContext.Provider>
      </GameQuestsContext.Provider>
    </GamePlayerContext.Provider>
  );
};

export const useGamePlayer = () => {
  const ctx = useContext(GamePlayerContext);
  if (!ctx) throw new Error('useGamePlayer must be used within GameProvider');
  return ctx;
};

export const useGameQuests = () => {
  const ctx = useContext(GameQuestsContext);
  if (!ctx) throw new Error('useGameQuests must be used within GameProvider');
  return ctx;
};

export const useGameProgression = () => {
  const ctx = useContext(GameProgressionContext);
  if (!ctx) throw new Error('useGameProgression must be used within GameProvider');
  return ctx;
};

// Backward compatible hook combining sub-contexts
export const useGame = (): GameContextType => {
  const playerCtx = useGamePlayer();
  const questsCtx = useGameQuests();
  const progressionCtx = useGameProgression();

  return useMemo(
    () => ({
      ...playerCtx,
      ...questsCtx,
      ...progressionCtx,
    }),
    [playerCtx, questsCtx, progressionCtx]
  );
};

