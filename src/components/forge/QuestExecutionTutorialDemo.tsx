import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Clock,
  Zap,
  Check,
  AlertTriangle,
  Flame,
  Shield,
  ArrowLeft,
  Award,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { BackButton } from '../ui/BackButton';
import { useBackHandler } from '../../services/backButtonManager';
import { playUISound } from '../../services/soundManager';

interface QuestExecutionTutorialDemoProps {
  onBack: () => void;
}

/**
 * QUEST EXECUTION TUTORIAL DEMO
 * 
 * Standalone sandbox component used EXCLUSIVELY by the Quest Execution System Guide.
 * Operates entirely on transient in-memory local state.
 * Never calls real database or progression services, awards 0 XP, and never touches real quests.
 */
export const QuestExecutionTutorialDemo: React.FC<QuestExecutionTutorialDemoProps> = ({
  onBack,
}) => {
  const [secondsRemaining, setSecondsRemaining] = useState<number>(120);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [isExtended, setIsExtended] = useState<boolean>(false);

  // Android Back Handler Priority 60 (returns to guides)
  useBackHandler(
    'tutorial-quest-execution',
    60,
    () => {
      onBack();
      return true;
    },
    true
  );

  // Controlled timer tick for demo authenticity (does not dispatch notifications)
  useEffect(() => {
    if (isCompleted || secondsRemaining <= 0) return;
    const interval = setInterval(() => {
      setSecondsRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [isCompleted, secondsRemaining]);

  const formatDemoTime = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCompleteDemo = () => {
    playUISound('confirm');
    setIsCompleted(true);
  };

  const handleExtendDemo = () => {
    playUISound('tap');
    setIsExtended(true);
    setSecondsRemaining((prev) => prev + 300);
  };

  return (
    <div
      id="quest-execution-tutorial-demo-root"
      data-system-guide="tutorial-execution-screen"
      className="space-y-5 pb-24 max-w-xl mx-auto"
    >
      {/* Top Header & Demo Indicator */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <BackButton
          onClick={onBack}
          label="Guides"
          sublabel="Exit Demo"
          id="tutorial-exec-back-btn"
        />

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 font-mono text-[10px] font-bold uppercase tracking-wider">
            <Sparkles className="w-3 h-3 text-amber-500 shrink-0" />
            <span>Tutorial Demo</span>
          </span>
        </div>
      </div>

      {isCompleted ? (
        /* Tutorial-Only Session Finished State */
        <motion.div
          key="tutorial-completed-card"
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.25 }}
          className="forge-card p-6 text-center space-y-4 rounded-2xl bg-[var(--forge-surface)] border border-[var(--forge-border-accent)] shadow-xl"
        >
          <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-500 flex items-center justify-center shadow-lg">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div>
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-[var(--forge-text-primary)]">
              Session Finished Demo
            </h2>
            <p className="text-xs text-[var(--forge-text-secondary)] mt-1.5 max-w-md mx-auto leading-relaxed">
              In a real quest, completing awards Player XP, Attribute XP, and streak credit. Because this is a tutorial demonstration, no real data was modified.
            </p>
          </div>

          <div className="pt-2 flex justify-center">
            <Button
              variant="gold"
              onClick={onBack}
              className="px-6 py-2.5 text-xs font-mono font-bold uppercase tracking-wider"
            >
              Return to System Guides
            </Button>
          </div>
        </motion.div>
      ) : (
        /* Active Execution Demo */
        <div className="space-y-4">
          {/* Objective Overview Card */}
          <div
            data-system-guide="tutorial-execution-overview"
            className="forge-card p-5 rounded-2xl bg-[var(--forge-surface)] border border-[var(--forge-border)] shadow-xs space-y-3"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="forge-pill forge-pill-accent text-[10px] font-mono uppercase">
                Focus Sprint • Daily Quest
              </span>
              <span className="text-[10px] font-mono text-[var(--forge-text-muted)]">
                2 Min Protocol
              </span>
            </div>

            <div>
              <h2 className="font-serif text-lg sm:text-xl font-bold text-[var(--forge-text-primary)]">
                Tutorial Focus Sprint
              </h2>
              <p className="text-xs text-[var(--forge-text-secondary)] mt-1 leading-relaxed">
                Practice how an active Forge quest functions. During real quests, maintain focused attention without distractions until the timer elapses.
              </p>
            </div>

            <div className="pt-2 border-t border-[var(--forge-border)] flex items-center justify-between text-xs">
              <span className="text-[var(--forge-text-muted)] font-mono text-[11px]">Primary Attribute:</span>
              <span className="text-[var(--forge-text-accent)] font-semibold font-mono text-[11px]">Mind / Focus (+15 XP demo)</span>
            </div>
          </div>

          {/* Countdown Timer Display */}
          <div
            data-system-guide="tutorial-execution-timer"
            className="forge-card p-6 rounded-2xl bg-[var(--forge-surface)] border border-[var(--forge-border)] shadow-xs flex flex-col items-center justify-center text-center space-y-3"
          >
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[var(--forge-text-muted)]">
              Remaining Execution Time
            </span>

            <div className="font-mono text-4xl sm:text-5xl font-bold tracking-tight text-[var(--forge-text-accent)]">
              {formatDemoTime(secondsRemaining)}
            </div>

            <div className="flex items-center gap-1.5 text-xs text-[var(--forge-text-secondary)]">
              <Clock className="w-3.5 h-3.5 text-[var(--forge-text-muted)]" />
              <span>{isExtended ? 'Extended focus block active' : 'Unbroken deep work block'}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div
            data-system-guide="tutorial-execution-actions"
            className="forge-card p-4 rounded-2xl bg-[var(--forge-surface)] border border-[var(--forge-border)] shadow-xs flex items-center justify-between gap-2.5 flex-wrap sm:flex-nowrap"
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="text-xs font-mono uppercase text-[var(--forge-text-muted)] hover:text-[var(--forge-text-primary)]"
            >
              Abandon Demo
            </Button>

            <div className="flex items-center gap-2 ml-auto">
              {!isExtended && (
                <Button
                  variant="dark"
                  size="sm"
                  onClick={handleExtendDemo}
                  className="text-xs font-mono uppercase text-[var(--forge-text-secondary)]"
                >
                  +5m Extend
                </Button>
              )}

              <Button
                variant="gold"
                size="sm"
                onClick={handleCompleteDemo}
                className="text-xs font-mono font-bold uppercase shadow-xs flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Complete Demo</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
