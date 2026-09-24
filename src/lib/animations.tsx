import React, { useEffect, useState } from 'react';
import { motion, type HTMLMotionProps } from 'motion/react';

/**
 * CENTRALIZED ANIMATION TIMING SYSTEM FOR FORGE
 * 
 * Consistent durations and easing curves across the entire application.
 */

export const ANIMATION_DURATIONS = {
  /** 100–150ms: Button presses, icon bounce, touch feedback, checkbox toggle */
  fast: 0.12,
  /** 250–350ms: Card transitions, fade-ins, slide animations, navigation transitions, modals */
  normal: 0.3,
  /** 300–500ms: XP bar fills, progress bar updates, XP number counting, quest completion */
  progress: 0.4,
  /** 500–700ms: Level Up animations, skill unlocks, stage unlocks, major achievements */
  major: 0.6,
} as const;

export const EASINGS = {
  easeOut: [0.16, 1, 0.3, 1] as [number, number, number, number],
  easeInOut: [0.4, 0, 0.2, 1] as [number, number, number, number],
  spring: { type: 'spring', stiffness: 400, damping: 25 },
  softSpring: { type: 'spring', stiffness: 280, damping: 20 },
  bounce: { type: 'spring', stiffness: 500, damping: 15 },
} as const;

/** Reusable motion props for standard interactive elements */
export const MOTION_TOKENS = {
  buttonTap: {
    whileTap: { scale: 0.95 },
    transition: { duration: ANIMATION_DURATIONS.fast, ease: EASINGS.easeOut },
  },
  cardPress: {
    whileTap: { scale: 0.98 },
    transition: { duration: ANIMATION_DURATIONS.fast },
  },
  fadeInUp: {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -8 },
    transition: { duration: ANIMATION_DURATIONS.normal, ease: EASINGS.easeOut },
  },
  fadeInScale: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 },
    transition: { duration: ANIMATION_DURATIONS.normal, ease: EASINGS.easeOut },
  },
  staggerContainer: {
    initial: { opacity: 0 },
    animate: {
      opacity: 1,
      transition: { staggerChildren: 0.05, delayChildren: 0.02 },
    },
  },
  staggerItem: {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0, transition: { duration: ANIMATION_DURATIONS.normal } },
  },
};

/**
 * Animated Progress Bar Component
 * Smoothly fills over 400ms with easeInOut
 */
interface AnimatedProgressBarProps {
  progress: number; // 0 to 100
  colorClass?: string;
  heightClass?: string;
  bgClass?: string;
  showGlow?: boolean;
}

export const AnimatedProgressBar: React.FC<AnimatedProgressBarProps> = ({
  progress,
  colorClass = 'bg-[var(--forge-primary,#D4AF37)]',
  heightClass = 'h-2',
  bgClass = 'bg-[var(--forge-progress-track,#151515)]',
  showGlow = true,
}) => {
  const clampedProgress = Math.min(100, Math.max(0, progress));

  return (
    <div className={`w-full ${bgClass} rounded-full overflow-hidden ${heightClass} relative`}>
      <motion.div
        className={`h-full ${colorClass} rounded-full relative`}
        initial={{ width: 0 }}
        animate={{ width: `${clampedProgress}%` }}
        transition={{ duration: ANIMATION_DURATIONS.progress, ease: EASINGS.easeInOut }}
      >
        {showGlow && clampedProgress > 0 && (
          <div className="absolute right-0 top-0 bottom-0 w-2 bg-white/40 blur-[1px] rounded-full" />
        )}
      </motion.div>
    </div>
  );
};

/**
 * Animated Counter Component for XP and Stats
 */
interface AnimatedCounterProps {
  value: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}

export const AnimatedCounter: React.FC<AnimatedCounterProps> = ({
  value,
  duration = ANIMATION_DURATIONS.progress,
  prefix = '',
  suffix = '',
  className = '',
}) => {
  const [displayValue, setDisplayValue] = useState(value);

  useEffect(() => {
    let startTimestamp: number | null = null;
    const initialValue = displayValue;
    const delta = value - initialValue;

    if (delta === 0) return;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / (duration * 1000), 1);
      // Cubic ease-out: fast initial acceleration, smooth deceleration, 0 overshoot
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(initialValue + delta * easeOut);
      setDisplayValue(current);

      if (progress < 1) {
        animId = window.requestAnimationFrame(step);
      } else {
        setDisplayValue(value);
      }
    };

    let animId = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(animId);
  }, [value, duration]);

  return (
    <span className={className}>
      {prefix}
      {displayValue.toLocaleString()}
      {suffix}
    </span>
  );
};

/**
 * Animated Checkbox Component with spring bounce
 */
interface AnimatedCheckboxProps {
  checked: boolean;
  onChange?: () => void;
  size?: 'sm' | 'md' | 'lg';
  activeColorClass?: string;
}

export const AnimatedCheckbox: React.FC<AnimatedCheckboxProps> = ({
  checked,
  onChange,
  size = 'md',
  activeColorClass = 'bg-[var(--forge-button-bg,#D4AF37)] border-[var(--forge-border-accent,rgba(212,175,55,0.4))] text-[var(--forge-button-text,#050505)] shadow-[0_0_12px_var(--forge-primary-glow)]',
}) => {
  const sizeMap = {
    sm: 'w-5 h-5 min-w-[20px]',
    md: 'w-6 h-6 min-w-[24px]',
    lg: 'w-7 h-7 min-w-[28px]',
  };

  const iconSizeMap = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  return (
    <motion.button
      type="button"
      onClick={onChange}
      whileTap={{ scale: 0.85 }}
      animate={checked ? { scale: [0.9, 1.15, 1] } : { scale: 1 }}
      transition={{ duration: ANIMATION_DURATIONS.fast, ease: EASINGS.easeOut }}
      className={`${sizeMap[size]} rounded-md border flex items-center justify-center cursor-pointer transition-colors ${
        checked
          ? activeColorClass
          : 'border-[var(--forge-border,#1F1F1F)] bg-[var(--forge-bg-elevated,#0A0A0A)] text-transparent hover:border-[var(--forge-border-accent,rgba(212,175,55,0.4))]'
      }`}
    >
      <motion.svg
        className={iconSizeMap[size]}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={false}
        animate={checked ? { scale: 1, opacity: 1 } : { scale: 0.5, opacity: 0 }}
        transition={{ duration: ANIMATION_DURATIONS.fast }}
      >
        <polyline points="20 6 9 17 4 12" />
      </motion.svg>
    </motion.button>
  );
};

/**
 * Motion Button wrapper for interactive mobile touch targets
 */
export const MotionButton: React.FC<HTMLMotionProps<'button'>> = ({
  children,
  className = '',
  ...props
}) => {
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      transition={{ duration: ANIMATION_DURATIONS.fast, ease: EASINGS.easeOut }}
      className={`cursor-pointer touch-manipulation active:opacity-90 ${className}`}
      {...props}
    >
      {children}
    </motion.button>
  );
};
