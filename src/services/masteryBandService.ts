import { Skill, Quest, QuestLibraryItem } from '../types';

export interface ForgeBandDefinition {
  band: 1 | 2 | 3 | 4 | 5 | 6;
  name: string;
  title: string;
  requiredHoursPerSkill: number;
  requiredSkillsCount: number;
  description: string;
  questScopeDescription: string;
  accentColor: string;
  textColor: string;
  borderColor: string;
  bgColor: string;
  glowColor: string;
}

export const FORGE_MASTERY_BANDS: ForgeBandDefinition[] = [
  {
    band: 1,
    name: 'Initiate',
    title: 'Band 1 • Initiate',
    requiredHoursPerSkill: 0,
    requiredSkillsCount: 0,
    description: 'Foundational practice, fundamental mechanics, and habit formation.',
    questScopeDescription: 'Core drills, basic techniques, and short deliberate sessions (10–30 min)',
    accentColor: '#10b981', // emerald
    textColor: 'text-emerald-500 dark:text-emerald-400',
    borderColor: 'border-emerald-500/30',
    bgColor: 'bg-emerald-500/10',
    glowColor: 'shadow-emerald-500/10',
  },
  {
    band: 2,
    name: 'Practitioner',
    title: 'Band 2 • Practitioner',
    requiredHoursPerSkill: 250,
    requiredSkillsCount: 3,
    description: 'Consistent execution, structured routines, and intermediate skill synthesis.',
    questScopeDescription: 'Multi-part exercises, active synthesis, and sustained drills (30–60 min)',
    accentColor: '#0ea5e9', // sky
    textColor: 'text-sky-500 dark:text-sky-400',
    borderColor: 'border-sky-500/30',
    bgColor: 'bg-sky-500/10',
    glowColor: 'shadow-sky-500/10',
  },
  {
    band: 3,
    name: 'Advanced',
    title: 'Band 3 • Advanced',
    requiredHoursPerSkill: 500,
    requiredSkillsCount: 3,
    description: 'Deep craft refinement, technical constraint execution, and high-intensity deliberate practice.',
    questScopeDescription: 'Complex projects, endurance sessions, and technique refinement (45–90 min)',
    accentColor: '#6366f1', // indigo
    textColor: 'text-indigo-500 dark:text-indigo-400',
    borderColor: 'border-indigo-500/30',
    bgColor: 'bg-indigo-500/10',
    glowColor: 'shadow-indigo-500/10',
  },
  {
    band: 4,
    name: 'Specialist',
    title: 'Band 4 • Specialist',
    requiredHoursPerSkill: 750,
    requiredSkillsCount: 3,
    description: 'Autonomous problem solving, nuanced technical mastery, and rigorous execution standards.',
    questScopeDescription: 'Substantial creative and technical deliverables, intensive deep dives (60–120 min)',
    accentColor: '#f59e0b', // amber
    textColor: 'text-amber-500 dark:text-amber-400',
    borderColor: 'border-amber-500/30',
    bgColor: 'bg-amber-500/10',
    glowColor: 'shadow-amber-500/10',
  },
  {
    band: 5,
    name: 'Master',
    title: 'Band 5 • Master',
    requiredHoursPerSkill: 1000,
    requiredSkillsCount: 3,
    description: 'Exemplary fluency, instinctual execution, and comprehensive domain authority.',
    questScopeDescription: 'Full portfolio-grade projects, masterworks, and comprehensive demonstrations (90–180 min)',
    accentColor: '#a855f7', // purple
    textColor: 'text-purple-500 dark:text-purple-400',
    borderColor: 'border-purple-500/30',
    bgColor: 'bg-purple-500/10',
    glowColor: 'shadow-purple-500/10',
  },
  {
    band: 6,
    name: 'Transcendent',
    title: 'Band 6 • Transcendent',
    requiredHoursPerSkill: 1250,
    requiredSkillsCount: 3,
    description: 'Pinnacle achievement, effortless multidisciplinary integration, and creative sovereignty.',
    questScopeDescription: 'Landmark achievements, groundbreaking cross-discipline synthesis, and opus creation',
    accentColor: '#f43f5e', // rose
    textColor: 'text-rose-500 dark:text-rose-400',
    borderColor: 'border-rose-500/30',
    bgColor: 'bg-rose-500/10',
    glowColor: 'shadow-rose-500/10',
  },
];

export interface SkillBandProgress {
  skillId: string;
  skillName: string;
  hours: number;
  requiredHours: number;
  percentage: number;
  isQualified: boolean;
  active?: boolean;
}

export interface EvaluatedBand extends ForgeBandDefinition {
  isUnlocked: boolean;
  isCurrentTarget: boolean;
  qualifiedCount: number;
  requiredCount: number;
  skillsProgress: SkillBandProgress[];
}

export interface MasteryBandsOverview {
  highestUnlockedBand: 1 | 2 | 3 | 4 | 5 | 6;
  highestBand: ForgeBandDefinition;
  nextBand: ForgeBandDefinition | null;
  bands: EvaluatedBand[];
  totalPracticeHours: number;
  totalPracticeSeconds: number;
  qualifiedSkillsCountForNextBand: number;
  requiredSkillsCountForNextBand: number;
}

/**
 * Returns practice hours for a skill, rounded to 1 decimal place.
 */
export function getSkillPracticeHours(skill?: Skill | null): number {
  if (!skill) return 0;
  const seconds = skill.totalPracticeSeconds || 0;
  return Math.round((seconds / 3600) * 10) / 10;
}

/**
 * Format practice hours nicely (e.g. "12.5 hrs", "0.5 hrs", "0 hrs")
 */
export function formatPracticeHours(hours: number): string {
  if (hours <= 0) return '0 hrs';
  if (hours < 1) {
    const mins = Math.round(hours * 60);
    return `${mins}m (${hours.toFixed(1)}h)`;
  }
  return `${hours.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} hrs`;
}

/**
 * Evaluates the full Forge Mastery Bands state across all skills in the database.
 * Requirement: To unlock Band N (for N >= 2), at least 3 distinct skills must have
 * >= requiredHoursPerSkill.
 */
export function calculateMasteryBandsState(skills: Skill[] = []): MasteryBandsOverview {
  const safeSkills = skills || [];

  let totalPracticeSeconds = 0;
  safeSkills.forEach((s) => {
    totalPracticeSeconds += s.totalPracticeSeconds || 0;
  });
  const totalPracticeHours = Math.round((totalPracticeSeconds / 3600) * 10) / 10;

  // Evaluate each band sequentially
  let highestUnlockedBand: 1 | 2 | 3 | 4 | 5 | 6 = 1;

  const evaluatedBands: EvaluatedBand[] = FORGE_MASTERY_BANDS.map((bandDef) => {
    const reqHours = bandDef.requiredHoursPerSkill;
    const reqCount = bandDef.requiredSkillsCount;

    const skillsProgress: SkillBandProgress[] = safeSkills.map((s) => {
      const hours = getSkillPracticeHours(s);
      const isQualified = reqHours === 0 || hours >= reqHours;
      const percentage = reqHours === 0 ? 100 : Math.min(100, Math.round((hours / reqHours) * 100));

      return {
        skillId: s.id,
        skillName: s.name,
        hours,
        requiredHours: reqHours,
        percentage,
        isQualified,
        active: Boolean(s.active),
      };
    });

    // Sort: qualified first, then closest by hours descending
    skillsProgress.sort((a, b) => {
      if (a.isQualified && !b.isQualified) return -1;
      if (!a.isQualified && b.isQualified) return 1;
      return b.hours - a.hours;
    });

    const qualifiedCount = bandDef.band === 1
      ? safeSkills.length
      : skillsProgress.filter((sp) => sp.isQualified).length;

    const isUnlocked = bandDef.band === 1 ? true : qualifiedCount >= reqCount;

    if (isUnlocked && bandDef.band > highestUnlockedBand) {
      highestUnlockedBand = bandDef.band;
    }

    return {
      ...bandDef,
      isUnlocked,
      isCurrentTarget: false, // will set below
      qualifiedCount,
      requiredCount: reqCount,
      skillsProgress,
    };
  });

  // Determine current target (the next locked band)
  let nextBandDef: ForgeBandDefinition | null = null;
  let nextBandQualifiedCount = 0;
  let nextBandRequiredCount = 3;

  for (const b of evaluatedBands) {
    if (!b.isUnlocked) {
      b.isCurrentTarget = true;
      nextBandDef = b;
      nextBandQualifiedCount = b.qualifiedCount;
      nextBandRequiredCount = b.requiredCount;
      break;
    }
  }

  const highestBand = FORGE_MASTERY_BANDS.find((b) => b.band === highestUnlockedBand) || FORGE_MASTERY_BANDS[0];

  return {
    highestUnlockedBand,
    highestBand,
    nextBand: nextBandDef,
    bands: evaluatedBands,
    totalPracticeHours,
    totalPracticeSeconds,
    qualifiedSkillsCountForNextBand: nextBandQualifiedCount,
    requiredSkillsCountForNextBand: nextBandRequiredCount,
  };
}

/**
 * Returns the highest unlocked band number (1 to 6).
 */
export function getHighestUnlockedBand(skills: Skill[] = []): 1 | 2 | 3 | 4 | 5 | 6 {
  return calculateMasteryBandsState(skills).highestUnlockedBand;
}

/**
 * Validates if a quest band is accessible by the player.
 * Guard 1: quest.band <= highestUnlockedBand
 * Guard 2: quest.band <= (skill.currentStage || 1)
 */
export function isQuestBandEligible(
  questBand: number,
  highestUnlockedBand: number,
  skillCurrentStage: number = 1
): boolean {
  if (questBand <= 0) return false;
  if (questBand > highestUnlockedBand) return false;
  const maxStageAllowed = Math.max(1, skillCurrentStage);
  if (questBand > maxStageAllowed) return false;
  return true;
}

/**
 * Derive an appropriate Quest Band (1 to 6) for a quest or library item,
 * respecting the player's highest unlocked band and curriculum stage.
 */
export function assignQuestBand(
  item: {
    questBand?: number;
    band?: number;
    difficultyBand?: number;
    difficultyLevel?: number;
    estimatedDuration?: string;
    estimatedDurationMinutes?: number;
    curriculumStage?: number;
    developmentTier?: number;
  },
  highestUnlockedBand: 1 | 2 | 3 | 4 | 5 | 6 = 1,
  skillCurrentStage: number = 1
): 1 | 2 | 3 | 4 | 5 | 6 {
  const safeHighestBand = Math.max(1, Math.min(6, typeof highestUnlockedBand === 'number' ? highestUnlockedBand : 1)) as 1 | 2 | 3 | 4 | 5 | 6;
  const safeSkillStage = Math.max(1, Math.min(6, typeof skillCurrentStage === 'number' ? skillCurrentStage : 1));
  const maxAllowed = Math.min(safeHighestBand, safeSkillStage);

  // Raw hint from item
  let rawBand = 1;
  if (typeof item.questBand === 'number' && item.questBand >= 1) {
    rawBand = item.questBand;
  } else if (typeof item.band === 'number' && item.band >= 1) {
    rawBand = item.band;
  } else {
    // Infer from duration
    const durMinutes = item.estimatedDurationMinutes || (item.estimatedDuration ? parseInt(item.estimatedDuration, 10) : 25) || 25;
    if (durMinutes <= 25) {
      rawBand = 1;
    } else if (durMinutes <= 45) {
      rawBand = 2;
    } else if (durMinutes <= 75) {
      rawBand = 3;
    } else if (durMinutes <= 105) {
      rawBand = 4;
    } else if (durMinutes <= 150) {
      rawBand = 5;
    } else {
      rawBand = 6;
    }

    if (item.curriculumStage && item.curriculumStage > 0) {
      rawBand = Math.min(rawBand, item.curriculumStage);
    } else if (item.developmentTier && item.developmentTier > 0) {
      rawBand = Math.min(rawBand, item.developmentTier);
    }
  }

  // Strictly clamp to [1, maxAllowed]
  const finalBand = Math.max(1, Math.min(rawBand, maxAllowed));
  return (finalBand as 1 | 2 | 3 | 4 | 5 | 6);
}

/**
 * Get band definition object for a band number.
 */
export function getForgeBandDefinition(bandNumber: number): ForgeBandDefinition {
  const found = FORGE_MASTERY_BANDS.find((b) => b.band === bandNumber);
  return found || FORGE_MASTERY_BANDS[0];
}
