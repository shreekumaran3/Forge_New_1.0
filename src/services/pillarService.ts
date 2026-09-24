import { PillarId, Skill, PlayerStatState } from '../types';
import { PILLARS_CONFIG, STATS_CONFIG, getStatXpNextLevel } from './xpService';

export interface UnifiedPillarData {
  id: PillarId;
  name: string;
  icon: string;
  color: string;
  description: string;
  subCategories: string[];
  level: number;
  currentXp: number;
  nextLevelXp: number;
  totalXp: number;
  progress: number; // 0-100 percentage
  contributingSkills: Skill[];
  contributingStats: { id: string; name: string; level: number; xp: number }[];
}

export function calculateUnifiedPillars(
  stats: PlayerStatState[],
  skills: Skill[]
): UnifiedPillarData[] {
  return PILLARS_CONFIG.map((pillar) => {
    // 1. Get stats in this pillar
    const pillarStatDefs = STATS_CONFIG.filter((s) => s.pillarId === pillar.id);
    const pillarStatIds = pillarStatDefs.map((s) => s.id);
    const pillarStatStates = stats.filter((s) => pillarStatIds.includes(s.statId));

    // 2. Get skills in this pillar
    const pillarSkills = skills.filter((s) => s.pillarId === pillar.id);

    // Sum total XP from stats & skills
    const statsTotalXp = pillarStatStates.reduce((sum, s) => sum + (s.lifetimeXp || 0), 0);
    const skillsTotalXp = pillarSkills.reduce((sum, s) => sum + (s.lifetimeXp || 0), 0);
    const totalXp = statsTotalXp + skillsTotalXp;

    // Calculate pillar level based on accumulated XP
    let level = 1;
    let xpForNext = getStatXpNextLevel(level);

    let remainingXp = totalXp;
    while (remainingXp >= xpForNext) {
      remainingXp -= xpForNext;
      level++;
      xpForNext = getStatXpNextLevel(level);
    }

    const currentXp = remainingXp;
    const nextLevelXp = xpForNext;
    const progress = Math.min(100, Math.round((currentXp / nextLevelXp) * 100));

    const contributingStats = pillarStatDefs.map((def) => {
      const st = pillarStatStates.find((s) => s.statId === def.id);
      return {
        id: def.id,
        name: def.name,
        level: st ? st.level : 1,
        xp: st ? st.lifetimeXp : 0,
      };
    });

    return {
      id: pillar.id,
      name: pillar.name,
      icon: pillar.icon,
      color: pillar.color,
      description: pillar.description,
      subCategories: pillar.subCategories,
      level,
      currentXp,
      nextLevelXp,
      totalXp,
      progress,
      contributingSkills: pillarSkills,
      contributingStats,
    };
  });
}
