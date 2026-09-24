import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useGame } from '../../context/GameContext';
import { useTheme } from '../../theme/ThemeContext';
import {
  FORGE_MASTERY_BANDS,
  calculateMasteryBandsState,
  formatPracticeHours,
  EvaluatedBand,
  SkillBandProgress,
} from '../../services/masteryBandService';
import { playUISound } from '../../services/soundManager';
import { useBackHandler } from '../../services/backButtonManager';
import { BackButton } from '../ui/BackButton';
import {
  Shield,
  Flame,
  Award,
  Lock,
  CheckCircle2,
  Hourglass,
  Sparkles,
  ChevronRight,
  Target,
  Clock,
  Compass,
  Zap,
} from 'lucide-react';

interface ForgeSkillTreeViewProps {
  onBack?: () => void;
  tourStepId?: string;
}

export const ForgeSkillTreeView: React.FC<ForgeSkillTreeViewProps> = ({ onBack, tourStepId }) => {
  const { skills = [] } = useGame();
  const { currentMode } = useTheme();
  const isLight = currentMode === 'light';

  // Authoritative 6-Band Mastery state
  const bandsOverview = useMemo(() => calculateMasteryBandsState(skills), [skills]);

  // Initially select current target band or highest unlocked band
  const [selectedBandNumber, setSelectedBandNumber] = useState<number>(() => {
    return bandsOverview.nextBand?.band || bandsOverview.highestUnlockedBand;
  });

  const selectedBand: EvaluatedBand = useMemo(() => {
    return (
      bandsOverview.bands.find((b) => b.band === selectedBandNumber) ||
      bandsOverview.bands[0]
    );
  }, [bandsOverview, selectedBandNumber]);

  // Safe Android Back dismissal
  useBackHandler(
    'forge-skill-tree-view',
    40,
    () => {
      if (onBack) {
        onBack();
      }
    },
    Boolean(onBack)
  );

  const handleSelectBand = (bandNum: number) => {
    playUISound('tap');
    setSelectedBandNumber(bandNum);
  };

  return (
    <div
      id="forge-skill-tree-view"
      data-system-guide="skill-tree-view"
      data-forge-tour="skill-tree-mobile"
      className="space-y-6 max-w-5xl mx-auto pb-16"
    >
      {/* 1. TOP HEADER & METRICS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--forge-border-subtle)] pb-5">
        <div className="flex items-center gap-3">
          {onBack && (
            <BackButton
              onClick={onBack}
              label="Forge Hub"
              className="forge-button-secondary text-xs uppercase tracking-wider py-1.5 px-3"
            />
          )}
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[var(--forge-text-accent)]" />
              <h1 className="font-serif text-xl sm:text-2xl font-bold text-[var(--forge-text-primary)]">
                Universal Forge Mastery Tree
              </h1>
            </div>
            <p className="text-xs text-[var(--forge-text-secondary)] mt-0.5">
              The 6-Band Progression Architecture • Ascend through validated practice hours
            </p>
          </div>
        </div>

        {/* Top Summary Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="forge-pill forge-pill-accent text-xs flex items-center gap-1.5 py-1 px-3">
            <Award className="w-3.5 h-3.5" />
            <span>Current: Band {bandsOverview.highestUnlockedBand} • {bandsOverview.highestBand.name}</span>
          </div>
          <div className="forge-pill text-xs text-[var(--forge-text-secondary)] flex items-center gap-1.5 py-1 px-3">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span>Total Practice: {bandsOverview.totalPracticeHours} hrs</span>
          </div>
        </div>
      </div>

      {/* 2. PROGRESSION CALLOUT */}
      <div className="forge-card p-4 sm:p-5 rounded-xl border border-[var(--forge-border-subtle)] bg-[var(--forge-surface-subtle)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--forge-text-accent)]">
                Authoritative Progression Rule
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-mono">
                No Fake Currencies
              </span>
            </div>
            <p className="text-xs text-[var(--forge-text-secondary)] leading-relaxed max-w-3xl">
              Forge Mastery Bands advance purely through cumulative practice hours on real skills. To qualify for higher bands, 
              at least <span className="font-semibold text-[var(--forge-text-primary)]">3 distinct skills</span> must independently reach the required hour threshold. One skill cannot satisfy multiple qualifying slots.
            </p>
          </div>

          {bandsOverview.nextBand && (
            <div className="sm:text-right shrink-0">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--forge-text-muted)] block">
                Next Milestone
              </span>
              <span className="text-xs font-bold text-[var(--forge-text-primary)]">
                Band {bandsOverview.nextBand.band} • {bandsOverview.nextBand.name}
              </span>
              <div className="text-[11px] text-[var(--forge-text-secondary)] mt-0.5">
                {bandsOverview.qualifiedSkillsCountForNextBand} / {bandsOverview.requiredSkillsCountForNextBand} Skills Qualified
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. MAIN INTERACTIVE LAYOUT: 6-BAND TIMELINE + BAND DETAIL INSPECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: THE 6 BANDS (5 cols on lg) */}
        <div className="lg:col-span-5 space-y-3">
          <h2 className="text-xs font-mono uppercase tracking-widest text-[var(--forge-text-secondary)] font-bold flex items-center gap-1.5 px-1">
            <Target className="w-3.5 h-3.5 text-[var(--forge-text-accent)]" />
            Forge Mastery Bands (I – VI)
          </h2>

          <div className="space-y-2.5">
            {bandsOverview.bands.map((bandDef) => {
              const isSelected = selectedBandNumber === bandDef.band;
              const isCurrentUnlocked = bandsOverview.highestUnlockedBand === bandDef.band;

              return (
                <div
                  key={bandDef.band}
                  onClick={() => handleSelectBand(bandDef.band)}
                  className={`relative p-3.5 sm:p-4 rounded-xl border transition-all cursor-pointer select-none ${
                    isSelected
                      ? 'border-[var(--forge-border-accent)] bg-[var(--forge-surface-elevated)] ring-1 ring-[var(--forge-border-accent)] shadow-md'
                      : bandDef.isUnlocked
                      ? 'border-[var(--forge-border-subtle)] bg-[var(--forge-surface)] hover:border-[var(--forge-border-accent)]'
                      : 'border-[var(--forge-border-subtle)]/60 bg-[var(--forge-surface)]/50 opacity-80 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {/* Band Number Badge */}
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center font-serif font-black text-sm shrink-0 border"
                        style={{
                          borderColor: bandDef.isUnlocked ? bandDef.accentColor : 'var(--forge-border-subtle)',
                          backgroundColor: bandDef.isUnlocked ? `${bandDef.accentColor}20` : 'transparent',
                          color: bandDef.isUnlocked ? bandDef.accentColor : 'var(--forge-text-muted)',
                        }}
                      >
                        {bandDef.band === 1 ? 'I' : bandDef.band === 2 ? 'II' : bandDef.band === 3 ? 'III' : bandDef.band === 4 ? 'IV' : bandDef.band === 5 ? 'V' : 'VI'}
                      </div>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-sm text-[var(--forge-text-primary)]">
                            {bandDef.name}
                          </h3>
                          {isCurrentUnlocked && (
                            <span className="text-[10px] font-mono uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                              Active Band
                            </span>
                          )}
                          {bandDef.isCurrentTarget && (
                            <span className="text-[10px] font-mono uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                              Target
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-[var(--forge-text-secondary)] mt-0.5 line-clamp-1">
                          {bandDef.requiredHoursPerSkill === 0
                            ? 'Baseline Initiate'
                            : `${bandDef.requiredHoursPerSkill}h per skill × ${bandDef.requiredSkillsCount} skills`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {bandDef.isUnlocked ? (
                        <div className="flex items-center gap-1 text-[11px] font-mono font-bold text-emerald-400">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span className="hidden sm:inline">UNLOCKED</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-[11px] font-mono text-[var(--forge-text-muted)]">
                          <Lock className="w-3.5 h-3.5" />
                          <span>{bandDef.qualifiedCount}/{bandDef.requiredCount}</span>
                        </div>
                      )}
                      <ChevronRight className={`w-4 h-4 text-[var(--forge-text-muted)] transition-transform ${isSelected ? 'rotate-90 text-[var(--forge-text-accent)]' : ''}`} />
                    </div>
                  </div>

                  {/* Micro Progress Bar */}
                  {bandDef.band > 1 && (
                    <div className="mt-3 pt-2.5 border-t border-[var(--forge-border-subtle)] flex items-center justify-between text-[11px] font-mono">
                      <span className="text-[var(--forge-text-secondary)]">
                        Qualification: {bandDef.qualifiedCount} / {bandDef.requiredCount} Skills
                      </span>
                      <span className="text-[var(--forge-text-primary)] font-bold">
                        {Math.min(100, Math.round((bandDef.qualifiedCount / bandDef.requiredCount) * 100))}%
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: DETAILED INSPECTION OF SELECTED BAND (7 cols on lg) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="forge-card p-5 sm:p-6 rounded-2xl border border-[var(--forge-border-subtle)] bg-[var(--forge-surface)] shadow-lg relative overflow-hidden">
            {/* Band Header Banner */}
            <div className="flex items-start justify-between gap-4 border-b border-[var(--forge-border-subtle)] pb-5">
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className="text-xs font-mono font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full border"
                    style={{
                      borderColor: `${selectedBand.accentColor}40`,
                      backgroundColor: `${selectedBand.accentColor}15`,
                      color: selectedBand.accentColor,
                    }}
                  >
                    Band {selectedBand.band}
                  </span>
                  {selectedBand.isUnlocked ? (
                    <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Qualified & Unlocked
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Locked • In Progress
                    </span>
                  )}
                </div>

                <h2 className="font-serif text-2xl font-bold text-[var(--forge-text-primary)] mt-1.5">
                  {selectedBand.name}
                </h2>
                <p className="text-xs text-[var(--forge-text-secondary)] mt-1 leading-relaxed">
                  {selectedBand.description}
                </p>
              </div>
            </div>

            {/* Scope & Quest Style Callout */}
            <div className="mt-5 p-4 rounded-xl border border-[var(--forge-border-subtle)] bg-[var(--forge-surface-subtle)] space-y-2">
              <div className="text-xs font-mono uppercase tracking-wider text-[var(--forge-text-accent)] font-bold flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5" />
                Quest Scope & Daily Intensity
              </div>
              <p className="text-xs text-[var(--forge-text-primary)] leading-relaxed">
                {selectedBand.questScopeDescription}
              </p>
              <div className="text-[11px] text-[var(--forge-text-secondary)] pt-1 flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                <span>Threshold: <strong className="text-[var(--forge-text-primary)]">{selectedBand.requiredHoursPerSkill} Practice Hours</strong> per qualifying skill</span>
              </div>
            </div>

            {/* Skills Qualification Breakdown */}
            <div className="mt-6 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-mono uppercase tracking-widest text-[var(--forge-text-secondary)] font-bold flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-amber-400" />
                  Qualifying Skills Roster ({selectedBand.qualifiedCount}/{selectedBand.requiredCount || skills.length})
                </h3>
                <span className="text-[11px] text-[var(--forge-text-muted)] font-mono">
                  {selectedBand.requiredHoursPerSkill}h requirement
                </span>
              </div>

              {selectedBand.skillsProgress.length === 0 ? (
                <div className="text-center py-8 text-xs text-[var(--forge-text-muted)] border border-dashed border-[var(--forge-border-subtle)] rounded-xl">
                  No skills recorded in Forge yet. Complete quests or choose skills to begin.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
                  {selectedBand.skillsProgress.map((sp) => {
                    const hoursRemaining = Math.max(0, sp.requiredHours - sp.hours);

                    return (
                      <div
                        key={sp.skillId}
                        className={`p-3 rounded-xl border transition-all ${
                          sp.isQualified
                            ? 'border-emerald-500/30 bg-emerald-500/5'
                            : 'border-[var(--forge-border-subtle)] bg-[var(--forge-surface)]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-xs text-[var(--forge-text-primary)]">
                                {sp.skillName}
                              </span>
                              {sp.active && (
                                <span className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.2 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                                  Active
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-[var(--forge-text-secondary)] font-mono">
                              Logged: {formatPracticeHours(sp.hours)}
                            </span>
                          </div>

                          <div className="text-right shrink-0">
                            {sp.isQualified ? (
                              <span className="text-[11px] font-mono font-bold text-emerald-400 flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Qualified
                              </span>
                            ) : (
                              <span className="text-[11px] font-mono text-[var(--forge-text-muted)]">
                                {hoursRemaining.toFixed(1)}h remaining
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Progress bar per skill */}
                        {sp.requiredHours > 0 && (
                          <div className="mt-2">
                            <div className="w-full bg-[var(--forge-surface-subtle)] h-1.5 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{
                                  width: `${Math.min(100, sp.percentage)}%`,
                                  backgroundColor: sp.isQualified ? '#10b981' : selectedBand.accentColor,
                                }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
