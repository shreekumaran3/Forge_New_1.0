import { DevelopmentDomain, PillarId, StatId } from '../types';

export interface DomainMappingConfig {
  domain: DevelopmentDomain;
  pillarId: PillarId;
  primaryStatId: StatId;
  relatedSkillKeywords: string[];
  displayName: string;
}

/**
 * DATA-DRIVEN DOMAIN MAPPING
 * Centralized mapping between DevelopmentDomains and Forge PillarIds / StatIds.
 * Can be updated dynamically or extended without changing Quest Director selection logic.
 */
export const DOMAIN_MAPPINGS: Record<string, DomainMappingConfig> = {
  drawing: {
    domain: 'drawing',
    pillarId: 'wisdom',
    primaryStatId: 'creativity',
    relatedSkillKeywords: ['draw', 'art', 'sketch', 'illustration', 'anatomy', 'portrait'],
    displayName: 'Drawing & Visual Craft',
  },
  climbing: {
    domain: 'climbing',
    pillarId: 'strength',
    primaryStatId: 'endurance',
    relatedSkillKeywords: ['climb', 'walk', 'hike', 'boulder', 'mountaineer', 'fitness', 'endurance'],
    displayName: 'Climbing & Physical Resilience',
  },
  mental_fortitude: {
    domain: 'mental_fortitude',
    pillarId: 'character',
    primaryStatId: 'discipline',
    relatedSkillKeywords: ['fortitude', 'code', 'program', 'read', 'meditation', 'discipline', 'logic', 'focus'],
    displayName: 'Mental Fortitude & Focus',
  },
  storytelling: {
    domain: 'storytelling',
    pillarId: 'purpose',
    primaryStatId: 'knowledge',
    relatedSkillKeywords: ['story', 'write', 'journal', 'hook', 'character', 'dialogue', 'editing'],
    displayName: 'Storytelling & Purpose',
  },
};

/**
 * Resolve domain configuration with dynamic fallback for custom domains
 */
export function getDomainMapping(domain?: string): DomainMappingConfig {
  if (!domain) {
    return {
      domain: 'wisdom_general',
      pillarId: 'wisdom',
      primaryStatId: 'knowledge',
      relatedSkillKeywords: [],
      displayName: 'General Knowledge & Craft',
    };
  }

  if (DOMAIN_MAPPINGS[domain]) {
    return DOMAIN_MAPPINGS[domain];
  }

  const normalized = domain.toLowerCase().trim();
  let pillarId: PillarId = 'wisdom';
  let primaryStatId: StatId = 'creativity';

  if (
    normalized.includes('strength') ||
    normalized.includes('fit') ||
    normalized.includes('run') ||
    normalized.includes('climb') ||
    normalized.includes('body') ||
    normalized.includes('athlet') ||
    normalized.includes('walk') ||
    normalized.includes('lift') ||
    normalized.includes('calisthenic')
  ) {
    pillarId = 'strength';
    primaryStatId = 'endurance';
  } else if (
    normalized.includes('code') ||
    normalized.includes('math') ||
    normalized.includes('tech') ||
    normalized.includes('science') ||
    normalized.includes('lang') ||
    normalized.includes('read') ||
    normalized.includes('study') ||
    normalized.includes('engineer') ||
    normalized.includes('japan')
  ) {
    pillarId = 'wisdom';
    primaryStatId = 'knowledge';
  } else if (
    normalized.includes('meditat') ||
    normalized.includes('spirit') ||
    normalized.includes('mind') ||
    normalized.includes('faith') ||
    normalized.includes('disciplin') ||
    normalized.includes('moral')
  ) {
    pillarId = 'character';
    primaryStatId = 'discipline';
  } else if (
    normalized.includes('lead') ||
    normalized.includes('speak') ||
    normalized.includes('social') ||
    normalized.includes('relat') ||
    normalized.includes('communicat')
  ) {
    pillarId = 'relationships';
    primaryStatId = 'communication';
  } else if (
    normalized.includes('creat') ||
    normalized.includes('photo') ||
    normalized.includes('art') ||
    normalized.includes('music') ||
    normalized.includes('write') ||
    normalized.includes('camera')
  ) {
    pillarId = 'purpose';
    primaryStatId = 'creativity';
  }

  const cleanName = domain.charAt(0).toUpperCase() + domain.slice(1).replace(/_/g, ' ');
  const keywords = Array.from(new Set([normalized, ...normalized.split(/[\s_-]+/).filter((w) => w.length > 2)]));

  const config: DomainMappingConfig = {
    domain,
    pillarId,
    primaryStatId,
    relatedSkillKeywords: keywords,
    displayName: cleanName,
  };

  // Cache dynamic mapping
  DOMAIN_MAPPINGS[domain] = config;
  return config;
}

/**
 * Helper to get the mapped PillarId for a DevelopmentDomain
 */
export function getDomainPillarId(domain?: DevelopmentDomain): PillarId {
  if (!domain) return 'wisdom';
  return getDomainMapping(domain).pillarId;
}

/**
 * Helper to get the mapped StatId for a DevelopmentDomain
 */
export function getDomainPrimaryStatId(domain?: DevelopmentDomain): StatId {
  if (!domain) return 'knowledge';
  return getDomainMapping(domain).primaryStatId;
}

/**
 * Update domain mapping dynamically if needed
 */
export function setDomainMapping(domain: DevelopmentDomain, pillarId: PillarId, primaryStatId: StatId): void {
  const existing = getDomainMapping(domain);
  existing.pillarId = pillarId;
  existing.primaryStatId = primaryStatId;
  DOMAIN_MAPPINGS[domain] = existing;
}

