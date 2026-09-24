import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useGame } from '../../context/GameContext';
import { useTheme } from '../../theme/ThemeContext';
import {
  getForgeTourSteps,
  ForgeTourStep,
  ForgeSubView,
} from './forgeTourConfig';
import {
  getTutorialAvailableNodeState,
  TutorialNodeState,
} from '../../services/unifiedSkillTreeService';
import { setForgeTutorialCompleted } from '../../services/forgeTutorialService';
import { playUISound } from '../../services/soundManager';
import { useBackHandler } from '../../services/backButtonManager';
import {
  TargetRect,
  resolveTargetElement,
  scrollTargetIntoViewIfNeeded,
  enableTutorialScrollLock,
  measureElementRect,
  calculateTourCardLayout,
  isElementCircular,
  isPointVisibleAt,
} from './tutorialScrollManager';
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Check,
  Flame,
  Zap,
  Shield,
  Loader2,
} from 'lucide-react';

interface ForgeTourSpotlightProps {
  isActive: boolean;
  stepIndex: number;
  onStepChange: (index: number) => void;
  onClose: () => void;
  onTutorialComplete?: () => void;
  currentSubView: ForgeSubView;
  onNavigateSubView: (view: ForgeSubView) => void;
}

export const ForgeTourSpotlight: React.FC<ForgeTourSpotlightProps> = ({
  isActive,
  stepIndex,
  onStepChange,
  onClose,
  onTutorialComplete,
  currentSubView,
  onNavigateSubView,
}) => {
  const { player, skills } = useGame();
  const { currentMode } = useTheme();
  const isLight = currentMode === 'light';
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);
  const [isNavigating, setIsNavigating] = useState<boolean>(true);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const activeElementRef = useRef<HTMLElement | null>(null);

  // Determine current player's skill tree state to configure honest tutorial steps
  const tutorialNodeState: TutorialNodeState = useMemo(() => {
    return getTutorialAvailableNodeState(
      player?.level || 1,
      0,
      skills || []
    );
  }, [player?.level, skills]);

  const hasAvailableNode = tutorialNodeState.status === 'available';

  const tourSteps: ForgeTourStep[] = useMemo(() => {
    return getForgeTourSteps({
      playerLevel: player?.level || 1,
      hasAvailableNode,
      availableNodeTitle: tutorialNodeState.node?.title,
    });
  }, [player?.level, hasAvailableNode, tutorialNodeState.node?.title]);

  const currentStep: ForgeTourStep = tourSteps[stepIndex] || tourSteps[0];

  // Lock manual user scrolling (wheel, touchmove, keyboard scroll) while tutorial is active.
  // Releases immediately on close, skip, completion, or component unmount.
  useEffect(() => {
    if (!isActive) return;
    const releaseScrollLock = enableTutorialScrollLock();
    return () => {
      releaseScrollLock();
    };
  }, [isActive]);

  // 1. Target Resolution, Sub-View Navigation & Deterministic Visibility Pipeline
  useEffect(() => {
    if (!isActive) {
      setTargetRect(null);
      setIsNavigating(false);
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      }
      return;
    }

    let isSubscribed = true;
    setIsNavigating(true);
    setTargetRect(null);

    // Hard safety fallback to ensure the navigation spinner NEVER gets stuck indefinitely
    const safetyTimeout = setTimeout(() => {
      if (isSubscribed) {
        setIsNavigating(false);
      }
    }, 3200);

    // If step requires a different sub-view, request navigation and wait for subview to update
    if (currentStep.targetView !== currentSubView) {
      onNavigateSubView(currentStep.targetView);
      return () => {
        isSubscribed = false;
        clearTimeout(safetyTimeout);
      };
    }

    // Pipeline: Settle -> Resolve Element -> Scroll Container -> Measure -> Display
    async function locateAndPositionTarget() {
      try {
        // Double requestAnimationFrame ensures React commit & Framer-motion layout settle
        await new Promise<void>((res) => {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => res());
          });
        });

        if (!isSubscribed) return;

        // Build responsive, state-aware target selector list
        const candidateSelectors: string[] = [];

        if (
          currentStep.id === 'quests-roster' ||
          currentStep.stepNumber === 4
        ) {
          // Highlight ONE SINGLE ACTUAL QUEST CARD; fallback gracefully if not rendered
          candidateSelectors.push('[data-tutorial-target="active-quest-card"]');
          candidateSelectors.push('[data-forge-tour="tutorial-quest"]');
          candidateSelectors.push('[data-quest-card="true"]');
          candidateSelectors.push('[data-forge-tour="active-quests-header"]');
        } else if (
          currentStep.id === 'tutorial-quest' ||
          currentStep.stepNumber === 5
        ) {
          candidateSelectors.push('[data-forge-tour="start-quest"]');
          candidateSelectors.push('[data-tutorial-target="active-quest-card"] button');
          candidateSelectors.push('[data-forge-tour="tutorial-quest"]');
          candidateSelectors.push('[data-tutorial-target="active-quest-card"]');
          candidateSelectors.push('[data-quest-card="true"]');
          candidateSelectors.push('[data-forge-tour="active-quests-header"]');
        } else if (
          currentStep.id === 'tutorial-available-node' ||
          currentStep.stepNumber === 7
        ) {
          if (tutorialNodeState.node?.id) {
            try {
              candidateSelectors.push(`[data-skill-node-id="${CSS.escape(tutorialNodeState.node.id)}"]`);
            } catch {
              candidateSelectors.push(`[data-skill-node-id="${tutorialNodeState.node.id}"]`);
            }
          }
          candidateSelectors.push('[data-forge-tour="tutorial-available-node"]');
          candidateSelectors.push('[data-forge-tour="skill-tree-mobile"]');
          candidateSelectors.push('[data-forge-tour="skill-tree"]');
        } else if (
          currentStep.targetSelector === '[data-forge-tour="skill-tree-mobile"]' ||
          currentStep.targetSelector === '[data-forge-tour="skill-tree"]'
        ) {
          candidateSelectors.push('[data-forge-tour="skill-tree-mobile"]');
          candidateSelectors.push('[data-forge-tour="skill-tree"]');
        } else if (currentStep.targetSelector === '#forge-character-build-view') {
          candidateSelectors.push('#forge-character-build-view');
          candidateSelectors.push('[data-forge-tour="character"]');
        } else if (currentStep.targetSelector === '#forge-progression-view') {
          candidateSelectors.push('#forge-progression-view');
          candidateSelectors.push('[data-forge-tour="progression"]');
        } else if (currentStep.targetSelector === '[data-forge-tour="skill-node-detail"]') {
          candidateSelectors.push('[data-forge-tour="skill-node-detail"]');
          candidateSelectors.push('[data-forge-tour="skill-tree-mobile"]');
          candidateSelectors.push('[data-forge-tour="skill-tree"]');
        } else if (
          currentStep.id === 'forge-path' ||
          currentStep.targetSelector === '[data-forge-tour="forge-path"]'
        ) {
          candidateSelectors.push('[data-forge-tour="forge-path"]');
        } else {
          candidateSelectors.push(currentStep.targetSelector);
        }

        // Try candidate selectors sequentially
        let el: HTMLElement | null = null;
        for (const selector of candidateSelectors) {
          el = await resolveTargetElement(selector, 1800);
          if (el) break;
        }

        if (!isSubscribed) return;

        if (el) {
          activeElementRef.current = el;

          // Automatically scroll container into full visibility
          await scrollTargetIntoViewIfNeeded(el);

          if (!isSubscribed) return;

          // Measure settled target coordinates
          const rect = measureElementRect(el);
          setTargetRect(rect);
          setIsNavigating(false);
          clearTimeout(safetyTimeout);

          // Diagnostics for development inspection
          if (
            process.env.NODE_ENV !== 'production' &&
            (currentStep.id === 'tutorial-available-node' || currentStep.stepNumber === 7)
          ) {
            console.group('[Forge Tour Diagnostics] Step 7 - Available Skill Node');
            console.log('Status:', tutorialNodeState.status);
            console.log('Available Node ID:', tutorialNodeState.node?.id);
            console.log('Available Node Title:', tutorialNodeState.node?.title);
            console.log('Genuinely Unlockable:', hasAvailableNode);
            console.log('Target DOM Rect:', rect);
            console.groupEnd();
          }

          // Setup real-time dynamic resize observer
          if (resizeObserverRef.current) {
            resizeObserverRef.current.disconnect();
          }

          if (typeof ResizeObserver !== 'undefined') {
            resizeObserverRef.current = new ResizeObserver(() => {
              if (isSubscribed && activeElementRef.current) {
                const updatedRect = measureElementRect(activeElementRef.current);
                if (updatedRect) setTargetRect(updatedRect);
              }
            });
            resizeObserverRef.current.observe(el);
          }
        } else {
          // Graceful fallback if target is not available in DOM
          setTargetRect(null);
          setIsNavigating(false);
          clearTimeout(safetyTimeout);
        }
      } catch (err) {
        console.error('[Forge Tour] Error during target navigation:', err);
        if (isSubscribed) {
          setTargetRect(null);
          setIsNavigating(false);
          clearTimeout(safetyTimeout);
        }
      }
    }

    locateAndPositionTarget();

    // Listen to window scroll & resize events to keep target coordinates synced
    const handleWindowChange = () => {
      if (isSubscribed && activeElementRef.current) {
        const updatedRect = measureElementRect(activeElementRef.current);
        if (updatedRect) setTargetRect(updatedRect);
      }
    };

    window.addEventListener('resize', handleWindowChange, { passive: true });
    window.addEventListener('scroll', handleWindowChange, { passive: true });

    return () => {
      isSubscribed = false;
      clearTimeout(safetyTimeout);
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      }
      window.removeEventListener('resize', handleWindowChange);
      window.removeEventListener('scroll', handleWindowChange);
    };
  }, [
    isActive,
    stepIndex,
    currentSubView,
    currentStep.id,
    currentStep.targetSelector,
    currentStep.targetView,
    hasAvailableNode,
    tutorialNodeState.node?.id,
  ]);

  // 2. Keyboard Navigation
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleSkip();
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        handleNext();
      } else if (e.key === 'ArrowLeft' && stepIndex > 0) {
        handlePrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, stepIndex, tourSteps.length]);

  const handleNext = () => {
    if (stepIndex < tourSteps.length - 1) {
      playUISound('tutorialStep');
      onStepChange(stepIndex + 1);
    } else {
      playUISound('tutorialComplete');
      setForgeTutorialCompleted(true);
      onClose();
      onTutorialComplete?.();
    }
  };

  const handlePrev = () => {
    if (stepIndex > 0) {
      playUISound('tutorialStep');
      onStepChange(stepIndex - 1);
    }
  };

  const handleSkip = () => {
    playUISound('tap');
    setForgeTutorialCompleted(true);
    onClose();
  };

  // Register Android Back button handler for Tour Walkthrough (Priority 80)
  useBackHandler(
    'forge-tour-spotlight',
    80,
    () => {
      if (stepIndex > 0) {
        handlePrev();
      } else {
        handleSkip();
      }
      return true;
    },
    isActive
  );

  if (!isActive) return null;

  const isFinalStep = currentStep.isFinalStep || stepIndex === tourSteps.length - 1;
  const cardLayout = calculateTourCardLayout(targetRect, currentStep.placement);

  // Spotlight cutout padding around element
  const isCircular =
    currentStep.targetShape === 'circle' || isElementCircular(activeElementRef.current);
  const padding = 8;
  const spotlightX = targetRect ? Math.max(0, targetRect.left - padding) : 0;
  const spotlightY = targetRect ? Math.max(0, targetRect.top - padding) : 0;
  const spotlightW = targetRect ? targetRect.width + padding * 2 : 0;
  const spotlightH = targetRect ? targetRect.height + padding * 2 : 0;
  const circleRadius = isCircular ? Math.max(spotlightW, spotlightH) / 2 : 0;

  return (
    <div id="forge-tour-portal" className="fixed inset-0 z-50 pointer-events-auto select-none">
      {/* 1. SVG Cutout Dimming Overlay */}
      <svg className="fixed inset-0 w-full h-full pointer-events-none transition-opacity duration-200 ease-out">
        <defs>
          <mask id="forge-tour-mask">
            {/* Opaque white fills screen */}
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {/* Cutout over target element reveals underlying application */}
            {targetRect &&
              !isNavigating &&
              (isCircular ? (
                <circle
                  cx={spotlightX + spotlightW / 2}
                  cy={spotlightY + spotlightH / 2}
                  r={circleRadius}
                  fill="black"
                  className="transition-all duration-200 ease-out"
                />
              ) : (
                <rect
                  x={spotlightX}
                  y={spotlightY}
                  width={spotlightW}
                  height={spotlightH}
                  rx="16"
                  ry="16"
                  fill="black"
                  className="transition-all duration-200 ease-out"
                />
              ))}
          </mask>
        </defs>

        {/* Backdrop Darkness - adapts gracefully between Light and Dark modes */}
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill={isLight ? 'rgba(32, 37, 34, 0.45)' : 'rgba(4, 6, 12, 0.78)'}
          mask="url(#forge-tour-mask)"
        />
      </svg>

      {/* 2. Target Spotlight Border & Subtle Pulse Frame */}
      {targetRect && !isNavigating && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2 }}
          className={`fixed pointer-events-none border-2 border-[var(--forge-accent)] shadow-[0_0_24px_var(--forge-accent-glow)] ${
            isCircular ? 'rounded-full' : 'rounded-2xl'
          }`}
          style={{
            top: `${spotlightY}px`,
            left: `${spotlightX}px`,
            width: `${spotlightW}px`,
            height: `${spotlightH}px`,
          }}
        >
          {/* Subtle outer accent line */}
          <div
            className={`absolute -inset-1 border border-[var(--forge-accent)]/35 pointer-events-none animate-pulse ${
              isCircular ? 'rounded-full' : 'rounded-2xl'
            }`}
          />
        </motion.div>
      )}

      {/* 3. Floating Interactive Walkthrough Card */}
      <AnimatePresence mode="wait">
        {!isNavigating ? (
          <motion.div
            key={`tour-card-${currentStep.id}`}
            initial={{ opacity: 0, y: cardLayout.placement === 'bottom' ? 8 : -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="fixed z-50 bg-[var(--forge-surface-elevated)] border border-[var(--forge-border-strong)] rounded-2xl shadow-2xl p-4 sm:p-5 flex flex-col justify-between backdrop-blur-md text-[var(--forge-text-primary)]"
            style={{
              top: `${cardLayout.top}px`,
              left: `${cardLayout.left}px`,
              width: `${cardLayout.width}px`,
            }}
          >
            {/* Top Header: Step Indicator */}
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-mono font-bold tracking-widest text-[var(--forge-accent)] bg-[var(--forge-accent-muted)] border border-[var(--forge-border-accent)] px-2 py-0.5 rounded-md uppercase">
                STEP {currentStep.stepNumber} OF {currentStep.totalSteps}
              </span>
              <span className="text-[10px] font-mono text-[var(--forge-text-muted)] truncate max-w-[200px]">
                {currentStep.subtitle}
              </span>
            </div>

            {/* Title */}
            <h3 className="text-base font-extrabold text-[var(--forge-text-primary)] tracking-wide flex items-center gap-2">
              {currentStep.title}
            </h3>

            {/* Step Body Description */}
            <p className="text-xs text-[var(--forge-text-secondary)] leading-relaxed mt-1.5 mb-3">
              {currentStep.description}
            </p>

            {/* Action Cue Hint */}
            {currentStep.actionHint && (
              <div className="mb-4 px-2.5 py-1.5 rounded-lg bg-[var(--forge-surface)] border border-[var(--forge-border)] flex items-center gap-2 text-[11px] font-mono text-[var(--forge-accent)]">
                <Sparkles className="w-3.5 h-3.5 text-[var(--forge-accent)] shrink-0" />
                <span className="truncate">{currentStep.actionHint}</span>
              </div>
            )}

            {/* Bottom Actions Bar */}
            <div className="flex items-center justify-between pt-2.5 border-t border-[var(--forge-border)]">
              {/* Skip Button */}
              <button
                onClick={handleSkip}
                className="text-xs font-semibold text-[var(--forge-text-muted)] hover:text-[var(--forge-text-primary)] transition-colors cursor-pointer px-1 py-1"
              >
                Skip
              </button>

              {/* Navigation Controls */}
              <div className="flex items-center gap-2">
                {stepIndex > 0 && (
                  <button
                    onClick={handlePrev}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-[var(--forge-text-primary)] bg-[var(--forge-surface-interactive)] border border-[var(--forge-border)] hover:border-[var(--forge-border-accent)] transition-all cursor-pointer min-h-[36px]"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back</span>
                  </button>
                )}

                <button
                  onClick={handleNext}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-md min-h-[36px] bg-[var(--forge-button-accent)] text-[var(--forge-button-accent-text)] hover:brightness-110 active:scale-95"
                >
                  <span>{isFinalStep ? 'Start Forging' : 'Next'}</span>
                  {isFinalStep ? (
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  ) : (
                    <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        ) : (
          /* Subtle transitional indicator during screen navigation / target locating */
          <motion.div
            key="tour-navigating-indicator"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-3.5 py-2 rounded-full bg-[var(--forge-surface-elevated)] border border-[var(--forge-border)] text-xs font-mono text-[var(--forge-accent)] flex items-center gap-2 shadow-xl backdrop-blur-sm"
          >
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Navigating to {currentStep.title}...</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
