/**
 * KEEP WALKING - XP & Level Calculation Engine
 */

import { StatId, PillarId, SkillRank } from '../types';

// Centralized XP Base Rewards Configuration
export const XP_CONFIG = {
  // Activity Base General XP
  WORKOUT: 100,
  JOURNAL: 30,
  READING: 30,
  STUDY: 60,
  WALK: 40,
  MEDITATION: 20,
  PRAYER: 20,
  HABIT_DEFAULT: 25,
  ROUTINE_ITEM: 15,
  QUEST_DAILY: 35,
  QUEST_WEEKLY: 75,
  QUEST_EPIC: 150,
  QUEST_LEGENDARY: 300,

  // Bonus Rewards
  DAILY_BONUS_ALL_QUESTS: 100,
  QUEST_LINE_BONUS: 150,
  ROUTINE_COMPLETION_BONUS: 50,

  // Streak Multipliers (5% per consecutive day up to 50%)
  STREAK_BONUS_PER_DAY: 0.05,
  MAX_STREAK_BONUS_MULTIPLIER: 0.50,
};

// Activity Attribute XP Mappings (Distribution per Activity)
export const ACTIVITY_ATTRIBUTE_MAP: Record<string, Partial<Record<StatId, number>>> = {
  workout: { strength: 50, endurance: 20, discipline: 10, health: 10 },
  running: { endurance: 50, health: 20, discipline: 10 },
  walking: { endurance: 25, health: 15 },
  journal: { emotional_resilience: 20, knowledge: 10 },
  reading: { knowledge: 20, focus: 10 },
  study: { knowledge: 30, focus: 20, discipline: 10 },
  drawing: { creativity: 30, focus: 15 },
  meditation: { focus: 15, emotional_resilience: 15 },
  prayer: { faith: 20, emotional_resilience: 10 },
  public_speaking: { communication: 30, leadership: 20 },
  leadership: { leadership: 30, communication: 20 },
  finance: { financial_literacy: 30, discipline: 10 },
};

export const MAX_PLAYER_LEVEL = 100;

// Reusable Progression Curve Configuration
export const PROGRESSION_CONFIG = {
  // Canonical Player Character XP Curve: ROUND(120 * (1 + 0.075 * (level - 1))^2.15)
  PLAYER_CURVE: {
    BASE_XP: 120,
    SCALING_FACTOR: 0.075,
    EXPONENT: 2.15,
    MAX_LEVEL: MAX_PLAYER_LEVEL,
  },
  // Skill XP Curve
  SKILL_CURVE: {
    BASE_XP: 80,
    EXPONENT: 1.28,
  },
  // Stat / Pillar XP Curve
  STAT_CURVE: {
    BASE_XP: 80,
    EXPONENT: 1.25,
  },
};

/**
 * Authoritative XP required for next player character level
 * Canonical Formula: ROUND(120 * (1 + 0.075 * (level - 1))^2.15)
 * Capped at Level 100.
 */
export function getPlayerXpForNextLevel(level: number): number {
  if (level < 1) return PROGRESSION_CONFIG.PLAYER_CURVE.BASE_XP;
  const effectiveLevel = Math.min(Math.max(1, level), MAX_PLAYER_LEVEL);
  return Math.round(
    PROGRESSION_CONFIG.PLAYER_CURVE.BASE_XP *
      Math.pow(
        1 + PROGRESSION_CONFIG.PLAYER_CURVE.SCALING_FACTOR * (effectiveLevel - 1),
        PROGRESSION_CONFIG.PLAYER_CURVE.EXPONENT
      )
  );
}

// Canonical alias for backward compatibility
export const getPlayerXpNextLevel = getPlayerXpForNextLevel;

/**
 * Validates that the level curve is strictly monotonic across all levels 1..MAX_PLAYER_LEVEL
 */
export function validateMonotonicLevelCurve(): boolean {
  for (let lvl = 1; lvl < MAX_PLAYER_LEVEL; lvl++) {
    if (getPlayerXpForNextLevel(lvl + 1) <= getPlayerXpForNextLevel(lvl)) {
      return false;
    }
  }
  return true;
}

/**
 * Get required XP for next stat level
 */
export function getStatXpNextLevel(currentLevel: number): number {
  if (currentLevel < 1) return PROGRESSION_CONFIG.STAT_CURVE.BASE_XP;
  return Math.round(
    PROGRESSION_CONFIG.STAT_CURVE.BASE_XP *
      Math.pow(currentLevel, PROGRESSION_CONFIG.STAT_CURVE.EXPONENT)
  );
}

/**
 * Get required XP for next skill level
 */
export function getSkillXpNextLevel(currentLevel: number): number {
  if (currentLevel < 1) return PROGRESSION_CONFIG.SKILL_CURVE.BASE_XP;
  return Math.round(
    PROGRESSION_CONFIG.SKILL_CURVE.BASE_XP *
      Math.pow(currentLevel, PROGRESSION_CONFIG.SKILL_CURVE.EXPONENT)
  );
}

/**
 * Calculate the cumulative XP required to reach a given target level from Level 1.
 */
export function calculateCumulativePlayerXp(targetLevel: number): number {
  const cappedLevel = Math.min(Math.max(1, targetLevel), MAX_PLAYER_LEVEL);
  let total = 0;
  for (let lvl = 1; lvl < cappedLevel; lvl++) {
    total += getPlayerXpForNextLevel(lvl);
  }
  return total;
}

export interface PlayerProgressionResult {
  newLevel: number;
  newCurrentXp: number;
  newLifetimeXp: number;
  levelsGained: number;
  levelsCrossed: number[];
  isMaxLevel: boolean;
}

/**
 * Authoritative Player Level progression calculator.
 * Evaluates XP addition, multi-level crossing, and Level 100 cap.
 */
export function calculatePlayerLevelUp(
  currentLevel: number,
  currentXp: number,
  lifetimeXp: number,
  xpToAdd: number
): PlayerProgressionResult {
  let level = Math.min(Math.max(1, currentLevel), MAX_PLAYER_LEVEL);
  let newCurrentXp = currentXp + xpToAdd;
  const newLifetimeXp = lifetimeXp + xpToAdd;
  const levelsCrossed: number[] = [];

  while (level < MAX_PLAYER_LEVEL) {
    const requiredXp = getPlayerXpForNextLevel(level);
    if (newCurrentXp >= requiredXp) {
      newCurrentXp -= requiredXp;
      level += 1;
      levelsCrossed.push(level);
      if (level >= MAX_PLAYER_LEVEL) {
        level = MAX_PLAYER_LEVEL;
        break;
      }
    } else {
      break;
    }
  }

  return {
    newLevel: level,
    newCurrentXp,
    newLifetimeXp,
    levelsGained: level - Math.min(Math.max(1, currentLevel), MAX_PLAYER_LEVEL),
    levelsCrossed,
    isMaxLevel: level >= MAX_PLAYER_LEVEL,
  };
}

/**
 * Authoritative Player Level rollback calculator for revoked XP.
 */
export function calculatePlayerLevelDown(
  currentLevel: number,
  currentXp: number,
  lifetimeXp: number,
  xpToRevoke: number
): {
  newLevel: number;
  newCurrentXp: number;
  newLifetimeXp: number;
  levelsLost: number;
} {
  let level = Math.min(Math.max(1, currentLevel), MAX_PLAYER_LEVEL);
  let newCurrentXp = currentXp - xpToRevoke;
  const newLifetimeXp = Math.max(0, lifetimeXp - xpToRevoke);
  let levelsLost = 0;

  while (newCurrentXp < 0 && level > 1) {
    level -= 1;
    levelsLost += 1;
    const prevReqXp = getPlayerXpForNextLevel(level);
    newCurrentXp += prevReqXp;
  }

  if (newCurrentXp < 0) newCurrentXp = 0;

  return {
    newLevel: level,
    newCurrentXp,
    newLifetimeXp,
    levelsLost,
  };
}

/**
 * Calculate streak bonus multiplier
 * e.g., streak = 5 -> +25% bonus XP
 */
export function calculateStreakBonus(streakDays: number, baseMsXp: number): number {
  if (streakDays <= 1) return 0;
  const bonusMultiplier = Math.min(
    (streakDays - 1) * XP_CONFIG.STREAK_BONUS_PER_DAY,
    XP_CONFIG.MAX_STREAK_BONUS_MULTIPLIER
  );
  return Math.round(baseMsXp * bonusMultiplier);
}

import { getSkillRankTitle } from './masteryService';

/**
 * Determine Skill Rank title based on level
 */
export function getSkillRank(level: number): SkillRank {
  return getSkillRankTitle(level);
}

/**
 * Format the identity forging statement
 */
export function getForgeIdentityTag(statId: StatId, pillarId?: PillarId): string {
  switch (statId) {
    case 'strength':
      return 'Strength Forged';
    case 'health':
      return 'Vitality Forged';
    case 'discipline':
      return 'Discipline Forged';
    case 'knowledge':
      return 'Knowledge Forged';
    case 'faith':
      return 'Faith Forged';
    case 'endurance':
      return 'Endurance Forged';
    case 'focus':
      return 'Focus Forged';
    case 'creativity':
      return 'Vision Forged';
    case 'communication':
      return 'Connection Forged';
    case 'leadership':
      return 'Character Forged';
    case 'financial_literacy':
      return 'Stability Forged';
    case 'emotional_resilience':
      return 'Fortitude Forged';
    default:
      return 'Character Forged';
  }
}

export const PILLARS_CONFIG = [
  {
    id: 'strength' as PillarId,
    name: 'Strength',
    icon: 'Shield',
    color: 'from-amber-600 to-red-700',
    subCategories: ['Exercise', 'Nutrition', 'Recovery', 'Mobility', 'Endurance'],
    description: 'Forging the physical vessel to endure life\'s challenges.',
  },
  {
    id: 'wisdom' as PillarId,
    name: 'Wisdom',
    icon: 'BookOpen',
    color: 'from-blue-600 to-indigo-800',
    subCategories: ['Reading', 'Storytelling', 'Learning', 'Observation', 'Reflection', 'Decision Making'],
    description: 'Sharpening intellect and understanding through deliberate study.',
  },
  {
    id: 'character' as PillarId,
    name: 'Character',
    icon: 'Flame',
    color: 'from-yellow-500 to-amber-600',
    subCategories: ['Integrity', 'Discipline', 'Patience', 'Humility', 'Kindness', 'Self Control', 'Gratitude'],
    description: 'Nurturing inner virtue, self-mastery, and unshakeable honor.',
  },
  {
    id: 'relationships' as PillarId,
    name: 'Relationships',
    icon: 'Heart',
    color: 'from-rose-600 to-pink-700',
    subCategories: ['Family', 'Friends', 'Communication', 'Listening', 'Empathy', 'Acts of Service'],
    description: 'Building deep bonds, trust, and loving service with others.',
  },
  {
    id: 'purpose' as PillarId,
    name: 'Purpose',
    icon: 'Compass',
    color: 'from-emerald-600 to-teal-800',
    subCategories: ['Career', 'University', 'Faith', 'Adventure', 'Financial Stability', 'Legacy'],
    description: 'Mapping your life mission, vocational mastery, and lasting impact.',
  },
];

export const STATS_CONFIG: { id: StatId; name: string; pillarId: PillarId; description: string }[] = [
  { id: 'strength', name: 'Strength', pillarId: 'strength', description: 'Physical power and structural resilience.' },
  { id: 'health', name: 'Health & Vitality', pillarId: 'strength', description: 'Nutrition, sleep, and physical energy.' },
  { id: 'endurance', name: 'Endurance', pillarId: 'strength', description: 'Stamina, cardiovascular fitness, and grit.' },
  { id: 'knowledge', name: 'Knowledge', pillarId: 'wisdom', description: 'Deep learning, comprehension, and skill acquiring.' },
  { id: 'focus', name: 'Focus', pillarId: 'wisdom', description: 'Deep work, concentration, and mental presence.' },
  { id: 'creativity', name: 'Creativity', pillarId: 'wisdom', description: 'Problem solving, artistic expression, and innovation.' },
  { id: 'discipline', name: 'Discipline', pillarId: 'character', description: 'Daily consistency and self-regulation.' },
  { id: 'emotional_resilience', name: 'Emotional Resilience', pillarId: 'character', description: 'Calm under fire and emotional mastery.' },
  { id: 'faith', name: 'Faith & Spiritual', pillarId: 'purpose', description: 'Higher purpose, gratitude, and conviction.' },
  { id: 'communication', name: 'Communication', pillarId: 'relationships', description: 'Active listening and honest expression.' },
  { id: 'leadership', name: 'Leadership', pillarId: 'relationships', description: 'Inspiring, guiding, and supporting peers.' },
  { id: 'financial_literacy', name: 'Financial Mastery', pillarId: 'purpose', description: 'Resource management and building long-term security.' },
];

