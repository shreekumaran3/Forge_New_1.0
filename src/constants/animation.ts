/**
 * Centralized Animation Timing & Motion Tokens System
 * Ensures consistent animation language across every screen in Forge.
 */

import type { Variants } from 'motion/react';

export const animation = {
  /** 100-150ms: Button presses, icon bounce, touch feedback, checkbox completion, toggles */
  fast: 0.15,
  /** 250-350ms: Card transitions, fade-ins, slide animations, navigation transitions, panels, modals */
  normal: 0.3,
  /** 300-500ms: XP bar fills, progress bar updates, XP number counting, quest transitions, recovery progress */
  progress: 0.4,
  /** 500-700ms: Level Up animations, Skill Tree unlocks, Stage unlocks, Milestone completion, Epic/Legendary quests */
  major: 0.6,
};

export const transitions = {
  /** Fast spring for tactile touch feedback */
  fast: { duration: animation.fast, ease: 'easeOut' as const },
  /** Smooth spring for buttons and card taps */
  spring: { type: 'spring' as const, stiffness: 450, damping: 25 },
  /** Bouncy spring for icons, checkmarks and celebratory badges */
  springBouncy: { type: 'spring' as const, stiffness: 500, damping: 15 },
  /** Ease in-out curve for progress bar fills and counting numbers */
  progress: { duration: animation.progress, ease: 'easeInOut' as const },
  /** Gentle spring with medium damping for major progression events */
  major: { type: 'spring' as const, stiffness: 220, damping: 20 },
  /** Standard smooth curve for card fade and slide transitions */
  normal: { duration: animation.normal, ease: 'easeOut' as const },
};

export const fadeSlideVariants: Variants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: transitions.normal },
  exit: { opacity: 0, y: -8, transition: { duration: animation.fast } },
};

export const staggerContainerVariants: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.02,
    },
  },
};

export const motionTokens = {
  buttonTap: { scale: 0.95 },
  cardTap: { scale: 0.97 },
  cardHover: { scale: 1.01 },
  fadeSlide: fadeSlideVariants,
  staggerContainer: staggerContainerVariants,
  checkboxComplete: {
    scale: [1, 1.25, 1],
    transition: transitions.springBouncy,
  },
};
