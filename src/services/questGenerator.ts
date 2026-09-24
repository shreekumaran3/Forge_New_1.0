import {
  Quest,
  QuestCategory,
  LifeBuild,
  Skill,
  UserActiveBuilds,
  StatId,
  PillarId,
  HealthLog,
  QuestLog,
  Destiny,
  PlayerProfile,
  ForgePath,
  DailyQuestIntent,
  AIQuestConcept,
} from '../types';
import { PRESET_BUILDS } from '../data/buildsAndSkillsData';
import { getForgeIdentityTag } from './xpService';
import { generateAPEQuests } from './apeEngine';

/**
 * Smart Progression Rules for adaptive quest titles & difficulty evolution
 */
const PROGRESSION_MAP: Record<string, string[]> = {
  'walk': [
    '20 min Outdoor Walk',
    '30 min Outdoor Walk',
    '45 min Outdoor Walk',
    'Weighted Walk',
    'Trail Walk',
    'Mountain Hike',
  ],
  'push': [
    '5 Push Ups',
    '10 Push Ups',
    '20 Push Ups',
    'Weighted Push Ups',
    'Explosive Push Ups',
    'Ring Push Ups',
  ],
  'read': [
    'Read 10 pages',
    'Read 20 pages',
    'Read 30 pages',
    'Write Book Review',
    'Write Critical Analysis',
  ],
  'draw': [
    'Stick Figures Sketch',
    'Gesture Drawing',
    'Construction Practice',
    'Perspective Drawing',
    'Anatomy Study',
    'Complete Comic Page',
  ],
  'meditation': [
    '5-Minute Quiet Stillness',
    '10-Minute Diaphragmatic Breathwork',
    '20-Minute Contemplative Silence',
    'Deep Fasting & Meditation',
  ],
};

/**
 * Normalize quest title by stripping category prefixes, progressive overload suffixes, and lowercasing
 */
export function normalizeQuestTitle(title: string): string {
  if (!title) return '';
  return title
    .replace(/^(main|weekly|epic|legendary|side|daily)\s+quest:\s*/i, '')
    .split(/[\—\–\-]/)[0]
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim();
}

/**
 * Get single authoritative content key representing underlying activity/concept
 */
export function getQuestContentKey(quest: {
  id?: number | string;
  conceptId?: string;
  libraryItemId?: string;
  variationFamily?: string;
  title?: string;
}): string {
  if (!quest) return '';
  if (quest.conceptId) return `concept:${quest.conceptId.toLowerCase().trim()}`;
  if (quest.libraryItemId) return `concept:${quest.libraryItemId.toLowerCase().trim()}`;
  if (quest.variationFamily) return `concept:${quest.variationFamily.toLowerCase().trim()}`;
  const normTitle = normalizeQuestTitle(quest.title || '');
  if (normTitle) return `title:${normTitle}`;
  return '';
}

/**
 * Check if two quest objects represent the same core activity/content
 */
export function isSameQuestContent(
  q1: { id?: number | string; libraryItemId?: string; conceptId?: string; variationFamily?: string; title?: string },
  q2: { id?: number | string; libraryItemId?: string; conceptId?: string; variationFamily?: string; title?: string }
): boolean {
  if (!q1 || !q2) return false;
  if (q1.id !== undefined && q2.id !== undefined && q1.id === q2.id) {
    return true;
  }
  const k1 = getQuestContentKey(q1);
  const k2 = getQuestContentKey(q2);
  if (k1 && k2 && k1 === k2) {
    return true;
  }
  const t1 = normalizeQuestTitle(q1.title || '');
  const t2 = normalizeQuestTitle(q2.title || '');
  if (t1 && t2 && t1 === t2) {
    return true;
  }
  return false;
}

/**
 * Helper to generate identity-aligned "WHY it exists" reasons for generated quests
 */
function generateQuestReason(title: string, buildTitle: string, pillarId: PillarId, statId: StatId): string {
  const lower = title.toLowerCase();

  if (lower.includes('walk') || lower.includes('hike') || lower.includes('step') || lower.includes('cardio')) {
    return 'Improve physical endurance and stamina for your Summit Seeker destiny.';
  }
  if (lower.includes('draw') || lower.includes('sketch') || lower.includes('gesture') || lower.includes('perspective') || lower.includes('anatomy')) {
    return 'Master visual storytelling and technical craft for your Story Weaver destiny.';
  }
  if (lower.includes('read') || lower.includes('book') || lower.includes('study') || lower.includes('notes')) {
    return 'Deepen mental clarity, knowledge, and critical synthesis.';
  }
  if (lower.includes('push') || lower.includes('core') || lower.includes('lift') || lower.includes('workout') || lower.includes('strength')) {
    return 'Forge physical capacity and discipline for daily resilience.';
  }
  if (lower.includes('breath') || lower.includes('stretch') || lower.includes('meditat') || lower.includes('shower') || lower.includes('quiet')) {
    return 'Recovery focus: reset nervous system and restore mental clarity.';
  }
  if (lower.includes('gratitude') || lower.includes('family') || lower.includes('speak') || lower.includes('journal')) {
    return 'Nurture relationships and reinforce character foundation.';
  }

  return `Aligned with your ${buildTitle} build to strengthen ${pillarId} and ${statId}.`;
}

/**
 * Scale quest title up or down based on completion vs skip history
 */
export function getSmartProgressionTitle(baseTitle: string, completionCount: number = 0, skipCount: number = 0): string {
  const matchKey = Object.keys(PROGRESSION_MAP).find((key) => baseTitle.toLowerCase().includes(key.toLowerCase()));
  if (!matchKey) return baseTitle;

  const chain = PROGRESSION_MAP[matchKey];
  if (!chain || chain.length === 0) return baseTitle;

  let levelIndex = Math.floor(completionCount / 3) - Math.floor(skipCount / 2);
  levelIndex = Math.max(0, Math.min(chain.length - 1, levelIndex));

  return chain[levelIndex];
}

/**
 * Generate Today's Automated Quests using the Adaptive Progression Engine (APE)
 */
export function generateDailyQuests(
  activeBuilds: UserActiveBuilds,
  userSkills: Skill[],
  existingQuests: Quest[],
  recovery?: any,
  healthLog?: HealthLog | null,
  questLogs?: QuestLog[],
  destinies?: Destiny[],
  player?: PlayerProfile,
  weeklyFocus?: string,
  seed?: number,
  forgePath?: ForgePath,
  dailyIntent?: DailyQuestIntent,
  aiQuestConcepts?: AIQuestConcept[],
  forceRefresh?: boolean
): Quest[] {
  return generateAPEQuests({
    activeBuilds,
    skills: userSkills,
    existingQuests,
    recovery: recovery || { status: 'balanced', sleepHours: 7.5, activeMinutes: 45, score: 85, consecutiveTrainingDays: 0, recommendation: 'Good recovery' },
    healthLog,
    questLogs,
    destinies,
    player,
    weeklyFocus,
    seed,
    forgePath,
    dailyIntent,
    aiQuestConcepts,
    forceRefresh,
  });
}

export { getHeldBackLandmarks } from './apeEngine';
export type { HeldBackLandmark } from './apeEngine';

