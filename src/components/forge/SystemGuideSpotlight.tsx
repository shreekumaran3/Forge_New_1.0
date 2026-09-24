import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, ArrowRight, Check, Sparkles, Loader2 } from 'lucide-react';
import { SystemGuideDef, SystemGuideDestination } from './systemGuideConfig';
import { playUISound } from '../../services/soundManager';

interface SystemGuideSpotlightProps {
  guide: SystemGuideDef;
  onClose: () => void;
  onNavigate: (destination: SystemGuideDestination) => void;
}

interface TargetRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export const SystemGuideSpotlight: React.FC<SystemGuideSpotlightProps> = ({
  guide,
  onClose,
  onNavigate,
}) => {
  const [stepIndex, setStepIndex] = useState<number>(0);
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);
  const [isNavigating, setIsNavigating] = useState<boolean>(true);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const activeElementRef = useRef<HTMLElement | null>(null);

  const currentStep = guide.steps[stepIndex] || guide.steps[0];
  const isFinalStep = stepIndex >= guide.steps.length - 1;

  // Lock background scrolling while guide is active
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  // Update target rect on element repositioning
  const updateElementRect = useCallback((elem: HTMLElement) => {
    const rect = elem.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      setTargetRect({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      });
    }
  }, []);

  // Locate and measure target element
  useEffect(() => {
    let isCancelled = false;
    setIsNavigating(true);
    setTargetRect(null);

    if (resizeObserverRef.current) {
      resizeObserverRef.current.disconnect();
    }

    // Ensure root and sub-tab/view navigation occurs
    onNavigate(guide.destination);

    // Timeout safety fallback so user is never permanently stuck in navigation state
    const safetyTimer = setTimeout(() => {
      if (!isCancelled) {
        setIsNavigating(false);
      }
    }, 3000);

    let attempts = 0;
    const maxAttempts = 35; // 35 * 70ms = 2.45s

    const checkElement = () => {
      if (isCancelled) return;

      const elem = document.querySelector(currentStep.targetSelector) as HTMLElement | null;

      if (elem && elem.getBoundingClientRect().height > 0) {
        activeElementRef.current = elem;

        // Smoothly scroll target into visible center area
        elem.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });

        setTimeout(() => {
          if (isCancelled) return;
          updateElementRect(elem);
          setIsNavigating(false);

          // Attach ResizeObserver to keep rect updated
          if ('ResizeObserver' in window) {
            resizeObserverRef.current = new ResizeObserver(() => {
              if (activeElementRef.current) {
                updateElementRect(activeElementRef.current);
              }
            });
            resizeObserverRef.current.observe(elem);
          }
        }, 180);
      } else if (attempts < maxAttempts) {
        attempts++;
        setTimeout(checkElement, 70);
      } else {
        setIsNavigating(false);
      }
    };

    // Initial check after React commit
    requestAnimationFrame(() => {
      requestAnimationFrame(checkElement);
    });

    return () => {
      isCancelled = true;
      clearTimeout(safetyTimer);
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      }
    };
  }, [currentStep, guide.destination, onNavigate, updateElementRect]);

  // Window resize and scroll listeners
  useEffect(() => {
    const handleRecalc = () => {
      if (activeElementRef.current) {
        updateElementRect(activeElementRef.current);
      }
    };
    window.addEventListener('resize', handleRecalc, { passive: true });
    window.addEventListener('scroll', handleRecalc, { passive: true });
    return () => {
      window.removeEventListener('resize', handleRecalc);
      window.removeEventListener('scroll', handleRecalc);
    };
  }, [updateElementRect]);

  const handleNext = () => {
    playUISound('tap');
    if (isFinalStep) {
      onClose();
    } else {
      setStepIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    playUISound('tap');
    if (stepIndex > 0) {
      setStepIndex((prev) => prev - 1);
    }
  };

  const handleSkip = () => {
    playUISound('tap');
    onClose();
  };

  // Card Positioning calculations
  const cardLayout = useMemo(() => {
    const margin = 16;
    const cardWidth = Math.min(380, window.innerWidth - 32);
    const cardHeight = 240; // Estimated card height
    const vh = window.innerHeight;
    const vw = window.innerWidth;

    if (!targetRect) {
      return {
        top: Math.max(margin, (vh - cardHeight) / 2),
        left: Math.max(margin, (vw - cardWidth) / 2),
        width: cardWidth,
        placement: 'center' as const,
      };
    }

    const spaceAbove = targetRect.top;
    const spaceBelow = vh - (targetRect.top + targetRect.height);

    let placement: 'top' | 'bottom' = currentStep.placement === 'top' ? 'top' : 'bottom';
    if (placement === 'bottom' && spaceBelow < cardHeight + 24 && spaceAbove > cardHeight + 24) {
      placement = 'top';
    } else if (placement === 'top' && spaceAbove < cardHeight + 24 && spaceBelow > cardHeight + 24) {
      placement = 'bottom';
    }

    let top: number;
    if (placement === 'bottom') {
      top = targetRect.top + targetRect.height + 12;
      // Clamp to viewport bottom
      if (top + cardHeight > vh - margin) {
        top = Math.max(margin, vh - cardHeight - margin);
      }
    } else {
      top = targetRect.top - cardHeight - 12;
      if (top < margin) {
        top = margin;
      }
    }

    // Horizontal centering relative to target
    const targetCenterX = targetRect.left + targetRect.width / 2;
    let left = targetCenterX - cardWidth / 2;
    // Clamp to viewport horizontal margins
    left = Math.max(margin, Math.min(vw - cardWidth - margin, left));

    return {
      top,
      left,
      width: cardWidth,
      placement,
    };
  }, [targetRect, currentStep.placement]);

  const pad = 6;
  const spotlightX = targetRect ? Math.max(0, targetRect.left - pad) : 0;
  const spotlightY = targetRect ? Math.max(0, targetRect.top - pad) : 0;
  const spotlightW = targetRect ? targetRect.width + pad * 2 : 0;
  const spotlightH = targetRect ? targetRect.height + pad * 2 : 0;
  const isCircular = currentStep.targetShape === 'circle';

  return (
    <div
      id="forge-system-guide-overlay"
      className="fixed inset-0 z-50 pointer-events-auto"
      style={{ touchAction: 'none' }}
    >
      {/* 1. Backdrop with spotlight cutout mask */}
      <svg
        className="fixed inset-0 w-full h-full pointer-events-none transition-opacity duration-300 z-40"
        style={{ width: '100vw', height: '100vh' }}
      >
        <defs>
          <mask id="system-guide-spotlight-mask">
            {/* White allows backdrop fill */}
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {/* Black cuts out spotlight aperture */}
            {targetRect && (
              <rect
                x={spotlightX}
                y={spotlightY}
                width={spotlightW}
                height={spotlightH}
                rx={isCircular ? spotlightW / 2 : 16}
                ry={isCircular ? spotlightH / 2 : 16}
                fill="black"
              />
            )}
          </mask>
        </defs>
        {/* Semi-transparent dark curtain */}
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(0, 0, 0, 0.78)"
          mask="url(#system-guide-spotlight-mask)"
        />
      </svg>

      {/* 2. Target accent pulse ring */}
      {targetRect && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2 }}
          className="fixed pointer-events-none z-40"
          style={{
            top: `${spotlightY}px`,
            left: `${spotlightX}px`,
            width: `${spotlightW}px`,
            height: `${spotlightH}px`,
          }}
        >
          <div
            className={`absolute -inset-1 border border-[var(--forge-border-accent,#D4AF37)]/40 pointer-events-none animate-pulse ${
              isCircular ? 'rounded-full' : 'rounded-2xl'
            }`}
          />
        </motion.div>
      )}

      {/* 3. Floating Interactive Walkthrough Card */}
      <AnimatePresence mode="wait">
        {!isNavigating ? (
          <motion.div
            key={`guide-card-${guide.id}-${currentStep.id}`}
            initial={{ opacity: 0, y: cardLayout.placement === 'bottom' ? 8 : -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="fixed z-50 bg-[var(--forge-surface)] border border-[var(--forge-border-accent)] rounded-2xl shadow-2xl p-4 sm:p-5 flex flex-col justify-between backdrop-blur-xl text-[var(--forge-text-primary)]"
            style={{
              top: `${cardLayout.top}px`,
              left: `${cardLayout.left}px`,
              width: `${cardLayout.width}px`,
            }}
          >
            {/* Top Header: Step Indicator & Category */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-mono font-bold tracking-widest text-[var(--forge-text-accent)] bg-[var(--forge-primary)]/10 border border-[var(--forge-border-accent)] px-2 py-0.5 rounded-md uppercase">
                  STEP {stepIndex + 1} OF {guide.steps.length}
                </span>
                <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--forge-text-muted)] truncate max-w-[200px]">
                  {guide.categoryLabel}
                </span>
              </div>

              {/* Step Title */}
              <h3 className="text-base font-bold font-serif text-[var(--forge-text-primary)] tracking-wide flex items-center gap-2">
                {currentStep.title}
              </h3>

              {/* Step Description */}
              <p className="text-xs text-[var(--forge-text-secondary)] leading-relaxed mt-1.5 mb-3">
                {currentStep.description}
              </p>

              {/* Action Cue Hint */}
              {currentStep.actionHint && (
                <div className="mb-4 px-2.5 py-1.5 rounded-lg bg-[var(--forge-surface-interactive)] border border-[var(--forge-border)] flex items-center gap-2 text-[11px] font-mono text-[var(--forge-text-accent)]">
                  <Sparkles className="w-3.5 h-3.5 text-[var(--forge-text-accent)] shrink-0" />
                  <span className="truncate">{currentStep.actionHint}</span>
                </div>
              )}
            </div>

            {/* Bottom Actions Bar (Skip on left, Back/Next on right; NO CLOSE X) */}
            <div className="flex items-center justify-between pt-2.5 border-t border-[var(--forge-border)] mt-1">
              <button
                type="button"
                onClick={handleSkip}
                className="text-xs font-semibold text-[var(--forge-text-muted)] hover:text-[var(--forge-text-primary)] transition-colors cursor-pointer px-1 py-1"
              >
                Skip
              </button>

              <div className="flex items-center gap-2">
                {stepIndex > 0 && (
                  <button
                    type="button"
                    onClick={handlePrev}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-[var(--forge-text-primary)] bg-[var(--forge-surface-interactive)] border border-[var(--forge-border)] hover:border-[var(--forge-border-accent)] transition-all cursor-pointer min-h-[36px]"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleNext}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-md min-h-[36px] bg-[var(--forge-primary)] text-[var(--forge-button-text,#000)] hover:brightness-105 active:scale-95"
                >
                  <span>{isFinalStep ? 'Got It' : 'Next'}</span>
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
          /* Subtle transitional indicator during screen navigation */
          <motion.div
            key="guide-navigating-indicator"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-[var(--forge-surface)] border border-[var(--forge-border-accent)] text-xs font-mono text-[var(--forge-text-accent)] flex items-center gap-2 shadow-2xl backdrop-blur-md"
          >
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--forge-text-accent)]" />
            <span>Navigating to {guide.title}...</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
