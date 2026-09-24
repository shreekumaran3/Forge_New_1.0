/**
 * FORGE — Capability-Based Quest Difficulty & Selection Service
 *
 * Authoritative progression layer mapping:
 * SKILL TREE → UNLOCKED CAPABILITY → DEMONSTRATED CAPABILITY → TARGET DIFFICULTY → CANDIDATE SCORING → 5 ACTIVE QUESTS
 *
 * Pure calculation functions adhering strictly to Forge architectural boundaries:
 * - 0–100 Capability Score per node
 * - 8 Difficulty Bands (Band 0 to Band 7)
 * - Tier Ceilings matching Skill Tree hierarchy
 * - Recency-weighted completion scoring with diminishing returns
 * - Candidate scoring combining node relevance, difficulty fit, progression, freshness, and diversity
 */

import {
  Quest,
  QuestLibraryItem,
  QuestLog,
  PlayerStatState,
  StatId,
  DevelopmentDomain,
  PillarId,
} from '../types';
import {
  UnifiedSkillNode,
  UNIFIED_SKILL_NODES,
} from '../data/unifiedSkillTreeData';
import {
  getAllNodeLevels,
  getNodeLevel,
  getUnlockedSkillNodes,
} from './unifiedSkillTreeService';
import { isSameQuestContent, getQuestContentKey, normalizeQuestTitle } from './questGenerator';

// =========================================================================
// TYPES & INTERFACES
// =========================================================================

export interface NodeCapabilityScoreBreakdown {
  nodeId: string;
  totalScore: number; // 0–100
  accessScore: number; // 0–20 (from node tier)
  completionScore: number; // 0–25 (diminishing return on relevant completions)
  consistencyScore: number; // 0–20 (28-day rolling window consistency)
  recentPerformanceScore: number; // 0–15 (recency-weighted completion volume)
  skillStatScore: number; // 0–10 (supportive stat progression)
  investmentScore: number; // 0–10 (node level / maxLevel * 10)
  strugglePenalty: number; // 0 to -10 (temporary struggle reduction)
}

export interface DifficultyBandInfo {
  band: number; // 0 to 7
  name: string;
  minScore: number;
  maxScore: number;
  description: string;
  typicalCharacteristics: string[];
}

export interface CandidateScoringContext {
  targetDifficulty: number;
  node: UnifiedSkillNode;
  activeQuests?: Quest[];
  questLogs?: QuestLog[];
  recentQuestHistory?: { title: string; conceptId?: string; libraryItemId?: string }[];
  seed?: number;
}

export interface ScoredQuestCandidate {
  item: QuestLibraryItem;
  node: UnifiedSkillNode;
  intrinsicDifficulty: number; // 0–100
  difficultyBand: number; // 0–7
  targetDifficulty: number; // 0–100
  candidateScore: number; // 0–100
  nodeRelevance: number; // 0–100
  difficultyFitScore: number; // 0–100
  progressionValue: number; // 0–100
  diversityScore: number; // 0–100
  freshnessScore: number; // 0–100
  complementaryScore: number; // 0–100
  tagOverlapScore: number; // 0–20
}

// =========================================================================
// 1. DIFFICULTY BANDS DEFINITIONS (Section 13)
// =========================================================================

export const DIFFICULTY_BANDS: DifficultyBandInfo[] = [
  {
    band: 0,
    name: 'Introduction',
    minScore: 0,
    maxScore: 14,
    description: 'Teach the behavior. Very short, low complexity, low intensity, low commitment.',
    typicalCharacteristics: ['10–15 minute walk', '5 push-ups', '5-min focused reading', 'gesture sketch'],
  },
  {
    band: 1,
    name: 'Foundation',
    minScore: 15,
    maxScore: 27,
    description: 'Establish basic consistency and habit foundation.',
    typicalCharacteristics: ['20–30 minute walk', '10 push-ups', '10 pages reading', '10-min drawing study'],
  },
  {
    band: 2,
    name: 'Developing',
    minScore: 28,
    maxScore: 40,
    description: 'Build physical, mental, or creative capacity.',
    typicalCharacteristics: ['30–45 minute walk', '20 push-ups', '20–30 pages reading', '20-min drawing study'],
  },
  {
    band: 3,
    name: 'Competent',
    minScore: 41,
    maxScore: 53,
    description: 'The player can reliably perform the skill independently.',
    typicalCharacteristics: ['45–60 min cardio', 'structured strength session', '30–45 min deep work', 'perspective/anatomy study'],
  },
  {
    band: 4,
    name: 'Advanced',
    minScore: 54,
    maxScore: 66,
    description: 'Require meaningful skill, effort, and commitment.',
    typicalCharacteristics: ['hill walking', 'weighted training', 'longer deep-work block', 'complex drawing study'],
  },
  {
    band: 5,
    name: 'Specialized',
    minScore: 67,
    maxScore: 78,
    description: 'Require specialized capability and elevated discipline.',
    typicalCharacteristics: ['trail hike', 'rucking', 'advanced strength', 'complex composition', 'extended project'],
  },
  {
    band: 6,
    name: 'Expert',
    minScore: 79,
    maxScore: 89,
    description: 'Require strong demonstrated capability across domains.',
    typicalCharacteristics: ['demanding hike', 'advanced challenge', 'high-complexity creative work', 'real-world leadership'],
  },
  {
    band: 7,
    name: 'Master',
    minScore: 90,
    maxScore: 100,
    description: 'Rare, demanding mastery challenges.',
    typicalCharacteristics: ['major expedition preparation', 'high-level creative project', 'professional execution'],
  },
];

/**
 * Maps a numeric 0–100 score to its difficulty band (0–7)
 */
export function getQuestDifficultyBand(score: number): DifficultyBandInfo {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  for (const band of DIFFICULTY_BANDS) {
    if (clamped >= band.minScore && clamped <= band.maxScore) {
      return band;
    }
  }
  return clamped >= 90 ? DIFFICULTY_BANDS[7] : DIFFICULTY_BANDS[0];
}

/**
 * Returns the maximum difficulty band allowed for a given Skill Tree tier (Section 14)
 * Tier 0: Max Band 0 (Max difficulty score 14)
 * Tier 1: Max Band 1 (Max difficulty score 27)
 * Tier 2: Max Band 2 (Max difficulty score 40)
 * Tier 3: Max Band 3 (Max difficulty score 53)
 * Tier 4: Max Band 4 (Max difficulty score 66)
 * Tier 5: Max Band 6 (Max difficulty score 89)
 * Tier 6: Max Band 7 (Max difficulty score 100)
 */
export function getMaxBandForTier(tier: number): number {
  switch (tier) {
    case 0:
      return 0;
    case 1:
      return 1;
    case 2:
      return 2;
    case 3:
      return 3;
    case 4:
      return 4;
    case 5:
      return 6;
    case 6:
    default:
      return 7;
  }
}

/**
 * Returns the maximum score ceiling (0–100) for a given Skill Tree tier
 */
export function getMaxScoreForTier(tier: number): number {
  const maxBand = getMaxBandForTier(tier);
  return DIFFICULTY_BANDS[maxBand]?.maxScore ?? 100;
}

// =========================================================================
// 2. QUEST RELEVANCE & MATCHING TO SKILL NODES (Sections 8, 23, 24)
// =========================================================================

/**
 * Check if a quest is relevant to a specific UnifiedSkillNode
 * Evaluates: exact skill/node ID, tag overlap, domain match, and concept mapping
 */
export function isQuestRelevantToNode(
  quest: {
    title?: string;
    domain?: string;
    skillId?: string;
    pillarId?: string;
    primaryStatId?: string;
    tags?: string[];
    conceptId?: string;
    libraryItemId?: string;
  },
  node: UnifiedSkillNode
): boolean {
  if (!quest || !node) return false;

  // 1. Direct node / skill association
  if (quest.skillId && (quest.skillId === node.id || node.id.includes(quest.skillId))) {
    return true;
  }

  // 2. Explicit tag overlap with node.questTags
  if (quest.tags && quest.tags.length > 0 && node.questTags && node.questTags.length > 0) {
    const nodeTags = new Set(node.questTags.map((t) => t.toLowerCase()));
    const hasTagMatch = quest.tags.some((t) => nodeTags.has(t.toLowerCase()));
    if (hasTagMatch) return true;
  }

  // 3. Title keyword overlap with node title or node subBranch
  const normTitle = (quest.title || '').toLowerCase();
  const nodeName = node.title.toLowerCase();
  const subBranch = (node.subBranch || '').toLowerCase();

  if (nodeName.length > 3 && normTitle.includes(nodeName)) return true;
  if (subBranch.length > 3 && normTitle.includes(subBranch)) return true;

  // 4. Domain + primaryStatId match
  if (
    node.domain !== 'general_maintenance' &&
    quest.domain === node.domain &&
    quest.primaryStatId === node.primaryStatId
  ) {
    return true;
  }

  return false;
}

/**
 * Calculates tag overlap score between a quest item and a skill node (Section 23)
 * 0 matching tags: 0
 * 1 matching tag: +8
 * 2 matching tags: +14
 * 3+ matching tags: +20 max
 */
export function calculateTagOverlapScore(item: QuestLibraryItem, node: UnifiedSkillNode): number {
  if (!item.tags || item.tags.length === 0 || !node.questTags || node.questTags.length === 0) {
    return 0;
  }

  const nodeTags = new Set(node.questTags.map((t) => t.toLowerCase()));
  let matchCount = 0;
  for (const tag of item.tags) {
    if (nodeTags.has(tag.toLowerCase())) {
      matchCount++;
    }
  }

  if (matchCount === 0) return 0;
  if (matchCount === 1) return 8;
  if (matchCount === 2) return 14;
  return 20;
}

/**
 * Calculates deterministic Node Relevance score (0–100) (Section 24)
 * Prioritizes:
 * exact skill/node association > explicit questTag overlap > domain match > primary stat match > generic pillar match
 */
export function getQuestNodeRelevance(item: QuestLibraryItem, node: UnifiedSkillNode): number {
  if (!item || !node) return 0;

  let relevance = 0;

  // 1. Exact skill association (up to +40)
  if (item.skillId && (item.skillId === node.id || node.id.includes(item.skillId))) {
    relevance += 40;
  }

  // 2. Tag overlap score (up to +25)
  const tagScore = calculateTagOverlapScore(item, node);
  relevance += Math.round((tagScore / 20) * 25);

  // 3. Domain match (up to +20)
  if (node.domain === 'general_maintenance') {
    if (item.domain === 'drawing' || item.category === 'maintenance' || item.pillarId === 'character' || item.pillarId === 'purpose') {
      relevance += 15;
    }
  } else if (item.domain === node.domain) {
    relevance += 20;
  }

  // 4. Primary stat match (up to +10)
  if (item.primaryStatId && item.primaryStatId === node.primaryStatId) {
    relevance += 10;
  }

  // 5. Pillar match (up to +5)
  if (item.pillarId === node.pillarId) {
    relevance += 5;
  }

  return Math.min(100, relevance);
}

// =========================================================================
// 3. INTRINSIC QUEST DIFFICULTY (Sections 17, 18)
// =========================================================================

/**
 * Calculates baseline intrinsic difficulty (0–100) from quest library metadata.
 * Uses: developmentTier, difficulty ('easy'|'moderate'|'hard'|'expert'|'epic'|'legendary'), estimatedDuration, category, tags
 */
export function getQuestIntrinsicDifficulty(item: QuestLibraryItem): number {
  if (!item) return 20;

  // 1. Base from developmentTier (1 to 5)
  // Tier 1 -> 15, Tier 2 -> 30, Tier 3 -> 48, Tier 4 -> 68, Tier 5 -> 88
  const tier = item.developmentTier || 1;
  let baseScore = 15;
  if (tier === 2) baseScore = 30;
  else if (tier === 3) baseScore = 48;
  else if (tier === 4) baseScore = 68;
  else if (tier >= 5) baseScore = 88;

  // 2. Difficulty modifier
  const diffStr = String(item.difficulty || '').toLowerCase();
  let diffMod = 0;
  if (diffStr === 'easy') diffMod = -6;
  else if (diffStr === 'moderate') diffMod = 0;
  else if (diffStr === 'hard') diffMod = 8;
  else if (diffStr === 'expert') diffMod = 16;
  else if (diffStr === 'epic') diffMod = 22;
  else if (diffStr === 'legendary') diffMod = 28;

  // 3. Duration modifier
  let durationMod = 0;
  const durStr = (item.estimatedDuration || '').toLowerCase();
  const minutesMatch = durStr.match(/(\d+)\s*(?:min|mins|minute|minutes)/);
  const hoursMatch = durStr.match(/(\d+)\s*(?:hr|hrs|hour|hours)/);

  let totalMinutes = 20;
  if (minutesMatch) {
    totalMinutes = parseInt(minutesMatch[1], 10);
  } else if (hoursMatch) {
    totalMinutes = parseInt(hoursMatch[1], 10) * 60;
  }

  if (totalMinutes <= 10) durationMod = -8;
  else if (totalMinutes <= 15) durationMod = -4;
  else if (totalMinutes <= 30) durationMod = 0;
  else if (totalMinutes <= 45) durationMod = 4;
  else if (totalMinutes <= 60) durationMod = 8;
  else if (totalMinutes <= 120) durationMod = 14;
  else durationMod = 20;

  // 4. Category modifier
  let catMod = 0;
  if (item.category === 'side' || item.category === 'maintenance') catMod = -4;
  else if (item.category === 'weekly') catMod = 6;
  else if (item.category === 'epic') catMod = 14;
  else if (item.category === 'legendary') catMod = 20;

  const raw = baseScore + diffMod + durationMod + catMod;
  return Math.max(5, Math.min(100, Math.round(raw)));
}

// =========================================================================
// 4. NODE CAPABILITY SCORE CALCULATION (Sections 5–12, 21)
// =========================================================================

/**
 * Calculate Node Access Score (Section 6)
 * Core / Tier 0: 0
 * Tier 1: 10
 * Tier 2: 20
 * Tier 3: 30
 * Tier 4: 45
 * Tier 5: 60
 * Tier 6: 75
 * (Normalized to 0–20 points in final capability composition: accessScore = (tierBaseline / 75) * 20)
 */
export function calculateNodeAccessScore(tier: number): number {
  switch (tier) {
    case 0:
      return 0;
    case 1:
      return 3;
    case 2:
      return 6;
    case 3:
      return 9;
    case 4:
      return 13;
    case 5:
      return 17;
    case 6:
    default:
      return 20;
  }
}

/**
 * Calculate Node Investment Score (Section 7)
 * (normalizedLevel * 10) -> Clamp 0–10
 */
export function calculateNodeInvestmentScore(currentLevel: number, maxLevel: number): number {
  if (!maxLevel || maxLevel <= 0) return 0;
  const normalized = Math.max(0, Math.min(1, currentLevel / maxLevel));
  return Math.round(normalized * 10 * 10) / 10;
}

/**
 * Calculate Demonstrated Completion Score with diminishing returns (Section 8)
 * completionScore = 25 * (1 - Math.exp(-completedRelevantQuests / 8))
 * Clamp 0–25
 */
export function calculateDemonstratedCompletionScore(relevantCompletionCount: number): number {
  if (relevantCompletionCount <= 0) return 0;
  const score = 25 * (1 - Math.exp(-relevantCompletionCount / 8));
  return Math.max(0, Math.min(25, Math.round(score * 10) / 10));
}

/**
 * Calculate Consistency Score over rolling 28-day window (Section 9)
 * Uses actual completed relevant quests in rolling 28-day window.
 * 0% -> 0, 50% -> 10, 75% -> 15, 90% -> 18, 100% -> 20
 */
export function calculateConsistencyScore(
  questLogs: QuestLog[] = [],
  node: UnifiedSkillNode,
  nowMs: number = Date.now()
): number {
  const windowDays = 28;
  const logsInWindow = questLogs.filter((log) => {
    const ageDays = (nowMs - new Date(log.completedAt).getTime()) / (1000 * 60 * 60 * 24);
    return ageDays >= 0 && ageDays <= windowDays;
  });

  if (logsInWindow.length === 0) return 0;

  const relevantLogs = logsInWindow.filter((log) =>
    isQuestRelevantToNode(
      {
        title: log.questTitle,
        skillId: log.skillId,
        pillarId: log.pillarId,
        primaryStatId: log.statId,
      },
      node
    )
  );

  if (relevantLogs.length === 0) return 0;

  // Determine active active weeks in the 28-day window (4 weeks)
  const activeWeeks = new Set<number>();
  relevantLogs.forEach((log) => {
    const ageDays = (nowMs - new Date(log.completedAt).getTime()) / (1000 * 60 * 60 * 24);
    const weekIdx = Math.min(3, Math.floor(ageDays / 7));
    activeWeeks.add(weekIdx);
  });

  // Calculate consistency ratio from active weeks + volume
  const weekRatio = activeWeeks.size / 4; // 0 to 1
  const volumeBonus = Math.min(1, relevantLogs.length / 8); // 8 completions in 28 days = full volume
  const combinedRatio = weekRatio * 0.6 + volumeBonus * 0.4;

  const score = combinedRatio * 20;
  return Math.max(0, Math.min(20, Math.round(score * 10) / 10));
}

/**
 * Calculate Recency-Weighted Performance Score (Section 10)
 * 0–7 days: 100% weight
 * 8–14 days: 75% weight
 * 15–21 days: 50% weight
 * 22–28 days: 25% weight
 * Older: 0 weight
 * Normalized to 0–15 points.
 */
export function calculateRecentPerformanceScore(
  questLogs: QuestLog[] = [],
  node: UnifiedSkillNode,
  nowMs: number = Date.now()
): number {
  let weightedSum = 0;

  questLogs.forEach((log) => {
    const ageDays = (nowMs - new Date(log.completedAt).getTime()) / (1000 * 60 * 60 * 24);
    if (ageDays < 0 || ageDays > 28) return;

    if (!isQuestRelevantToNode({ title: log.questTitle, skillId: log.skillId, pillarId: log.pillarId, primaryStatId: log.statId }, node)) {
      return;
    }

    let weight = 0;
    if (ageDays <= 7) weight = 1.0;
    else if (ageDays <= 14) weight = 0.75;
    else if (ageDays <= 21) weight = 0.5;
    else if (ageDays <= 28) weight = 0.25;

    weightedSum += weight;
  });

  // Diminishing returns on recent completions to max 15 points (5 weighted completions -> ~12.5 pts, 8+ -> ~15 pts)
  const score = 15 * (1 - Math.exp(-weightedSum / 3.5));
  return Math.max(0, Math.min(15, Math.round(score * 10) / 10));
}

/**
 * Calculate Skill / Stat Progression Score (Section 11)
 * Normalizes primary stat level/XP to 0–10
 */
export function calculateSkillStatScore(stats: PlayerStatState[] = [], node: UnifiedSkillNode): number {
  if (!node.primaryStatId || stats.length === 0) return 3; // Neutral baseline

  const stat = stats.find((s) => s.statId === node.primaryStatId);
  if (!stat) return 3;

  const level = stat.level || 1;
  // Level 1 = 1 pt, Level 5 = 4 pts, Level 10 = 7 pts, Level 15+ = 10 pts
  const normalized = Math.min(10, Math.max(0, (level / 15) * 10));
  return Math.round(normalized * 10) / 10;
}

/**
 * Calculate Struggle Penalty (Section 21)
 * 1 struggle: -2
 * 2 struggles: -4
 * 3 struggles: -7
 * 4+ struggles: -10 max
 */
export function calculateStrugglePenalty(
  activeQuests: Quest[] = [],
  node: UnifiedSkillNode
): number {
  let struggleCount = 0;

  activeQuests.forEach((q) => {
    if (isQuestRelevantToNode(q, node)) {
      if ((q.skipCount || 0) > 0) {
        struggleCount += q.skipCount || 0;
      }
    }
  });

  if (struggleCount === 0) return 0;
  if (struggleCount === 1) return -2;
  if (struggleCount === 2) return -4;
  if (struggleCount === 3) return -7;
  return -10;
}

/**
 * Complete Node Capability Score Calculation (Section 5, 12)
 * Returns breakdown and total 0–100 score
 */
export function getNodeCapabilityScore(
  nodeId: string,
  stats: PlayerStatState[] = [],
  questLogs: QuestLog[] = [],
  activeQuests: Quest[] = [],
  nodeLevelsOverride?: Record<string, number>
): NodeCapabilityScoreBreakdown {
  const node = UNIFIED_SKILL_NODES.find((n) => n.id === nodeId);
  if (!node) {
    return {
      nodeId,
      totalScore: 0,
      accessScore: 0,
      completionScore: 0,
      consistencyScore: 0,
      recentPerformanceScore: 0,
      skillStatScore: 0,
      investmentScore: 0,
      strugglePenalty: 0,
    };
  }

  const levels = nodeLevelsOverride || getAllNodeLevels();
  const currentLevel = levels[nodeId] || 0;

  // If node is completely locked, capability score is 0
  if (currentLevel === 0) {
    return {
      nodeId,
      totalScore: 0,
      accessScore: 0,
      completionScore: 0,
      consistencyScore: 0,
      recentPerformanceScore: 0,
      skillStatScore: 0,
      investmentScore: 0,
      strugglePenalty: 0,
    };
  }

  // 1. Access Score (0–20)
  const accessScore = calculateNodeAccessScore(node.tier);

  // 2. Investment Score (0–10)
  const investmentScore = calculateNodeInvestmentScore(currentLevel, node.maxLevel);

  // 3. Relevant completion count
  const relevantCompletions = questLogs.filter((log) =>
    isQuestRelevantToNode(
      {
        title: log.questTitle,
        skillId: log.skillId,
        pillarId: log.pillarId,
        primaryStatId: log.statId,
      },
      node
    )
  ).length;
  const completionScore = calculateDemonstratedCompletionScore(relevantCompletions);

  // 4. Consistency Score (0–20)
  const consistencyScore = calculateConsistencyScore(questLogs, node);

  // 5. Recent Performance Score (0–15)
  const recentPerformanceScore = calculateRecentPerformanceScore(questLogs, node);

  // 6. Skill / Stat Score (0–10)
  const skillStatScore = calculateSkillStatScore(stats, node);

  // 7. Struggle Penalty (0 to -10)
  const strugglePenalty = calculateStrugglePenalty(activeQuests, node);

  // Sum components
  const rawTotal =
    accessScore +
    completionScore +
    consistencyScore +
    recentPerformanceScore +
    skillStatScore +
    investmentScore +
    strugglePenalty;

  // Clamp to 0–100 and apply Tier maximum ceiling
  const tierCeiling = getMaxScoreForTier(node.tier);
  const totalScore = Math.max(0, Math.min(tierCeiling, Math.min(100, Math.round(rawTotal))));

  return {
    nodeId,
    totalScore,
    accessScore,
    completionScore,
    consistencyScore,
    recentPerformanceScore,
    skillStatScore,
    investmentScore,
    strugglePenalty,
  };
}

// =========================================================================
// 5. TARGET DIFFICULTY CALCULATION (Section 19, 20)
// =========================================================================

/**
 * Calculates progression offset for capability score (Section 20)
 * 0–20: +5
 * 21–40: +5
 * 41–60: +7
 * 61–80: +8
 * 81–100: +5
 */
export function getProgressionOffset(capabilityScore: number): number {
  if (capabilityScore <= 20) return 5;
  if (capabilityScore <= 40) return 5;
  if (capabilityScore <= 60) return 7;
  if (capabilityScore <= 80) return 8;
  return 5;
}

/**
 * Calculates target quest difficulty (0–100) for a given node (Section 20)
 * targetDifficulty = capabilityScore + progressionOffset
 * Clamped to node tier maximum ceiling.
 */
export function getTargetDifficulty(
  node: UnifiedSkillNode,
  stats: PlayerStatState[] = [],
  questLogs: QuestLog[] = [],
  activeQuests: Quest[] = []
): number {
  const cap = getNodeCapabilityScore(node.id, stats, questLogs, activeQuests);
  const offset = getProgressionOffset(cap.totalScore);
  const rawTarget = cap.totalScore + offset;
  const tierCeiling = getMaxScoreForTier(node.tier);

  return Math.max(0, Math.min(tierCeiling, Math.min(100, rawTarget)));
}

// =========================================================================
// 6. CANDIDATE SCORING (Section 19, 25)
// =========================================================================

/**
 * Calculates deterministic Candidate Score for a quest library item (Section 25)
 * candidateScore =
 *   nodeRelevance * 0.30
 * + difficultyFitScore * 0.25
 * + progressionValue * 0.15
 * + diversityScore * 0.10
 * + freshnessScore * 0.10
 * + complementaryScore * 0.05
 * + randomness * 0.05
 */
export function scoreQuestCandidate(
  item: QuestLibraryItem,
  context: CandidateScoringContext
): ScoredQuestCandidate {
  const { targetDifficulty, node, activeQuests = [], questLogs = [], seed = 1 } = context;

  const intrinsicDifficulty = getQuestIntrinsicDifficulty(item);
  const difficultyBand = getQuestDifficultyBand(intrinsicDifficulty).band;
  const nodeRelevance = getQuestNodeRelevance(item, node);
  const tagOverlapScore = calculateTagOverlapScore(item, node);

  // 1. Difficulty Fit Score (0–100) (Section 19: 70% near-target, 20% slightly easier, 10% stretch)
  const diffDistance = Math.abs(intrinsicDifficulty - targetDifficulty);
  let difficultyFitScore = Math.max(0, 100 - diffDistance * 3.5);

  // Small bonus if quest is a healthy stretch (+5 to +10 difficulty points)
  if (intrinsicDifficulty >= targetDifficulty && intrinsicDifficulty <= targetDifficulty + 10) {
    difficultyFitScore = Math.min(100, difficultyFitScore + 10);
  }

  // 2. Progression Value (0–100)
  // Quests that introduce new tags or advance the node's sub-branch have high progression value
  let progressionValue = 50;
  if (item.developmentTier && item.developmentTier >= node.tier) {
    progressionValue += 25;
  }
  if (tagOverlapScore > 0) {
    progressionValue += tagOverlapScore;
  }
  progressionValue = Math.min(100, progressionValue);

  // 3. Diversity Score (0–100)
  // Penalize over-concentration in the same primary stat or concept among currently active quests
  let diversityScore = 80;
  const activeStatCount = activeQuests.filter((q) => q.primaryStatId === item.primaryStatId).length;
  if (activeStatCount >= 2) diversityScore -= 30;
  else if (activeStatCount === 1) diversityScore -= 10;
  diversityScore = Math.max(0, diversityScore);

  // 4. Freshness Score (0–100)
  // Check age of last completion in questLogs
  let freshnessScore = 100;
  const matchingLog = questLogs.find((l) => isSameQuestContent(item, { title: l.questTitle }));
  if (matchingLog) {
    const ageDays = (Date.now() - new Date(matchingLog.completedAt).getTime()) / (1000 * 60 * 60 * 24);
    if (ageDays <= 3) freshnessScore = 20;
    else if (ageDays <= 7) freshnessScore = 50;
    else if (ageDays <= 14) freshnessScore = 75;
  }

  // 5. Complementary Score (0–100)
  let complementaryScore = 50;
  if (item.complementaryConcepts && item.complementaryConcepts.length > 0) {
    const hasActiveComplement = activeQuests.some((aq) =>
      item.complementaryConcepts?.some((c) =>
        (aq.title || '').toLowerCase().includes(c.toLowerCase()) ||
        (aq.libraryItemId || '').toLowerCase().includes(c.toLowerCase())
      )
    );
    if (hasActiveComplement) {
      complementaryScore = 90;
    }
  }

  // 6. Deterministic Small Randomness (0–100 * 0.05)
  const pseudoRand = ((seed * 9301 + 49297) % 233280) / 233280;
  const randomnessScore = pseudoRand * 100;

  // Candidate Final Score Assembly
  const candidateScore = Math.round(
    nodeRelevance * 0.30 +
    difficultyFitScore * 0.25 +
    progressionValue * 0.15 +
    diversityScore * 0.10 +
    freshnessScore * 0.10 +
    complementaryScore * 0.05 +
    randomnessScore * 0.05
  );

  return {
    item,
    node,
    intrinsicDifficulty,
    difficultyBand,
    targetDifficulty,
    candidateScore,
    nodeRelevance,
    difficultyFitScore,
    progressionValue,
    diversityScore,
    freshnessScore,
    complementaryScore,
    tagOverlapScore,
  };
}

// =========================================================================
// 7. HIGH-LEVEL QUERY & UTILITY EXPORTS
// =========================================================================

/**
 * Calculates capability score for all currently unlocked Skill Tree nodes
 */
export function getAllUnlockedNodeCapabilities(
  stats: PlayerStatState[] = [],
  questLogs: QuestLog[] = [],
  activeQuests: Quest[] = []
): NodeCapabilityScoreBreakdown[] {
  const unlockedNodes = getUnlockedSkillNodes();
  return unlockedNodes.map((node) =>
    getNodeCapabilityScore(node.id, stats, questLogs, activeQuests)
  );
}

/**
 * Finds the most relevant unlocked UnifiedSkillNode for a given quest
 */
export function findBestSkillNodeForQuest(
  quest: {
    title?: string;
    domain?: string;
    skillId?: string;
    pillarId?: string;
    primaryStatId?: string;
    tags?: string[];
  }
): UnifiedSkillNode | undefined {
  const unlockedNodes = getUnlockedSkillNodes();
  if (unlockedNodes.length === 0) return UNIFIED_SKILL_NODES[0];

  let bestNode: UnifiedSkillNode | undefined = undefined;
  let highestRelevance = -1;

  for (const node of unlockedNodes) {
    const relevance = getQuestNodeRelevance(
      {
        id: 'temp',
        title: quest.title || '',
        description: '',
        domain: (quest.domain as DevelopmentDomain) || 'drawing',
        pillarId: (quest.pillarId as PillarId) || 'strength',
        primaryStatId: (quest.primaryStatId as StatId) || 'strength',
        tags: quest.tags || [],
        category: 'main',
        difficulty: 'moderate',
        rarity: 'common',
        estimatedDuration: '20 mins',
        xpReward: 35,
      },
      node
    );

    if (relevance > highestRelevance) {
      highestRelevance = relevance;
      bestNode = node;
    }
  }

  return bestNode || unlockedNodes[0];
}

/**
 * Calculate effective difficulty for any quest object
 */
export function calculateQuestDifficulty(
  quest: Quest | QuestLibraryItem
): {
  intrinsicScore: number; // 0–100
  difficultyBand: DifficultyBandInfo;
  tier: number;
} {
  const item: QuestLibraryItem = 'domain' in quest && 'developmentTier' in quest
    ? (quest as QuestLibraryItem)
    : {
        id: typeof quest.id === 'string' ? quest.id : `q_${quest.id}`,
        title: quest.title,
        description: quest.description || '',
        domain: 'drawing',
        pillarId: quest.pillarId,
        primaryStatId: quest.primaryStatId,
        category: (quest.category as any) || 'main',
        difficulty: (quest as any).difficulty || 'moderate',
        rarity: quest.rarity || 'common',
        estimatedDuration: quest.estimatedDuration || '20 mins',
        xpReward: quest.xpReward || 35,
        tags: [],
        developmentTier: (quest as any).developmentTier || 1,
      };

  const intrinsicScore = getQuestIntrinsicDifficulty(item);
  const difficultyBand = getQuestDifficultyBand(intrinsicScore);

  return {
    intrinsicScore,
    difficultyBand,
    tier: item.developmentTier || 1,
  };
}
