import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import { BarChart3, Trophy, BookOpen, Footprints, Feather, Palette, Sparkles, Award, Quote, Calendar, X, Download } from 'lucide-react';
import { ChronicleItem, LegacyMilestone, PersonalRecord, UserPrinciple } from '../../types';
import { Card } from '../ui/Card';
import { useBackHandler } from '../../services/backButtonManager';

interface YearInReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  year?: string;
  chronicleItems: ChronicleItem[];
  milestones: LegacyMilestone[];
  records: PersonalRecord[];
  principles: UserPrinciple[];
}

export const YearInReviewModal: React.FC<YearInReviewModalProps> = ({
  isOpen,
  onClose,
  year = '2026',
  chronicleItems,
  milestones,
  records,
  principles,
}) => {
  useBackHandler(
    'year-in-review-modal',
    100,
    () => {
      onClose();
      return true;
    },
    isOpen
  );

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Aggregate stats from actual records (defaulting to 0 / empty when not present)
  const unlockedMilestones = milestones.filter((m) => m.isUnlocked);
  const longestWalkRec = records.find((r) => r.key === 'longest_walk')?.value || '0';
  const focusHoursRec = records.find((r) => r.key === 'focus_hours' || r.key === 'prog_hours')?.value || '0';
  const drawHoursRec = records.find((r) => r.key === 'draw_hours')?.value || '0';
  const booksRec = records.find((r) => r.key === 'books_finished')?.value || '0';

  const favoritePrinciple = principles.length > 0 ? (principles[0].statement || principles[0].text) : 'No lesson recorded yet.';

  const yearHighlights = chronicleItems.slice(0, 5);

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-2xl bg-[var(--forge-surface)] border border-[var(--forge-border)] rounded-2xl p-5 sm:p-6 space-y-5 shadow-xl text-left max-h-[90vh] overflow-y-auto custom-scrollbar relative"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--forge-border)] pb-3 relative z-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-mono font-bold text-[var(--forge-text-accent)] bg-[var(--forge-primary)]/10 px-2.5 py-0.5 rounded-full border border-[var(--forge-border-accent)]">
                ANNUAL REPORT
              </span>
              <span className="text-xs text-[var(--forge-text-secondary)] font-mono">{year} ARCHIVE</span>
            </div>
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-[var(--forge-text-primary)] mt-1.5">
              {year} Year in Review
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-[var(--forge-text-secondary)] hover:text-[var(--forge-text-primary)] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Aggregated Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 relative z-10">
          <Card className="p-3.5 bg-[var(--forge-surface-interactive)] border border-[var(--forge-border)] rounded-2xl space-y-1">
            <div className="flex items-center justify-between text-amber-400">
              <BookOpen className="w-4 h-4" />
              <span className="text-[10px] font-mono uppercase text-[var(--forge-text-secondary)]">Books Read</span>
            </div>
            <span className="text-lg font-bold font-mono text-[var(--forge-text-primary)] block">{booksRec} Books</span>
          </Card>

          <Card className="p-3.5 bg-[var(--forge-surface-interactive)] border border-[var(--forge-border)] rounded-2xl space-y-1">
            <div className="flex items-center justify-between text-emerald-400">
              <Footprints className="w-4 h-4" />
              <span className="text-[10px] font-mono uppercase text-[var(--forge-text-secondary)]">Longest Trek</span>
            </div>
            <span className="text-lg font-bold font-mono text-[var(--forge-text-primary)] block">{longestWalkRec} km</span>
          </Card>

          <Card className="p-3.5 bg-[var(--forge-surface-interactive)] border border-[var(--forge-border)] rounded-2xl space-y-1">
            <div className="flex items-center justify-between text-cyan-400">
              <Feather className="w-4 h-4" />
              <span className="text-[10px] font-mono uppercase text-[var(--forge-text-secondary)]">Focus & Practice</span>
            </div>
            <span className="text-lg font-bold font-mono text-[var(--forge-text-primary)] block">{focusHoursRec} hrs</span>
          </Card>

          <Card className="p-3.5 bg-[var(--forge-surface-interactive)] border border-[var(--forge-border)] rounded-2xl space-y-1">
            <div className="flex items-center justify-between text-rose-400">
              <Palette className="w-4 h-4" />
              <span className="text-[10px] font-mono uppercase text-[var(--forge-text-secondary)]">Art & Drawing</span>
            </div>
            <span className="text-lg font-bold font-mono text-[var(--forge-text-primary)] block">{drawHoursRec} hrs</span>
          </Card>
        </div>

        {/* Favorite Principle / Wisdom Callout */}
        <Card className="p-4 sm:p-5 bg-[var(--forge-surface-interactive)] border border-[var(--forge-border-accent)] rounded-2xl space-y-2 relative z-10">
          <span className="text-[10px] uppercase font-mono font-bold text-[var(--forge-text-accent)] flex items-center gap-1.5">
            <Quote className="w-3.5 h-3.5 text-[var(--forge-text-accent)]" /> BIGGEST LESSON LEARNED IN {year}
          </span>
          <p className="font-serif text-sm sm:text-base font-bold text-[var(--forge-text-primary)] italic leading-snug">
            &quot;{favoritePrinciple}&quot;
          </p>
        </Card>

        {/* Year Highlights Timeline */}
        <div className="space-y-3 relative z-10">
          <h3 className="font-serif text-sm font-bold text-[var(--forge-text-primary)] flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[var(--forge-text-accent)]" />
            Chronicle Highlights of {year}
          </h3>

          <div className="space-y-2">
            {yearHighlights.length === 0 ? (
              <Card className="p-6 text-center space-y-2 bg-[var(--forge-surface-interactive)] border border-[var(--forge-border)] rounded-2xl">
                <Calendar className="w-8 h-8 text-[var(--forge-text-muted)] mx-auto opacity-60" />
                <h4 className="font-serif font-bold text-sm text-[var(--forge-text-primary)]">Complete your first year to unlock your annual report.</h4>
                <p className="text-xs text-[var(--forge-text-secondary)] max-w-sm mx-auto">
                  As you log daily reflections, complete quests, and achieve milestones, your annual report will automatically compile here.
                </p>
              </Card>
            ) : (
              yearHighlights.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 bg-[var(--forge-surface-interactive)] border border-[var(--forge-border)] rounded-2xl flex items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase font-mono text-[var(--forge-text-accent)] font-bold">
                        {item.category}
                      </span>
                      <span className="text-xs text-[var(--forge-text-secondary)] font-mono">{item.date}</span>
                    </div>
                    <h4 className="font-bold text-[var(--forge-text-primary)] mt-0.5">{item.title}</h4>
                  </div>

                  <Award className="w-4 h-4 text-[var(--forge-text-accent)] shrink-0" />
                </div>
              ))
            )}
          </div>
        </div>

        {/* Close & Print buttons */}
        <div className="pt-3 border-t border-[var(--forge-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
          <span className="text-xs text-[var(--forge-text-secondary)] font-mono">Life Story Archive</span>
          <button
            type="button"
            onClick={() => window.print()}
            className="min-h-[40px] px-4 py-2 bg-[var(--forge-primary)] text-[var(--forge-button-text,#000)] font-sans font-bold text-xs rounded-2xl border border-[var(--forge-border-accent)] shadow-xs hover:brightness-105 transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Download className="w-4 h-4" />
            <span>Export / Print Summary</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};
