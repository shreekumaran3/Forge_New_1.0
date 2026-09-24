import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'motion/react';
import { RotateCcw, Zap } from 'lucide-react';
import { playUISound } from '../../services/soundManager';

interface QuestIncompleteEffectProps {
  isActive: boolean;
  xpAmount?: number;
  onFinished?: () => void;
}

// Safe Haptic Vibration Helper for Incomplete
const triggerIncompleteHaptic = (prefersReducedMotion: boolean) => {
  if (prefersReducedMotion) return;
  if (typeof window === 'undefined' || !('vibrate' in navigator)) return;

  try {
    // Subtle, gentle double-pulse contraction haptic (non-punitive)
    navigator.vibrate([15, 30, 15]);
  } catch {
    // Gracefully catch browser restriction
  }
};

export const QuestIncompleteEffect: React.FC<QuestIncompleteEffectProps> = ({
  isActive,
  xpAmount = 0,
  onFinished,
}) => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const hasVibratedRef = useRef(false);
  const displayXpRef = useRef(xpAmount);

  if (isActive && xpAmount > 0) {
    displayXpRef.current = xpAmount;
  }

  useEffect(() => {
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(reducedMotionQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    reducedMotionQuery.addEventListener('change', handleChange);
    return () => reducedMotionQuery.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    if (!isActive) {
      hasVibratedRef.current = false;
      return;
    }

    if (!hasVibratedRef.current) {
      hasVibratedRef.current = true;
      triggerIncompleteHaptic(prefersReducedMotion);
      playUISound('questReverse');
    }

    const timer = setTimeout(() => {
      onFinished?.();
    }, 400);

    return () => clearTimeout(timer);
  }, [isActive, prefersReducedMotion, onFinished]);

  if (!isActive) return null;

  return (
    <>
      {/* CONTRACTION OVERLAY WITH -XX XP DISPLAY */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={
          prefersReducedMotion
            ? { opacity: [0, 1, 0], scale: 1 }
            : {
                opacity: [0, 1, 1, 0],
                scale: [0.96, 1.0, 1.0, 0.96],
              }
        }
        transition={{
          duration: 0.4,
          times: [0, 0.2, 0.8, 1],
          ease: 'easeOut',
        }}
        className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-30 p-4 bg-[#050505]/80 rounded-2xl border border-[var(--forge-border,#2A2A2A)]"
      >
        <div
          className="px-5 py-2.5 rounded-xl flex flex-col items-center justify-center gap-1.5 border shadow-lg"
          style={{
            backgroundColor: 'rgba(8, 8, 8, 0.95)',
            borderColor: 'var(--forge-border, #2A2A2A)',
          }}
        >
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 bg-[var(--forge-surface-interactive,#1A1A1A)] text-[var(--forge-text-secondary,#8E9299)] border border-[var(--forge-border,#2A2A2A)]">
              <RotateCcw className="w-3 h-3 text-[var(--forge-text-secondary,#8E9299)]" />
            </div>
            <span className="font-serif font-bold tracking-[0.2em] text-[10px] uppercase text-[var(--forge-text-primary,#E4E3E0)]">
              QUEST REVERSED
            </span>
          </div>

          <div className="flex items-center gap-1 font-mono font-bold text-base text-[var(--forge-primary,#D4AF37)]">
            <Zap className="w-3.5 h-3.5 fill-none stroke-[2] opacity-80" />
            <span>-{displayXpRef.current || xpAmount} XP</span>
          </div>
        </div>
      </motion.div>
    </>
  );
};
