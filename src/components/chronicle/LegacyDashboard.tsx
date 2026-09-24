import React, { useState } from 'react';
import { Sparkles, Award, BookOpen, Shield, Flame, Compass, Calendar, Clock, Gift, BarChart3 } from 'lucide-react';
import { ChronicleItem, LifeChapter, LegacyMilestone } from '../../types';
import { Card } from '../ui/Card';

interface LegacyDashboardProps {
  chronicleItems: ChronicleItem[];
  chapters: LifeChapter[];
  milestones: LegacyMilestone[];
  reflectionsCount: number;
  journeysCount: number;
  onOpenCapsules: () => void;
  onOpenYearInReview: () => void;
}

export const LegacyDashboard: React.FC<LegacyDashboardProps> = ({
  chronicleItems,
  chapters,
  milestones,
  reflectionsCount,
  journeysCount,
  onOpenCapsules,
  onOpenYearInReview,
}) => {
  const currentChapter = chapters.find((c) => c.isCurrent) || chapters[0];

  // Calculate Years Recorded
  let yearsRecordedStr = '0 Days';
  if (chronicleItems.length > 0) {
    const dates = chronicleItems.map((c) => new Date(c.date).getTime()).filter((t) => !isNaN(t));
    if (dates.length > 0) {
      const minDate = new Date(Math.min(...dates));
      const now = new Date();
      const diffDays = Math.max(1, Math.floor((now.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24)));
      const diffYears = (diffDays / 365).toFixed(1);
      yearsRecordedStr = diffDays > 365 ? `${diffYears} Years` : `${diffDays} Days`;
    }
  }

  const unlockedMilestonesCount = milestones.filter((m) => m.isUnlocked).length;
  const totalMilestonesCount = milestones.length;

  return (
    <Card className="relative overflow-hidden space-y-4 bg-[var(--forge-surface)] border border-[var(--forge-border)] rounded-2xl p-4 sm:p-5">
      {/* Main Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-mono font-bold tracking-widest text-[var(--forge-text-accent)] bg-[var(--forge-primary)]/10 px-2.5 py-0.5 rounded-full border border-[var(--forge-border-accent)]">
              LIFE STORY ARCHIVE
            </span>
            {currentChapter && (
              <span className="text-xs text-[var(--forge-text-secondary)] font-serif italic">
                Currently: {currentChapter.title}
              </span>
            )}
          </div>
          <h1 className="font-serif text-xl sm:text-2xl font-bold text-[var(--forge-text-primary)] tracking-tight mt-1">
            Living Legacy
          </h1>
          <p className="text-xs text-[var(--forge-text-secondary)] mt-0.5 max-w-lg">
            &quot;You are building the story of your life. Character is forged through quiet daily discipline.&quot;
          </p>
        </div>

        {/* Quick Action Triggers */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            data-system-guide="memory-capsules-btn"
            onClick={onOpenCapsules}
            className="min-h-[40px] px-3.5 py-2 bg-[var(--forge-surface-interactive)] border border-[var(--forge-border)] hover:border-[var(--forge-border-accent)] rounded-2xl text-xs font-bold text-[var(--forge-text-primary)] hover:text-[var(--forge-text-accent)] transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
            title="Messages to Future Self"
          >
            <Gift className="w-3.5 h-3.5 text-purple-400" />
            <span>Memory Capsules</span>
          </button>

          <button
            type="button"
            data-system-guide="year-in-review-btn"
            onClick={onOpenYearInReview}
            className="min-h-[40px] px-3.5 py-2 bg-[var(--forge-surface-interactive)] border border-[var(--forge-border)] hover:border-cyan-500/50 rounded-2xl text-xs font-bold text-[var(--forge-text-primary)] hover:text-cyan-300 transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
            title="Annual Summary Report"
          >
            <BarChart3 className="w-3.5 h-3.5 text-cyan-400" />
            <span>Year in Review</span>
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5 pt-2 relative z-10">
        <div className="p-3 bg-[var(--forge-surface-interactive)] border border-[var(--forge-border)] rounded-2xl">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--forge-text-muted)] block">Years Recorded</span>
          <span className="text-base font-bold font-mono text-[var(--forge-text-accent)] mt-0.5 block">{yearsRecordedStr}</span>
        </div>

        <div className="p-3 bg-[var(--forge-surface-interactive)] border border-[var(--forge-border)] rounded-2xl">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--forge-text-muted)] block">Milestones</span>
          <span className="text-base font-bold font-mono text-emerald-400 mt-0.5 block">{unlockedMilestonesCount}/{totalMilestonesCount}</span>
        </div>

        <div className="p-3 bg-[var(--forge-surface-interactive)] border border-[var(--forge-border)] rounded-2xl">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--forge-text-muted)] block">Reflections</span>
          <span className="text-base font-bold font-mono text-cyan-400 mt-0.5 block">{reflectionsCount}</span>
        </div>

        <div className="p-3 bg-[var(--forge-surface-interactive)] border border-[var(--forge-border)] rounded-2xl">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--forge-text-muted)] block">Life Chapters</span>
          <span className="text-base font-bold font-mono text-amber-400 mt-0.5 block">{chapters.length}</span>
        </div>

        <div className="p-3 bg-[var(--forge-surface-interactive)] border border-[var(--forge-border)] rounded-2xl">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--forge-text-muted)] block">Journeys</span>
          <span className="text-base font-bold font-mono text-purple-400 mt-0.5 block">{journeysCount}</span>
        </div>

        <div className="p-3 bg-[var(--forge-surface-interactive)] border border-[var(--forge-border)] rounded-2xl">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--forge-text-muted)] block">Events</span>
          <span className="text-base font-bold font-mono text-[var(--forge-text-primary)] mt-0.5 block">{chronicleItems.length}</span>
        </div>
      </div>
    </Card>
  );
};
