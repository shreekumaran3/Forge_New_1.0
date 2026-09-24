import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Shield,
  Zap,
  Flame,
  Check,
  Trash2,
  ChevronDown,
  ChevronUp,
  Clock,
  Target,
  Award,
} from 'lucide-react';
import { Quest } from '../../types';
import { useGame } from '../../context/GameContext';
import { Card } from '../ui/Card';
import { getQuestRarity } from '../../services/questRarityService';
import { PILLARS_CONFIG } from '../../services/xpService';
import { playUISound } from '../../services/soundManager';

interface QuestCardProps {
  quest: Quest;
  onComplete?: (id: number) => Promise<void> | void;
  onUncomplete?: (id: number) => Promise<void> | void;
  onStart?: (id: number) => void;
  onDelete?: (id: number) => void;
  showDeleteButton?: boolean;
}

export const QuestCard: React.FC<QuestCardProps> = React.memo(({
  quest,
  onComplete,
  onUncomplete,
  onStart,
  onDelete,
  showDeleteButton = true,
}) => {
  const { activeExecution, startQuestExecution } = useGame();
  const [isExpanded, setIsExpanded] = useState(false);
  const isCompleted = quest.completedToday;
  const pillar = PILLARS_CONFIG.find((p) => p.id === quest.pillarId);
  const rarity = getQuestRarity(quest.rarity, quest.category, quest.xpReward);

  const isThisQuestExecuting =
    Boolean(activeExecution) &&
    activeExecution?.questId === quest.id &&
    activeExecution?.status !== 'COMPLETED' &&
    activeExecution?.status !== 'CANCELLED';

  const durationText = quest.estimatedDuration || '15-20 mins';

  const handleStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!quest.id) return;
    if (onStart) {
      onStart(quest.id);
    } else {
      startQuestExecution(quest.id);
    }
  };

  return (
    <motion.div
      layout
      key={quest.id}
      initial={{ opacity: 0, y: 10 }}
      animate={{ scale: 1, y: 0, opacity: 1 }}
      exit={{ opacity: 0, scale: 0.85, y: -14 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="group relative"
    >
      <Card
        style={isCompleted ? undefined : rarity.cardStyle}
        className={`relative overflow-hidden transition-all duration-200 border p-5 sm:p-6 rounded-3xl ${
          isCompleted
            ? 'bg-[var(--forge-surface)] border-[var(--forge-border)] opacity-75'
            : 'bg-[var(--forge-surface)] hover:border-[var(--forge-border-accent)] shadow-sm'
        }`}
      >
        <div className="space-y-3.5 relative z-10">
          {/* Header Tags Row & Optional Delete Action */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap min-w-0">
              {/* Authoritative Quest Type Indicator */}
              {quest.questType && (
                <span
                  className={`text-[10px] font-mono font-bold tracking-wider px-2.5 py-0.5 rounded-full border flex items-center gap-1 shrink-0 shadow-xs ${
                    quest.questType === 'daily_sharpening'
                      ? 'text-amber-300 bg-amber-950/40 border-amber-500/40'
                      : quest.questType === 'weekly_skill_check'
                      ? 'text-cyan-300 bg-cyan-950/40 border-cyan-500/40'
                      : 'text-purple-300 bg-purple-950/40 border-purple-500/40'
                  }`}
                >
                  <Target className="w-2.5 h-2.5 shrink-0" />
                  <span>
                    {quest.questType === 'daily_sharpening'
                      ? 'Daily Sharpening'
                      : quest.questType === 'weekly_skill_check'
                      ? 'Weekly Skill Check'
                      : 'Monthly Monument'}
                  </span>
                </span>
              )}

              {/* Rarity */}
              <span
                style={rarity.badgeStyle}
                className="text-[10px] uppercase font-mono font-bold tracking-widest px-3 py-1 rounded-full border flex items-center gap-1 shrink-0"
              >
                <Shield className="w-3 h-3" style={{ color: rarity.accentColor }} />
                <span>{rarity.label}</span>
              </span>

              {/* Identity Tag */}
              <span className="forge-pill forge-pill-accent text-[10px] shrink-0">
                {quest.identityTag || 'Identity Forged'}
              </span>

              {/* Pillar */}
              <span className="forge-pill text-[10px] text-[var(--forge-text-secondary)] shrink-0">
                {pillar?.name || quest.pillarId}
              </span>

              {/* Authoritative Forge Quest Band Indicator */}
              {(quest.questBand !== undefined || quest.band !== undefined || quest.difficultyBand !== undefined) && (
                <span className="text-[10px] font-mono font-bold tracking-wider text-cyan-400 bg-cyan-950/30 border border-cyan-500/30 px-2.5 py-0.5 rounded-full shrink-0 flex items-center gap-1">
                  <Target className="w-2.5 h-2.5 text-cyan-400" />
                  Band {quest.questBand || quest.band || quest.difficultyBand || 1}
                </span>
              )}

              {/* Streak */}
              {quest.streak > 0 && (
                <span className="forge-pill text-[10px] text-amber-400 border-amber-500/30 bg-amber-500/10 flex items-center gap-1 shrink-0">
                  <Flame className="w-3 h-3 text-amber-500 fill-amber-500/20" /> {quest.streak}d
                </span>
              )}
            </div>

            {/* Custom Quest Delete Action */}
            {showDeleteButton && quest.id && onDelete && !quest.isAutoGenerated && (
              <button
                type="button"
                onClick={() => onDelete(quest.id!)}
                className="text-[var(--forge-text-muted)] hover:text-red-400 p-2 transition-colors cursor-pointer shrink-0 rounded-full hover:bg-red-950/20"
                title="Delete quest"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Quest Title */}
          <div>
            <h3
              className={`text-base sm:text-lg font-bold font-serif leading-snug ${
                isCompleted ? 'line-through text-[var(--forge-text-secondary)]' : 'text-[var(--forge-text-primary)]'
              }`}
            >
              {quest.title}
            </h3>
            {!isCompleted && (
              <div className="h-[2.5px] w-16 mt-2 rounded-full" style={rarity.titleUnderlineStyle} />
            )}
          </div>

          {/* EXPLANATION Section (Direct, readable, actionable) */}
          {(quest.description || quest.action) && (
            <div>
              <p
                className={`text-xs sm:text-sm text-[var(--forge-text-secondary)] leading-relaxed ${
                  !isExpanded ? 'line-clamp-2' : ''
                }`}
              >
                {quest.description || quest.action}
              </p>
            </div>
          )}

          {/* VIEW DETAILS Toggle & Expandable Metadata */}
          {(quest.description || quest.action) && (
            <div className="pt-0.5">
              <button
                type="button"
                onClick={() => {
                  playUISound('uiBubble');
                  setIsExpanded(!isExpanded);
                }}
                className="inline-flex items-center gap-1.5 text-xs font-mono font-bold uppercase tracking-wider text-[var(--forge-text-accent)] hover:underline cursor-pointer transition-colors"
              >
                <span>{isExpanded ? 'Hide Details' : 'View Details'}</span>
                {isExpanded ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                    className="overflow-hidden pt-3 border-t border-[var(--forge-border)] mt-2.5 space-y-2 text-xs text-[var(--forge-text-secondary)]"
                  >
                    <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-[var(--forge-surface-elevated)] p-3 rounded-2xl border border-[var(--forge-border)]">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-[var(--forge-text-accent)] shrink-0" />
                        <span>Duration: {durationText}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Target className="w-3.5 h-3.5 text-[var(--forge-text-accent)] shrink-0" />
                        <span>Difficulty: Band {quest.questBand || quest.band || quest.difficultyBand || 1} ({quest.difficultyScore || 20}/100)</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Award className="w-3.5 h-3.5 text-[var(--forge-text-accent)] shrink-0" />
                        <span>Reward: +{quest.xpReward} XP</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Shield className="w-3.5 h-3.5 text-[var(--forge-text-accent)] shrink-0" />
                        <span>Category: {quest.category || 'Main'}</span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Footer Metadata & Dominant START QUEST Action */}
          <div className="flex items-center justify-between gap-3 pt-3.5 border-t border-[var(--forge-border)] mt-3 flex-wrap sm:flex-nowrap">
            {/* Left: Duration & XP Reward */}
            <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap min-w-0">
              <span className="forge-pill text-xs font-mono text-[var(--forge-text-secondary)] shrink-0 py-2 px-3.5">
                <Clock className="w-3.5 h-3.5 text-[var(--forge-text-accent)] shrink-0" />
                <span className="font-semibold">{durationText}</span>
              </span>
              <span
                style={rarity.xpBadgeStyle}
                className="font-bold px-3.5 py-2 rounded-full border text-xs font-mono tracking-wide shrink-0 shadow-xs"
              >
                +{quest.xpReward} XP
              </span>
            </div>

            {/* Right: Dominant Primary Action Button (Minimum 56px touch height) */}
            <div className="shrink-0 flex items-center justify-end w-full sm:w-auto">
              {isCompleted ? (
                <div className="w-full sm:w-auto min-h-[48px] px-5 py-2.5 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 text-emerald-300 font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400 stroke-[2.5]" />
                  <span>
                    {quest.questType === 'weekly_skill_check'
                      ? 'Completed This Week'
                      : quest.questType === 'monthly_monument'
                      ? 'Completed This Month'
                      : 'Completed Today'}
                  </span>
                </div>
              ) : isThisQuestExecuting ? (
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  data-forge-tour="start-quest"
                  onClick={handleStart}
                  className="w-full sm:w-auto min-h-[56px] h-14 px-6 sm:px-7 rounded-2xl bg-gradient-to-r from-amber-500 via-[#D4AF37] to-amber-400 text-black font-mono text-xs sm:text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-2.5 shadow-md animate-pulse cursor-pointer border border-amber-300/60 transition-all hover:brightness-110 active:brightness-95"
                >
                  <Flame className="w-4 h-4 sm:w-5 sm:h-5 fill-black text-black shrink-0" />
                  <span>RESUME MISSION</span>
                </motion.button>
              ) : (
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  data-forge-tour="start-quest"
                  onClick={handleStart}
                  className="forge-button-primary w-full sm:w-auto min-h-[56px] h-14 px-7 sm:px-9 rounded-2xl text-black font-mono text-xs sm:text-sm font-extrabold uppercase tracking-wider flex items-center justify-center gap-2.5 cursor-pointer hover:brightness-110 active:brightness-95 shadow-md"
                >
                  <Target className="w-4 h-4 sm:w-5 sm:h-5 text-black stroke-[2.5] shrink-0" />
                  <span>START QUEST</span>
                </motion.button>
              )}
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
});

