import { SkillRank, RankInfo } from '../types';

export const MASTERY_RANKS_CONFIG: RankInfo[] = [
  {
    rank: 'Novice',
    minLevel: 1,
    icon: 'Seedling',
    color: 'text-slate-400 bg-slate-800/60',
    borderColor: 'border-slate-700/80',
    glowEffect: 'shadow-none',
    unlockMessage: 'You have taken your first step on this path.',
  },
  {
    rank: 'Apprentice',
    minLevel: 3,
    icon: 'BookOpen',
    color: 'text-emerald-400 bg-emerald-950/40',
    borderColor: 'border-emerald-700/60',
    glowEffect: 'shadow-[0_0_12px_rgba(16,185,129,0.15)]',
    unlockMessage: 'Basic mechanics are now instinct. Fundamentals unlocked!',
  },
  {
    rank: 'Practitioner',
    minLevel: 6,
    icon: 'Hammer',
    color: 'text-cyan-400 bg-cyan-950/40',
    borderColor: 'border-cyan-600/60',
    glowEffect: 'shadow-[0_0_15px_rgba(6,182,212,0.2)]',
    unlockMessage: 'Consistent application turns effort into reliable technique.',
  },
  {
    rank: 'Adept',
    minLevel: 10,
    icon: 'Sparkles',
    color: 'text-indigo-400 bg-indigo-950/40',
    borderColor: 'border-indigo-500/70',
    glowEffect: 'shadow-[0_0_20px_rgba(99,102,241,0.25)]',
    unlockMessage: 'Fluent execution achieved. Complex workflows feel natural.',
  },
  {
    rank: 'Expert',
    minLevel: 15,
    icon: 'Award',
    color: 'text-amber-400 bg-amber-950/40',
    borderColor: 'border-amber-500/80',
    glowEffect: 'shadow-[0_0_22px_rgba(245,158,11,0.3)]',
    unlockMessage: 'High precision and problem solving elevate your work above average.',
  },
  {
    rank: 'Master',
    minLevel: 20,
    icon: 'Crown',
    color: 'text-rose-400 bg-rose-950/40',
    borderColor: 'border-rose-500/90',
    glowEffect: 'shadow-[0_0_25px_rgba(244,63,94,0.35)]',
    unlockMessage: 'Mastery achieved. You command complete authority in this discipline.',
  },
  {
    rank: 'Virtuoso',
    minLevel: 26,
    icon: 'Flame',
    color: 'text-violet-300 bg-violet-950/50',
    borderColor: 'border-violet-400/90',
    glowEffect: 'shadow-[0_0_30px_rgba(167,139,250,0.4)]',
    unlockMessage: 'Your unique voice and style define a new standard of craftsmanship.',
  },
  {
    rank: 'Legend',
    minLevel: 35,
    icon: 'Trophy',
    color: 'text-amber-300 bg-gradient-to-r from-amber-950/80 via-yellow-950/70 to-amber-950/80',
    borderColor: 'border-amber-300',
    glowEffect: 'shadow-[0_0_35px_rgba(252,211,77,0.5)] animate-pulse',
    unlockMessage: 'LEGENDARY STATUS! Your achievements will echo through time.',
  },
];

export function getSkillRankInfo(level: number): RankInfo {
  for (let i = MASTERY_RANKS_CONFIG.length - 1; i >= 0; i--) {
    if (level >= MASTERY_RANKS_CONFIG[i].minLevel) {
      return MASTERY_RANKS_CONFIG[i];
    }
  }
  return MASTERY_RANKS_CONFIG[0];
}

export function getSkillRankTitle(level: number): SkillRank {
  return getSkillRankInfo(level).rank;
}

export function getSkillRankConfig(level: number) {
  const info = getSkillRankInfo(level);
  return {
    title: info.rank,
    badgeBg: info.color,
    textColor: info.color,
    borderColor: info.borderColor,
    glowEffect: info.glowEffect,
  };
}

export function checkRankPromotion(oldLevel: number, newLevel: number): RankInfo | null {
  const oldRank = getSkillRankInfo(oldLevel);
  const newRank = getSkillRankInfo(newLevel);
  if (newRank.rank !== oldRank.rank) {
    return newRank;
  }
  return null;
}
