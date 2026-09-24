import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Plus, RefreshCw, Quote, Bookmark, Filter, Check, X, Tag } from 'lucide-react';
import { UserPrinciple } from '../../types';
import { db } from '../../db/database';
import { Card } from '../ui/Card';
import { CategoryGrid, CategoryGridItem } from '../ui/CategoryGrid';

interface LessonsLearnedTabProps {
  principles: UserPrinciple[];
}

export const LessonsLearnedTab: React.FC<LessonsLearnedTabProps> = ({ principles }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'revisited' | 'category'>('newest');
  const [randomIdx, setRandomIdx] = useState<number>(0);

  // Add Principle Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [statement, setStatement] = useState('');
  const [category, setCategory] = useState('Growth');
  const [context, setContext] = useState('');

  const categories = ['all', 'Growth', 'Discipline', 'Mindset', 'Physical', 'Wisdom', 'Character'];

  // Random Reminder Principle
  const activePrinciples = principles.length > 0 ? principles : [];
  const randomPrinciple =
    activePrinciples.length > 0
      ? activePrinciples[randomIdx % activePrinciples.length]
      : null;

  const cycleRandom = () => {
    if (activePrinciples.length > 0) {
      setRandomIdx((prev) => (prev + 1) % activePrinciples.length);
    }
  };

  // Filter & Sort
  const filtered = activePrinciples.filter(
    (p) => selectedCategory === 'all' || p.category === selectedCategory
  );

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'newest') {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    } else if (sortBy === 'revisited') {
      return (b.revisitedCount || 0) - (a.revisitedCount || 0);
    } else {
      return a.category.localeCompare(b.category);
    }
  });

  const handleRevisit = async (principle: UserPrinciple) => {
    if (principle.id) {
      const newCount = (principle.revisitedCount || 0) + 1;
      await db.principles.update(principle.id, {
        revisitedCount: newCount,
        lastRevisitedAt: new Date().toISOString(),
      });
    }
  };

  const handleAddPrinciple = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!statement.trim()) return;

    const todayStr = new Date().toISOString().split('T')[0];
    await db.principles.add({
      text: statement.trim(),
      statement: statement.trim(),
      category: category.trim() || 'Growth',
      context: context.trim() || undefined,
      createdAt: todayStr,
      revisitedCount: 1,
    });

    setStatement('');
    setContext('');
    setIsAddModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Random Reminder Card */}
      {randomPrinciple && (
        <Card className="p-4 sm:p-5 relative overflow-hidden bg-[var(--forge-surface)] border border-[var(--forge-border-accent)] rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-mono font-bold tracking-widest text-[var(--forge-text-accent)] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[var(--forge-text-accent)]" /> RANDOM WISDOM REMINDER
            </span>

            <button
              type="button"
              onClick={cycleRandom}
              className="min-h-[32px] px-2.5 py-1 rounded-xl bg-[var(--forge-surface-interactive)] border border-[var(--forge-border)] text-[var(--forge-text-secondary)] hover:text-[var(--forge-text-accent)] transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-mono"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Next</span>
            </button>
          </div>

          <div className="relative pl-6">
            <Quote className="w-5 h-5 text-[var(--forge-text-accent)]/40 absolute left-0 top-0" />
            <p className="font-serif text-sm sm:text-base font-bold text-[var(--forge-text-primary)] italic leading-snug">
              &quot;{randomPrinciple.statement || randomPrinciple.text}&quot;
            </p>
            {randomPrinciple.context && (
              <p className="text-xs text-[var(--forge-text-secondary)] mt-1.5">— {randomPrinciple.context}</p>
            )}
          </div>
        </Card>
      )}

      {/* Header & Controls */}
      <div className="p-3.5 bg-[var(--forge-surface)] border border-[var(--forge-border)] rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Category Filters */}
        <CategoryGrid variant="compact" cols={6}>
          {categories.map((cat) => (
            <CategoryGridItem
              key={cat}
              id={cat}
              label={cat}
              isActive={selectedCategory === cat}
              onClick={() => setSelectedCategory(cat)}
            />
          ))}
        </CategoryGrid>

        <div className="flex items-center gap-2 shrink-0">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="min-h-[40px] bg-[var(--forge-surface-interactive)] border border-[var(--forge-border)] text-[var(--forge-text-secondary)] text-xs font-mono font-bold px-3 py-2 rounded-xl outline-none"
          >
            <option value="newest">Newest First</option>
            <option value="revisited">Most Internalized</option>
            <option value="category">By Category</option>
          </select>

          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="min-h-[40px] px-4 py-2 bg-[var(--forge-primary)] text-[var(--forge-button-text,#000)] font-sans font-bold text-xs rounded-2xl border border-[var(--forge-border-accent)] shadow-xs hover:brightness-105 transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add Principle</span>
          </button>
        </div>
      </div>

      {/* Principles Collection Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {sorted.map((p) => (
          <Card key={p.id} className="p-4 sm:p-5 bg-[var(--forge-surface)] border border-[var(--forge-border)] hover:border-[var(--forge-border-accent)] rounded-2xl transition-all space-y-3 relative flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-mono font-bold text-[var(--forge-text-accent)] bg-[var(--forge-primary)]/10 px-2.5 py-0.5 rounded-full border border-[var(--forge-border-accent)]">
                  {p.category}
                </span>
                <span className="text-xs text-[var(--forge-text-secondary)] font-mono">{p.createdAt}</span>
              </div>

              <p className="font-serif text-sm sm:text-base font-bold text-[var(--forge-text-primary)] italic leading-snug">
                &quot;{p.statement || p.text}&quot;
              </p>

              {p.context && (
                <p className="text-xs text-[var(--forge-text-secondary)]">{p.context}</p>
              )}
            </div>

            <div className="pt-3 border-t border-[var(--forge-border)] flex items-center justify-between">
              <span className="text-xs text-[var(--forge-text-secondary)] font-mono">
                Internalized {p.revisitedCount || 1}x
              </span>

              <button
                type="button"
                onClick={() => handleRevisit(p)}
                className="px-3 py-1.5 bg-[var(--forge-surface-interactive)] border border-[var(--forge-border)] hover:border-[var(--forge-border-accent)] text-[var(--forge-text-secondary)] hover:text-[var(--forge-text-accent)] rounded-xl text-xs font-mono font-bold transition-all cursor-pointer"
              >
                + Internalize
              </button>
            </div>
          </Card>
        ))}
      </div>

      {/* ADD PRINCIPLE MODAL */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-md bg-[var(--forge-surface)] border border-[var(--forge-border)] rounded-2xl p-5 sm:p-6 space-y-4 shadow-xl text-left"
            >
              <div className="flex items-center justify-between border-b border-[var(--forge-border)] pb-3">
                <h3 className="font-serif text-base font-bold text-[var(--forge-text-primary)] flex items-center gap-2">
                  <Quote className="w-5 h-5 text-[var(--forge-text-accent)]" />
                  Add Personal Principle
                </h3>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="text-[var(--forge-text-secondary)] hover:text-[var(--forge-text-primary)] cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddPrinciple} className="space-y-3">
                <div>
                  <label className="text-[10px] uppercase font-bold text-[var(--forge-text-secondary)] block mb-1">
                    Principle / Lesson Statement *
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={statement}
                    onChange={(e) => setStatement(e.target.value)}
                    placeholder="e.g., Consistency beats motivation every single time."
                    className="w-full bg-[var(--forge-surface-interactive)] border border-[var(--forge-border)] rounded-xl px-3 py-2 text-xs text-[var(--forge-text-primary)] focus:border-[var(--forge-border-accent)] outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-[var(--forge-text-secondary)] block mb-1">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-[var(--forge-surface-interactive)] border border-[var(--forge-border)] rounded-xl px-3 py-2 text-xs text-[var(--forge-text-primary)] focus:border-[var(--forge-border-accent)] outline-none capitalize"
                  >
                    <option value="Growth">Growth</option>
                    <option value="Discipline">Discipline</option>
                    <option value="Mindset">Mindset</option>
                    <option value="Physical">Physical</option>
                    <option value="Wisdom">Wisdom</option>
                    <option value="Character">Character</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-[var(--forge-text-secondary)] block mb-1">
                    Context / Source
                  </label>
                  <input
                    type="text"
                    value={context}
                    onChange={(e) => setContext(e.target.value)}
                    placeholder="e.g., Learned during Mount Kinabalu incline training"
                    className="w-full bg-[var(--forge-surface-interactive)] border border-[var(--forge-border)] rounded-xl px-3 py-2 text-xs text-[var(--forge-text-primary)] focus:border-[var(--forge-border-accent)] outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="min-h-[40px] py-2 px-4 bg-[var(--forge-surface-interactive)] border border-[var(--forge-border)] text-[var(--forge-text-secondary)] hover:text-[var(--forge-text-primary)] rounded-2xl text-xs font-semibold cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="min-h-[40px] py-2 px-4 bg-[var(--forge-primary)] text-[var(--forge-button-text,#000)] rounded-2xl text-xs font-bold border border-[var(--forge-border-accent)] shadow-xs hover:brightness-105 cursor-pointer flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>Save Principle</span>
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
