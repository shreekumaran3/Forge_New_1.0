import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BookOpen, Plus, Sparkles, Check, Calendar, ArrowRight, X, Bookmark, Tag } from 'lucide-react';
import { LifeChapter, LegacyMilestone } from '../../types';
import { db } from '../../db/database';
import { Card } from '../ui/Card';

interface LifeChaptersTabProps {
  chapters: LifeChapter[];
  milestones: LegacyMilestone[];
}

export const LifeChaptersTab: React.FC<LifeChaptersTabProps> = ({ chapters, milestones }) => {
  const [isNewChapterModalOpen, setIsNewChapterModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [description, setDescription] = useState('');
  const [tagsStr, setTagsStr] = useState('');

  const currentChapter = chapters.find((c) => c.isCurrent) || chapters[0];
  const unlockedMilestones = milestones.filter((m) => m.isUnlocked);

  // Suggest new chapter if current chapter has 3+ major milestones unlocked
  const showSuggestionBanner = unlockedMilestones.length >= 3 && chapters.length < 5;

  const handleCreateChapter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const todayStr = new Date().toISOString().split('T')[0];
    const tagsArr = tagsStr
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    // Set all existing chapters isCurrent = false
    const allChapters = await db.chapters.toArray();
    for (const ch of allChapters) {
      if (ch.id) {
        await db.chapters.update(ch.id, { isCurrent: false, endDate: todayStr });
      }
    }

    // Add new chapter
    await db.chapters.add({
      title: title.trim(),
      subtitle: subtitle.trim() || 'A new chapter of growth & discipline begins.',
      description: description.trim() || undefined,
      startDate: todayStr,
      isCurrent: true,
      tags: tagsArr.length > 0 ? tagsArr : undefined,
    });

    // Add Chronicle Entry
    await db.chronicle.add({
      title: `Inaugurated ${title.trim()}`,
      subtitle: subtitle.trim() || 'A new life era has officially begun.',
      category: 'chapter',
      date: todayStr,
      icon: 'BookOpen',
      xpReward: 0,
      details: description.trim() || 'Entered a new era of personal growth.',
    });

    // Update Player Profile currentChapter
    const player = await db.player.toCollection().first();
    if (player && player.id) {
      await db.player.update(player.id, {
        currentChapter: title.trim(),
      });
    }

    setTitle('');
    setSubtitle('');
    setDescription('');
    setTagsStr('');
    setIsNewChapterModalOpen(false);
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6">
      {/* Intelligent Chapter Suggestion Banner */}
      {showSuggestionBanner && (
        <Card className="p-4 sm:p-5 relative overflow-hidden bg-[var(--forge-surface)] border border-[var(--forge-border-accent)] rounded-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-[var(--forge-primary)]/20 border border-[var(--forge-border-accent)] text-[var(--forge-text-accent)] shrink-0 mt-0.5">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-mono font-bold text-[var(--forge-text-accent)]">
                  ERA EVOLUTION DETECTED
                </span>
                <h3 className="font-serif text-sm sm:text-base font-bold text-[var(--forge-text-primary)] mt-0.5">
                  Ready to inaugurate a new Life Chapter?
                </h3>
                <p className="text-xs text-[var(--forge-text-secondary)] mt-0.5">
                  You have unlocked {unlockedMilestones.length} major milestones in your current era ({currentChapter?.title}).
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsNewChapterModalOpen(true)}
              className="min-h-[40px] px-4 py-2 bg-[var(--forge-primary)] text-[var(--forge-button-text,#000)] font-sans font-bold text-xs rounded-2xl border border-[var(--forge-border-accent)] shadow-xs hover:brightness-105 transition-all cursor-pointer shrink-0 flex items-center justify-center gap-1.5"
            >
              <span>Inaugurate New Era</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </Card>
      )}

      {/* Chapters Header & Trigger */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif text-lg font-bold text-[var(--forge-text-primary)] tracking-tight flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-[var(--forge-text-accent)]" />
            Life Eras & Chapters
          </h2>
          <p className="text-xs text-[var(--forge-text-secondary)]">
            Different chapters define distinct phases of your personal evolution.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsNewChapterModalOpen(true)}
          className="min-h-[40px] px-3.5 py-2 bg-[var(--forge-surface-interactive)] border border-[var(--forge-border)] hover:border-[var(--forge-border-accent)] text-[var(--forge-text-primary)] hover:text-[var(--forge-text-accent)] text-xs font-bold rounded-2xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>New Chapter</span>
        </button>
      </div>

      {/* Chapters Stack */}
      <div className="space-y-4">
        {chapters.map((chapter) => {
          return (
            <Card
              key={chapter.id}
              className={`p-4 sm:p-5 relative overflow-hidden transition-all rounded-2xl space-y-3 border ${
                chapter.isCurrent
                  ? 'bg-[var(--forge-surface)] border-2 border-[var(--forge-border-accent)] shadow-xs'
                  : 'bg-[var(--forge-surface)] border-[var(--forge-border)] opacity-90 hover:opacity-100 hover:border-[var(--forge-border-accent)]'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {chapter.isCurrent ? (
                      <span className="text-[10px] uppercase font-mono font-bold tracking-widest text-black bg-[var(--forge-primary)] px-2.5 py-0.5 rounded-full shadow-xs">
                        ACTIVE CURRENT ERA
                      </span>
                    ) : (
                      <span className="text-[10px] uppercase font-mono font-bold text-[var(--forge-text-muted)] bg-[var(--forge-surface-interactive)] px-2.5 py-0.5 rounded-full border border-[var(--forge-border)]">
                        COMPLETED ERA
                      </span>
                    )}
                    <span className="text-xs text-[var(--forge-text-secondary)] font-mono flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-[var(--forge-text-accent)]" />
                      {formatDate(chapter.startDate)} – {chapter.endDate ? formatDate(chapter.endDate) : 'Present'}
                    </span>
                  </div>

                  <h3 className="font-serif text-base sm:text-lg font-bold text-[var(--forge-text-primary)] mt-1.5">
                    {chapter.title}
                  </h3>
                  <p className="text-xs text-[var(--forge-text-secondary)] italic">{chapter.subtitle}</p>
                </div>

                <Bookmark className={`w-5 h-5 shrink-0 ${chapter.isCurrent ? 'text-[var(--forge-text-accent)]' : 'text-[var(--forge-text-muted)]'}`} />
              </div>

              {chapter.description && (
                <p className="text-xs text-[var(--forge-text-primary)] leading-relaxed p-3.5 bg-[var(--forge-surface-interactive)] border border-[var(--forge-border)] rounded-xl">
                  {chapter.description}
                </p>
              )}

              {chapter.tags && chapter.tags.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  <Tag className="w-3.5 h-3.5 text-[var(--forge-text-accent)]" />
                  {chapter.tags.map((t, idx) => (
                    <span
                      key={idx}
                      className="text-[10px] font-mono bg-[var(--forge-surface-interactive)] border border-[var(--forge-border)] text-[var(--forge-text-secondary)] px-2 py-0.5 rounded-md"
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* NEW CHAPTER MODAL */}
      <AnimatePresence>
        {isNewChapterModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-md bg-[var(--forge-surface)] border border-[var(--forge-border)] rounded-2xl p-5 sm:p-6 space-y-4 shadow-xl text-left"
            >
              <div className="flex items-center justify-between border-b border-[var(--forge-border)] pb-3">
                <h3 className="font-serif text-base font-bold text-[var(--forge-text-primary)] flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-[var(--forge-text-accent)]" />
                  Inaugurate New Life Chapter
                </h3>
                <button
                  type="button"
                  onClick={() => setIsNewChapterModalOpen(false)}
                  className="text-[var(--forge-text-secondary)] hover:text-[var(--forge-text-primary)] cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateChapter} className="space-y-3">
                <div>
                  <label className="text-[10px] uppercase font-bold text-[var(--forge-text-secondary)] block mb-1">
                    Chapter Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Chapter III: The Sovereign Architect"
                    className="w-full bg-[var(--forge-surface-interactive)] border border-[var(--forge-border)] rounded-xl px-3 py-2 text-xs text-[var(--forge-text-primary)] focus:border-[var(--forge-border-accent)] outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-[var(--forge-text-secondary)] block mb-1">
                    Tagline / Theme
                  </label>
                  <input
                    type="text"
                    value={subtitle}
                    onChange={(e) => setSubtitle(e.target.value)}
                    placeholder="e.g., Refining illustration mastery & preparing for mountain summit."
                    className="w-full bg-[var(--forge-surface-interactive)] border border-[var(--forge-border)] rounded-xl px-3 py-2 text-xs text-[var(--forge-text-primary)] focus:border-[var(--forge-border-accent)] outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-[var(--forge-text-secondary)] block mb-1">
                    Chapter Description / Era Goals
                  </label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe the focus, values, and major aspirations of this era..."
                    className="w-full bg-[var(--forge-surface-interactive)] border border-[var(--forge-border)] rounded-xl px-3 py-2 text-xs text-[var(--forge-text-primary)] focus:border-[var(--forge-border-accent)] outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-[var(--forge-text-secondary)] block mb-1">
                    Era Tags (Comma separated)
                  </label>
                  <input
                    type="text"
                    value={tagsStr}
                    onChange={(e) => setTagsStr(e.target.value)}
                    placeholder="Illustration, Trekking, Discipline, 2026"
                    className="w-full bg-[var(--forge-surface-interactive)] border border-[var(--forge-border)] rounded-xl px-3 py-2 text-xs text-[var(--forge-text-primary)] focus:border-[var(--forge-border-accent)] outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsNewChapterModalOpen(false)}
                    className="min-h-[40px] py-2 px-4 bg-[var(--forge-surface-interactive)] border border-[var(--forge-border)] text-[var(--forge-text-secondary)] hover:text-[var(--forge-text-primary)] rounded-2xl text-xs font-semibold cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="min-h-[40px] py-2 px-4 bg-[var(--forge-primary)] text-[var(--forge-button-text,#000)] rounded-2xl text-xs font-bold border border-[var(--forge-border-accent)] shadow-xs hover:brightness-105 cursor-pointer flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>Inaugurate Chapter</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
