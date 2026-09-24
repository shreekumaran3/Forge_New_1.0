import { AIQuestConcept, DailyQuestIntent, ForgePath } from '../types';
import { isGenericTitle, isConcreteAction } from './questQuality';

export interface InterpretPathResult {
  pathName: string;
  description: string;
  domain: string;
  focus: string;
  skillConcepts: string[];
  learningObjectives: string[];
  reasoning?: string;
  readyToApply?: boolean;
  reply?: string;
}

/**
 * Client-side fallback for interpreting a user's Forge Path description
 */
function localFallbackInterpretPath(userGoal: string): InterpretPathResult {
  const raw = (userGoal || '').trim();
  const lower = raw.toLowerCase();
  const slug = lower.replace(/[^a-z0-9]+/g, '_').slice(0, 30) || 'custom_path';
  const title = raw.length > 0 ? raw.charAt(0).toUpperCase() + raw.slice(1) : 'Focused Craft';

  let focus = 'Core Foundations';
  let skillConcepts = [
    `${title} Fundamentals`,
    `${title} Mechanics & Techniques`,
    `${title} Intermediate Practice`,
    `${title} Creative Output`,
    `${title} Advanced Mastery`,
  ];
  let learningObjectives = [
    `Establish a daily discipline in ${title}`,
    `Build technical execution consistency and confidence`,
    `Complete progressive milestone projects in ${title}`,
  ];

  if (lower.includes('photo') || lower.includes('camera') || lower.includes('lens')) {
    focus = 'Composition & Lighting';
    skillConcepts = [
      'Camera Fundamentals & Exposure',
      'Visual Composition & Framing',
      'Lighting & Contrast Study',
      'Visual Storytelling & Series',
      'Post-Processing & Portfolio Curation',
    ];
    learningObjectives = [
      'Master the exposure triangle and manual aperture/shutter control',
      'Develop intuition for natural light, geometry, and framing',
      'Complete curated photo essays and exhibition-ready prints',
    ];
  } else if (lower.includes('japan') || lower.includes('language') || lower.includes('spanish') || lower.includes('french') || lower.includes('german')) {
    focus = 'Core Vocabulary & Grammar';
    skillConcepts = [
      'Core Vocabulary & SRS Drills',
      'Grammar & Sentence Patterns',
      'Listening Comprehension & Immersion',
      'Speaking & Pronunciation Practice',
      'Reading Native Literature',
    ];
    learningObjectives = [
      'Build retention of core high-frequency words and expressions',
      'Hold confident daily conversations with native fluency',
      'Read native books, articles, and cultural works',
    ];
  } else if (lower.includes('code') || lower.includes('software') || lower.includes('program') || lower.includes('python') || lower.includes('rust') || lower.includes('web')) {
    focus = 'Core Algorithms & Systems';
    skillConcepts = [
      'Programming Foundations & Syntax',
      'Data Structures & Algorithms',
      'System Architecture & Design',
      'Hands-On Project Building',
      'Performance Optimization & Testing',
    ];
    learningObjectives = [
      'Design and deploy resilient software applications',
      'Solve complex algorithmic problems with elegance',
      'Contribute to production-grade repositories and architectures',
    ];
  }

  return {
    pathName: title,
    description: `Dedicate regular focused effort to forging true mastery in ${title}.`,
    domain: slug,
    focus,
    skillConcepts,
    learningObjectives,
  };
}

/**
 * Client-side fallback for interpreting daily intent
 */
function localFallbackInterpretDailyIntent(userPrompt: string): Partial<DailyQuestIntent> {
  const prompt = (userPrompt || '').toLowerCase();
  let availableMinutes: number | undefined;

  const minMatch = prompt.match(/(\d+)\s*(?:mins?|minutes?|m\b)/i);
  if (minMatch) {
    const parsed = parseInt(minMatch[1], 10);
    if (!isNaN(parsed) && parsed >= 5 && parsed <= 480) {
      availableMinutes = parsed;
    }
  } else if (prompt.includes('two hour') || prompt.includes('2 hour') || prompt.includes('120 min')) {
    availableMinutes = 120;
  } else if (prompt.includes('half hour') || prompt.includes('30 min')) {
    availableMinutes = 30;
  } else if (prompt.includes('hour') || prompt.includes('60 min')) {
    availableMinutes = 60;
  } else if (prompt.includes('quick') || prompt.includes('15 min') || prompt.includes('10 min')) {
    availableMinutes = 15;
  } else if (prompt.includes('45 min')) {
    availableMinutes = 45;
  }

  let energyPreference: 'low' | 'moderate' | 'high' | 'peak' = 'moderate';
  if (prompt.includes('tired') || prompt.includes('exhausted') || prompt.includes('low energy') || prompt.includes('sick') || prompt.includes('burnt out')) {
    energyPreference = 'low';
  } else if (prompt.includes('hyped') || prompt.includes('high energy') || prompt.includes('ready to grind') || prompt.includes('intense')) {
    energyPreference = 'high';
  } else if (prompt.includes('peak') || prompt.includes('maximum') || prompt.includes('beast mode')) {
    energyPreference = 'peak';
  }

  let difficultyPreference: 'easy' | 'moderate' | 'challenging' | 'elite' = 'moderate';
  if (energyPreference === 'low' || prompt.includes('light') || prompt.includes('easy') || prompt.includes('gentle')) {
    difficultyPreference = 'easy';
  } else if (energyPreference === 'high' || prompt.includes('hard') || prompt.includes('challenge')) {
    difficultyPreference = 'challenging';
  } else if (energyPreference === 'peak') {
    difficultyPreference = 'elite';
  }

  const avoidRecentlyRepeatedActivities = prompt.includes('repeat') || prompt.includes('bored') || prompt.includes('different') || prompt.includes('fresh') || prompt.includes('variety');

  const preferredDomains: string[] = [];
  const deprioritizedDomains: string[] = [];

  if (prompt.includes('bored of drawing') || prompt.includes('no drawing') || prompt.includes('avoid drawing')) {
    deprioritizedDomains.push('drawing');
  } else if (prompt.includes('draw') || prompt.includes('art') || prompt.includes('sketch')) {
    preferredDomains.push('drawing');
  }

  if (prompt.includes('japan') || prompt.includes('language')) {
    preferredDomains.push('japanese');
  }

  if (prompt.includes('no climbing') || prompt.includes('no physical')) {
    deprioritizedDomains.push('climbing');
  } else if (prompt.includes('climb') || prompt.includes('physical') || prompt.includes('workout') || prompt.includes('fitness')) {
    preferredDomains.push('climbing');
  }

  return {
    availableMinutes,
    energyPreference,
    difficultyPreference,
    preferredDomains,
    deprioritizedDomains,
    targetSkills: [],
    preferredActivityTypes: ['practical', 'drill'],
    noveltyPreference: avoidRecentlyRepeatedActivities ? 'high' : 'moderate',
    avoidRecentlyRepeatedActivities,
    notes: `Adapted for today${availableMinutes ? ` with ${availableMinutes} min time budget` : ''}${energyPreference === 'low' ? ' (low energy)' : ''}.`,
  };
}

/**
 * Interpret user natural language goal into a structured Forge Path
 */
export async function interpretForgePath(
  userGoal: string,
  options?: {
    messages?: Array<{ role: string; content: string }>;
    currentPath?: ForgePath;
    playerContext?: any;
  }
): Promise<InterpretPathResult> {
  try {
    const res = await fetch('/api/gemini/interpret-path', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userGoal,
        messages: options?.messages,
        currentPath: options?.currentPath,
        playerContext: options?.playerContext,
      }),
    });

    if (!res.ok) {
      throw new Error(`Server returned ${res.status}`);
    }

    const data = await res.json();
    if (data && data.data && data.data.pathName) {
      return {
        ...data.data,
        reply: data.reply,
        reasoning: data.reasoning || data.data.reasoning,
        readyToApply: data.readyToApply,
      };
    }
    return localFallbackInterpretPath(userGoal);
  } catch (err) {
    console.warn('Network call to /api/gemini/interpret-path failed, using local fallback:', err);
    return localFallbackInterpretPath(userGoal);
  }
}

/**
 * Interpret user daily prompt into structured constraints for APE
 */
export async function interpretDailyIntent(
  userPrompt: string,
  context?: {
    forgePathName?: string;
    currentFocus?: string;
    skills?: string[];
    recentQuestTitles?: string[];
  }
): Promise<DailyQuestIntent> {
  const today = new Date().toISOString().split('T')[0];

  try {
    const res = await fetch('/api/gemini/interpret-daily-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userPrompt, context }),
    });

    if (!res.ok) {
      throw new Error(`Server returned ${res.status}`);
    }

    const data = await res.json();
    if (data && (data.intentData || data.data)) {
      const payload = data.intentData || data.data;
      return {
        ...payload,
        dateKey: today,
        userPrompt,
        createdAt: new Date().toISOString(),
      };
    }
  } catch (err) {
    console.warn('Network call to /api/gemini/interpret-daily-intent failed, using local fallback:', err);
  }

  const fallback = localFallbackInterpretDailyIntent(userPrompt);
  return {
    dateKey: today,
    userPrompt,
    domain: fallback.domain,
    focus: fallback.focus,
    targetSkills: fallback.targetSkills || [],
    preferredActivityTypes: fallback.preferredActivityTypes || ['practical', 'drill'],
    noveltyPreference: fallback.noveltyPreference || 'moderate',
    availableMinutes: fallback.availableMinutes,
    energyPreference: fallback.energyPreference || 'moderate',
    difficultyPreference: fallback.difficultyPreference || 'moderate',
    preferredDomains: fallback.preferredDomains || [],
    deprioritizedDomains: fallback.deprioritizedDomains || [],
    avoidRecentlyRepeatedActivities: fallback.avoidRecentlyRepeatedActivities || false,
    notes: fallback.notes || 'Adapted for today based on your preferences.',
    createdAt: new Date().toISOString(),
  };
}

// ====================================================
// AI QUEST CONCEPT POOL CACHE & SERVICE
// ====================================================

export interface ActiveSkillContext {
  skillId: string;
  name: string;
  goalTrackId?: string;
  domain?: string;
  currentStage?: number;
  stageName?: string;
  stagePurpose?: string;
  capabilities?: string[];
  concreteActions?: string[];
  milestoneGoal?: string;
}

export interface GenerateQuestConceptsParams {
  forgePath: ForgePath;
  activeSkills?: ActiveSkillContext[];
  highestUnlockedForgeBand?: number;
  playerContext?: {
    level?: number;
    skills?: Array<{ id?: string; name: string; level: number; category?: string; active?: boolean }>;
    stats?: Array<{ statId: string; level: number }>;
  };
  questHistory?: {
    recentCompletedTitles?: string[];
    activeQuestTitles?: string[];
  };
  dailyIntent?: DailyQuestIntent;
  count?: number;
  refreshSeed?: number;
  refreshNonce?: number | string;
  forceRefresh?: boolean;
}

interface ConceptsCacheEntry {
  cacheKey: string;
  concepts: AIQuestConcept[];
  timestamp: number;
}

let inMemoryConceptsCache: ConceptsCacheEntry | null = null;
const CACHE_STORAGE_KEY = 'forge_ai_quest_concepts_cache';
const CACHE_TTL_MS = 1000 * 60 * 60 * 6; // 6 hours

function computeConceptsCacheKey(
  forgePath: ForgePath,
  dailyIntent?: DailyQuestIntent,
  activeSkills?: ActiveSkillContext[],
  highestUnlockedForgeBand?: number
): string {
  const sortedSkills = (forgePath.skillConcepts || []).slice().map((s) => s.trim().toLowerCase()).sort().join(',');
  const sortedObjectives = (forgePath.learningObjectives || []).slice().map((o) => o.trim().toLowerCase()).sort().join(',');
  const activeSkillsPart = (activeSkills || [])
    .map((s) => `${s.skillId}:${s.name}:${s.currentStage || 1}`)
    .sort()
    .join(';');
  const pathPart = `${forgePath.name?.trim()}::${forgePath.domain?.trim()}::${forgePath.focus?.trim() || ''}::${sortedSkills}::${sortedObjectives}::${activeSkillsPart}::band_${highestUnlockedForgeBand || 1}`;

  const intentPart = dailyIntent
    ? `${dailyIntent.dateKey}::${dailyIntent.userPrompt?.trim() || ''}::${dailyIntent.availableMinutes || ''}::${dailyIntent.energyPreference || ''}::${dailyIntent.difficultyPreference || ''}::${(dailyIntent.preferredDomains || []).slice().sort().join(',')}::${(dailyIntent.deprioritizedDomains || []).slice().sort().join(',')}::${(dailyIntent.targetSkills || []).slice().sort().join(',')}::${(dailyIntent.preferredActivityTypes || []).slice().sort().join(',')}::${dailyIntent.avoidRecentlyRepeatedActivities ? 'avoid_repeat' : ''}`
    : 'no_intent';
  return `${pathPart}__${intentPart}`;
}

/**
 * Retrieve cached AI quest concepts for current Forge Path and Daily Intent, if available
 */
export function getCachedAIQuestConcepts(
  forgePath?: ForgePath,
  dailyIntent?: DailyQuestIntent,
  activeSkills?: ActiveSkillContext[],
  highestUnlockedForgeBand?: number
): AIQuestConcept[] | null {
  if (!forgePath || !forgePath.domain) return null;
  const key = computeConceptsCacheKey(forgePath, dailyIntent, activeSkills, highestUnlockedForgeBand);

  if (inMemoryConceptsCache && inMemoryConceptsCache.cacheKey === key) {
    if (Date.now() - inMemoryConceptsCache.timestamp < CACHE_TTL_MS && inMemoryConceptsCache.concepts.length > 0) {
      return inMemoryConceptsCache.concepts;
    }
  }

  try {
    const raw = sessionStorage.getItem(CACHE_STORAGE_KEY);
    if (raw) {
      const parsed: ConceptsCacheEntry = JSON.parse(raw);
      if (parsed.cacheKey === key && Array.isArray(parsed.concepts) && parsed.concepts.length > 0) {
        if (Date.now() - parsed.timestamp < CACHE_TTL_MS) {
          inMemoryConceptsCache = parsed;
          return parsed.concepts;
        }
      }
    }
  } catch {
    // Ignore storage parse issues
  }

  return null;
}

/**
 * Clear cached concepts (used when Forge Path or Daily Intent is explicitly modified)
 */
export function clearAIQuestConceptsCache(): void {
  inMemoryConceptsCache = null;
  try {
    sessionStorage.removeItem(CACHE_STORAGE_KEY);
  } catch {
    // Ignore storage issues
  }
}

/**
 * Strictly validate an AI quest concept against active skills and Forge Mastery Band constraints.
 * Ensures skillId exists, belongs to activeSkills, and questBand is clamped to [1, highestUnlockedForgeBand].
 */
export function validateAIQuestConcept(
  c: any,
  activeSkills?: any[],
  highestUnlockedForgeBand: number = 1
): AIQuestConcept | null {
  if (!c) return null;
  if (typeof c.title !== 'string' || !c.title.trim() || isGenericTitle(c.title)) return null;
  if (typeof c.description !== 'string' || !c.description.trim()) return null;
  if (typeof c.action !== 'string' || !c.action.trim() || !isConcreteAction(c.action)) return null;
  if (typeof c.completionCriteria !== 'string' || !c.completionCriteria.trim()) return null;

  // Filter to genuinely active skills if a broader skill array was provided
  const prioritySkills = (activeSkills || []).filter(
    (s: any) => s && (typeof s.activePriority === 'number' && s.activePriority > 0)
  );
  const activeFlagSkills = (activeSkills || []).filter(
    (s: any) => s && (s.active === true || s.isActive === true)
  );
  const effectiveActiveSkills = prioritySkills.length > 0
    ? prioritySkills
    : activeFlagSkills.length > 0
      ? activeFlagSkills
      : (activeSkills || []).slice(0, 3);

  const allowedActiveSkillIds = new Set(
    effectiveActiveSkills
      .map((s: any) => s && (s.id || s.skillId))
      .filter(Boolean)
      .map((id: any) => String(id).trim())
  );

  // For skill-focused AI concepts, skillId is mandatory and must belong to activeSkills
  const hasSkillId = typeof c.skillId === 'string' && c.skillId.trim().length > 0;
  if (!hasSkillId) return null;
  if (allowedActiveSkillIds.size > 0 && !allowedActiveSkillIds.has(c.skillId.trim())) return null;

  const rawBand = c.questBand || c.band || 1;
  const safeHighestBand = typeof highestUnlockedForgeBand === 'number'
    ? Math.max(1, Math.min(6, highestUnlockedForgeBand))
    : 1;
  const targetSkill = effectiveActiveSkills.find((s: any) => s && (s.id === c.skillId || s.skillId === c.skillId));
  const skillStage = Math.max(1, targetSkill?.currentStage || 1);
  const effectiveMax = Math.min(safeHighestBand, skillStage);
  const questBand = Math.max(1, Math.min(effectiveMax, rawBand)) as 1 | 2 | 3 | 4 | 5 | 6;

  return {
    ...c,
    skillId: String(c.skillId).trim(),
    goalTrackId: c.goalTrackId ? String(c.goalTrackId).trim() : undefined,
    questBand,
    band: questBand,
  };
}

/**
 * Generate or fetch intelligent quest concepts from Gemini for the player's active Forge Path.
 * Returns an empty array if Gemini is unavailable, so APE can seamlessly use procedural fallback.
 */
export async function fetchAIQuestConcepts(
  params: GenerateQuestConceptsParams,
  forceRefresh: boolean = false
): Promise<AIQuestConcept[]> {
  const { forgePath, dailyIntent, activeSkills, highestUnlockedForgeBand = 1 } = params;
  if (!forgePath || !forgePath.domain) {
    return [];
  }

  const cacheKey = computeConceptsCacheKey(forgePath, dailyIntent, activeSkills, highestUnlockedForgeBand);

  // Return cached pool if valid and refresh not explicitly requested
  if (!forceRefresh && !params.forceRefresh) {
    const cached = getCachedAIQuestConcepts(forgePath, dailyIntent, activeSkills, highestUnlockedForgeBand);
    if (cached && cached.length > 0) {
      return cached;
    }
  } else {
    clearAIQuestConceptsCache();
  }

  const effectiveRefreshNonce = params.refreshNonce !== undefined ? params.refreshNonce : params.refreshSeed;

  try {
    const res = await fetch('/api/gemini/generate-quest-concepts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        forgePath: {
          name: forgePath.name,
          domain: forgePath.domain,
          focus: forgePath.focus,
          description: forgePath.description,
          skillConcepts: forgePath.skillConcepts,
          learningObjectives: forgePath.learningObjectives,
          goalTracks: forgePath.goalTracks,
          masteryOutcomes: forgePath.masteryOutcomes,
          questArchetypes: forgePath.questArchetypes,
        },
        activeSkills: activeSkills || [],
        highestUnlockedForgeBand,
        playerContext: params.playerContext,
        questHistory: params.questHistory,
        dailyIntent: dailyIntent
          ? {
              userPrompt: dailyIntent.userPrompt,
              availableMinutes: dailyIntent.availableMinutes,
              energyPreference: dailyIntent.energyPreference,
              difficultyPreference: dailyIntent.difficultyPreference,
              preferredDomains: dailyIntent.preferredDomains,
              deprioritizedDomains: dailyIntent.deprioritizedDomains,
              targetSkills: dailyIntent.targetSkills,
              preferredActivityTypes: dailyIntent.preferredActivityTypes,
              avoidRecentlyRepeatedActivities: dailyIntent.avoidRecentlyRepeatedActivities,
              notes: dailyIntent.notes,
            }
          : undefined,
        count: params.count || 20,
        refreshSeed: params.refreshSeed,
        refreshNonce: effectiveRefreshNonce,
        forceRefresh: Boolean(forceRefresh || params.forceRefresh),
      }),
    });

    if (!res.ok) {
      throw new Error(`Server returned status ${res.status}`);
    }

    const data = await res.json();
    if (data && Array.isArray(data.concepts) && data.concepts.length > 0) {
      const validConcepts: AIQuestConcept[] = data.concepts
        .map((c: any) => validateAIQuestConcept(c, activeSkills, highestUnlockedForgeBand))
        .filter((c: any): c is AIQuestConcept => c !== null);

      console.log(`[fetchAIQuestConcepts] Received ${validConcepts.length} valid concepts from server (Source: ${data.source || 'gemini'}). RefreshNonce: ${effectiveRefreshNonce ?? 'none'}, ForceRefresh: ${Boolean(forceRefresh || params.forceRefresh)}`);

      if (validConcepts.length > 0) {
        const entry: ConceptsCacheEntry = {
          cacheKey,
          concepts: validConcepts,
          timestamp: Date.now(),
        };
        inMemoryConceptsCache = entry;
        try {
          sessionStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(entry));
        } catch {
          // Ignore storage issues
        }
        return validConcepts;
      }
    }
  } catch (err) {
    console.warn('[Forge APE] Gemini quest concept generation unavailable, APE will use procedural library:', err);
  }

  return [];
}
