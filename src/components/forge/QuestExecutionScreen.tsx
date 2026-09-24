import React, { useState } from 'react';
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
} from 'lucide-react';
import { QuestExecution } from '../../types';
import { useGame } from '../../context/GameContext';
import { useQuestExecutionTimer } from '../../hooks/useQuestExecutionTimer';
import { formatTimeDisplay } from '../../services/questExecutionService';
import { getQuestRarity } from '../../services/questRarityService';
import { PILLARS_CONFIG, STATS_CONFIG } from '../../services/xpService';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { useBackHandler } from '../../services/backButtonManager';
import { playUISound } from '../../services/soundManager';
import { useTheme } from '../../theme/ThemeContext';

interface QuestExecutionScreenProps {
  execution: QuestExecution;
  onBack: () => void;
}

export const QuestExecutionScreen: React.FC<QuestExecutionScreenProps> = ({
  execution,
  onBack,
}) => {
  const { currentMode } = useTheme();
  const isLight = currentMode === 'light';

  const {
    confirmQuestExecution,
    completeQuestExecutionEarly,
    extendQuestExecution,
    finishQuestExecution,
    cancelQuestExecution,
    dismissCompletedExecution,
  } = useGame();

  const [isAbandonModalOpen, setIsAbandonModalOpen] = useState(false);
  const [isEarlyCompleteModalOpen, setIsEarlyCompleteModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Android Back Button handler: Priority 60 (above subviews, below modals)
  useBackHandler(
    `quest-exec-${execution.executionId}`,
    60,
    () => {
      if (isAbandonModalOpen) {
        setIsAbandonModalOpen(false);
        return true;
      }
      if (isEarlyCompleteModalOpen) {
        setIsEarlyCompleteModalOpen(false);
        return true;
      }
      if (isCompleted) {
        handleContinue();
        return true;
      }
      onBack();
      return true;
    },
    Boolean(execution)
  );

  const timer = useQuestExecutionTimer(execution, () => {
    playUISound('questTimerComplete');
  });

  const rarity = getQuestRarity(execution.rarity, execution.category, execution.basePlayerXP);
  const pillar = PILLARS_CONFIG.find((p) => p.id === execution.pillarId);
  const stat = STATS_CONFIG.find((s) => s.id === execution.primaryStatId);

  // Status transitions
  const isAwaitingConfirmation =
    execution.status === 'AWAITING_CONFIRMATION' ||
    (execution.status === 'ACTIVE' && timer.remainingSeconds === 0);
  const isExtension = execution.status === 'EXTENSION';
  const isCompleted = execution.status === 'COMPLETED';

  const handleConfirmFinish = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      if (isExtension) {
        await finishQuestExecution(execution.executionId);
      } else {
        await confirmQuestExecution(execution.executionId);
      }
    } catch (err) {
      console.error('Failed to complete quest execution:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEarlyComplete = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setIsEarlyCompleteModalOpen(false);
    try {
      await completeQuestExecutionEarly(execution.executionId);
    } catch (err) {
      console.error('Failed to early complete quest execution:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExtend = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await extendQuestExecution(execution.executionId);
    } catch (err) {
      console.error('Failed to extend quest execution:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmAbandon = async () => {
    setIsAbandonModalOpen(false);
    await cancelQuestExecution(execution.executionId);
    onBack();
  };

  const handleContinue = () => {
    dismissCompletedExecution();
    onBack();
  };

  // Visual styling for urgency states
  const getUrgencyBorder = () => {
    if (isExtension) return 'border-cyan-500/60 shadow-[0_0_25px_rgba(6,182,212,0.15)]';
    if (isAwaitingConfirmation) return 'border-[var(--forge-gold)]/80 shadow-[0_0_30px_rgba(212,175,55,0.25)]';
    if (timer.urgency === 'critical') return 'border-orange-500/70 shadow-[0_0_25px_rgba(249,115,22,0.2)] animate-pulse';
    if (timer.urgency === 'warning') return 'border-amber-500/50 shadow-[0_0_18px_rgba(245,158,11,0.15)]';
    return 'border-[var(--forge-border)]';
  };

  return (
    <div id="quest-execution-screen" className="space-y-6 pb-24 max-w-lg mx-auto">
      {/* 1. TOP BAR: Back Navigation + Status Badge */}
      <div className="flex items-center justify-between gap-3">
        {!isCompleted ? (
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--forge-surface)] border border-[var(--forge-border)] text-xs font-sans font-medium text-[var(--forge-text-secondary)] hover:text-[var(--forge-text-primary)] hover:border-[var(--forge-border-focus)] transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Forge Hub</span>
          </button>
        ) : (
          <div />
        )}

        <div className="flex items-center gap-2">
          {isExtension ? (
            <span className="px-2.5 py-1 rounded-md bg-cyan-950/40 border border-cyan-500/50 text-cyan-400 text-xs font-sans font-semibold uppercase tracking-wider flex items-center gap-1.5 animate-pulse">
              <Zap className="w-3.5 h-3.5 text-cyan-400" />
              <span>Extension Mode</span>
            </span>
          ) : isAwaitingConfirmation ? (
            <span className="px-2.5 py-1 rounded-md bg-amber-950/40 border border-amber-500/60 text-amber-400 text-xs font-sans font-semibold uppercase tracking-wider flex items-center gap-1.5 animate-pulse">
              <Check className="w-3.5 h-3.5 text-amber-400" />
              <span>Time Complete</span>
            </span>
          ) : isCompleted ? (
            <span className="px-2.5 py-1 rounded-md bg-emerald-950/40 border border-emerald-500/50 text-emerald-400 text-xs font-sans font-semibold uppercase tracking-wider flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-emerald-400" />
              <span>Completed</span>
            </span>
          ) : (
            <span className="px-2.5 py-1 rounded-md bg-[var(--forge-surface)] border border-[var(--forge-gold)]/40 text-[var(--forge-gold)] text-xs font-sans font-semibold uppercase tracking-wider flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-[var(--forge-gold)] animate-pulse" />
              <span>Mission Active</span>
            </span>
          )}
        </div>
      </div>

      {/* 2. SESSION FINISHED SCREEN (If Finished) */}
      {isCompleted ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        >
          <Card className="p-6 sm:p-8 border border-[var(--forge-border-accent)] bg-[var(--forge-surface)] text-center relative overflow-hidden shadow-xl space-y-6 rounded-2xl">
            <div className="space-y-2">
              <span className="text-xs font-mono font-bold uppercase tracking-[0.2em] text-[var(--forge-text-accent)]">
                SESSION FINISHED
              </span>
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[var(--forge-text-primary)] leading-tight">
                {execution.questTitle}
              </h2>
            </div>

            {/* Primary Reward: +XP */}
            <div className="py-4 px-6 rounded-2xl bg-[var(--forge-surface-subtle)] border border-[var(--forge-border)] max-w-xs mx-auto space-y-1.5">
              <div className="font-mono text-3xl sm:text-4xl font-extrabold text-[var(--forge-text-accent)] tracking-tight">
                +{execution.finalPlayerXP || execution.basePlayerXP} XP
              </div>
              {execution.skillId && (execution.finalSkillXP || execution.baseSkillXP) ? (
                <div className="text-xs font-mono text-[var(--forge-text-secondary)] border-t border-[var(--forge-border)] pt-1.5 flex items-center justify-center">
                  <span>+{execution.finalSkillXP || execution.baseSkillXP} Skill XP</span>
                </div>
              ) : null}
            </div>

            {/* Sole Action: CONTINUE */}
            <Button
              variant="gold"
              size="lg"
              onClick={handleContinue}
              className="w-full text-sm font-bold tracking-wider uppercase py-4 shadow-md rounded-xl cursor-pointer"
            >
              CONTINUE
            </Button>
          </Card>
        </motion.div>
      ) : (
        /* 3. ACTIVE MISSION / TIMER CORE COMPONENT */
        <Card className={`p-6 sm:p-8 bg-[var(--forge-surface)] relative overflow-hidden transition-all duration-300 ${getUrgencyBorder()}`}>
          <div className="relative z-10 flex flex-col items-center text-center space-y-6">
            {/* Quest Category & Identity Header */}
            <div className="flex items-center gap-2 flex-wrap justify-center">
              <span
                style={rarity.badgeStyle}
                className="text-xs uppercase font-sans font-bold tracking-wider px-2.5 py-1 rounded-md border flex items-center gap-1 shrink-0"
              >
                <Shield className="w-3 h-3" style={{ color: rarity.accentColor }} />
                <span>{rarity.label}</span>
              </span>

              <span className="text-xs uppercase font-sans tracking-wider font-bold text-[var(--forge-text-accent)] bg-[var(--forge-primary-muted)] px-2 py-0.5 rounded-md border border-[var(--forge-border-accent)]">
                {execution.identityTag || 'Identity Forged'}
              </span>

              {pillar && (
                <span className="text-xs text-[var(--forge-text-secondary)] uppercase tracking-wider bg-[var(--forge-surface-subtle)] px-2 py-0.5 rounded-md border border-[var(--forge-border)]">
                  {pillar.name}
                </span>
              )}
            </div>

            {/* Mission Title & Primary Prominent Description */}
            <div className="space-y-3 max-w-md w-full">
              <h1 className="font-sans text-xl sm:text-2xl font-bold text-[var(--forge-text-primary)] leading-tight">
                {execution.questTitle}
              </h1>

              {/* Prominent main content area for quest description */}
              {execution.questDescription && (
                <div className="p-4 bg-[var(--forge-surface-subtle)] border border-[var(--forge-border)] rounded-xl text-left">
                  <p className="text-sm text-[var(--forge-text-primary)] leading-relaxed font-normal">
                    {execution.questDescription}
                  </p>
                </div>
              )}
            </div>

            {/* CENTERPIECE: AUTHORITATIVE TIMESTAMP TIMER */}
            <div className="w-full max-w-xs py-4 px-6 rounded-2xl bg-[var(--forge-surface-subtle)] border border-[var(--forge-border)] relative shadow-inner">
              {isExtension ? (
                /* EXTENSION STOPWATCH */
                <div className="space-y-1">
                  <span className={`text-xs font-sans font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 ${
                    isLight ? 'text-cyan-800' : 'text-cyan-400'
                  }`}>
                    <Zap className="w-3.5 h-3.5" />
                    Extended Duration
                  </span>
                  <div className={`font-mono text-4xl sm:text-5xl font-extrabold tracking-wider ${
                    isLight ? 'text-cyan-800' : 'text-cyan-400'
                  }`}>
                    {timer.extensionTimeFormatted}
                  </div>
                  <div className="pt-2 border-t border-[var(--forge-border)] flex items-center justify-between text-xs font-sans">
                    <span className="text-[var(--forge-text-secondary)]">Live Reward:</span>
                    <span className="text-[var(--forge-text-accent)] font-bold">+{timer.currentReward.playerXP} XP ({Math.round(timer.currentReward.multiplier * 100)}%)</span>
                  </div>
                </div>
              ) : isAwaitingConfirmation ? (
                /* TIME COMPLETE READY TO FINISH */
                <div className="space-y-2 py-2">
                  <span className="text-xs font-sans font-bold uppercase tracking-wider text-[var(--forge-text-accent)]">
                    Planned Duration Reached
                  </span>
                  <div className="font-mono text-4xl sm:text-5xl font-extrabold tracking-wider text-[var(--forge-text-accent)]">
                    00:00
                  </div>
                  <p className="text-xs text-[var(--forge-text-secondary)] font-sans">
                    Target {formatTimeDisplay(execution.durationSeconds)} elapsed
                  </p>
                </div>
              ) : (
                /* ACTIVE COUNTDOWN */
                <div className="space-y-1">
                  <span className="text-xs font-sans font-semibold uppercase tracking-wider text-[var(--forge-text-secondary)]">
                    Time Remaining
                  </span>
                  <div
                    className={`font-mono text-4xl sm:text-5xl font-extrabold tracking-wider transition-colors ${
                      timer.urgency === 'critical'
                        ? 'text-orange-500'
                        : timer.urgency === 'warning'
                        ? 'text-amber-500'
                        : 'text-[var(--forge-text-primary)]'
                    }`}
                  >
                    {timer.timeFormatted}
                  </div>
                  <div className="pt-2 border-t border-[var(--forge-border)] flex items-center justify-between text-xs font-sans text-[var(--forge-text-secondary)]">
                    <span>Target: {formatTimeDisplay(execution.durationSeconds)}</span>
                    <span className="text-[var(--forge-text-accent)] font-bold">+{execution.basePlayerXP} XP</span>
                  </div>
                </div>
              )}

              {/* Smooth Progress Track */}
              {!isExtension && (
                <div className="w-full bg-[var(--forge-surface)] h-1.5 rounded-full overflow-hidden mt-3 border border-[var(--forge-border)]">
                  <div
                    className="h-full bg-gradient-to-r from-[var(--forge-primary-muted)] to-[var(--forge-primary)] transition-all duration-300 ease-out rounded-full"
                    style={{ width: `${timer.progressPercent}%` }}
                  />
                </div>
              )}
            </div>

            {/* 4. DYNAMIC ACTION BUTTON CONTROLS */}
            <div className="w-full max-w-md space-y-3 pt-2">
              {isAwaitingConfirmation ? (
                /* "ARE YOU FINISHED?" QUESTION FLOW */
                <div className="space-y-3.5 p-4 sm:p-5 bg-[var(--forge-surface-subtle)] border-2 border-[var(--forge-border-accent)] rounded-2xl shadow-sm">
                  <div className="text-center space-y-1.5">
                    <span className="font-sans text-xs uppercase tracking-wider font-bold text-[var(--forge-text-accent)]">
                      Countdown Complete
                    </span>
                    <h3 className="font-sans text-base sm:text-lg font-bold text-[var(--forge-text-primary)]">
                      ARE YOU FINISHED WITH THIS QUEST?
                    </h3>
                    <p className="text-xs text-[var(--forge-text-secondary)] max-w-xs mx-auto leading-relaxed">
                      The scheduled time is finished. Did you complete the quest?
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
                    <motion.button
                      whileTap={{ scale: 0.98 }}
                      type="button"
                      onClick={handleConfirmFinish}
                      disabled={isSubmitting}
                      className="flex-1 min-h-[48px] px-5 py-3 rounded-xl forge-button-primary font-sans text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      <Check className="w-4 h-4 stroke-[3]" />
                      <span>YES, I'M FINISHED</span>
                    </motion.button>

                    <motion.button
                      whileTap={{ scale: 0.98 }}
                      type="button"
                      onClick={handleExtend}
                      disabled={isSubmitting}
                      className={`min-h-[48px] px-4 py-3 rounded-xl bg-[var(--forge-surface)] border font-sans text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 ${
                        isLight
                          ? 'border-cyan-700/40 text-cyan-800 hover:bg-cyan-700/10'
                          : 'border-cyan-500/40 text-cyan-400 hover:bg-cyan-950/20'
                      }`}
                    >
                      <Clock className="w-4 h-4" />
                      <span>NOT YET — EXTEND</span>
                    </motion.button>
                  </div>
                </div>
              ) : isExtension ? (
                /* EXTENSION FINISH CONTROLS */
                <div className="space-y-3">
                  <div className={`p-3 border rounded-xl text-xs text-center font-sans ${
                    isLight
                      ? 'bg-cyan-900/10 border-cyan-700/30 text-cyan-900'
                      : 'bg-cyan-950/20 border-cyan-500/30 text-cyan-300'
                  }`}>
                    Reward gradually decreases by 5% per minute past scheduled duration (50% minimum).
                  </div>

                  <Button
                    variant="gold"
                    size="lg"
                    onClick={handleConfirmFinish}
                    disabled={isSubmitting}
                    className="w-full min-h-[48px] flex items-center justify-center gap-2 font-bold uppercase tracking-wider text-xs shadow-sm py-3.5"
                  >
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>Finish Quest & Claim +{timer.currentReward.playerXP} XP</span>
                  </Button>

                  <button
                    type="button"
                    onClick={() => setIsAbandonModalOpen(true)}
                    className="text-xs font-sans text-[var(--forge-text-secondary)] hover:text-red-500 transition-colors uppercase tracking-wider cursor-pointer py-1.5 block mx-auto"
                  >
                    Abandon Quest
                  </button>
                </div>
              ) : (
                /* STANDARD ACTIVE STATE CONTROLS: SYMMETRICAL [ COMPLETE EARLY ] [ ABANDON ] */
                <div className="grid grid-cols-2 gap-3 pt-2 w-full">
                  <button
                    type="button"
                    onClick={() => setIsEarlyCompleteModalOpen(true)}
                    className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[var(--forge-surface-subtle)] border border-[var(--forge-border-accent)] text-[var(--forge-text-accent)] hover:bg-[var(--forge-primary-muted)] font-sans text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-xs active:scale-[0.98]"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Complete Early</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsAbandonModalOpen(true)}
                    className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[var(--forge-surface-subtle)] border border-[var(--forge-border)] text-[var(--forge-text-secondary)] hover:text-red-500 hover:border-red-500/50 hover:bg-red-500/5 font-sans text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer active:scale-[0.98]"
                  >
                    <span>Abandon</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* EARLY COMPLETION CONFIRMATION MODAL */}
      <Modal
        isOpen={isEarlyCompleteModalOpen}
        onClose={() => setIsEarlyCompleteModalOpen(false)}
        title="Complete quest early?"
        subtitle="Finish now and claim the early-completion reward?"
      >
        <div className="space-y-4 pt-2">
          <div className="p-4 bg-[var(--forge-surface-subtle)] border border-[var(--forge-border)] rounded-xl space-y-3">
            <p className="text-xs text-[var(--forge-text-primary)] leading-relaxed">
              If you have completed the goals of <strong className="text-[var(--forge-text-accent)]">"{execution.questTitle}"</strong> ahead of time, you can finish now and claim your full rewards.
            </p>
            <div className="flex items-center justify-between text-xs font-sans pt-2 border-t border-[var(--forge-border)]">
              <span className="text-[var(--forge-text-secondary)]">Reward:</span>
              <span className="text-[var(--forge-text-accent)] font-bold text-sm">+{execution.basePlayerXP} XP</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <Button
              variant="secondary"
              size="md"
              onClick={() => setIsEarlyCompleteModalOpen(false)}
              className="text-xs font-sans"
            >
              Keep Going
            </Button>

            <Button
              variant="gold"
              size="md"
              onClick={handleEarlyComplete}
              disabled={isSubmitting}
              className="text-xs font-bold font-sans uppercase tracking-wider"
            >
              Finish & Claim
            </Button>
          </div>
        </div>
      </Modal>

      {/* ABANDON QUEST CONFIRMATION MODAL */}
      <Modal
        isOpen={isAbandonModalOpen}
        onClose={() => setIsAbandonModalOpen(false)}
        title="ABANDON QUEST?"
        subtitle="Progress will be cancelled and no XP will be awarded."
      >
        <div className="space-y-4 pt-2">
          <div
            className={`p-4 rounded-xl text-xs space-y-2 border ${
              isLight
                ? 'bg-[#9A554D]/10 border-[#9A554D]/35 text-[#7A3E37]'
                : 'bg-red-950/20 border-red-500/30 text-red-400'
            }`}
          >
            <div
              className={`flex items-center gap-2 font-bold font-sans uppercase tracking-wider ${
                isLight ? 'text-[#85443D]' : 'text-red-400'
              }`}
            >
              <AlertTriangle className={`w-4 h-4 ${isLight ? 'text-[#85443D]' : 'text-red-400'}`} />
              <span>Warning: No Rewards Granted</span>
            </div>
            <p className={`leading-relaxed ${isLight ? 'text-[#7A3E37]/90' : 'text-red-300/80'}`}>
              If you abandon "{execution.questTitle}", your current timer progress will reset, no Character XP will be granted, and the quest will remain uncompleted.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <Button
              variant="secondary"
              size="md"
              onClick={() => setIsAbandonModalOpen(false)}
              className="text-xs font-sans"
            >
              Keep Going
            </Button>

            <button
              type="button"
              onClick={handleConfirmAbandon}
              className={`min-h-[40px] px-4 py-2 rounded-xl text-xs font-bold font-sans uppercase tracking-wider transition-colors cursor-pointer flex items-center justify-center ${
                isLight
                  ? 'bg-[#9A554D] hover:bg-[#85443D] text-[#F5F2EB] border border-[#85443D]'
                  : 'bg-red-900/60 hover:bg-red-800 border border-red-700 text-red-100'
              }`}
            >
              Abandon Quest
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
