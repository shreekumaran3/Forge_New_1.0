import {
  Skill,
  SkillCurriculumStage,
  ForgePath,
  ForgePathGoalTrack,
  DevelopmentDomain,
  SkillMilestone,
} from '../types';
import { db } from '../db/database';
import { getDomainMapping } from '../data/questDomainMapping';
import { resolveGoalTracksForForgePath, SKILL_ROADMAPS } from './apeEngine';
import { clearAIQuestConceptsCache } from './geminiService';
import { STARTER_SKILLS, getStarterSkills } from '../data/starterSkillsData';
import { reconcileDeterministicQuests } from './deterministicQuestService';

export { STARTER_SKILLS, getStarterSkills };

export const MAX_ACTIVE_SKILLS = 3;

/**
 * Normalizes an identifier string into a clean lowercase slug.
 */
export function generateSkillSlug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .slice(0, 32);
}

/**
 * Fetches all currently active skills (up to 3), sorted strictly by activePriority (1, 2, 3).
 * If priorities have discrepancies or gaps, repairs them and saves to db.skills.
 */
export async function getActiveSkills(): Promise<Skill[]> {
  try {
    const allSkills = await db.skills.toArray();
    const activeList = allSkills
      .filter((s) => Boolean(s.active))
      .sort((a, b) => (a.activePriority || 999) - (b.activePriority || 999));

    // Cap at MAX_ACTIVE_SKILLS and normalize priorities to 1, 2, 3
    let needsNormalization = false;
    const capped = activeList.slice(0, MAX_ACTIVE_SKILLS);

    // If more than 3 were marked active, deactivate the excess
    if (activeList.length > MAX_ACTIVE_SKILLS) {
      needsNormalization = true;
      for (let i = MAX_ACTIVE_SKILLS; i < activeList.length; i++) {
        await db.skills.update(activeList[i].id, {
          active: false,
          activePriority: undefined,
        });
        activeList[i].active = false;
        activeList[i].activePriority = undefined;
      }
    }

    // Verify priorities are 1, 2, 3 without gaps or duplicates
    for (let i = 0; i < capped.length; i++) {
      const targetPriority = i + 1;
      if (capped[i].activePriority !== targetPriority) {
        needsNormalization = true;
        capped[i].activePriority = targetPriority;
        await db.skills.update(capped[i].id, { activePriority: targetPriority });
      }
    }

    return capped;
  } catch (err) {
    console.warn('Failed to get active skills:', err);
    return [];
  }
}

/**
 * Activates a skill into the active roster (max 3 skills).
 * Rejects if 3 skills are already active without silently deactivating others.
 */
export async function activateSkill(
  skillId: string
): Promise<{ success: boolean; reason?: string; activeSkills: Skill[] }> {
  try {
    const skill = await db.skills.get(skillId);
    if (!skill) {
      const active = await getActiveSkills();
      return { success: false, reason: `Skill '${skillId}' not found`, activeSkills: active };
    }

    const currentActive = await getActiveSkills();

    // Already active
    if (skill.active) {
      return { success: true, activeSkills: currentActive };
    }

    // Max 3 active skills limit check
    if (currentActive.length >= MAX_ACTIVE_SKILLS) {
      return {
        success: false,
        reason: `Maximum of ${MAX_ACTIVE_SKILLS} active skills reached. Deactivate a skill before activating another.`,
        activeSkills: currentActive,
      };
    }

    // Assign next available priority (1, 2, or 3)
    const usedPriorities = new Set(currentActive.map((s) => s.activePriority).filter(Boolean));
    let nextPriority = 1;
    for (let p = 1; p <= MAX_ACTIVE_SKILLS; p++) {
      if (!usedPriorities.has(p)) {
        nextPriority = p;
        break;
      }
    }

    await db.skills.update(skillId, {
      active: true,
      activePriority: nextPriority,
      unlocked: true,
    });

    skill.active = true;
    skill.activePriority = nextPriority;
    skill.unlocked = true;

    // Sync corresponding goalTrack in ForgePath if one exists
    await syncGoalTrackActiveState(skillId, true, nextPriority);

    clearAIQuestConceptsCache();
    await reconcileDeterministicQuests();
    const updatedActive = await getActiveSkills();
    return { success: true, activeSkills: updatedActive };
  } catch (err) {
    console.error('Failed to activate skill:', err);
    const active = await getActiveSkills();
    return { success: false, reason: String(err), activeSkills: active };
  }
}

/**
 * Deactivates an active skill.
 * Clears activePriority and compacts remaining active skill priorities (e.g. 1, 3 -> 1, 2).
 * Existing progression (XP, Level, Milestones, History) is completely preserved.
 */
export async function deactivateSkill(
  skillId: string
): Promise<{ success: boolean; reason?: string; activeSkills: Skill[] }> {
  try {
    const skill = await db.skills.get(skillId);
    if (!skill) {
      const active = await getActiveSkills();
      return { success: false, reason: `Skill '${skillId}' not found`, activeSkills: active };
    }

    if (!skill.active) {
      const active = await getActiveSkills();
      return { success: true, activeSkills: active };
    }

    // Deactivate target skill
    await db.skills.update(skillId, {
      active: false,
      activePriority: undefined,
    });

    // Compact remaining active skill priorities
    const allSkills = await db.skills.toArray();
    const remaining = allSkills
      .filter((s) => s.id !== skillId && Boolean(s.active))
      .sort((a, b) => (a.activePriority || 999) - (b.activePriority || 999));

    for (let i = 0; i < remaining.length; i++) {
      const newPriority = i + 1;
      remaining[i].activePriority = newPriority;
      await db.skills.update(remaining[i].id, { activePriority: newPriority });
    }

    // Sync goalTrack in ForgePath
    await syncGoalTrackActiveState(skillId, false, undefined);

    clearAIQuestConceptsCache();
    await reconcileDeterministicQuests();
    const updatedActive = await getActiveSkills();
    return { success: true, activeSkills: updatedActive };
  } catch (err) {
    console.error('Failed to deactivate skill:', err);
    const active = await getActiveSkills();
    return { success: false, reason: String(err), activeSkills: active };
  }
}

/**
 * Reorders active skills to match the provided skillIds order.
 * Takes 1 to 3 active skill IDs and sets activePriority to 1, 2, 3 in that exact order.
 */
export async function reorderActiveSkills(
  skillIds: string[]
): Promise<{ success: boolean; reason?: string; activeSkills: Skill[] }> {
  try {
    if (!Array.isArray(skillIds) || skillIds.length === 0) {
      const active = await getActiveSkills();
      return { success: false, reason: 'Invalid skill IDs provided for reordering', activeSkills: active };
    }

    if (skillIds.length > MAX_ACTIVE_SKILLS) {
      const active = await getActiveSkills();
      return {
        success: false,
        reason: `Cannot reorder more than ${MAX_ACTIVE_SKILLS} active skills`,
        activeSkills: active,
      };
    }

    for (let i = 0; i < skillIds.length; i++) {
      const id = skillIds[i];
      const targetPriority = i + 1;
      await db.skills.update(id, {
        active: true,
        activePriority: targetPriority,
      });
      await syncGoalTrackActiveState(id, true, targetPriority);
    }

    clearAIQuestConceptsCache();
    const updatedActive = await getActiveSkills();
    return { success: true, activeSkills: updatedActive };
  } catch (err) {
    console.error('Failed to reorder active skills:', err);
    const active = await getActiveSkills();
    return { success: false, reason: String(err), activeSkills: active };
  }
}

/**
 * Helper to sync a skill's active status with the corresponding ForgePath goalTrack.
 */
async function syncGoalTrackActiveState(
  skillId: string,
  active: boolean,
  activePriority?: number
): Promise<void> {
  try {
    const forgePath = await db.forgePath.toCollection().first();
    if (!forgePath || !Array.isArray(forgePath.goalTracks) || forgePath.goalTracks.length === 0) {
      return;
    }

    let modified = false;
    const updatedTracks = forgePath.goalTracks.map((gt) => {
      const matches =
        gt.skillId === skillId ||
        gt.id === skillId ||
        gt.id === `gt_${skillId.replace(/^skill_/, '')}` ||
        skillId === `skill_${gt.id.replace(/^gt_/, '')}`;

      if (matches) {
        modified = true;
        return {
          ...gt,
          skillId,
          active,
          activePriority: active ? activePriority : undefined,
        };
      }
      return gt;
    });

    if (modified && forgePath.id) {
      await db.forgePath.update(forgePath.id, {
        goalTracks: updatedTracks,
        updatedAt: new Date().toISOString(),
      });
    }
  } catch (err) {
    console.warn('Failed to sync goal track active state:', err);
  }
}

/**
 * Synchronizes persistent skills with a Forge Path's goalTracks.
 * Ensures:
 * 1. Every goal track has a persistent Skill with curriculum stages & capabilities.
 * 2. Historical progression (level, currentXp, lifetimeXp, milestones) is NEVER erased.
 * 3. Exactly up to 3 skills are active with priorities 1, 2, 3 (defaults first 3 if none active).
 */
export async function syncSkillsWithForgePath(path: ForgePath): Promise<Skill[]> {
  try {
    const resolvedTracks = resolveGoalTracksForForgePath(path);
    const existingSkills = await db.skills.toArray();

    // Map existing skills by ID and by normalized name
    const skillMap = new Map<string, Skill>();
    const nameMap = new Map<string, Skill>();
    existingSkills.forEach((s) => {
      skillMap.set(s.id.toLowerCase(), s);
      nameMap.set(s.name.toLowerCase().trim(), s);
    });

    const activeSkillsBefore = existingSkills.filter((s) => Boolean(s.active));
    const activeSkillCountBefore = activeSkillsBefore.length;
    const currentForgeSkillIds = new Set<string>();

    for (let i = 0; i < resolvedTracks.length; i++) {
      const track = resolvedTracks[i];
      const cleanTrackName = track.name.trim();
      const stableSlug = track.skillId || `skill_${track.id.replace(/^gt_/, '')}`;

      // Check if matching skill already exists using stable ID or normalized name
      // NOTE: Do NOT match by domain alone (Part 12)
      const existing =
        (track.skillId ? skillMap.get(track.skillId.toLowerCase()) : undefined) ||
        skillMap.get(stableSlug.toLowerCase()) ||
        nameMap.get(cleanTrackName.toLowerCase()) ||
        (track.id ? skillMap.get(track.id.toLowerCase()) : undefined);

      const dom = (track.domain || path.domain || 'custom_domain') as DevelopmentDomain;
      const domainMap = getDomainMapping(dom);

      // Build curriculum stages (prioritizes track.stages, then roadmap, then fallback)
      const stages: SkillCurriculumStage[] = buildCurriculumStagesForTrack(track);

      if (existing) {
        currentForgeSkillIds.add(existing.id);

        // PRESERVE historical progression! Only update curriculum metadata & link
        const incomingHasStages = Boolean(track.stages && track.stages.length > 0);
        const stagesToUse = incomingHasStages
          ? stages
          : (existing.stages?.length ? existing.stages : stages);

        const updatedSkill: Partial<Skill> = {
          goalTrackId: track.id,
          domain: dom,
          currentStage: track.currentStage || existing.currentStage || 1,
          totalStages: track.totalStages || existing.totalStages || stagesToUse.length || 7,
          stageName: track.stageName || existing.stageName || stagesToUse[0]?.title || 'Fundamentals',
          stagePurpose: track.stagePurpose || existing.stagePurpose || stagesToUse[0]?.purpose,
          capabilities: track.capabilities?.length ? track.capabilities : (existing.capabilities?.length ? existing.capabilities : []),
          concreteActions: track.concreteActions?.length ? track.concreteActions : (existing.concreteActions?.length ? existing.concreteActions : []),
          stages: stagesToUse,
        };

        // If track explicitly specifies active state, update it; otherwise preserve existing active state
        if (track.active !== undefined) {
          updatedSkill.active = track.active;
          updatedSkill.activePriority = track.activePriority;
        } else {
          updatedSkill.active = existing.active;
          updatedSkill.activePriority = existing.activePriority;
        }

        await db.skills.update(existing.id, updatedSkill);
        track.skillId = existing.id;
        track.active = updatedSkill.active !== undefined ? updatedSkill.active : existing.active;
        track.activePriority = updatedSkill.activePriority !== undefined ? updatedSkill.activePriority : existing.activePriority;
      } else {
        currentForgeSkillIds.add(stableSlug);

        // Create new persistent Skill (strictly inactive by default unless explicitly marked active)
        const shouldDefaultActive = Boolean(track.active);
        const initialPriority = track.activePriority !== undefined ? track.activePriority : undefined;

        const initialMilestones: SkillMilestone[] = stages.slice(0, 3).map((stg, sIdx) => ({
          id: `${stableSlug}_m${stg.stageNumber || sIdx + 1}`,
          skillId: stableSlug,
          title: stg.title,
          description: stg.purpose || stg.description || `Master Stage ${stg.stageNumber} capability.`,
          tier: sIdx + 1,
          requiredSkillLevel: sIdx === 0 ? 1 : (sIdx + 1) * 2,
          completed: false,
          unlocked: sIdx === 0,
          prerequisiteId: sIdx > 0 ? `${stableSlug}_m${sIdx}` : undefined,
        }));

        const newSkill: Skill = {
          id: stableSlug,
          name: cleanTrackName,
          category: dom,
          pillarId: domainMap.pillarId,
          primaryStatId: domainMap.primaryStatId,
          iconName: inferIconNameForDomain(dom),
          description: track.description || `Core pursuit track for ${cleanTrackName}`,
          unlocked: true,
          level: 1,
          currentXp: 0,
          lifetimeXp: 0,
          totalPracticeSeconds: 0,
          rank: 'Novice',
          todayProgressCount: 0,
          weeklyProgressCount: 0,
          nextMilestoneTitle: initialMilestones[0]?.title || `${cleanTrackName} Fundamentals`,
          estimatedCompletion: '4-6 weeks',
          milestones: initialMilestones,
          domain: dom,
          goalTrackId: track.id,
          active: shouldDefaultActive,
          activePriority: initialPriority,
          currentStage: track.currentStage || 1,
          totalStages: track.totalStages || stages.length || 7,
          stageName: track.stageName || stages[0]?.title || 'Fundamentals',
          stagePurpose: track.stagePurpose || stages[0]?.purpose,
          capabilities: track.capabilities || [],
          concreteActions: track.concreteActions || [],
          stages,
          progressionHistory: [],
          questHistory: [],
        };

        await db.skills.add(newSkill);
        track.skillId = stableSlug;
        track.active = newSkill.active;
        track.activePriority = newSkill.activePriority;
      }
    }

    // Part 11: Reconcile persistent skills:
    // Stale persistent skills that do NOT correspond to a current Forge Path Goal Track
    // become inactive (active: false, activePriority: undefined) but remain in db with all history intact.
    // Custom user-created skills (isCustom: true) are preserved and never automatically deactivated.
    for (const skill of existingSkills) {
      if (skill.isCustom) {
        continue;
      }
      if (!currentForgeSkillIds.has(skill.id)) {
        if (skill.active || skill.activePriority !== undefined) {
          await db.skills.update(skill.id, {
            active: false,
            activePriority: undefined,
          });
        }
      }
    }

    // Ensure active roster has at most 3 skills and sequential priorities
    await getActiveSkills();

    return await db.skills.toArray();
  } catch (err) {
    console.error('Failed to sync skills with Forge Path:', err);
    return [];
  }
}

/**
 * Builds curriculum stages from a goal track or the domain's roadmap.
 * Priority:
 * 1. If track.stages exists and contains valid stages: use track.stages exactly.
 * 2. Otherwise if an appropriate SKILL_ROADMAP exists: use roadmap.
 * 3. Otherwise: fallback 5-stage progressive structure.
 */
function buildCurriculumStagesForTrack(track: ForgePathGoalTrack): SkillCurriculumStage[] {
  if (Array.isArray(track.stages) && track.stages.length > 0) {
    return track.stages;
  }

  const dom = (track.domain || '').toLowerCase();
  const roadmap = SKILL_ROADMAPS[dom];

  if (roadmap && roadmap.length > 0) {
    return roadmap.map((def) => ({
      stageNumber: def.stageNumber,
      title: def.title,
      description: def.description,
      purpose: def.description,
      capabilities: [def.title, def.masteryGateRequirement],
      concreteActions: def.sampleQuests || [],
      sampleQuests: def.sampleQuests || [],
      milestoneGoal: def.masteryGateRequirement,
      completed: false,
    }));
  }

  // Fallback 5-stage progressive structure
  const name = track.name || 'Craft';
  return [
    {
      stageNumber: 1,
      title: `${name} Fundamentals & Habit Baseline`,
      description: 'Daily deliberate practice and core mechanics.',
      purpose: 'Establish core execution fundamentals',
      capabilities: [`${name} Foundations`, 'Execution Consistency'],
      concreteActions: track.concreteActions?.length ? track.concreteActions : [`${name} 20-Min Practice Session`],
      sampleQuests: [`${name} 20-Min Practice Session`],
      milestoneGoal: `Complete Stage 1 ${name} Baseline`,
      completed: false,
    },
    {
      stageNumber: 2,
      title: `${name} Technique & Mechanics`,
      description: 'Refine precision, eliminate errors, and build stamina.',
      purpose: 'Mechanical precision and form consistency',
      capabilities: ['Precision Control', 'Error Recovery'],
      concreteActions: [`${name} Mechanical Precision Drill`],
      sampleQuests: [`${name} Mechanical Precision Drill`],
      milestoneGoal: `Demonstrate Consistent ${name} Technique`,
      completed: false,
    },
    {
      stageNumber: 3,
      title: `${name} Intermediate Application`,
      description: 'Sustained projects, complex challenges, and variable conditions.',
      purpose: 'Endurance and problem solving under varied demands',
      capabilities: ['Project Execution', 'Adaptive Technique'],
      concreteActions: [`${name} 35-Min Creative Challenge`],
      sampleQuests: [`${name} 35-Min Creative Challenge`],
      milestoneGoal: `Complete Intermediate ${name} Milestone`,
      completed: false,
    },
    {
      stageNumber: 4,
      title: `${name} Advanced Integration`,
      description: 'High-speed execution, deep nuance, and portfolio creation.',
      purpose: 'Master-level speed, synthesis, and creative voice',
      capabilities: ['Nuance & Styling', 'Original Synthesis'],
      concreteActions: [`${name} Advanced Production Block`],
      sampleQuests: [`${name} Advanced Production Block`],
      milestoneGoal: `Publish or Complete Advanced ${name} Project`,
      completed: false,
    },
    {
      stageNumber: 5,
      title: `${name} Mastery & Capstone`,
      description: 'Original published masterworks, benchmarks, and mentorship.',
      purpose: 'Complete creative autonomy and landmark achievements',
      capabilities: ['Virtuosity', 'Original Innovation'],
      concreteActions: [`${name} Capstone Masterwork Execution`],
      sampleQuests: [`${name} Capstone Masterwork Execution`],
      milestoneGoal: `Summit Landmark ${name} Capstone`,
      completed: false,
    },
  ];
}

function inferIconNameForDomain(domain: string): string {
  const d = domain.toLowerCase();
  if (d.includes('draw') || d.includes('art')) return 'Palette';
  if (d.includes('climb') || d.includes('mountain') || d.includes('hike')) return 'Mountain';
  if (d.includes('story') || d.includes('writ')) return 'BookOpen';
  if (d.includes('fit') || d.includes('body') || d.includes('lift')) return 'Flame';
  if (d.includes('cook') || d.includes('food') || d.includes('chef')) return 'Utensils';
  if (d.includes('finance') || d.includes('money') || d.includes('invest') || d.includes('budget')) return 'Coins';
  if (d.includes('mind') || d.includes('fortitude') || d.includes('focus')) return 'Brain';
  if (d.includes('code') || d.includes('software')) return 'Code';
  if (d.includes('japan') || d.includes('lang')) return 'Languages';
  return 'Sparkles';
}

/**
 * Seeds the 5 preset starter skills (Drawing, Writing, Fitness, Cooking, Personal Finance)
 * into db.skills if they do not already exist.
 *
 * CRITICAL: Preserves existing user skills and progression — never overwrites or duplicates!
 */
export async function seedStarterSkills(): Promise<Skill[]> {
  try {
    const existingSkills = await db.skills.toArray();
    const existingIds = new Set(existingSkills.map((s) => s.id));
    const existingNames = new Set(existingSkills.map((s) => s.name.trim().toLowerCase()));

    const starterCatalog = getStarterSkills();
    for (const starter of starterCatalog) {
      if (!existingIds.has(starter.id) && !existingNames.has(starter.name.trim().toLowerCase())) {
        await db.skills.add(starter);
      }
    }
    return await db.skills.toArray();
  } catch (err) {
    console.error('Failed to seed starter skills:', err);
    return [];
  }
}

/**
 * Selects up to 3 active skills for the player (used in onboarding & skill selection).
 * Enforces the 3-skill active limit, marks chosen skills active with priorities 1, 2, 3,
 * and deactivates any other active skills.
 */
export async function selectOnboardingSkills(skillIds: string[]): Promise<Skill[]> {
  try {
    if (!Array.isArray(skillIds)) {
      throw new Error('Expected array of skill IDs');
    }
    const sanitizedIds = skillIds.slice(0, MAX_ACTIVE_SKILLS);

    // Ensure all existing skills are in memory
    const allSkills = await db.skills.toArray();
    const skillMap = new Map(allSkills.map((s) => [s.id, s]));

    // Deactivate currently active skills that are not in the new selection
    for (const skill of allSkills) {
      if (skill.active && !sanitizedIds.includes(skill.id)) {
        await db.skills.update(skill.id, {
          active: false,
          activePriority: undefined,
        });
      }
    }

    // Activate the chosen skills with priority 1, 2, 3
    for (let i = 0; i < sanitizedIds.length; i++) {
      const id = sanitizedIds[i];
      const priority = i + 1;
      let existing = skillMap.get(id);

      if (!existing) {
        // Check if it's one of the 5 starter skills
        const starter = getStarterSkills().find((s) => s.id === id);
        if (starter) {
          starter.active = true;
          starter.activePriority = priority;
          starter.unlocked = true;
          await db.skills.put(starter);
          continue;
        }
      }

      await db.skills.update(id, {
        active: true,
        activePriority: priority,
        unlocked: true,
      });
      await syncGoalTrackActiveState(id, true, priority);
    }

    clearAIQuestConceptsCache();
    await reconcileDeterministicQuests();
    return await getActiveSkills();
  } catch (err) {
    console.error('Failed to select onboarding skills:', err);
    return await getActiveSkills();
  }
}

/**
 * Adds a new custom skill to the player's persistent skill collection.
 * Enforces:
 * - Persistent/owned skills can exceed 3.
 * - Active skills are strictly capped at MAX_ACTIVE_SKILLS (3).
 * - Newly added skill defaults to inactive if all 3 active slots are occupied.
 * - Does NOT silently deactivate any existing active skill.
 * - Calls reconcileDeterministicQuests to generate the 3 deterministic quest types for the new skill.
 */
export async function addCustomSkill(skillDef: {
  name: string;
  category?: string;
  pillarId?: Skill['pillarId'];
  primaryStatId?: Skill['primaryStatId'];
  iconName?: string;
  description?: string;
  domain?: string;
  active?: boolean;
}): Promise<Skill> {
  const trimmedName = skillDef.name.trim();
  let slug = generateSkillSlug(trimmedName);

  // If a skill with this slug already exists, generate a unique slug
  const existing = await db.skills.get(slug);
  if (existing) {
    slug = `${slug}_${Math.random().toString(36).slice(2, 6)}`;
  }

  // Active status rules:
  // Persistent skills are NOT limited to 3, but ACTIVE focus skills are capped at 3.
  // If 3 active slots are occupied, the new skill MUST be inactive by default.
  const currentActive = await getActiveSkills();
  const canBeActive = currentActive.length < MAX_ACTIVE_SKILLS;
  const shouldBeActive = canBeActive && Boolean(skillDef.active);
  const activePriority = shouldBeActive ? currentActive.length + 1 : undefined;

  const category = skillDef.category || 'Practical Wisdom';
  const pillarId = skillDef.pillarId || 'wisdom';
  const primaryStatId = skillDef.primaryStatId || 'knowledge';
  const iconName = skillDef.iconName || inferIconNameForDomain(trimmedName);
  const description = skillDef.description || `Mastery and deliberate real-world practice of ${trimmedName}.`;
  const domain = skillDef.domain || slug;

  const newSkill: Skill = {
    id: slug,
    name: trimmedName,
    category,
    pillarId,
    primaryStatId,
    iconName,
    description,
    unlocked: true,
    level: 1,
    currentXp: 0,
    lifetimeXp: 0,
    rank: 'Novice',
    todayProgressCount: 0,
    weeklyProgressCount: 0,
    totalPracticeSeconds: 0,
    nextMilestoneTitle: `${trimmedName} Fundamentals`,
    estimatedCompletion: '4-6 weeks',
    domain,
    active: shouldBeActive,
    activePriority,
    isCustom: true,
    currentStage: 1,
    totalStages: 5,
    stageName: `${trimmedName} Fundamentals & Baseline`,
    stagePurpose: `Establish foundational mechanics and consistent daily practice of ${trimmedName}`,
    capabilities: [`${trimmedName} Core Mechanics`, 'Daily Practice Routine'],
    concreteActions: [`20-minute focused ${trimmedName} practice sprint`],
    milestones: [
      { id: `${slug}_m1`, skillId: slug, tier: 1, title: `${trimmedName} Fundamentals`, description: `Complete initial deliberate practice baseline for ${trimmedName}.`, completed: false, unlocked: true, requiredSkillLevel: 1 },
      { id: `${slug}_m2`, skillId: slug, tier: 2, title: `${trimmedName} Technique & Precision`, description: `Demonstrate controlled mechanical consistency.`, completed: false, prerequisiteId: `${slug}_m1`, unlocked: false, requiredSkillLevel: 2 },
      { id: `${slug}_m3`, skillId: slug, tier: 3, title: `${trimmedName} Intermediate Project`, description: `Execute an integrated challenge or project using ${trimmedName}.`, completed: false, prerequisiteId: `${slug}_m2`, unlocked: false, requiredSkillLevel: 4 },
      { id: `${slug}_m4`, skillId: slug, tier: 4, title: `${trimmedName} Advanced Nuance`, description: `Perform under speed and variable friction.`, completed: false, prerequisiteId: `${slug}_m3`, unlocked: false, requiredSkillLevel: 6 },
      { id: `${slug}_m5`, skillId: slug, tier: 5, title: `${trimmedName} Capstone Masterwork`, description: `Complete a landmark capstone achievement in ${trimmedName}.`, completed: false, prerequisiteId: `${slug}_m4`, unlocked: false, requiredSkillLevel: 8 },
    ],
    stages: [
      {
        stageNumber: 1,
        title: `${trimmedName} Fundamentals & Baseline`,
        description: `Establish daily deliberate practice and basic mechanics for ${trimmedName}.`,
        purpose: 'Build consistent execution habits and muscle memory',
        capabilities: [`${trimmedName} Basics`],
        concreteActions: [`20-minute ${trimmedName} practice session`],
        sampleQuests: [`20-Min ${trimmedName} Practice Sprint`],
        milestoneGoal: `Complete ${trimmedName} Fundamentals`,
        completed: false,
      },
      {
        stageNumber: 2,
        title: `${trimmedName} Technique & Precision`,
        description: 'Refine form, eliminate mechanical errors, and increase stamina.',
        purpose: 'Establish dependable execution consistency',
        capabilities: ['Precision Control'],
        concreteActions: [`Focused ${trimmedName} drill`],
        sampleQuests: [`${trimmedName} Technique Drill`],
        milestoneGoal: `Complete ${trimmedName} Technique & Precision`,
        completed: false,
      },
      {
        stageNumber: 3,
        title: `${trimmedName} Intermediate Application`,
        description: 'Sustained challenges, complex problem solving, and intermediate projects.',
        purpose: 'Apply fundamentals under complex realistic constraints',
        capabilities: ['Project Execution'],
        concreteActions: [`30-minute ${trimmedName} project session`],
        sampleQuests: [`${trimmedName} Intermediate Project Block`],
        milestoneGoal: `Complete ${trimmedName} Intermediate Project`,
        completed: false,
      },
      {
        stageNumber: 4,
        title: `${trimmedName} Advanced Integration`,
        description: 'Nuanced execution, high-speed execution, and original synthesis.',
        purpose: 'Reach professional fluidity and personal voice',
        capabilities: ['Original Synthesis'],
        concreteActions: [`Advanced ${trimmedName} production sprint`],
        sampleQuests: [`${trimmedName} Advanced Sprint`],
        milestoneGoal: `Complete ${trimmedName} Advanced Nuance`,
        completed: false,
      },
      {
        stageNumber: 5,
        title: `${trimmedName} Mastery & Capstone`,
        description: 'Original public masterworks, benchmark achievement, and mentorship.',
        purpose: 'Complete autonomy and landmark excellence',
        capabilities: ['Virtuosity'],
        concreteActions: [`Execute landmark ${trimmedName} capstone project`],
        sampleQuests: [`${trimmedName} Capstone Challenge`],
        milestoneGoal: `Complete ${trimmedName} Capstone Masterwork`,
        completed: false,
      },
    ],
    progressionHistory: [],
    questHistory: [],
  };

  await db.skills.add(newSkill);
  clearAIQuestConceptsCache();
  // Ensure the 3 deterministic quest definitions are immediately created for this persistent skill
  await reconcileDeterministicQuests();
  return newSkill;
}

