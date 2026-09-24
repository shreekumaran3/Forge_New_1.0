import React from 'react';
import { motion } from 'motion/react';
import { Card } from '../ui/Card';
import { ProgressBar } from '../ui/ProgressBar';
import { useGame } from '../../context/GameContext';
import {
  getCharacterArchetype,
  getSkillTreeBranchSummary,
  getUnlockedSkillNodeIds,
} from '../../services/unifiedSkillTreeService';
import { UNIFIED_SKILL_NODES } from '../../data/unifiedSkillTreeData';
import { STATS_CONFIG } from '../../services/xpService';
import { BackButton } from '../ui/BackButton';
import {
  Shield,
  Zap,
  Sparkles,
  Award,
  Crown,
  Flame,
  CheckCircle2,
  Dumbbell,
  Brain,
  Layers,
  Compass,
} from 'lucide-react';

interface ForgeCharacterBuildViewProps {
  onBack?: () => void;
}

export const ForgeCharacterBuildView: React.FC<ForgeCharacterBuildViewProps> = ({ onBack }) => {
  const { player, stats } = useGame();
  const archetype = getCharacterArchetype();
  const summaries = getSkillTreeBranchSummary();
  const unlockedIds = getUnlockedSkillNodeIds();

  const unlockedNodes = UNIFIED_SKILL_NODES.filter((n) => unlockedIds.includes(n.id));

  return (
    <div id="forge-character-build-view" data-forge-tour="character" className="space-y-6">
      {/* Top Bar with Back button */}
      <div className="flex items-center justify-between gap-3">
        {onBack && (
          <BackButton
            onClick={onBack}
            label="Forge"
            sublabel="Class"
            id="forge-character-back-btn"
          />
        )}

        <div className="forge-pill forge-pill-accent px-3.5 py-1.5 text-xs font-mono font-bold ml-auto flex items-center gap-1.5">
          <Crown className="w-3.5 h-3.5 text-[var(--forge-text-accent)]" />
          <span>LVL {player?.level || 1} Character</span>
        </div>
      </div>

      {/* Hero Character Archetype Card */}
      <div data-forge-tour="character" className="forge-card p-6 sm:p-7 relative overflow-hidden bg-gradient-to-b from-[var(--forge-surface-elevated)] to-[var(--forge-surface)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="forge-pill forge-pill-accent text-[10px]">
                Active RPG Class & Archetype
              </span>
            </div>
            <h2 className="font-serif text-2xl font-bold text-[var(--forge-text-primary)]">{archetype.title}</h2>
            <p className="text-xs sm:text-sm text-[var(--forge-text-secondary)] mt-1 max-w-md leading-relaxed font-sans">{archetype.subtitle}</p>
          </div>

          <div className="w-12 h-12 rounded-2xl bg-[var(--forge-primary-muted)] border border-[var(--forge-border-accent)] text-[var(--forge-text-accent)] flex items-center justify-center shrink-0 shadow-xs">
            <Flame className="w-6 h-6" />
          </div>
        </div>

        {/* Skill Progression Metrics */}
        <div className="mt-6 pt-5 border-t border-[var(--forge-border)] grid grid-cols-2 sm:grid-cols-3 gap-3 text-center">
          <div className="p-3 bg-[var(--forge-surface-interactive)] border border-[var(--forge-border)] rounded-2xl">
            <span className="text-[10px] uppercase font-mono text-[var(--forge-text-muted)] block">Mastered Perks</span>
            <span className="text-base sm:text-lg font-bold font-mono text-emerald-400">{unlockedNodes.length} / {UNIFIED_SKILL_NODES.length}</span>
          </div>
          <div className="p-3 bg-[var(--forge-surface-interactive)] border border-[var(--forge-border)] rounded-2xl">
            <span className="text-[10px] uppercase font-mono text-[var(--forge-text-muted)] block">Tree Mastery</span>
            <span className="text-base sm:text-lg font-bold font-mono text-[var(--forge-text-accent)]">{Math.round((unlockedNodes.length / Math.max(1, UNIFIED_SKILL_NODES.length)) * 100)}%</span>
          </div>
          <div className="p-3 bg-[var(--forge-surface-interactive)] border border-[var(--forge-border)] rounded-2xl col-span-2 sm:col-span-1">
            <span className="text-[10px] uppercase font-mono text-[var(--forge-text-muted)] block">Active Paths</span>
            <span className="text-base sm:text-lg font-bold font-mono text-amber-400">{summaries.filter(s => s.unlockedNodes > 0).length} Active</span>
          </div>
        </div>
      </div>

      {/* Specialization Branches Breakdown */}
      <div className="space-y-3.5">
        <h3 className="text-xs font-mono uppercase tracking-widest text-[var(--forge-text-secondary)] font-bold flex items-center gap-2">
          <Layers className="w-4 h-4 text-[var(--forge-text-accent)]" />
          Specialization Investment Breakdown
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {summaries.map((summary) => (
            <div key={summary.branchId} className="p-4 rounded-2xl space-y-2.5 border border-[var(--forge-border)] bg-[var(--forge-surface)] shadow-xs">
              <div className="flex items-center justify-between">
                <span className={`font-serif font-bold text-sm ${summary.accentColor}`}>{summary.branchName}</span>
                <span className="font-mono text-xs font-bold text-[var(--forge-text-primary)]">{summary.pointsInvested} SP</span>
              </div>
              <ProgressBar value={summary.completionPercent} max={100} color="gold" size="sm" />
              <div className="flex items-center justify-between text-xs text-[var(--forge-text-muted)] font-mono">
                <span>{summary.unlockedNodes} / {summary.totalNodes} Mastered</span>
                <span>{summary.completionPercent}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Mastered Abilities & Unlocks List */}
      <div className="space-y-3.5">
        <h3 className="text-xs font-mono uppercase tracking-widest text-[var(--forge-text-secondary)] font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          Mastered Abilities & Quest Unlocks ({unlockedNodes.length})
        </h3>

        <div className="grid grid-cols-1 gap-2.5">
          {unlockedNodes.map((node) => (
            <div
              key={node.id}
              className="p-3.5 bg-[var(--forge-surface)] border border-[var(--forge-border)] rounded-2xl flex items-start gap-3 shadow-xs"
            >
              <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                <Zap className="w-4 h-4 fill-emerald-400" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-[var(--forge-text-primary)] font-serif truncate">{node.title}</h4>
                  <span className="forge-pill text-[9px] uppercase font-mono">
                    {node.branchName}
                  </span>
                </div>
                <p className="text-xs text-[var(--forge-text-accent)] mt-0.5 font-sans leading-snug">✦ {node.unlockedAbility}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
