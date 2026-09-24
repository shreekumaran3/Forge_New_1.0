import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/database';
import { Habit } from '../../types';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { useGame } from '../../context/GameContext';
import { XP_CONFIG } from '../../services/xpService';
import {
  Flame,
  Plus,
  Check,
  Award,
  Target,
  Sparkles,
  Droplet,
  BookOpen,
  Footprints,
} from 'lucide-react';

export const HabitTracker: React.FC = () => {
  const { player, awardActivityXp, revokeActivityXp } = useGame();
  const habits = useLiveQuery(() => db.habits.toArray()) || [];

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCategory, setNewCategory] = useState<'health' | 'mind' | 'discipline' | 'skills' | 'lifestyle'>('health');
  const [newXp, setNewXp] = useState(40);

  const getHabitAttributes = (category: string) => {
    switch (category) {
      case 'health':
        return { health: 15, endurance: 10, discipline: 5 };
      case 'mind':
        return { knowledge: 15, focus: 10, discipline: 5 };
      case 'discipline':
        return { discipline: 25, focus: 10 };
      case 'skills':
        return { knowledge: 15, creativity: 15 };
      default:
        return { discipline: 15, emotional_resilience: 10 };
    }
  };

  const toggleHabitToday = async (habit: Habit) => {
    if (!habit.id || !player) return;

    const newCompleted = !habit.completedToday;
    const newStreak = newCompleted ? habit.currentStreak + 1 : Math.max(0, habit.currentStreak - 1);
    const todayStr = new Date().toISOString().split('T')[0];

    await db.habits.update(habit.id, {
      completedToday: newCompleted,
      currentStreak: newStreak,
      lastCompletedAt: newCompleted ? todayStr : habit.lastCompletedAt,
    });

    const xpEarned = habit.xpReward || XP_CONFIG.HABIT_DEFAULT;
    const attrMap = getHabitAttributes(habit.category);

    if (newCompleted) {
      // Award XP
      await awardActivityXp({
        activityType: 'habit',
        generalXp: xpEarned,
        attributes: attrMap,
        title: `Habit Completed: ${habit.title}`,
        subtitle: `${newStreak}-day streak maintained`,
        category: 'habit',
      });

      await db.chronicle.add({
        title: `Habit Completed: ${habit.title}`,
        subtitle: `Maintained a ${newStreak}-day streak.`,
        category: 'milestone',
        date: todayStr,
        icon: 'Flame',
        xpReward: xpEarned,
      });
    } else {
      // Unchecked: Revoke XP cleanly (fixes duplication exploit)
      await revokeActivityXp({
        generalXp: xpEarned,
        attributes: attrMap,
      });
    }
  };

  const handleCreateHabit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const todayStr = new Date().toISOString().split('T')[0];
    await db.habits.add({
      title: newTitle.trim(),
      description: newDesc.trim() || undefined,
      category: newCategory,
      icon: newCategory === 'health' ? 'Droplet' : 'BookOpen',
      xpReward: Number(newXp) || 40,
      targetPerWeek: 7,
      currentStreak: 0,
      completedToday: false,
      createdAt: todayStr,
    });

    setNewTitle('');
    setNewDesc('');
    setIsAddModalOpen(false);
  };

  return (
    <div data-system-guide="habit-tracker" className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--forge-text-accent)] flex items-center gap-2">
            <Flame className="w-4 h-4 text-amber-500" />
            Habit Engine & Streaks
          </h2>
          <p className="text-xs text-[var(--forge-text-secondary)]">
            Identity is built through daily repetition. Maintain active streaks.
          </p>
        </div>

        <button
          type="button"
          data-system-guide="new-habit-btn"
          onClick={() => setIsAddModalOpen(true)}
          className="min-h-[40px] px-3.5 py-1.5 bg-[var(--forge-primary)] text-[var(--forge-button-text,#000)] font-sans font-bold text-xs rounded-2xl border border-[var(--forge-border-accent)] shadow-xs hover:brightness-105 transition-all flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Habit</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {habits.map((habit) => {
          const isDone = habit.completedToday;

          return (
            <Card
              key={habit.id}
              className={`space-y-3 transition-all rounded-2xl p-4 sm:p-5 border ${
                isDone
                  ? 'bg-amber-950/20 border-amber-500/40'
                  : 'bg-[var(--forge-surface)] border-[var(--forge-border)] hover:border-[var(--forge-border-accent)]'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <span className="text-[10px] font-mono uppercase text-amber-400 font-bold tracking-wider">
                    {habit.category}
                  </span>
                  <h3 className="font-serif font-bold text-sm text-[var(--forge-text-primary)]">{habit.title}</h3>
                </div>

                <div className="flex items-center gap-1 bg-[var(--forge-surface-interactive)] px-2.5 py-1 rounded-full border border-[var(--forge-border)] font-mono text-xs text-amber-400 font-bold">
                  <Flame className="w-3 h-3 fill-amber-500/20" />
                  <span>{habit.currentStreak}d</span>
                </div>
              </div>

              {habit.description && (
                <p className="text-xs text-[var(--forge-text-secondary)] line-clamp-2">{habit.description}</p>
              )}

              <div className="flex items-center justify-between pt-1">
                <span className="text-[10px] font-mono font-bold text-[var(--forge-text-accent)]">+{habit.xpReward} XP</span>

                <button
                  type="button"
                  onClick={() => toggleHabitToday(habit)}
                  className={`min-h-[38px] px-3.5 py-1.5 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
                    isDone
                      ? 'bg-amber-500 text-black border-amber-500 shadow-xs'
                      : 'bg-[var(--forge-surface-interactive)] border-[var(--forge-border)] text-[var(--forge-text-secondary)] hover:text-[var(--forge-text-primary)] hover:border-[var(--forge-border-accent)]'
                  }`}
                >
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                  <span>{isDone ? 'Completed Today' : 'Mark Complete'}</span>
                </button>
              </div>
            </Card>
          );
        })}
      </div>

      {/* NEW HABIT MODAL */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="CREATE DAILY HABIT"
        subtitle="Track core daily behaviors that forge character."
      >
        <form onSubmit={handleCreateHabit} className="space-y-4 pt-2">
          <div>
            <label className="text-[10px] font-bold text-[var(--forge-text-secondary)] uppercase block mb-1">Habit Title</label>
            <input
              type="text"
              required
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="e.g. Read 20 Pages Non-Fiction"
              className="w-full bg-[var(--forge-surface-interactive)] border border-[var(--forge-border)] focus:border-[var(--forge-border-accent)] rounded-xl px-3 py-2 text-xs text-[var(--forge-text-primary)] outline-none"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-[var(--forge-text-secondary)] uppercase block mb-1">Description</label>
            <textarea
              rows={2}
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="Why this habit matters..."
              className="w-full bg-[var(--forge-surface-interactive)] border border-[var(--forge-border)] focus:border-[var(--forge-border-accent)] rounded-xl p-3 text-xs text-[var(--forge-text-primary)] outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-[var(--forge-text-secondary)] uppercase block mb-1">Category</label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as any)}
                className="w-full bg-[var(--forge-surface-interactive)] border border-[var(--forge-border)] focus:border-[var(--forge-border-accent)] rounded-xl px-3 py-2 text-xs text-[var(--forge-text-primary)] outline-none"
              >
                <option value="health">Health & Body</option>
                <option value="mind">Mind & Focus</option>
                <option value="discipline">Discipline</option>
                <option value="skills">Skills & Study</option>
                <option value="lifestyle">Lifestyle</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-[var(--forge-text-secondary)] uppercase block mb-1">XP Reward</label>
              <input
                type="number"
                value={newXp}
                onChange={(e) => setNewXp(Number(e.target.value))}
                className="w-full bg-[var(--forge-surface-interactive)] border border-[var(--forge-border)] focus:border-[var(--forge-border-accent)] rounded-xl px-3 py-2 text-xs text-[var(--forge-text-primary)] outline-none font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="min-h-[40px] px-4 py-2 bg-[var(--forge-surface-interactive)] text-[var(--forge-text-secondary)] hover:text-[var(--forge-text-primary)] font-sans font-semibold text-xs rounded-2xl border border-[var(--forge-border)] cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="min-h-[40px] px-4 py-2 bg-[var(--forge-primary)] text-[var(--forge-button-text,#000)] font-sans font-bold text-xs rounded-2xl border border-[var(--forge-border-accent)] shadow-xs hover:brightness-105 cursor-pointer transition-all"
            >
              Save Habit
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
