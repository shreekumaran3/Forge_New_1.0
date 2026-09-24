import {
  ForgePath,
  ForgePathProposal,
  ForgePathUpdate,
  ForgePathMutation,
  ForgePathGoalTrack,
} from '../types';
import { clearAIQuestConceptsCache } from './geminiService';
import { getForgePath, setForgePath } from '../db/database';
export {
  getActiveSkills,
  activateSkill,
  deactivateSkill,
  reorderActiveSkills,
  syncSkillsWithForgePath,
  MAX_ACTIVE_SKILLS,
} from './skillService';

/**
 * Normalizes a skill concept or learning objective for case-insensitive, whitespace-agnostic comparison.
 */
export function normalizeForgeConcept(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

/**
 * Intent-aware Forge Path mutation function.
 * Deterministically applies one of four operations:
 * 1. EXPAND: Keeps existing Forge Path and adds new skills/objectives (Safe Default).
 * 2. REMOVE: Keeps existing Forge Path and removes explicitly requested skills/objectives.
 * 3. REMOVE_ALL_SKILLS: Clears current Forge Path skill set and replaces it with only the newly requested skills.
 * 4. REPLACE: Completely replaces the current Forge Path with a new direction.
 */
export function applyForgePathUpdate(
  existing: ForgePath | null | undefined,
  update: ForgePathUpdate | ForgePathProposal | ForgePath | any
): ForgePath {
  // Structural discrimination:
  // Discriminate based on object structure, not just the presence of a 'mutation' field
  let incomingPath: Partial<ForgePath> | undefined;
  let rawMutation: any = update?.mutation;
  let addedSkillConcepts: string[] | undefined = update?.addedSkillConcepts;
  let removedSkillConcepts: string[] | undefined = update?.removedSkillConcepts;
  let addedLearningObjectives: string[] | undefined = update?.addedLearningObjectives;
  let removedLearningObjectives: string[] | undefined = update?.removedLearningObjectives;
  let incomingGoalTracks: ForgePathGoalTrack[] | undefined = update?.goalTracks;
  let removeAllSkills: boolean = Boolean(
    update?.removeAllSkills ||
    (update?.path as any)?.removeAllSkills ||
    rawMutation === 'remove_all_skills' ||
    (update?.path as any)?.mutation === 'remove_all_skills'
  );

  if (update && typeof update === 'object') {
    if ('path' in update && update.path && typeof update.path === 'object') {
      // Wrapper structure: ForgePathUpdate or ForgePathProposal
      incomingPath = update.path;
      if (!rawMutation && (update as any).mutation) {
        rawMutation = (update as any).mutation;
      }
      if (!addedSkillConcepts && (update.path as any).addedSkillConcepts) {
        addedSkillConcepts = (update.path as any).addedSkillConcepts;
      }
      if (!removedSkillConcepts && (update.path as any).removedSkillConcepts) {
        removedSkillConcepts = (update.path as any).removedSkillConcepts;
      }
      if (!addedLearningObjectives && (update.path as any).addedLearningObjectives) {
        addedLearningObjectives = (update.path as any).addedLearningObjectives;
      }
      if (!removedLearningObjectives && (update.path as any).removedLearningObjectives) {
        removedLearningObjectives = (update.path as any).removedLearningObjectives;
      }
      if (!incomingGoalTracks && (update.path as any).goalTracks) {
        incomingGoalTracks = (update.path as any).goalTracks;
      }
    } else {
      // Direct ForgePath object passed
      incomingPath = update as Partial<ForgePath>;
      if (!incomingGoalTracks && update.goalTracks) {
        incomingGoalTracks = update.goalTracks;
      }
    }
  }

  // Validate mutation type. SAFETY DEFAULT -> treat missing or invalid as 'expand'.
  const mutation: ForgePathMutation =
    rawMutation === 'remove_all_skills' || removeAllSkills
      ? 'remove_all_skills'
      : rawMutation === 'remove' || rawMutation === 'replace' || rawMutation === 'expand'
      ? rawMutation
      : 'expand';

  // Case 0: No existing path -> Return validated new path or default structure
  if (!existing) {
    const rawSkills = Array.isArray(incomingPath?.skillConcepts) ? incomingPath!.skillConcepts : [];
    const validSkills = rawSkills.filter((s): s is string => typeof s === 'string' && Boolean(s.trim()));

    const rawObjectives = Array.isArray(incomingPath?.learningObjectives) ? incomingPath!.learningObjectives : [];
    const validObjectives = rawObjectives.filter((o): o is string => typeof o === 'string' && Boolean(o.trim()));

    const domain = (incomingPath?.domain || 'custom_domain').toLowerCase().replace(/[^a-z0-9_]+/g, '_').slice(0, 30);

    return {
      name: incomingPath?.name?.trim() || 'Personal Pursuit',
      domain: domain || 'custom_domain',
      focus: incomingPath?.focus?.trim() || 'Core Foundations',
      description: incomingPath?.description?.trim() || 'Devote deliberate daily effort to progressive mastery.',
      skillConcepts: validSkills,
      learningObjectives: validObjectives,
      goalTracks: incomingGoalTracks || incomingPath?.goalTracks,
      reasoning: incomingPath?.reasoning,
      isCustom: incomingPath?.isCustom ?? true,
      createdAt: incomingPath?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  // Case 0.5: REMOVE_ALL_SKILLS -> Clears existing path skillConcepts, learningObjectives, and goalTracks.
  // Contains ONLY the newly requested skills and objectives.
  // Note: Historical skill records in database are retained but deactivated in syncSkillsWithForgePath.
  if (mutation === 'remove_all_skills' || removeAllSkills) {
    const rawSkills = [
      ...(Array.isArray(addedSkillConcepts) ? addedSkillConcepts : []),
      ...(Array.isArray(incomingPath?.skillConcepts) ? incomingPath!.skillConcepts : []),
    ];
    const validSkills = Array.from(
      new Set(rawSkills.filter((s): s is string => typeof s === 'string' && Boolean(s.trim())))
    );

    const rawObjectives = [
      ...(Array.isArray(addedLearningObjectives) ? addedLearningObjectives : []),
      ...(Array.isArray(incomingPath?.learningObjectives) ? incomingPath!.learningObjectives : []),
    ];
    const validObjectives = Array.from(
      new Set(rawObjectives.filter((o): o is string => typeof o === 'string' && Boolean(o.trim())))
    );

    const domain = (incomingPath?.domain?.trim() || existing.domain || 'custom_domain')
      .toLowerCase()
      .replace(/[^a-z0-9_]+/g, '_')
      .slice(0, 30);

    return {
      id: existing.id,
      name: incomingPath?.name?.trim() || existing.name,
      domain: domain || 'custom_domain',
      focus: incomingPath?.focus?.trim() || existing.focus,
      description: incomingPath?.description?.trim() || existing.description,
      skillConcepts: validSkills,
      learningObjectives: validObjectives,
      goalTracks: incomingGoalTracks || incomingPath?.goalTracks || [],
      reasoning: incomingPath?.reasoning || existing.reasoning,
      isCustom: true,
      createdAt: existing.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  // Case 1: REPLACE -> Completely replace existing path with new path.
  // Old skills, objectives, and focus are intentionally not preserved.
  if (mutation === 'replace') {
    const rawSkills = Array.isArray(incomingPath?.skillConcepts) ? incomingPath!.skillConcepts : [];
    const validSkills = rawSkills.filter((s): s is string => typeof s === 'string' && Boolean(s.trim()));

    const rawObjectives = Array.isArray(incomingPath?.learningObjectives) ? incomingPath!.learningObjectives : [];
    const validObjectives = rawObjectives.filter((o): o is string => typeof o === 'string' && Boolean(o.trim()));

    const domain = (incomingPath?.domain?.trim() || existing.domain || 'custom_domain')
      .toLowerCase()
      .replace(/[^a-z0-9_]+/g, '_')
      .slice(0, 30);

    return {
      id: existing.id,
      name: incomingPath?.name?.trim() || 'Personal Pursuit',
      domain: domain || 'custom_domain',
      focus: incomingPath?.focus?.trim() || 'Core Foundations',
      description: incomingPath?.description?.trim() || existing.description,
      skillConcepts: validSkills,
      learningObjectives: validObjectives,
      goalTracks: incomingGoalTracks || incomingPath?.goalTracks,
      reasoning: incomingPath?.reasoning || existing.reasoning,
      isCustom: true,
      createdAt: existing.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  // Case 2: REMOVE -> Keep existing path, remove explicitly requested skills/objectives.
  // Existing skills - explicitly removed skills. Unrelated skills and objectives remain intact.
  if (mutation === 'remove') {
    const toRemoveSkills = new Set<string>();
    if (Array.isArray(removedSkillConcepts)) {
      for (const s of removedSkillConcepts) {
        if (s && typeof s === 'string' && s.trim()) {
          toRemoveSkills.add(normalizeForgeConcept(s));
        }
      }
    }
    if (Array.isArray((incomingPath as any)?.removedSkillConcepts)) {
      for (const s of (incomingPath as any).removedSkillConcepts) {
        if (s && typeof s === 'string' && s.trim()) {
          toRemoveSkills.add(normalizeForgeConcept(s));
        }
      }
    }

    const toRemoveObjectives = new Set<string>();
    if (Array.isArray(removedLearningObjectives)) {
      for (const o of removedLearningObjectives) {
        if (o && typeof o === 'string' && o.trim()) {
          toRemoveObjectives.add(normalizeForgeConcept(o));
        }
      }
    }
    if (Array.isArray((incomingPath as any)?.removedLearningObjectives)) {
      for (const o of (incomingPath as any).removedLearningObjectives) {
        if (o && typeof o === 'string' && o.trim()) {
          toRemoveObjectives.add(normalizeForgeConcept(o));
        }
      }
    }

    // Filter existing skills: preserve existing display casing
    const remainingSkills = (existing.skillConcepts || []).filter((sc) => {
      const norm = normalizeForgeConcept(sc);
      return !toRemoveSkills.has(norm);
    });

    // Filter existing learning objectives: preserve existing display casing
    const remainingObjectives = (existing.learningObjectives || []).filter((lo) => {
      const norm = normalizeForgeConcept(lo);
      return !toRemoveObjectives.has(norm);
    });

    // Filter existing goal tracks if any correspond to removed skills
    const remainingGoalTracks = (existing.goalTracks || []).filter((gt) => {
      const trackNorm = normalizeForgeConcept(gt.name);
      return !toRemoveSkills.has(trackNorm);
    });

    // If any newly added skills/objectives were specified during the removal (e.g. swap), merge them
    const existingSkillNormSet = new Set(remainingSkills.map(normalizeForgeConcept));
    const addedSkills = addedSkillConcepts || [];
    for (const s of addedSkills) {
      if (s && typeof s === 'string' && s.trim()) {
        const norm = normalizeForgeConcept(s);
        if (!existingSkillNormSet.has(norm)) {
          remainingSkills.push(s.trim());
          existingSkillNormSet.add(norm);
        }
      }
    }

    const existingObjNormSet = new Set(remainingObjectives.map(normalizeForgeConcept));
    const addedObjectives = addedLearningObjectives || [];
    for (const o of addedObjectives) {
      if (o && typeof o === 'string' && o.trim()) {
        const norm = normalizeForgeConcept(o);
        if (!existingObjNormSet.has(norm)) {
          remainingObjectives.push(o.trim());
          existingObjNormSet.add(norm);
        }
      }
    }

    return {
      ...existing,
      id: existing.id,
      name: incomingPath?.name?.trim() || existing.name,
      domain: (incomingPath?.domain?.trim() || existing.domain || 'custom_domain')
        .toLowerCase()
        .replace(/[^a-z0-9_]+/g, '_')
        .slice(0, 30),
      focus: incomingPath?.focus?.trim() || existing.focus,
      description: incomingPath?.description?.trim() || existing.description,
      skillConcepts: remainingSkills,
      learningObjectives: remainingObjectives,
      goalTracks: remainingGoalTracks,
      reasoning: incomingPath?.reasoning || existing.reasoning,
      isCustom: true,
      createdAt: existing.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  // Case 3: EXPAND (Default) -> Keep existing path and add new skills/objectives.
  // Final skills = existing skills + new skills (deduplicated case-insensitively, preserving original display text).
  const expandedSkills: string[] = [...(existing.skillConcepts || [])];
  const existingSkillNormSet = new Set(expandedSkills.map(normalizeForgeConcept));

  const incomingSkillsToConsider = [
    ...(addedSkillConcepts || []),
    ...(Array.isArray(incomingPath?.skillConcepts) ? incomingPath!.skillConcepts : []),
  ];

  for (const s of incomingSkillsToConsider) {
    if (s && typeof s === 'string' && s.trim()) {
      const clean = s.trim();
      const norm = normalizeForgeConcept(clean);
      if (!existingSkillNormSet.has(norm)) {
        expandedSkills.push(clean);
        existingSkillNormSet.add(norm);
      }
    }
  }

  const expandedObjectives: string[] = [...(existing.learningObjectives || [])];
  const existingObjNormSet = new Set(expandedObjectives.map(normalizeForgeConcept));

  const incomingObjToConsider = [
    ...(addedLearningObjectives || []),
    ...(Array.isArray(incomingPath?.learningObjectives) ? incomingPath!.learningObjectives : []),
  ];

  for (const o of incomingObjToConsider) {
    if (o && typeof o === 'string' && o.trim()) {
      const clean = o.trim();
      const norm = normalizeForgeConcept(clean);
      if (!existingObjNormSet.has(norm)) {
        expandedObjectives.push(clean);
        existingObjNormSet.add(norm);
      }
    }
  }

  // Merge Goal Tracks preserving existing track states (skillId, active, activePriority)
  const mergedGoalTracks: ForgePathGoalTrack[] = [...(existing.goalTracks || [])];
  const existingTrackIds = new Set(mergedGoalTracks.map((t) => t.id.toLowerCase()));
  const existingTrackNames = new Set(mergedGoalTracks.map((t) => t.name.toLowerCase().trim()));

  const incomingTracksToConsider = [
    ...(Array.isArray(incomingGoalTracks) ? incomingGoalTracks : []),
    ...(Array.isArray(incomingPath?.goalTracks) ? incomingPath!.goalTracks : []),
  ];

  for (const t of incomingTracksToConsider) {
    if (t && t.name) {
      const nameKey = t.name.toLowerCase().trim();
      const idKey = (t.id || '').toLowerCase();
      if (!existingTrackNames.has(nameKey) && (!idKey || !existingTrackIds.has(idKey))) {
        mergedGoalTracks.push(t);
        existingTrackNames.add(nameKey);
        if (idKey) existingTrackIds.add(idKey);
      }
    }
  }

  return {
    ...existing,
    id: existing.id,
    name: incomingPath?.name?.trim() || existing.name,
    domain: (incomingPath?.domain?.trim() || existing.domain || 'custom_domain')
      .toLowerCase()
      .replace(/[^a-z0-9_]+/g, '_')
      .slice(0, 30),
    // Focus adjustments are applied without dropping existing crafts
    focus: incomingPath?.focus?.trim() || existing.focus,
    description: incomingPath?.description?.trim() || existing.description,
    skillConcepts: expandedSkills,
    learningObjectives: expandedObjectives,
    goalTracks: mergedGoalTracks.length > 0 ? mergedGoalTracks : undefined,
    reasoning: incomingPath?.reasoning || existing.reasoning,
    isCustom: true,
    createdAt: existing.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Backwards-compatible helper delegating to applyForgePathUpdate with 'expand'.
 */
export function mergeForgePaths(
  existing?: ForgePath,
  incoming?: Partial<ForgePath> | ForgePathProposal
): ForgePath {
  return applyForgePathUpdate(existing, {
    mutation: (incoming as any)?.mutation || 'expand',
    path: incoming,
    addedSkillConcepts: (incoming as any)?.addedSkillConcepts,
    removedSkillConcepts: (incoming as any)?.removedSkillConcepts,
    addedLearningObjectives: (incoming as any)?.addedLearningObjectives,
    removedLearningObjectives: (incoming as any)?.removedLearningObjectives,
  });
}

/**
 * Service-level helper to update the Forge Path deterministically and clear AI concept cache
 */
export async function updateForgePath(
  newPathOrUpdate: ForgePath | ForgePathProposal | ForgePathUpdate
): Promise<ForgePath> {
  clearAIQuestConceptsCache();
  const existing = await getForgePath();

  let finalPath: ForgePath;
  if ('path' in newPathOrUpdate && (newPathOrUpdate as any).path) {
    // Structural check: It is explicitly a ForgePathUpdate wrapping an inner path
    finalPath = applyForgePathUpdate(existing, newPathOrUpdate as ForgePathUpdate);
  } else if ('mutation' in newPathOrUpdate && !('name' in newPathOrUpdate)) {
    // Structural check: It is a ForgePathUpdate without a direct path name
    finalPath = applyForgePathUpdate(existing, newPathOrUpdate as ForgePathUpdate);
  } else if ('name' in newPathOrUpdate) {
    // It is a ForgePath or ForgePathProposal (which may contain mutation and removeAllSkills)
    const p = newPathOrUpdate as any;
    finalPath = applyForgePathUpdate(existing, {
      mutation: p.mutation || 'expand',
      removeAllSkills: p.removeAllSkills,
      path: p,
      addedSkillConcepts: p.addedSkillConcepts,
      removedSkillConcepts: p.removedSkillConcepts,
      addedLearningObjectives: p.addedLearningObjectives,
      removedLearningObjectives: p.removedLearningObjectives,
      goalTracks: p.goalTracks,
    });
  } else {
    finalPath = applyForgePathUpdate(existing, {
      mutation: 'expand',
      path: newPathOrUpdate as any,
    });
  }

  await setForgePath(finalPath);
  return finalPath;
}

export { clearAIQuestConceptsCache } from './geminiService';
