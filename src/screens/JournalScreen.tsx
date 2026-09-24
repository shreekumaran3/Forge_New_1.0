import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { JournalTracker } from '../components/journal/JournalTracker';
import { DailyReflectionCard } from '../components/reflection/DailyReflectionCard';
import { BookOpen, Sparkles } from 'lucide-react';
import { playUISound } from '../services/soundManager';

export const JournalScreen: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'journal' | 'reflection'>('journal');

  useEffect(() => {
    const handleSubTabEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ subTab?: 'journal' | 'reflection' }>;
      if (customEvent.detail?.subTab) {
        setActiveSubTab(customEvent.detail.subTab);
      }
    };
    window.addEventListener('journal_set_subtab', handleSubTabEvent);
    return () => window.removeEventListener('journal_set_subtab', handleSubTabEvent);
  }, []);

  return (
    <div id="journal-screen" className="space-y-6 pb-24 touch-pan-y">
      {/* Top Section Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold text-[var(--forge-text-primary)] flex items-center gap-2.5 tracking-tight">
            <BookOpen className="w-6 h-6 text-[var(--forge-text-accent)]" />
            JOURNAL & REFLECTION
          </h1>
          <p className="text-xs text-[var(--forge-text-secondary)] mt-1">
            Self-auditing, daily reflections, wins, lessons, and mindset calibration.
          </p>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="grid grid-cols-2 gap-2.5">
        <button
          type="button"
          data-system-guide="journal-tab-entries"
          onClick={() => {
            playUISound('tap');
            setActiveSubTab('journal');
          }}
          className={`min-h-[46px] py-2.5 px-4 text-xs font-sans font-semibold rounded-2xl border transition-all cursor-pointer flex items-center justify-center gap-2 select-none ${
            activeSubTab === 'journal'
              ? 'bg-[var(--forge-primary)] text-[var(--forge-button-text)] border-[var(--forge-border-accent)] shadow-xs font-bold'
              : 'bg-[var(--forge-surface)] border-[var(--forge-border)] text-[var(--forge-text-secondary)] hover:text-[var(--forge-text-primary)] hover:bg-[var(--forge-surface-interactive)] hover:border-[var(--forge-border-accent)]'
          }`}
        >
          <BookOpen className="w-4 h-4 shrink-0" />
          <span className="truncate">Journal Entries</span>
        </button>

        <button
          type="button"
          data-system-guide="journal-tab-reflection"
          onClick={() => {
            playUISound('tap');
            setActiveSubTab('reflection');
          }}
          className={`min-h-[46px] py-2.5 px-4 text-xs font-sans font-semibold rounded-2xl border transition-all cursor-pointer flex items-center justify-center gap-2 select-none ${
            activeSubTab === 'reflection'
              ? 'bg-[var(--forge-primary)] text-[var(--forge-button-text)] border-[var(--forge-border-accent)] shadow-xs font-bold'
              : 'bg-[var(--forge-surface)] border-[var(--forge-border)] text-[var(--forge-text-secondary)] hover:text-[var(--forge-text-primary)] hover:bg-[var(--forge-surface-interactive)] hover:border-[var(--forge-border-accent)]'
          }`}
        >
          <Sparkles className="w-4 h-4 shrink-0" />
          <span className="truncate">30-Second Reflection</span>
        </button>
      </div>

      {/* Tab Contents */}
      <div>
        {activeSubTab === 'journal' && (
          <div data-system-guide="journal-entries-content">
            <JournalTracker />
          </div>
        )}
        {activeSubTab === 'reflection' && (
          <div data-system-guide="journal-reflection-content" className="space-y-4 max-w-xl mx-auto">
            <DailyReflectionCard />
          </div>
        )}
      </div>
    </div>
  );
};
