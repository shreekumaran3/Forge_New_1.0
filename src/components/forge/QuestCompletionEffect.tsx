import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'motion/react';
import { QuestRarity } from '../../services/questRarityService';
import { Zap, Check } from 'lucide-react';
import { useTheme } from '../../theme/ThemeContext';
import { playUISound } from '../../services/soundManager';

interface QuestCompletionEffectProps {
  rarity: QuestRarity;
  xpReward: number;
  accentColor: string;
  isActive: boolean;
  onFinished?: () => void;
}

// Safe Haptic Vibration Helper
const triggerCompletionHaptic = (rarity: QuestRarity, prefersReducedMotion: boolean) => {
  if (prefersReducedMotion) return;
  if (typeof window === 'undefined' || !('vibrate' in navigator)) return;

  try {
    const patterns: Record<QuestRarity, number[]> = {
      common: [20],
      uncommon: [25, 20, 25],
      rare: [30, 20, 40],
      epic: [35, 20, 50],
      legendary: [40, 20, 60, 25, 70],
    };
    const pattern = patterns[rarity] || [20];
    navigator.vibrate(pattern);
  } catch {
    // Gracefully catch any browser restriction
  }
};

export const QuestCompletionEffect: React.FC<QuestCompletionEffectProps> = ({
  rarity,
  xpReward,
  accentColor,
  isActive,
  onFinished,
}) => {
  const { currentTheme } = useTheme();
  const [showScreenGlow, setShowScreenGlow] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const hasVibratedRef = useRef(false);

  const isLegendary = rarity === 'legendary';
  const isEpic = rarity === 'epic';

  const secondaryColor = currentTheme.accent || currentTheme.secondary || '#F59E0B';
  const secondaryLight = currentTheme.accentLight || currentTheme.secondaryLight || '#FBBF24';

  useEffect(() => {
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(reducedMotionQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    reducedMotionQuery.addEventListener('change', handleChange);
    return () => reducedMotionQuery.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    if (!isActive) {
      setShowScreenGlow(false);
      hasVibratedRef.current = false;
      return;
    }

    // Trigger haptic feedback and audio exactly ONCE per completion trigger
    if (!hasVibratedRef.current) {
      hasVibratedRef.current = true;
      triggerCompletionHaptic(rarity, prefersReducedMotion);
      playUISound('questComplete');
    }

    const finishTimer = setTimeout(() => {
      onFinished?.();
    }, 500);

    return () => clearTimeout(finishTimer);
  }, [isActive, rarity, accentColor, secondaryColor, secondaryLight, isLegendary, isEpic, prefersReducedMotion, onFinished]);

  if (!isActive) return null;

  return (
    <>
      {/* PHASE 1: IMPACT CONFIRMATION BORDER (0-500ms) */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={
          prefersReducedMotion
            ? { opacity: [0, 0.7, 0] }
            : {
                opacity: [0, 1, 0],
                scale: [0.98, 1.02, 0.95],
              }
        }
        transition={{
          duration: 0.5,
          times: [0, 0.3, 1],
          ease: 'easeOut',
        }}
        style={{
          borderColor: accentColor,
        }}
        className="absolute inset-0 z-20 pointer-events-none rounded-2xl border-2"
      />

      {/* PHASE 2: CENTERED COMPLETION & INLINE XP REWARD CARD OVERLAY */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={
          prefersReducedMotion
            ? { opacity: [0, 1, 0], scale: 1 }
            : {
                opacity: [0, 1, 1, 0],
                scale: [0.9, 1.02, 1.0, 0.95],
              }
        }
        transition={{
          duration: 0.5,
          times: [0, 0.2, 0.8, 1],
          ease: 'easeOut',
        }}
        className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-30 p-4 bg-[#050505]/80 rounded-2xl"
      >
        <div
          className="px-5 py-2.5 rounded-xl flex flex-col items-center justify-center gap-1.5 border shadow-lg"
          style={{
            backgroundColor: 'rgba(5, 5, 5, 0.95)',
            borderColor: accentColor,
          }}
        >
          <div className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 font-bold text-[10px]"
              style={{ backgroundColor: accentColor, color: '#050505' }}
            >
              <Check className="w-3 h-3 stroke-[3]" />
            </div>
            <span className="font-serif font-bold tracking-[0.2em] text-[10px] uppercase text-[#E4E3E0]">
              QUEST COMPLETE
            </span>
          </div>

          <div
            className="flex items-center gap-1 font-mono font-bold text-lg tracking-wider"
            style={{ color: accentColor }}
          >
            <Zap className="w-4 h-4 fill-current stroke-[2]" />
            <span>+{xpReward} XP</span>
          </div>
        </div>
      </motion.div>
    </>
  );
};
