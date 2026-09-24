import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { ProgressBar } from '../ui/ProgressBar';
import { useGame } from '../../context/GameContext';
import { getPlayerXpNextLevel, MAX_PLAYER_LEVEL } from '../../services/xpService';
import { calculateMasteryBandsState, formatPracticeHours } from '../../services/masteryBandService';
import { BackButton } from '../ui/BackButton';
import {
  TrendingUp,
  Award,
  Flame,
  Shield,
  Clock,
  CheckCircle2,
  Calendar,
  Sparkles,
  Target,
  Zap,
} from 'lucide-react';

interface ForgeProgressionViewProps {
  onBack?: () => void;
}

export const ForgeProgressionView: React.FC<ForgeProgressionViewProps> = ({ onBack }) => {
  const { player, skills = [], questLogs = [] } = useGame();

  const bandsOverview = useMemo(() => calculateMasteryBandsState(skills), [skills]);

  if (!player) return null;

  const nextLevelXp = getPlayerXpNextLevel(player.level);
  const totalCompletedLifetime = questLogs.length;
  const currentStreak = player.currentStreak || 0;
  const longestStreak = player.longestStreak || 0;

  return (
    <div id="forge-progression-view" data-forge-tour="progression" className="space-y-6">
      {/* Top Bar with Back button */}
      <div className="flex items-center justify-between gap-3">
        {onBack && (
          <BackButton
            onClick={onBack}
            label="Forge"
            sublabel="Levels"
            id="forge-progression-back-btn"
          />
        )}

        <div className="forge-pill forge-pill-accent px-3.5 py-1.5 text-xs font-mono font-bold ml-auto flex items-center gap-1.5">
          <TrendingUp className="w-3.5 h-3.5 text-[var(--forge-text-accent)]" />
          <span>Progression & Milestones</span>
        </div>
      </div>

      {/* Hero Level & XP Progression Card */}
      <div data-forge-tour="progression" className="forge-card p-6 sm:p-7 relative overflow-hidden bg-gradient-to-b from-[var(--forge-surface-elevated)] to-[var(--forge-surface)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="forge-pill forge-pill-accent text-[10px] mb-1">
              {player.level >= 100 ? 'ASCENDANT MASTER' : 'Universal Character Level'}
            </span>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[var(--forge-text-primary)] mt-1.5">
              Level {player.level} {player.level >= 100 && '• MAX'}
            </h2>
            <p className="text-xs sm:text-sm text-[var(--forge-text-secondary)] mt-1 max-w-lg leading-relaxed font-sans">
              {player.level >= 100 ? (
                <span>Peak Character Mastery achieved through persistent real-world discipline.</span>
              ) : (
                <span>
                  Universal character level advances through real-world actions and completed quests. Real practice time qualifies your Forge Mastery Bands.
                </span>
              )}
            </p>
          </div>

          <div className="w-12 h-12 rounded-2xl bg-[var(--forge-primary-muted)] border border-[var(--forge-border-accent)] flex items-center justify-center text-[var(--forge-text-accent)] shrink-0 shadow-xs">
            <Zap className="w-6 h-6 fill-[var(--forge-text-accent)]" />
          </div>
        </div>

        {/* Level XP Progress Bar */}
        <div className="mt-6 space-y-2.5">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-[var(--forge-text-secondary)]">Level Progress</span>
            <span className="text-[var(--forge-text-accent)] font-bold">
              {player.level >= 100 ? (
                'MAX / ASCENDANT'
              ) : (
                `${player.currentXp} / ${nextLevelXp} XP (${Math.min(100, Math.round((player.currentXp / nextLevelXp) * 100))}%)`
              )}
            </span>
          </div>
          <ProgressBar
            value={player.level >= 100 ? nextLevelXp : player.currentXp}
            max={nextLevelXp}
            color="gold"
            size="md"
          />
          <p className="text-xs font-mono text-[var(--forge-text-muted)] text-right">
            {player.level >= 100
              ? 'Level 100 Master Cap Reached'
              : `${nextLevelXp - player.currentXp} XP remaining to reach Level ${player.level + 1}`}
          </p>
        </div>
      </div>

      {/* Forge Mastery Band Standing Card */}
      <div className="forge-card p-5 sm:p-6 rounded-2xl border border-[var(--forge-border-subtle)] bg-[var(--forge-surface)] shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--forge-text-secondary)]">
                Forge Mastery Band Standing
              </span>
            </div>
            <h3 className="font-serif text-lg sm:text-xl font-bold text-[var(--forge-text-primary)]">
              Band {bandsOverview.highestUnlockedBand} • {bandsOverview.highestBand.name}
            </h3>
            <p className="text-xs text-[var(--forge-text-secondary)] leading-relaxed max-w-xl">
              {bandsOverview.highestBand.description}
            </p>
          </div>

          <div className="flex items-center gap-3 sm:text-right">
            <div className="p-3 rounded-xl bg-[var(--forge-surface-subtle)] border border-[var(--forge-border-subtle)]">
              <span className="text-[10px] font-mono uppercase text-[var(--forge-text-muted)] block">
                Total Practice
              </span>
              <span className="text-base font-bold font-mono text-[var(--forge-text-primary)]">
                {bandsOverview.totalPracticeHours} hrs
              </span>
            </div>

            {bandsOverview.nextBand && (
              <div className="p-3 rounded-xl bg-[var(--forge-surface-subtle)] border border-[var(--forge-border-subtle)]">
                <span className="text-[10px] font-mono uppercase text-[var(--forge-text-muted)] block">
                  Next Band Target
                </span>
                <span className="text-base font-bold font-mono text-cyan-400">
                  {bandsOverview.qualifiedSkillsCountForNextBand} / {bandsOverview.requiredSkillsCountForNextBand} Skills
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Lifetime Progression Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-[var(--forge-surface)] border border-[var(--forge-border)] space-y-1 shadow-xs">
          <div className="flex items-center gap-1.5 text-amber-400">
            <Flame className="w-4 h-4" />
            <span className="text-[10px] font-mono uppercase text-[var(--forge-text-muted)]">Lifetime XP</span>
          </div>
          <span className="text-lg font-bold font-mono text-[var(--forge-text-primary)] block">
            {player.lifetimeXp.toLocaleString()}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-[var(--forge-surface)] border border-[var(--forge-border)] space-y-1 shadow-xs">
          <div className="flex items-center gap-1.5 text-emerald-400">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-[10px] font-mono uppercase text-[var(--forge-text-muted)]">Quests Done</span>
          </div>
          <span className="text-lg font-bold font-mono text-[var(--forge-text-primary)] block">
            {totalCompletedLifetime}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-[var(--forge-surface)] border border-[var(--forge-border)] space-y-1 shadow-xs">
          <div className="flex items-center gap-1.5 text-orange-400">
            <Calendar className="w-4 h-4" />
            <span className="text-[10px] font-mono uppercase text-[var(--forge-text-muted)]">Streak</span>
          </div>
          <span className="text-lg font-bold font-mono text-[var(--forge-text-primary)] block">
            {currentStreak} Days
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-[var(--forge-surface)] border border-[var(--forge-border)] space-y-1 shadow-xs">
          <div className="flex items-center gap-1.5 text-purple-400">
            <Award className="w-4 h-4" />
            <span className="text-[10px] font-mono uppercase text-[var(--forge-text-muted)]">Best Streak</span>
          </div>
          <span className="text-lg font-bold font-mono text-[var(--forge-text-primary)] block">
            {longestStreak} Days
          </span>
        </div>
      </div>

      {/* Upcoming Character Milestone Gates */}
      <div className="space-y-3.5">
        <h3 className="text-xs font-mono uppercase tracking-widest text-[var(--forge-text-secondary)] font-bold flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[var(--forge-text-accent)]" />
          Upcoming Character Milestone Gates
        </h3>

        <div className="space-y-2.5">
          {player.level < MAX_PLAYER_LEVEL ? (
            <>
              {/* Immediate Next Level Gate */}
              <div className="p-4 bg-[var(--forge-surface)] border border-[var(--forge-border)] rounded-2xl flex items-center justify-between gap-3 shadow-xs">
                <div>
                  <span className="text-sm font-bold text-[var(--forge-text-primary)] font-serif block">
                    Level {player.level + 1} Advancement
                  </span>
                  <span className="text-xs text-[var(--forge-text-secondary)] font-sans">
                    General character progression threshold unlocking higher quest difficulty parameters
                  </span>
                </div>
                <span className="forge-pill forge-pill-accent text-xs font-mono font-bold shrink-0">
                  Level {player.level + 1}
                </span>
              </div>

              {/* Major Milestones (10, 25, 50, 75, 100) */}
              {(() => {
                const majorMilestones = [10, 25, 50, 75, 100];
                const nextMajor = majorMilestones.find((m) => m > player.level);
                if (!nextMajor) return null;
                return (
                  <div className="p-4 bg-[var(--forge-surface)] border border-[var(--forge-border)] rounded-2xl flex items-center justify-between gap-3 shadow-xs">
                    <div>
                      <span className="text-sm font-bold text-[var(--forge-text-primary)] font-serif block">
                        Level {nextMajor} Landmark Milestone
                      </span>
                      <span className="text-xs text-[var(--forge-text-secondary)] font-sans">
                        Major character milestone marking significant cumulative dedication and discipline
                      </span>
                    </div>
                    <span className="forge-pill text-purple-400 text-xs font-mono font-bold shrink-0 border-purple-500/30 bg-purple-500/10">
                      Tier {nextMajor / 25 >= 1 ? Math.floor(nextMajor / 25) : 1} Gate
                    </span>
                  </div>
                );
              })()}
            </>
          ) : (
            <div className="p-4 bg-[var(--forge-surface)] border border-[var(--forge-border-accent)] rounded-2xl flex items-center justify-between gap-3 shadow-xs">
              <div>
                <span className="text-sm font-bold text-[var(--forge-text-primary)] font-serif block">
                  Level 100 Ascendant Master
                </span>
                <span className="text-xs text-[var(--forge-text-secondary)] font-sans">
                  Maximum Character Level achieved. Continue mastering Forge Bands through deliberate practice.
                </span>
              </div>
              <span className="forge-pill forge-pill-accent text-xs font-mono font-bold shrink-0">
                MAX
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
