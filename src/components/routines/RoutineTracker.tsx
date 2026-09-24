import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/database';
import { Routine } from '../../types';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { useGame } from '../../context/GameContext';
import { XP_CONFIG } from '../../services/xpService';
import {
  Sun,
  Moon,
  Sparkles,
  Plus,
  Check,
  Flame,
  Zap,
} from 'lucide-react';

export const RoutineTracker: React.FC = () => {
  const { player, awardActivityXp, revokeActivityXp } = useGame();
  const routines = useLiveQuery(() => db.routines.toArray()) || [];

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newRoutineName, setNewRoutineName] = useState('');
  const [newIcon, setNewIcon] = useState('Sun');
  const [itemsText, setItemsText] = useState('5-Min Stretching\n10-Min Breathing\n500ml Water');

  const toggleItemComplete = async (routine: Routine, itemId: string) => {
    if (!routine.id) return;

    const wasCompleted = routine.completedToday;
    const updatedItems = routine.items.map((it) =>
      it.id === itemId ? { ...it, completedToday: !it.completedToday } : it
    );

    const allCompleted = updatedItems.length > 0 && updatedItems.every((it) => it.completedToday);

    await db.routines.update(routine.id, {
      items: updatedItems,
      completedToday: allCompleted,
      lastCompletedAt: allCompleted ? new Date().toISOString() : routine.lastCompletedAt,
    });

    const xpReward = routine.xpReward || XP_CONFIG.ROUTINE_COMPLETION_BONUS;

    if (!wasCompleted && allCompleted) {
      // Award Routine Completion XP
      await awardActivityXp({
        activityType: 'routine',
        generalXp: xpReward,
        attributes: { discipline: 20, focus: 15 },
        title: `Routine Completed: ${routine.name}`,
        subtitle: `Executed all ${routine.items.length} routine items`,
        category: 'routine',
      });

      const todayStr = new Date().toISOString().split('T')[0];
      await db.chronicle.add({
        title: `Routine Completed: ${routine.name}`,
        subtitle: `Executed all ${routine.items.length} routine habits.`,
        category: 'milestone',
        date: todayStr,
        icon: 'Sparkles',
        xpReward,
      });
    } else if (wasCompleted && !allCompleted) {
      // Deduct Routine Completion XP when unchecked
      await revokeActivityXp({
        generalXp: xpReward,
        attributes: { discipline: 20, focus: 15 },
      });
    }
  };

  const handleCreateRoutine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoutineName.trim()) return;

    const lines = itemsText.split('\n').filter((l) => l.trim().length > 0);
    const routineItems = lines.map((title, i) => ({
      id: `rit_${Date.now()}_${i}`,
      title: title.trim(),
      completedToday: false,
    }));

    const todayStr = new Date().toISOString().split('T')[0];
    await db.routines.add({
      name: newRoutineName.trim(),
      icon: newIcon,
      items: routineItems,
      xpReward: 50,
      completedToday: false,
      createdAt: todayStr,
    });

    setNewRoutineName('');
    setIsAddModalOpen(false);
  };

  return (
    <div data-system-guide="routine-tracker" className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--forge-text-accent)] flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[var(--forge-text-accent)]" />
            Reusable Daily Routines
          </h2>
          <p className="text-xs text-[var(--forge-text-secondary)]">
            Morning, Evening, or Deep Work routines to build quiet momentum.
          </p>
        </div>

        <button
          type="button"
          data-system-guide="new-routine-btn"
          onClick={() => setIsAddModalOpen(true)}
          className="min-h-[40px] px-3.5 py-1.5 bg-[var(--forge-primary)] text-[var(--forge-button-text,#000)] font-sans font-bold text-xs rounded-2xl border border-[var(--forge-border-accent)] shadow-xs hover:brightness-105 transition-all flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Routine</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {routines.map((routine) => {
          const isCompleted = routine.completedToday;

          return (
            <Card
              key={routine.id}
              className={`space-y-3 transition-all rounded-2xl p-4 sm:p-5 border ${
                isCompleted
                  ? 'bg-emerald-950/20 border-emerald-500/40'
                  : 'bg-[var(--forge-surface)] border-[var(--forge-border)] hover:border-[var(--forge-border-accent)]'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-[var(--forge-surface-interactive)] border border-[var(--forge-border)] rounded-xl text-[var(--forge-text-accent)]">
                    {routine.name.toLowerCase().includes('evening') || routine.icon === 'Moon' ? (
                      <Moon className="w-4 h-4 text-indigo-400" />
                    ) : (
                      <Sun className="w-4 h-4 text-amber-400" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-serif font-bold text-sm text-[var(--forge-text-primary)]">{routine.name}</h3>
                    <span className="text-[10px] text-[var(--forge-text-secondary)]">
                      {routine.items.filter((i) => i.completedToday).length} / {routine.items.length} Completed
                    </span>
                  </div>
                </div>

                <span className="text-[10px] font-mono font-bold text-[var(--forge-text-accent)] bg-[var(--forge-primary)]/10 px-2.5 py-0.5 rounded-full border border-[var(--forge-border-accent)]">
                  +{routine.xpReward} XP
                </span>
              </div>

              <div className="space-y-1.5 pt-1">
                {routine.items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => toggleItemComplete(routine, item.id)}
                    className={`w-full text-left p-2.5 rounded-xl border text-xs font-mono transition-all cursor-pointer flex items-center justify-between ${
                      item.completedToday
                        ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                        : 'bg-[var(--forge-surface-interactive)] border-[var(--forge-border)] text-[var(--forge-text-secondary)] hover:text-[var(--forge-text-primary)]'
                    }`}
                  >
                    <span className={item.completedToday ? 'line-through opacity-80' : ''}>
                      {item.title}
                    </span>
                    <div
                      className={`w-5 h-5 rounded-lg flex items-center justify-center border transition-colors ${
                        item.completedToday
                          ? 'bg-emerald-500 border-emerald-500 text-black'
                          : 'bg-[var(--forge-surface)] border-[var(--forge-border)]'
                      }`}
                    >
                      {item.completedToday && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </button>
                ))}
              </div>
            </Card>
          );
        })}
      </div>

      {/* NEW ROUTINE MODAL */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="CREATE DAILY ROUTINE"
        subtitle="Add a list of sequential steps or micro-habits."
      >
        <form onSubmit={handleCreateRoutine} className="space-y-4 pt-2">
          <div>
            <label className="text-[10px] font-bold text-[var(--forge-text-secondary)] uppercase block mb-1">Routine Name</label>
            <input
              type="text"
              required
              value={newRoutineName}
              onChange={(e) => setNewRoutineName(e.target.value)}
              placeholder="e.g. Midday Study Prep Routine"
              className="w-full bg-[var(--forge-surface-interactive)] border border-[var(--forge-border)] focus:border-[var(--forge-border-accent)] rounded-xl px-3 py-2 text-xs text-[var(--forge-text-primary)] outline-none"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-[var(--forge-text-secondary)] uppercase block mb-1">Routine Steps (One per line)</label>
            <textarea
              rows={4}
              value={itemsText}
              onChange={(e) => setItemsText(e.target.value)}
              className="w-full bg-[var(--forge-surface-interactive)] border border-[var(--forge-border)] focus:border-[var(--forge-border-accent)] rounded-xl p-3 text-xs text-[var(--forge-text-primary)] outline-none font-mono"
            />
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
              Save Routine
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
