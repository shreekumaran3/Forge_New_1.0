import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Shield } from 'lucide-react';
import { playUISound } from '../../services/soundManager';
import { useBackHandler } from '../../services/backButtonManager';

interface LevelUpCelebrationProps {
  newLevel: number;
  onFinished: () => void;
}

const triggerLevelUpHaptic = () => {
  if (typeof window === 'undefined' || !('vibrate' in navigator)) return;
  try {
    navigator.vibrate([30, 40, 60, 50, 100]);
  } catch {
    // Ignore
  }
};

export const LevelUpCelebration: React.FC<LevelUpCelebrationProps> = ({
  newLevel,
  onFinished,
}) => {
  useBackHandler(
    'level-up-celebration',
    100,
    () => {
      onFinished();
      return true;
    },
    true
  );

  useEffect(() => {
    triggerLevelUpHaptic();
    playUISound('levelUp');
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const timer = setTimeout(() => {
      onFinished();
    }, 1700);

    return () => {
      clearTimeout(timer);
      document.body.style.overflow = previousOverflow;
    };
  }, [onFinished]);

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 cursor-pointer overflow-hidden"
        onClick={onFinished}
      >
        {/* IMPACT FLASH */}
        <motion.div
          initial={{ opacity: 0.5 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          className="fixed inset-0 bg-white pointer-events-none"
        />

        {/* ONE EXPANDING RADIAL SHOCKWAVE */}
        <motion.div
          initial={{ scale: 0.3, opacity: 0.9 }}
          animate={{ scale: 2.2, opacity: 0 }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
          className="absolute w-64 h-64 rounded-full border-2 border-[var(--forge-primary,#D4AF37)] pointer-events-none"
        />

        {/* THEME-COLORED ENERGY CARD OVERLAY */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="relative z-10 flex flex-col items-center justify-center space-y-4 text-center px-6 py-8 rounded-3xl bg-[var(--forge-surface,#0A0A0A)] border border-[var(--forge-border-accent,rgba(212,175,55,0.5))] max-w-sm w-full"
        >
          {/* ICON & SHIELD */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: [0, 1.15, 1] }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[var(--forge-primary,#D4AF37)] text-[#050505] flex items-center justify-center"
          >
            <Shield className="w-8 h-8 sm:w-10 sm:h-10 stroke-[2.5]" />
          </motion.div>

          {/* BADGE */}
          <div className="px-3.5 py-1 rounded-full text-[10px] font-mono tracking-[0.2em] uppercase bg-[var(--forge-bg-elevated,#121212)] border border-[var(--forge-border,#2A2A2A)] text-[var(--forge-text-accent,#D4AF37)] flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>CHARACTER LEVEL INCREASED</span>
          </div>

          {/* LEVEL UP TEXT */}
          <div className="space-y-1">
            <h1 className="font-mono font-black text-3xl sm:text-4xl tracking-widest text-[var(--forge-primary,#D4AF37)] uppercase">
              LEVEL UP
            </h1>
            <p className="font-mono font-bold text-2xl text-[var(--forge-text-primary,#E4E3E0)] tracking-wider">
              LEVEL {newLevel}
            </p>
          </div>

          <p className="text-[11px] font-mono text-[var(--forge-text-muted,#8E9299)] tracking-widest uppercase pt-2">
            Tap anywhere to continue
          </p>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
