/**
 * FORGE — Quest Execution Engine & State Machine
 * 
 * Provides robust timestamp-based quest execution, live progression tracking,
 * extension timer handling with reward decay, state persistence across reloads/backgrounding,
 * and strict reward idempotency.
 */

import { Quest, QuestExecution, QuestExecutionStatus, PillarId, StatId, QuestCategory, QuestRarity } from '../types';

const ACTIVE_EXECUTION_STORAGE_KEY = 'forge_active_quest_execution';
const EXECUTION_HISTORY_STORAGE_KEY = 'forge_quest_execution_history';

/**
 * Provider interface abstraction for future extension compatibility.
 * Default is pure offline local engine. DO NOT attach external AI models.
 */
export interface QuestProvider {
  id: string;
  name: string;
  isReady: boolean;
}

export class LocalQuestProvider implements QuestProvider {
  id = 'local_forge_engine';
  name = 'Forge Native Quest Engine';
  isReady = true;
}

export const defaultQuestProvider = new LocalQuestProvider();

/**
 * Parses user-friendly duration strings into authoritative seconds.
 * Supports: "30 mins", "15-20 mins", "10 min", "45m", "1 hour", "25:00", etc.
 */
export function parseQuestDurationSeconds(quest?: Partial<Quest> | null): number {
  if (!quest) return 900; // 15 mins default

  const text = (quest.estimatedDuration || '').toLowerCase().trim();

  if (text) {
    // Check for HH:MM:SS or MM:SS format
    const timeMatch = text.match(/^(\d+):(\d+)(?::(\d+))?$/);
    if (timeMatch) {
      if (timeMatch[3]) {
        // HH:MM:SS
        return parseInt(timeMatch[1], 10) * 3600 + parseInt(timeMatch[2], 10) * 60 + parseInt(timeMatch[3], 10);
      }
      // MM:SS
      return parseInt(timeMatch[1], 10) * 60 + parseInt(timeMatch[2], 10);
    }

    // Check for hour declarations (e.g. "1 hour", "1.5 hours", "1 hr")
    const hourMatch = text.match(/([\d.]+)\s*(?:hour|hr|hrs|hours)/);
    if (hourMatch) {
      const hours = parseFloat(hourMatch[1]);
      if (!isNaN(hours) && hours > 0) {
        return Math.round(hours * 3600);
      }
    }

    // Check for range like "15-20 mins" -> take upper bound or average
    const rangeMatch = text.match(/(\d+)\s*-\s*(\d+)\s*(?:min|mins|minutes|m)?/);
    if (rangeMatch) {
      const lower = parseInt(rangeMatch[1], 10);
      const upper = parseInt(rangeMatch[2], 10);
      if (!isNaN(upper) && upper > 0) {
        return upper * 60;
      }
      if (!isNaN(lower) && lower > 0) {
        return lower * 60;
      }
    }

    // Check for single minute declaration (e.g. "25 mins", "25min", "25 m")
    const minMatch = text.match(/(\d+)\s*(?:min|mins|minute|minutes|m\b)?/);
    if (minMatch) {
      const minutes = parseInt(minMatch[1], 10);
      if (!isNaN(minutes) && minutes > 0) {
        return minutes * 60;
      }
    }
  }

  // Fallback heuristics based on quest tier / category / reward
  if (quest.category === 'legendary') return 1800; // 30 mins
  if (quest.category === 'epic') return 1500; // 25 mins
  if (quest.category === 'weekly') return 1800; // 30 mins
  if (quest.category === 'challenge') return 1200; // 20 mins
  if (quest.xpReward && quest.xpReward >= 60) return 1800;
  if (quest.xpReward && quest.xpReward >= 40) return 1200;

  return 900; // 15 mins standard
}

/**
 * Calculates decayed reward when mission duration is extended.
 * Formula:
 * - 0 min extension -> 100% reward
 * - Each 1 minute of extension -> decreases by 5%
 * - Floor: 50% minimum reward (never drops below 50%)
 */
export function calculateQuestReward(
  basePlayerXP: number,
  baseSkillXP: number,
  extensionSeconds: number = 0
): {
  playerXP: number;
  skillXP: number;
  multiplier: number;
  extensionMinutes: number;
  decayPercent: number;
} {
  const extensionMinutes = Math.max(0, extensionSeconds) / 60;
  // 5% reduction per full minute elapsed in extension
  const rawMultiplier = 1.0 - extensionMinutes * 0.05;
  const multiplier = Math.max(0.50, Math.min(1.0, Math.round(rawMultiplier * 1000) / 1000));
  const decayPercent = Math.round((1.0 - multiplier) * 100);

  const playerXP = Math.max(1, Math.round(basePlayerXP * multiplier));
  const skillXP = Math.max(0, Math.round(baseSkillXP * multiplier));

  return {
    playerXP,
    skillXP,
    multiplier,
    extensionMinutes: Math.round(extensionMinutes * 10) / 10,
    decayPercent,
  };
}

/**
 * Formats seconds into human-readable MM:SS or HH:MM:SS
 */
export function formatTimeDisplay(totalSeconds: number): string {
  const isNegative = totalSeconds < 0;
  const absSecs = Math.abs(Math.floor(totalSeconds));
  const hours = Math.floor(absSecs / 3600);
  const minutes = Math.floor((absSecs % 3600) / 60);
  const seconds = absSecs % 60;

  const prefix = isNegative ? '-' : '';

  if (hours > 0) {
    return `${prefix}${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${prefix}${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Factory to create a fresh QuestExecution state from a Quest definition
 */
export function createQuestExecution(quest: Quest): QuestExecution {
  const durationSeconds = parseQuestDurationSeconds(quest);
  const basePlayerXP = quest.xpReward || 30;
  const baseSkillXP = quest.skillId ? Math.round(basePlayerXP * 0.75) : 0;
  const now = Date.now();

  return {
    executionId: `exec_${quest.id || 'custom'}_${now}_${Math.random().toString(36).substring(2, 7)}`,
    questId: quest.id || 0,
    questTitle: quest.title,
    questDescription: quest.description,
    questReason: quest.reason,
    pillarId: quest.pillarId,
    primaryStatId: quest.primaryStatId,
    skillId: quest.skillId,
    category: quest.category,
    rarity: quest.rarity,
    identityTag: quest.identityTag,
    difficultyBand: quest.difficultyBand,
    difficultyScore: quest.difficultyScore,
    difficultyLevel: quest.difficultyLevel,
    questBand: quest.questBand || quest.band,
    band: quest.questBand || quest.band,
    status: 'ACTIVE',
    startedAt: now,
    durationSeconds,
    basePlayerXP,
    baseSkillXP,
    rewardGranted: false,
  };
}

/**
 * Retrieves the persisted active quest execution from localStorage
 * and updates state if the countdown has elapsed into AWAITING_CONFIRMATION.
 */
export function getActiveQuestExecution(): QuestExecution | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = localStorage.getItem(ACTIVE_EXECUTION_STORAGE_KEY);
    if (!raw) return null;

    const execution: QuestExecution = JSON.parse(raw);
    if (!execution || !execution.startedAt || !execution.status) {
      return null;
    }

    // Terminal statuses should not be considered active executions
    if (execution.status === 'COMPLETED' || execution.status === 'CANCELLED') {
      return null;
    }

    const now = Date.now();
    const elapsedSeconds = Math.floor((now - execution.startedAt) / 1000);

    // Dynamic state transition: if ACTIVE and duration reached, transition to AWAITING_CONFIRMATION
    if (execution.status === 'ACTIVE' && elapsedSeconds >= execution.durationSeconds) {
      execution.status = 'AWAITING_CONFIRMATION';
      saveActiveQuestExecution(execution);
    }

    return execution;
  } catch (err) {
    console.error('[QuestExecution] Failed to load active execution:', err);
    return null;
  }
}

/**
 * Persists the active quest execution to localStorage
 */
export function saveActiveQuestExecution(execution: QuestExecution | null): void {
  if (typeof window === 'undefined') return;

  try {
    if (!execution) {
      localStorage.removeItem(ACTIVE_EXECUTION_STORAGE_KEY);
    } else {
      localStorage.setItem(ACTIVE_EXECUTION_STORAGE_KEY, JSON.stringify(execution));
    }
    // Dispatch custom event so all active listeners on page update instantly
    window.dispatchEvent(new CustomEvent('forge_quest_execution_updated', { detail: execution }));
  } catch (err) {
    console.error('[QuestExecution] Failed to save active execution:', err);
  }
}

/**
 * Clears the active quest execution
 */
export function clearActiveQuestExecution(): void {
  saveActiveQuestExecution(null);
}

/**
 * Retrieves past execution history
 */
export function getQuestExecutionHistory(): QuestExecution[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(EXECUTION_HISTORY_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Saves a completed or cancelled execution to history
 */
export function addQuestExecutionHistory(record: QuestExecution): void {
  if (typeof window === 'undefined') return;
  try {
    const history = getQuestExecutionHistory();
    // Keep last 50 execution records
    const updated = [record, ...history.filter((h) => h.executionId !== record.executionId)].slice(0, 50);
    localStorage.setItem(EXECUTION_HISTORY_STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('[QuestExecution] Failed to save execution history:', err);
  }
}

/**
 * Creates a completed execution record for an early completion
 */
export function completeQuestEarly(execution: QuestExecution): QuestExecution {
  return {
    ...execution,
    status: 'COMPLETED',
    rewardGranted: true,
    completedAt: Date.now(),
    finalPlayerXP: execution.basePlayerXP,
    finalSkillXP: execution.baseSkillXP,
    rewardMultiplier: 1.0,
  };
}
