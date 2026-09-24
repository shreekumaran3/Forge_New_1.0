import React, { useState, useEffect } from 'react';
import { WorkoutTracker } from '../components/workout/WorkoutTracker';
import { ManualHealthTracker } from '../components/health/ManualHealthTracker';
import { HabitTracker } from '../components/habits/HabitTracker';
import { RoutineTracker } from '../components/routines/RoutineTracker';
import {
  Dumbbell,
  Heart,
  Flame,
  Activity,
} from 'lucide-react';
import { playUISound } from '../services/soundManager';

export const WorkoutScreen: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'training' | 'health' | 'habits' | 'routines'>('training');

  useEffect(() => {
    const handleSubTabEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ subTab?: 'training' | 'health' | 'habits' | 'routines' }>;
      if (customEvent.detail?.subTab) {
        setActiveSubTab(customEvent.detail.subTab);
      }
    };
    window.addEventListener('workout_set_subtab', handleSubTabEvent);
    return () => window.removeEventListener('workout_set_subtab', handleSubTabEvent);
  }, []);

  const tabs: { id: 'training' | 'health' | 'habits' | 'routines'; label: string; icon: React.ReactNode }[] = [
    { id: 'training', label: 'Training', icon: <Dumbbell className="w-3.5 h-3.5 shrink-0" /> },
    { id: 'health', label: 'Health', icon: <Heart className="w-3.5 h-3.5 shrink-0" /> },
    { id: 'habits', label: 'Habits', icon: <Flame className="w-3.5 h-3.5 shrink-0" /> },
    { id: 'routines', label: 'Routines', icon: <Activity className="w-3.5 h-3.5 shrink-0" /> },
  ];

  return (
    <div id="workout-screen" className="space-y-6 pb-24 touch-pan-y">
      {/* Top Section Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold text-[var(--forge-text-primary)] flex items-center gap-2.5 tracking-tight">
            <Dumbbell className="w-6 h-6 text-[var(--forge-text-accent)]" />
            WORKOUT & HEALTH
          </h1>
          <p className="text-xs text-[var(--forge-text-secondary)] mt-1">
            Physical conditioning, exercise logging, and vital health telemetry.
          </p>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5">
        {tabs.map((tab) => {
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              data-system-guide={`workout-tab-${tab.id}`}
              onClick={() => {
                playUISound('tap');
                setActiveSubTab(tab.id);
              }}
              className={`min-h-[44px] py-2 px-3 text-xs font-sans font-semibold rounded-2xl border transition-all cursor-pointer flex items-center justify-center gap-1.5 select-none ${
                isActive
                  ? 'bg-[var(--forge-primary)] text-[var(--forge-button-text)] border-[var(--forge-border-accent)] shadow-xs font-bold'
                  : 'bg-[var(--forge-surface)] border-[var(--forge-border)] text-[var(--forge-text-secondary)] hover:text-[var(--forge-text-primary)] hover:bg-[var(--forge-surface-interactive)] hover:border-[var(--forge-border-accent)]'
              }`}
            >
              {tab.icon}
              <span className="truncate">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Contents */}
      <div>
        {activeSubTab === 'training' && (
          <div data-system-guide="workout-training-content">
            <WorkoutTracker />
          </div>
        )}
        {activeSubTab === 'health' && (
          <div data-system-guide="workout-health-content" className="space-y-4">
            <ManualHealthTracker />
          </div>
        )}
        {activeSubTab === 'habits' && (
          <div data-system-guide="workout-habits-content">
            <HabitTracker />
          </div>
        )}
        {activeSubTab === 'routines' && (
          <div data-system-guide="workout-routines-content">
            <RoutineTracker />
          </div>
        )}
      </div>
    </div>
  );
};
