import React, { useState } from 'react';
import { Sparkles, Check, Heart, Target, Send, Calendar } from 'lucide-react';
import { db } from '../../db/database';
import { useGame } from '../../context/GameContext';

export const DailyReflectionCard: React.FC = () => {
  const { grantXpToPlayerAndStats } = useGame();
  const [wentWell, setWentWell] = useState('');
  const [feltHard, setFeltHard] = useState('');
  const [tomorrowFocus, setTomorrowFocus] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wentWell && !feltHard && !tomorrowFocus) return;

    const todayStr = new Date().toISOString().split('T')[0];
    await db.dailyReflections.add({
      date: todayStr,
      wentWell: wentWell.trim(),
      feltHard: feltHard.trim(),
      tomorrowFocus: tomorrowFocus.trim(),
      createdAt: new Date().toISOString(),
    });

    // Add +25 XP bonus for completing daily reflection through central engine
    await grantXpToPlayerAndStats({
      generalXp: 25,
      title: 'Daily Reflection',
      category: 'mindset',
    });

    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="bg-[var(--forge-surface)] border border-emerald-500/30 rounded-3xl p-6 text-center shadow-sm space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto shadow-xs">
          <Check className="w-6 h-6" />
        </div>
        <h4 className="text-base font-bold font-serif text-[var(--forge-text-primary)]">Daily Reflection Recorded</h4>
        <p className="text-xs text-[var(--forge-text-secondary)] max-w-sm mx-auto">
          Self-awareness reinforced (+25 XP). Your tomorrow focus is set.
        </p>
      </div>
    );
  }

  return (
    <div data-system-guide="daily-reflection-card" className="bg-[var(--forge-surface)] border border-[var(--forge-border)] rounded-3xl p-5 sm:p-6 shadow-sm relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--forge-primary)]/5 rounded-full blur-2xl pointer-events-none" />

      <div className="flex items-center gap-2 mb-4 relative z-10">
        <Sparkles className="w-4 h-4 text-[var(--forge-text-accent)]" />
        <h3 className="text-sm sm:text-base font-bold font-serif text-[var(--forge-text-primary)]">Daily 30-Second Reflection</h3>
        <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-[var(--forge-primary)]/10 border border-[var(--forge-border-accent)] text-[var(--forge-text-accent)] font-mono font-bold ml-auto">
          +25 XP
        </span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3.5 relative z-10">
        <div>
          <label className="text-xs font-medium text-[var(--forge-text-secondary)] flex items-center gap-1.5 mb-1.5">
            <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>What went well today?</span>
          </label>
          <input
            type="text"
            placeholder="e.g. Maintained focus on deep reading, hit 20 push-ups"
            value={wentWell}
            onChange={(e) => setWentWell(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--forge-surface-elevated)] border border-[var(--forge-border)] text-xs text-[var(--forge-text-primary)] focus:outline-none focus:border-[var(--forge-border-accent)] placeholder-[var(--forge-text-muted)]"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-[var(--forge-text-secondary)] flex items-center gap-1.5 mb-1.5">
            <Heart className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            <span>What felt hard?</span>
          </label>
          <input
            type="text"
            placeholder="e.g. Energy dip in early afternoon"
            value={feltHard}
            onChange={(e) => setFeltHard(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--forge-surface-elevated)] border border-[var(--forge-border)] text-xs text-[var(--forge-text-primary)] focus:outline-none focus:border-[var(--forge-border-accent)] placeholder-[var(--forge-text-muted)]"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-[var(--forge-text-secondary)] flex items-center gap-1.5 mb-1.5">
            <Target className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>What is tomorrow's focus?</span>
          </label>
          <input
            type="text"
            placeholder="e.g. Morning 30 min walk & Perspective drawing"
            value={tomorrowFocus}
            onChange={(e) => setTomorrowFocus(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--forge-surface-elevated)] border border-[var(--forge-border)] text-xs text-[var(--forge-text-primary)] focus:outline-none focus:border-[var(--forge-border-accent)] placeholder-[var(--forge-text-muted)]"
          />
        </div>

        <button
          type="submit"
          className="w-full py-3 rounded-2xl bg-[var(--forge-primary)] hover:opacity-95 text-[var(--forge-button-text,#000)] font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Complete Reflection</span>
        </button>
      </form>
    </div>
  );
};
