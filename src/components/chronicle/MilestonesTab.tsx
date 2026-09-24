import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Award, CheckCircle2, Circle, Plus, Filter, Sparkles, BookOpen, Cpu, Palette, Shield, GraduationCap, X, Check, Lock } from 'lucide-react';
import { LegacyMilestone } from '../../types';
import { db } from '../../db/database';
import { Card } from '../ui/Card';
import { CategoryGrid, CategoryGridItem } from '../ui/CategoryGrid';

interface MilestonesTabProps {
  milestones: LegacyMilestone[];
}

export const MilestonesTab: React.FC<MilestonesTabProps> = ({ milestones }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // New Custom Milestone state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<LegacyMilestone['category']>('life');
  const [reflectionNote, setReflectionNote] = useState('');

  const categories = ['all', 'education', 'creation', 'physical', 'mastery', 'consistency', 'life'];

  const filteredMilestones = milestones.filter((m) => {
    return selectedCategory === 'all' || m.category === selectedCategory;
  });

  const toggleMilestone = async (milestone: LegacyMilestone) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const newUnlocked = !milestone.isUnlocked;

    await db.legacyMilestones.update(milestone.id, {
      isUnlocked: newUnlocked,
      unlockedAt: newUnlocked ? todayStr : undefined,
    });

    if (newUnlocked) {
      await db.chronicle.add({
        title: `Milestone Achieved: ${milestone.title}`,
        subtitle: milestone.description,
        category: 'milestone',
        date: todayStr,
        icon: milestone.icon || 'Award',
        details: milestone.reflectionNote || undefined,
      });
    }
  };

  const handleCreateMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const todayStr = new Date().toISOString().split('T')[0];
    const id = `custom_m_${Date.now()}`;

    const newMilestone: LegacyMilestone = {
      id,
      title: title.trim(),
      description: description.trim() || 'Custom life milestone achieved.',
      category,
      icon: 'Award',
      isUnlocked: true,
      unlockedAt: todayStr,
      xpReward: 100,
      reflectionNote: reflectionNote.trim() || undefined,
    };

    await db.legacyMilestones.add(newMilestone);

    await db.chronicle.add({
      title: `Milestone Earned: ${title.trim()}`,
      subtitle: description.trim(),
      category: 'milestone',
      date: todayStr,
      icon: 'Award',
      details: reflectionNote.trim() || undefined,
    });

    setTitle('');
    setDescription('');
    setReflectionNote('');
    setIsAddModalOpen(false);
  };

  return (
    <div className="space-y-4">
      {/* Top Filter & Action Bar */}
      <div className="p-3.5 bg-[var(--forge-surface)] border border-[var(--forge-border)] rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <CategoryGrid variant="compact" cols={7}>
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

        <button
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          className="min-h-[40px] px-4 py-2 bg-[var(--forge-primary)] text-[var(--forge-button-text,#000)] font-sans font-bold text-xs rounded-2xl border border-[var(--forge-border-accent)] shadow-xs hover:brightness-105 transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>New Milestone</span>
        </button>
      </div>

      {/* Milestones Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filteredMilestones.map((m) => {
          return (
            <Card
              key={m.id}
              className={`p-4 sm:p-5 relative transition-all rounded-2xl space-y-2.5 border ${
                m.isUnlocked
                  ? 'bg-[var(--forge-surface)] border-[var(--forge-border-accent)] shadow-xs'
                  : 'bg-[var(--forge-surface)] border-[var(--forge-border)] opacity-80 hover:opacity-100 hover:border-[var(--forge-border-accent)]'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() => toggleMilestone(m)}
                    className="mt-0.5 cursor-pointer focus:outline-none"
                    title={m.isUnlocked ? 'Mark incomplete' : 'Mark complete'}
                  >
                    {m.isUnlocked ? (
                      <CheckCircle2 className="w-5 h-5 text-[var(--forge-text-accent)] fill-[var(--forge-primary)]/20" />
                    ) : (
                      <Circle className="w-5 h-5 text-[var(--forge-text-muted)] hover:text-[var(--forge-text-accent)]" />
                    )}
                  </button>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] uppercase font-mono font-bold text-[var(--forge-text-accent)] bg-[var(--forge-primary)]/10 px-2.5 py-0.5 rounded-full border border-[var(--forge-border-accent)]">
                        {m.category}
                      </span>
                      {m.unlockedAt && (
                        <span className="text-xs text-emerald-400 font-mono">
                          Achieved {m.unlockedAt}
                        </span>
                      )}
                    </div>

                    <h3 className="font-serif text-sm sm:text-base font-bold text-[var(--forge-text-primary)] mt-1">
                      {m.title}
                    </h3>
                    <p className="text-xs text-[var(--forge-text-secondary)] mt-0.5">{m.description}</p>
                  </div>
                </div>
              </div>

              {m.reflectionNote && (
                <div className="mt-2 p-3 bg-[var(--forge-surface-interactive)] border-l-2 border-[var(--forge-border-accent)] rounded-r-xl text-xs text-[var(--forge-text-secondary)] italic">
                  &quot;{m.reflectionNote}&quot;
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* CREATE MILESTONE MODAL */}
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
                  <Award className="w-5 h-5 text-[var(--forge-text-accent)]" />
                  Add Permanent Milestone
                </h3>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="text-[var(--forge-text-secondary)] hover:text-[var(--forge-text-primary)] cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateMilestone} className="space-y-3">
                <div>
                  <label className="text-[10px] uppercase font-bold text-[var(--forge-text-secondary)] block mb-1">
                    Milestone Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Read 50 Deep Books / Published First App"
                    className="w-full bg-[var(--forge-surface-interactive)] border border-[var(--forge-border)] rounded-xl px-3 py-2 text-xs text-[var(--forge-text-primary)] focus:border-[var(--forge-border-accent)] outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-[var(--forge-text-secondary)] block mb-1">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full bg-[var(--forge-surface-interactive)] border border-[var(--forge-border)] rounded-xl px-3 py-2 text-xs text-[var(--forge-text-primary)] focus:border-[var(--forge-border-accent)] outline-none capitalize"
                  >
                    <option value="life">Life</option>
                    <option value="education">Education</option>
                    <option value="creation">Creation</option>
                    <option value="physical">Physical</option>
                    <option value="mastery">Mastery</option>
                    <option value="consistency">Consistency</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-[var(--forge-text-secondary)] block mb-1">
                    Description
                  </label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="e.g., Expanded mental library through dedicated literature habits."
                    className="w-full bg-[var(--forge-surface-interactive)] border border-[var(--forge-border)] rounded-xl px-3 py-2 text-xs text-[var(--forge-text-primary)] focus:border-[var(--forge-border-accent)] outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-[var(--forge-text-secondary)] block mb-1">
                    Optional Reflection Note
                  </label>
                  <textarea
                    rows={2}
                    value={reflectionNote}
                    onChange={(e) => setReflectionNote(e.target.value)}
                    placeholder="What did achieving this milestone mean to you?"
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
                    <span>Save Milestone</span>
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
