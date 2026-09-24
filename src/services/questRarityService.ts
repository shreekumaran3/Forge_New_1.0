import React from 'react';
import { QuestCategory } from '../types';

export type QuestRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

/**
 * Shared Rarity Color Palette Constants
 */
export const RARITY_COLORS: Record<QuestRarity, string> = {
  common: '#8A8A8A',
  uncommon: '#3CB371',
  rare: '#3B82F6',
  epic: '#8B5CF6',
  legendary: '#E67E22',
};

export interface RarityConfig {
  rarity: QuestRarity;
  label: string;
  colorName: string;
  colorHex: string;
  badgeStyle: React.CSSProperties;
  cardStyle: React.CSSProperties;
  titleUnderlineStyle: React.CSSProperties;
  xpBadgeStyle: React.CSSProperties;
  accentColor: string;
  defaultXp: number;
  description: string;
}

export const QUEST_RARITIES: Record<QuestRarity, RarityConfig> = {
  common: {
    rarity: 'common',
    label: 'Common',
    colorName: 'Slate Gray',
    colorHex: '#8A8A8A',
    badgeStyle: {
      backgroundColor: 'rgba(138, 138, 138, 0.12)',
      borderColor: 'rgba(138, 138, 138, 0.35)',
      color: '#A8A8A8',
    },
    cardStyle: {
      borderLeft: '3px solid #8A8A8A',
      borderColor: 'rgba(138, 138, 138, 0.2)',
    },
    titleUnderlineStyle: {
      background: 'linear-gradient(90deg, rgba(138, 138, 138, 0.3) 0%, transparent 100%)',
    },
    xpBadgeStyle: {
      color: '#A8A8A8',
      borderColor: 'rgba(138, 138, 138, 0.25)',
      backgroundColor: 'rgba(138, 138, 138, 0.08)',
    },
    accentColor: '#8A8A8A',
    defaultXp: 20,
    description: 'Routine daily habits.',
  },
  uncommon: {
    rarity: 'uncommon',
    label: 'Uncommon',
    colorName: 'Emerald Green',
    colorHex: '#3CB371',
    badgeStyle: {
      backgroundColor: 'rgba(60, 179, 113, 0.12)',
      borderColor: 'rgba(60, 179, 113, 0.35)',
      color: '#3CB371',
    },
    cardStyle: {
      borderLeft: '3px solid #3CB371',
      borderColor: 'rgba(60, 179, 113, 0.25)',
    },
    titleUnderlineStyle: {
      background: 'linear-gradient(90deg, rgba(60, 179, 113, 0.35) 0%, transparent 100%)',
    },
    xpBadgeStyle: {
      color: '#3CB371',
      borderColor: 'rgba(60, 179, 113, 0.3)',
      backgroundColor: 'rgba(60, 179, 113, 0.08)',
    },
    accentColor: '#3CB371',
    defaultXp: 40,
    description: 'Healthy habits and consistency.',
  },
  rare: {
    rarity: 'rare',
    label: 'Rare',
    colorName: 'Azure Blue',
    colorHex: '#3B82F6',
    badgeStyle: {
      backgroundColor: 'rgba(59, 130, 246, 0.12)',
      borderColor: 'rgba(59, 130, 246, 0.35)',
      color: '#60A5FA',
    },
    cardStyle: {
      borderLeft: '3px solid #3B82F6',
      borderColor: 'rgba(59, 130, 246, 0.25)',
    },
    titleUnderlineStyle: {
      background: 'linear-gradient(90deg, rgba(59, 130, 246, 0.35) 0%, transparent 100%)',
    },
    xpBadgeStyle: {
      color: '#60A5FA',
      borderColor: 'rgba(59, 130, 246, 0.3)',
      backgroundColor: 'rgba(59, 130, 246, 0.08)',
    },
    accentColor: '#3B82F6',
    defaultXp: 80,
    description: 'Meaningful progression tasks.',
  },
  epic: {
    rarity: 'epic',
    label: 'Epic',
    colorName: 'Royal Purple',
    colorHex: '#8B5CF6',
    badgeStyle: {
      backgroundColor: 'rgba(139, 92, 246, 0.12)',
      borderColor: 'rgba(139, 92, 246, 0.35)',
      color: '#A78BFA',
    },
    cardStyle: {
      borderLeft: '3px solid #8B5CF6',
      borderColor: 'rgba(139, 92, 246, 0.25)',
    },
    titleUnderlineStyle: {
      background: 'linear-gradient(90deg, rgba(139, 92, 246, 0.35) 0%, transparent 100%)',
    },
    xpBadgeStyle: {
      color: '#A78BFA',
      borderColor: 'rgba(139, 92, 246, 0.3)',
      backgroundColor: 'rgba(139, 92, 246, 0.08)',
    },
    accentColor: '#8B5CF6',
    defaultXp: 150,
    description: 'Major weekly or monthly objectives.',
  },
  legendary: {
    rarity: 'legendary',
    label: 'Legendary',
    colorName: 'Exotic Burnt Orange',
    colorHex: '#E67E22',
    badgeStyle: {
      backgroundColor: 'rgba(230, 126, 34, 0.15)',
      borderColor: 'rgba(230, 126, 34, 0.45)',
      color: '#E67E22',
    },
    cardStyle: {
      borderLeft: '3.5px solid #E67E22',
      borderColor: 'rgba(230, 126, 34, 0.35)',
    },
    titleUnderlineStyle: {
      background: 'linear-gradient(90deg, rgba(230, 126, 34, 0.5) 0%, transparent 100%)',
    },
    xpBadgeStyle: {
      color: '#E67E22',
      borderColor: 'rgba(230, 126, 34, 0.4)',
      backgroundColor: 'rgba(230, 126, 34, 0.1)',
    },
    accentColor: '#E67E22',
    defaultXp: 300,
    description: 'Long-term life goals and major achievements.',
  },
};

/**
 * Infer rarity from quest category or difficulty level if rarity is not explicitly set
 */
export function getQuestRarity(rarity?: QuestRarity, category?: QuestCategory | string, xpReward?: number): RarityConfig {
  if (rarity && QUEST_RARITIES[rarity]) {
    return QUEST_RARITIES[rarity];
  }

  // Infer from category or XP reward
  if (category === 'legendary' || (xpReward && xpReward >= 250)) {
    return QUEST_RARITIES.legendary;
  }
  if (category === 'epic' || (xpReward && xpReward >= 120)) {
    return QUEST_RARITIES.epic;
  }
  if (category === 'challenge' || (xpReward && xpReward >= 60)) {
    return QUEST_RARITIES.rare;
  }
  if (category === 'main' || (xpReward && xpReward >= 30)) {
    return QUEST_RARITIES.uncommon;
  }

  return QUEST_RARITIES.common;
}

export function inferQuestRarity(quest: { rarity?: QuestRarity; category?: QuestCategory | string; xpReward?: number }): QuestRarity {
  return getQuestRarity(quest.rarity, quest.category, quest.xpReward).rarity;
}

