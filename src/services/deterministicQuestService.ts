/**
 * FORGE QUEST SYSTEM V1 — DETERMINISTIC QUEST SERVICE
 * 
 * Manages deterministic, non-AI quest definitions and state for persistent Skills.
 * Every persistent active Skill automatically has exactly THREE Quest Types:
 * 1. Daily Sharpening (daily_sharpening)
 * 2. Weekly Skill Check (weekly_skill_check)
 * 3. Monthly Monument (monthly_monument)
 * 
 * Rules:
 * - Gemini quest generation is completely dormant.
 * - Quests have a stable identity: quest.skillId + quest.questType.
 * - Cadence: Daily resets each calendar day, Weekly resets each ISO week, Monthly resets each month.
 * - Does not create duplicate copies on app open.
 * - Existing completion history, streak, and XP are strictly preserved.
 */

import {
  Quest,
  Skill,
  DeterministicQuestType,
  DETERMINISTIC_QUEST_TYPES,
  QuestFrequency,
  QuestCategory,
  PillarId,
  StatId,
} from '../types';
import { db } from '../db/database';
import { getActiveSkills } from './skillService';

export { DETERMINISTIC_QUEST_TYPES };

export interface DeterministicQuestTemplate {
  questType: DeterministicQuestType;
  title: string;
  description: string;
  estimatedDuration: string;
  durationMinutes: number;
  xpReward: number;
  frequency: QuestFrequency;
  category: QuestCategory;
  pillarId: PillarId;
  primaryStatId: StatId;
  identityTag: string;
  questBand: 1 | 2 | 3 | 4 | 5 | 6;
}

/**
 * Deliberately authored deterministic quest content for the 5 Starter Skills.
 * Content is authentic, skill-specific, and non-generic.
 */
export const STARTER_DETERMINISTIC_QUESTS: Record<string, DeterministicQuestTemplate[]> = {
  drawing: [
    {
      questType: 'daily_sharpening',
      title: 'Gesture & Contour Precision',
      description:
        'Warm up with confident mark-making: fluid 60-second gesture poses from life or photo reference, 2-point perspective box rotations, and continuous line contour drills. Draw from the shoulder with zero hesitant strokes.',
      estimatedDuration: '25 mins',
      durationMinutes: 25,
      xpReward: 40,
      frequency: 'daily',
      category: 'main',
      pillarId: 'wisdom',
      primaryStatId: 'creativity',
      identityTag: 'Artistry Forged',
      questBand: 1,
    },
    {
      questType: 'weekly_skill_check',
      title: 'Perspective & Value Study',
      description:
        'Produce a complete observational drawing demonstrating structural volumes and lighting. Construct complex shapes with anatomical landmarks and apply a disciplined 5-value range with cast shadows.',
      estimatedDuration: '50 mins',
      durationMinutes: 50,
      xpReward: 85,
      frequency: 'weekly',
      category: 'weekly',
      pillarId: 'wisdom',
      primaryStatId: 'creativity',
      identityTag: 'Artistry Forged',
      questBand: 2,
    },
    {
      questType: 'monthly_monument',
      title: 'Master Portfolio Composition',
      description:
        'Plan, thumbnail, pencil, and ink/render a substantial finished narrative artwork. Establish an intentional focal hierarchy, environmental depth, accurate anatomy, and cohesive surface rendering.',
      estimatedDuration: '90 mins',
      durationMinutes: 90,
      xpReward: 180,
      frequency: 'monthly',
      category: 'legendary',
      pillarId: 'wisdom',
      primaryStatId: 'creativity',
      identityTag: 'Artistry Forged',
      questBand: 3,
    },
  ],

  writing: [
    {
      questType: 'daily_sharpening',
      title: 'Deliberate Prose Crafting',
      description:
        'Execute 25 minutes of continuous, uninterrupted prose drafting. Build vivid sensory detail, strong verbs, and narrative momentum without self-editing or deleting backward.',
      estimatedDuration: '25 mins',
      durationMinutes: 25,
      xpReward: 40,
      frequency: 'daily',
      category: 'main',
      pillarId: 'wisdom',
      primaryStatId: 'focus',
      identityTag: 'Discipline Forged',
      questBand: 1,
    },
    {
      questType: 'weekly_skill_check',
      title: 'Structured Long-Form Essay',
      description:
        'Draft and revise a cohesive 750+ word essay or self-contained narrative scene. Hone paragraph rhythm, sharpen the central thesis or dramatic question, and tighten prose structure.',
      estimatedDuration: '50 mins',
      durationMinutes: 50,
      xpReward: 85,
      frequency: 'weekly',
      category: 'weekly',
      pillarId: 'wisdom',
      primaryStatId: 'focus',
      identityTag: 'Discipline Forged',
      questBand: 2,
    },
    {
      questType: 'monthly_monument',
      title: 'Completed Narrative or Treatise',
      description:
        'Draft, revise, and line-edit a substantial 2,500+ word manuscript, long-form investigative analysis, or polished multi-chapter story arc ready for public reading.',
      estimatedDuration: '90 mins',
      durationMinutes: 90,
      xpReward: 180,
      frequency: 'monthly',
      category: 'legendary',
      pillarId: 'wisdom',
      primaryStatId: 'focus',
      identityTag: 'Discipline Forged',
      questBand: 3,
    },
  ],

  fitness: [
    {
      questType: 'daily_sharpening',
      title: 'Deliberate Strength & Mobility Circuit',
      description:
        'Execute clean progressive overload: strict calisthenics or barbell movements (push-ups, pull-ups, squats, hinges) paired with active hip and thoracic spine mobility drills.',
      estimatedDuration: '30 mins',
      durationMinutes: 30,
      xpReward: 45,
      frequency: 'daily',
      category: 'main',
      pillarId: 'strength',
      primaryStatId: 'strength',
      identityTag: 'Strength Forged',
      questBand: 1,
    },
    {
      questType: 'weekly_skill_check',
      title: 'Volume Density & Capacity Benchmark',
      description:
        'Complete a measurable physical test: timed circuit, volume density test (e.g. 100 clean push-ups or 50 pull-ups in target time), or a sustained 5K tempo pace run.',
      estimatedDuration: '45 mins',
      durationMinutes: 45,
      xpReward: 85,
      frequency: 'weekly',
      category: 'weekly',
      pillarId: 'strength',
      primaryStatId: 'endurance',
      identityTag: 'Strength Forged',
      questBand: 2,
    },
    {
      questType: 'monthly_monument',
      title: 'Peak Athletic Performance Milestone',
      description:
        'Execute a landmark physical performance challenge: maximal lifting benchmark test, unbroken advanced bodyweight progression (handstand hold, muscle-up), or 10K endurance trial.',
      estimatedDuration: '75 mins',
      durationMinutes: 75,
      xpReward: 180,
      frequency: 'monthly',
      category: 'legendary',
      pillarId: 'strength',
      primaryStatId: 'strength',
      identityTag: 'Strength Forged',
      questBand: 3,
    },
  ],

  cooking: [
    {
      questType: 'daily_sharpening',
      title: 'Mise en Place & Knife Technique',
      description:
        'Practice disciplined culinary fundamentals: precise knife cuts (julienne/brunoise), pan temperature control, fond management, and tasting for exact salt-acid balance.',
      estimatedDuration: '25 mins',
      durationMinutes: 25,
      xpReward: 40,
      frequency: 'daily',
      category: 'main',
      pillarId: 'strength',
      primaryStatId: 'health',
      identityTag: 'Craft Forged',
      questBand: 1,
    },
    {
      questType: 'weekly_skill_check',
      title: 'Scratch-Cooked Multi-Element Meal',
      description:
        'Prepare a complete balanced dish from raw whole ingredients demonstrating emulsion or pan-reduction sauces, Maillard sear, and clean plating presentation.',
      estimatedDuration: '50 mins',
      durationMinutes: 50,
      xpReward: 85,
      frequency: 'weekly',
      category: 'weekly',
      pillarId: 'strength',
      primaryStatId: 'health',
      identityTag: 'Craft Forged',
      questBand: 2,
    },
    {
      questType: 'monthly_monument',
      title: 'Signature Multi-Course Culinary Showcase',
      description:
        'Plan, prep, and execute an elaborate 3-course scratch dinner or advanced culinary technique (fermentation, laminated dough, artisan sourdough, or complex roasting).',
      estimatedDuration: '90 mins',
      durationMinutes: 90,
      xpReward: 180,
      frequency: 'monthly',
      category: 'legendary',
      pillarId: 'strength',
      primaryStatId: 'health',
      identityTag: 'Craft Forged',
      questBand: 3,
    },
  ],

  personal_finance: [
    {
      questType: 'daily_sharpening',
      title: 'Ledger Audit & Expense Reconciliation',
      description:
        'Review all daily inflows and outflows, classify transactions with zero unassigned balances, audit recurring subscription micro-charges, and log net cash position.',
      estimatedDuration: '20 mins',
      durationMinutes: 20,
      xpReward: 35,
      frequency: 'daily',
      category: 'main',
      pillarId: 'wisdom',
      primaryStatId: 'financial_literacy',
      identityTag: 'Stewardship Forged',
      questBand: 1,
    },
    {
      questType: 'weekly_skill_check',
      title: 'Cash Flow & Capital Allocation Review',
      description:
        'Analyze weekly spending against budget targets, calculate discretionary surplus, and execute scheduled automated transfers to emergency reserve or low-cost index funds.',
      estimatedDuration: '40 mins',
      durationMinutes: 40,
      xpReward: 80,
      frequency: 'weekly',
      category: 'weekly',
      pillarId: 'wisdom',
      primaryStatId: 'financial_literacy',
      identityTag: 'Stewardship Forged',
      questBand: 2,
    },
    {
      questType: 'monthly_monument',
      title: 'Comprehensive Net Worth & Portfolio Audit',
      description:
        'Full balance sheet audit: calculate total net worth trajectory, rebalance asset allocation, audit account fees, optimize tax strategy, and lock next month\'s capital budget.',
      estimatedDuration: '60 mins',
      durationMinutes: 60,
      xpReward: 160,
      frequency: 'monthly',
      category: 'legendary',
      pillarId: 'wisdom',
      primaryStatId: 'financial_literacy',
      identityTag: 'Stewardship Forged',
      questBand: 3,
    },
  ],
};

/**
 * Fallback deterministic template generator for any non-starter or custom skills.
 * Provides structurally valid, deterministic quest templates based on the skill's name and attributes.
 */
export function getCustomSkillQuestTemplates(skill: Skill): DeterministicQuestTemplate[] {
  const name = skill.name.trim();
  const pillarId = (skill.pillarId as PillarId) || 'wisdom';
  const primaryStatId = (skill.primaryStatId as StatId) || 'discipline';

  return [
    {
      questType: 'daily_sharpening',
      title: `${name} Deliberate Practice`,
      description: `Execute a focused 25-minute deliberate practice session targeting fundamental mechanics, accuracy, and foundational drills for ${name}. Focus on zero distractions and mechanical consistency.`,
      estimatedDuration: '25 mins',
      durationMinutes: 25,
      xpReward: 40,
      frequency: 'daily',
      category: 'main',
      pillarId,
      primaryStatId,
      identityTag: `${name} Forged`,
      questBand: 1,
    },
    {
      questType: 'weekly_skill_check',
      title: `${name} Applied Challenge`,
      description: `Complete a 50-minute structured challenge demonstrating practical application and measurable competence in ${name} under real-world conditions.`,
      estimatedDuration: '50 mins',
      durationMinutes: 50,
      xpReward: 85,
      frequency: 'weekly',
      category: 'weekly',
      pillarId,
      primaryStatId,
      identityTag: `${name} Forged`,
      questBand: 2,
    },
    {
      questType: 'monthly_monument',
      title: `${name} Milestone Achievement`,
      description: `Complete a substantial milestone project or capstone achievement in ${name}. Synthesize accumulated techniques into a tangible, finished outcome of lasting value.`,
      estimatedDuration: '90 mins',
      durationMinutes: 90,
      xpReward: 180,
      frequency: 'monthly',
      category: 'legendary',
      pillarId,
      primaryStatId,
      identityTag: `${name} Forged`,
      questBand: 3,
    },
  ];
}

/**
 * Resolves the deterministic quest definition for a specific skill and quest type.
 * Architecture: persistent Skill -> resolveQuestTemplate() -> Quest instance -> QuestCard
 */
export function resolveQuestTemplate(
  skill: Skill,
  questType: DeterministicQuestType
): DeterministicQuestTemplate {
  const templates = getDeterministicTemplatesForSkill(skill);
  const found = templates.find((t) => t.questType === questType);
  if (found) return found;

  const fallback = getCustomSkillQuestTemplates(skill);
  return fallback.find((t) => t.questType === questType) || fallback[0];
}

/**
 * Resolves all 3 deterministic quest definitions for a given Skill in canonical order:
 * [daily_sharpening, weekly_skill_check, monthly_monument]
 */
export function resolveQuestTemplatesForSkill(skill: Skill): DeterministicQuestTemplate[] {
  return [
    resolveQuestTemplate(skill, DETERMINISTIC_QUEST_TYPES.DAILY_SHARPENING),
    resolveQuestTemplate(skill, DETERMINISTIC_QUEST_TYPES.WEEKLY_SKILL_CHECK),
    resolveQuestTemplate(skill, DETERMINISTIC_QUEST_TYPES.MONTHLY_MONUMENT),
  ];
}

/**
 * Resolves the 3 deterministic quest templates for a given Skill.
 */
export function getDeterministicTemplatesForSkill(skill: Skill): DeterministicQuestTemplate[] {
  const slug = skill.id.toLowerCase().replace(/^skill_/, '');
  if (STARTER_DETERMINISTIC_QUESTS[slug]) {
    return STARTER_DETERMINISTIC_QUESTS[slug];
  }
  // Check by lowercase name as well
  const nameSlug = skill.name.toLowerCase().replace(/[^a-z0-9]+/g, '_');
  if (STARTER_DETERMINISTIC_QUESTS[nameSlug]) {
    return STARTER_DETERMINISTIC_QUESTS[nameSlug];
  }
  // Check finance alias
  if (slug === 'finance' || nameSlug === 'finance') {
    return STARTER_DETERMINISTIC_QUESTS['personal_finance'];
  }
  return getCustomSkillQuestTemplates(skill);
}

/**
 * Calculates current ISO week string for cadence tracking (e.g. "2026-W39")
 */
export function getISOWeekString(date: Date = new Date()): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

/**
 * Reconciles and populates deterministic quests in IndexedDB.
 * Ensures:
 * - Every persistent skill has exactly 3 deterministic quests (Daily Sharpening, Weekly Skill Check, Monthly Monument).
 * - Existing quest states (completion status, streak, practice time, etc.) are never overwritten.
 * - Does NOT create duplicates.
 * - Inactive skills retain their deterministic quests and history intact.
 * - Cleans up only obsolete incomplete auto-generated quests that do not belong to any persistent skill.
 */
export async function reconcileDeterministicQuests(): Promise<Quest[]> {
  try {
    const allSkills = await db.skills.toArray();
    if (allSkills.length === 0) {
      return [];
    }

    // Ensure active skills have sequential priorities if any exist
    let activeSkills = allSkills
      .filter((s) => Boolean(s.active))
      .sort((a, b) => (a.activePriority || 999) - (b.activePriority || 999));

    // Fallback: If no skills are active yet, activate top 3
    if (activeSkills.length === 0) {
      const toActivate = allSkills.slice(0, 3);
      for (let i = 0; i < toActivate.length; i++) {
        await db.skills.update(toActivate[i].id, {
          active: true,
          activePriority: i + 1,
          unlocked: true,
        });
        toActivate[i].active = true;
        toActivate[i].activePriority = i + 1;
      }
      activeSkills = toActivate;
    }

    const allQuests = await db.quests.toArray();
    const todayStr = new Date().toISOString().split('T')[0];
    const currentWeekStr = getISOWeekString(new Date());
    const currentMonthStr = todayStr.slice(0, 7);

    const persistentSkillIds = new Set(allSkills.map((s) => s.id));
    const persistentSkillSlugs = new Set(allSkills.map((s) => s.id.replace(/^skill_/, '')));

    // For EVERY persistent skill (both active and inactive), ensure the 3 deterministic quest types exist
    for (const skill of allSkills) {
      const templates = resolveQuestTemplatesForSkill(skill);

      for (const template of templates) {
        // Look for existing quest by stable relationship: skillId + questType
        const existing = allQuests.find(
          (q) =>
            (q.skillId === skill.id || q.skillId === skill.id.replace(/^skill_/, '')) &&
            q.questType === template.questType
        );

        if (existing && existing.id !== undefined) {
          // Quest exists — preserve progression state!
          // Check self-healing cadence status
          let shouldBeCompleted = Boolean(existing.completedToday);

          if (existing.lastCompletedAt) {
            const completedDateStr = existing.lastCompletedAt.split('T')[0];
            if (template.questType === 'daily_sharpening') {
              if (completedDateStr !== todayStr) {
                shouldBeCompleted = false;
              }
            } else if (template.questType === 'weekly_skill_check') {
              const completedWeekStr = getISOWeekString(new Date(existing.lastCompletedAt));
              if (completedWeekStr !== currentWeekStr) {
                shouldBeCompleted = false;
              }
            } else if (template.questType === 'monthly_monument') {
              const completedMonthStr = completedDateStr.slice(0, 7);
              if (completedMonthStr !== currentMonthStr) {
                shouldBeCompleted = false;
              }
            }
          }

          // Update any metadata while keeping user progress intact
          const updates: Partial<Quest> = {
            title: template.title,
            description: template.description,
            estimatedDuration: template.estimatedDuration,
            durationMinutes: template.durationMinutes,
            xpReward: template.xpReward,
            frequency: template.frequency,
            category: template.category,
            pillarId: template.pillarId,
            primaryStatId: template.primaryStatId,
            identityTag: template.identityTag,
            questType: template.questType,
            skillId: skill.id,
            questBand: template.questBand,
            band: template.questBand,
            completedToday: shouldBeCompleted,
          };

          await db.quests.update(existing.id, updates);
        } else {
          // Quest does not exist yet — create it deterministically
          const newQuest: Omit<Quest, 'id'> = {
            title: template.title,
            description: template.description,
            estimatedDuration: template.estimatedDuration,
            durationMinutes: template.durationMinutes,
            xpReward: template.xpReward,
            frequency: template.frequency,
            category: template.category,
            pillarId: template.pillarId,
            primaryStatId: template.primaryStatId,
            identityTag: template.identityTag,
            questType: template.questType,
            skillId: skill.id,
            questBand: template.questBand,
            band: template.questBand,
            completedToday: false,
            streak: 0,
            completionCount: 0,
            isAutoGenerated: true,
            contentOrigin: 'deterministic_v1',
            createdAt: new Date().toISOString(),
          };

          await db.quests.add(newQuest as Quest);
        }
      }
    }

    // Clean up ONLY obsolete auto-generated incomplete quests that don't belong to ANY persistent skill
    const refreshedQuests = await db.quests.toArray();
    for (const q of refreshedQuests) {
      if (
        q.id !== undefined &&
        !q.completedToday &&
        (q.completionCount || 0) === 0 &&
        q.isAutoGenerated &&
        q.frequency !== 'custom'
      ) {
        const isBelongingToKnownSkill =
          q.skillId &&
          (persistentSkillIds.has(q.skillId) || persistentSkillSlugs.has(q.skillId));
        const hasDeterministicType =
          q.questType === 'daily_sharpening' ||
          q.questType === 'weekly_skill_check' ||
          q.questType === 'monthly_monument';

        if (!isBelongingToKnownSkill || !hasDeterministicType) {
          await db.quests.delete(q.id);
        }
      }
    }

    return await db.quests.toArray();
  } catch (err) {
    console.error('[DeterministicQuestService] Failed to reconcile deterministic quests:', err);
    return await db.quests.toArray();
  }
}

/**
 * Self-healing cadence reset check.
 * Evaluates completion dates against current calendar day, week, and month.
 */
export async function checkAndResetDeterministicCadences(): Promise<void> {
  try {
    const quests = await db.quests.toArray();
    const todayStr = new Date().toISOString().split('T')[0];
    const currentWeekStr = getISOWeekString(new Date());
    const currentMonthStr = todayStr.slice(0, 7);

    for (const q of quests) {
      if (!q.id || !q.completedToday) continue;

      let shouldReset = false;
      if (q.lastCompletedAt) {
        const completedDateStr = q.lastCompletedAt.split('T')[0];
        if (q.questType === 'daily_sharpening') {
          if (completedDateStr !== todayStr) {
            shouldReset = true;
          }
        } else if (q.questType === 'weekly_skill_check') {
          const completedWeekStr = getISOWeekString(new Date(q.lastCompletedAt));
          if (completedWeekStr !== currentWeekStr) {
            shouldReset = true;
          }
        } else if (q.questType === 'monthly_monument') {
          const completedMonthStr = completedDateStr.slice(0, 7);
          if (completedMonthStr !== currentMonthStr) {
            shouldReset = true;
          }
        }
      }

      if (shouldReset) {
        await db.quests.update(q.id, { completedToday: false });
      }
    }
  } catch (err) {
    console.error('[DeterministicQuestService] Cadence reset error:', err);
  }
}
