import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import {
  Footprints,
  Moon,
  Droplet,
  Scale,
  Smile,
  Zap,
  Check,
  Heart,
} from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { getTodayHealthLog, saveManualHealthLog, getAllHealthLogs } from '../../services/healthService';
import { HealthLog } from '../../types';

function formatLogDate(dateStr: string): { monthDay: string; weekdayOrToday: string } {
  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) {
    return { monthDay: dateStr, weekdayOrToday: '' };
  }
  const [year, month, day] = parts;
  const dateObj = new Date(year, month - 1, day);

  const today = new Date();
  const isToday =
    today.getFullYear() === year &&
    today.getMonth() === month - 1 &&
    today.getDate() === day;

  const monthDay = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const weekdayOrToday = isToday
    ? 'Today'
    : dateObj.toLocaleDateString('en-US', { weekday: 'short' });

  return { monthDay, weekdayOrToday };
}

function formatSteps(steps?: number): string {
  if (steps === undefined || isNaN(steps)) return '—';
  return steps.toLocaleString('en-US');
}

function formatSleep(sleepHours?: number): string {
  if (sleepHours === undefined || isNaN(sleepHours)) return '—';
  return `${sleepHours} hrs`;
}

function formatWater(waterMl?: number): string {
  if (waterMl === undefined || isNaN(waterMl)) return '—';
  if (waterMl >= 100) {
    const liters = waterMl / 1000;
    return `${Number(liters.toFixed(1))} L`;
  }
  return `${waterMl} L`;
}

function formatWeight(weightKg?: number): string {
  if (weightKg === undefined || isNaN(weightKg)) return '—';
  return `${weightKg} kg`;
}

function formatCapitalized(val?: string): string {
  if (!val) return '—';
  return val.charAt(0).toUpperCase() + val.slice(1).toLowerCase();
}

export const ManualHealthTracker: React.FC = () => {
  const { updatePlayer, player } = useGame();

  const [steps, setSteps] = useState<string>('');
  const [sleep, setSleep] = useState<string>('');
  const [waterMl, setWaterMl] = useState<string>('');
  const [weightKg, setWeightKg] = useState<string>('');
  const [mood, setMood] = useState<string>('');
  const [energy, setEnergy] = useState<string>('');
  const [isSaved, setIsSaved] = useState(false);
  const [historyLogs, setHistoryLogs] = useState<HealthLog[]>([]);

  const loadHistoryLogs = async () => {
    const logs = await getAllHealthLogs();
    setHistoryLogs(logs);
  };

  useEffect(() => {
    async function loadData() {
      const log = await getTodayHealthLog();
      if (log.stepCount !== undefined) setSteps(String(log.stepCount));
      if (log.sleepHours !== undefined) setSleep(String(log.sleepHours));
      if (log.waterMl !== undefined) setWaterMl(String(log.waterMl));
      if (log.weightKg !== undefined) setWeightKg(String(log.weightKg));
      if (log.mood) setMood(log.mood);
      if (log.energy) setEnergy(log.energy);
      if (!log.weightKg && player?.weightKg) {
        setWeightKg(String(player.weightKg));
      }
      await loadHistoryLogs();
    }
    loadData();
  }, [player]);

  const handleSaveHealthLogs = async () => {
    const numSteps = steps !== '' ? parseInt(steps, 10) : undefined;
    const numSleep = sleep !== '' ? parseFloat(sleep) : undefined;
    const numWater = waterMl !== '' ? parseInt(waterMl, 10) : undefined;
    const numWeight = weightKg !== '' ? parseFloat(weightKg) : undefined;

    await saveManualHealthLog({
      stepCount: numSteps,
      sleepHours: numSleep,
      waterMl: numWater,
      weightKg: numWeight,
      mood: mood || undefined,
      energy: energy || undefined,
    });

    if (numWeight && numWeight > 0) {
      await updatePlayer({ weightKg: numWeight });
    }

    await loadHistoryLogs();

    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <div className="space-y-6">
      <Card data-system-guide="manual-health-tracker" className="space-y-4 border border-[var(--forge-border)] bg-[var(--forge-surface)] rounded-2xl p-4 sm:p-5">
        <div className="flex items-center justify-between border-b border-[var(--forge-border)] pb-3">
          <div className="flex items-center gap-2">
            <Heart className="w-4 h-4 text-[var(--forge-text-accent)]" />
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--forge-text-primary)]">
              Manual Health Tracker
            </h3>
          </div>
          <span className="text-[10px] font-mono text-[var(--forge-text-accent)] bg-[var(--forge-primary)]/10 px-2.5 py-0.5 rounded-full border border-[var(--forge-border-accent)]">
            Self-Reported Metrics
          </span>
        </div>

        <p className="text-xs text-[var(--forge-text-secondary)]">
          Record your daily metrics manually. Every field begins empty until you enter your progress.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {/* Steps */}
          <div className="bg-[var(--forge-surface-interactive)] p-3 rounded-xl border border-[var(--forge-border)] space-y-1">
            <label className="text-[10px] uppercase font-bold text-[var(--forge-text-secondary)] flex items-center gap-1.5">
              <Footprints className="w-3.5 h-3.5 text-amber-400" />
              Steps
            </label>
            <input
              type="number"
              value={steps}
              onChange={(e) => setSteps(e.target.value)}
              className="w-full bg-[var(--forge-surface)] border border-[var(--forge-border)] focus:border-[var(--forge-border-accent)] rounded-xl px-2.5 py-1.5 text-xs text-[var(--forge-text-primary)] outline-none font-mono"
              placeholder="Enter steps..."
            />
          </div>

          {/* Sleep */}
          <div className="bg-[var(--forge-surface-interactive)] p-3 rounded-xl border border-[var(--forge-border)] space-y-1">
            <label className="text-[10px] uppercase font-bold text-[var(--forge-text-secondary)] flex items-center gap-1.5">
              <Moon className="w-3.5 h-3.5 text-indigo-400" />
              Sleep (Hours)
            </label>
            <input
              type="number"
              step="0.5"
              value={sleep}
              onChange={(e) => setSleep(e.target.value)}
              className="w-full bg-[var(--forge-surface)] border border-[var(--forge-border)] focus:border-[var(--forge-border-accent)] rounded-xl px-2.5 py-1.5 text-xs text-[var(--forge-text-primary)] outline-none font-mono"
              placeholder="Enter sleep..."
            />
          </div>

          {/* Water */}
          <div className="bg-[var(--forge-surface-interactive)] p-3 rounded-xl border border-[var(--forge-border)] space-y-1">
            <label className="text-[10px] uppercase font-bold text-[var(--forge-text-secondary)] flex items-center gap-1.5">
              <Droplet className="w-3.5 h-3.5 text-sky-400" />
              Water (ml)
            </label>
            <input
              type="number"
              step="100"
              value={waterMl}
              onChange={(e) => setWaterMl(e.target.value)}
              className="w-full bg-[var(--forge-surface)] border border-[var(--forge-border)] focus:border-[var(--forge-border-accent)] rounded-xl px-2.5 py-1.5 text-xs text-[var(--forge-text-primary)] outline-none font-mono"
              placeholder="Enter water..."
            />
          </div>

          {/* Weight */}
          <div className="bg-[var(--forge-surface-interactive)] p-3 rounded-xl border border-[var(--forge-border)] space-y-1">
            <label className="text-[10px] uppercase font-bold text-[var(--forge-text-secondary)] flex items-center gap-1.5">
              <Scale className="w-3.5 h-3.5 text-purple-400" />
              Weight (kg)
            </label>
            <input
              type="number"
              step="0.1"
              value={weightKg}
              onChange={(e) => setWeightKg(e.target.value)}
              className="w-full bg-[var(--forge-surface)] border border-[var(--forge-border)] focus:border-[var(--forge-border-accent)] rounded-xl px-2.5 py-1.5 text-xs text-[var(--forge-text-primary)] outline-none font-mono"
              placeholder="Enter weight..."
            />
          </div>

          {/* Mood */}
          <div className="bg-[var(--forge-surface-interactive)] p-3 rounded-xl border border-[var(--forge-border)] space-y-1">
            <label className="text-[10px] uppercase font-bold text-[var(--forge-text-secondary)] flex items-center gap-1.5">
              <Smile className="w-3.5 h-3.5 text-emerald-400" />
              Mood
            </label>
            <select
              value={mood}
              onChange={(e) => setMood(e.target.value)}
              className="w-full bg-[var(--forge-surface)] border border-[var(--forge-border)] focus:border-[var(--forge-border-accent)] rounded-xl px-2 py-1.5 text-xs text-[var(--forge-text-primary)] outline-none font-mono"
            >
              <option value="">Select mood...</option>
              <option value="low">Low</option>
              <option value="neutral">Neutral</option>
              <option value="good">Good</option>
              <option value="peak">Peak</option>
            </select>
          </div>

          {/* Energy */}
          <div className="bg-[var(--forge-surface-interactive)] p-3 rounded-xl border border-[var(--forge-border)] space-y-1">
            <label className="text-[10px] uppercase font-bold text-[var(--forge-text-secondary)] flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              Energy
            </label>
            <select
              value={energy}
              onChange={(e) => setEnergy(e.target.value)}
              className="w-full bg-[var(--forge-surface)] border border-[var(--forge-border)] focus:border-[var(--forge-border-accent)] rounded-xl px-2 py-1.5 text-xs text-[var(--forge-text-primary)] outline-none font-mono"
            >
              <option value="">Select energy...</option>
              <option value="low">Low</option>
              <option value="moderate">Moderate</option>
              <option value="high">High</option>
              <option value="peak">Peak</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={handleSaveHealthLogs}
            className="min-h-[44px] px-5 py-2 bg-[var(--forge-primary)] text-[var(--forge-button-text,#000)] font-sans font-bold text-xs rounded-2xl border border-[var(--forge-border-accent)] shadow-xs hover:brightness-105 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            {isSaved ? <Check className="w-3.5 h-3.5" /> : null}
            <span>{isSaved ? 'Saved Log' : 'Save Health Log'}</span>
          </button>
        </div>
      </Card>

      {/* RECENT LOGS - Vertical Timeline */}
      <div className="space-y-3 pt-1">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[var(--forge-text-accent,#D4AF37)]" />
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--forge-text-primary)]">
              Recent Logs
            </h3>
          </div>
          {historyLogs.length > 0 && (
            <span className="text-[10px] font-mono text-[var(--forge-text-secondary)]">
              {historyLogs.length} {historyLogs.length === 1 ? 'entry' : 'entries'}
            </span>
          )}
        </div>

        {historyLogs.length === 0 ? (
          <div className="p-6 text-center space-y-1.5 bg-[var(--forge-surface)] border border-[var(--forge-border)] rounded-2xl">
            <Heart className="w-6 h-6 text-[var(--forge-text-muted)] mx-auto opacity-40 mb-1" />
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--forge-text-primary)]">
              No Previous Logs
            </h4>
            <p className="text-xs text-[var(--forge-text-secondary)] max-w-xs mx-auto">
              Record your first health log to start tracking your history.
            </p>
          </div>
        ) : (
          <div className="relative pl-6 sm:pl-7 space-y-3.5 ml-1 sm:ml-2">
            {/* Subtle vertical timeline connector line */}
            <div
              className="absolute left-[7px] sm:left-[9px] top-4 bottom-4 w-[2px] bg-[var(--forge-border)]"
              aria-hidden="true"
            />

            {historyLogs.map((log) => {
              const { monthDay, weekdayOrToday } = formatLogDate(log.date);

              return (
                <div key={log.id || log.date} className="relative">
                  {/* Timeline Dot (●) centered on the 2px line */}
                  <div
                    className="absolute -left-[21px] sm:-left-[23px] top-4 w-2.5 h-2.5 rounded-full bg-[var(--forge-surface)] border-2 border-[var(--forge-border-accent,#D4AF37)] shadow-xs z-10"
                    aria-hidden="true"
                  />

                  {/* Horizontal History Card (Display-only) */}
                  <div className="bg-[var(--forge-surface)] border border-[var(--forge-border)] rounded-2xl p-3 sm:p-4 flex items-start gap-3 sm:gap-4 shadow-xs">
                    {/* Left Side: Date Column */}
                    <div className="shrink-0 w-14 sm:w-18 border-r border-[var(--forge-border)] pr-2 sm:pr-3 pt-0.5 text-left">
                      <div className="text-xs sm:text-sm font-bold font-mono text-[var(--forge-text-primary)] leading-tight">
                        {monthDay}
                      </div>
                      <div className="text-[10px] sm:text-xs font-mono font-medium text-[var(--forge-text-accent,#D4AF37)] mt-0.5">
                        {weekdayOrToday}
                      </div>
                    </div>

                    {/* Main Content: Saved Metrics */}
                    <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 gap-x-2.5 sm:gap-x-4 gap-y-2 text-xs">
                      {/* Steps */}
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Footprints className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <div className="min-w-0 truncate">
                          <div className="text-[10px] font-mono text-[var(--forge-text-secondary)] uppercase tracking-wide truncate">
                            Steps
                          </div>
                          <div className="font-mono font-bold text-[var(--forge-text-primary)] truncate text-xs">
                            {formatSteps(log.stepCount)}
                          </div>
                        </div>
                      </div>

                      {/* Sleep */}
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Moon className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                        <div className="min-w-0 truncate">
                          <div className="text-[10px] font-mono text-[var(--forge-text-secondary)] uppercase tracking-wide truncate">
                            Sleep
                          </div>
                          <div className="font-mono font-bold text-[var(--forge-text-primary)] truncate text-xs">
                            {formatSleep(log.sleepHours)}
                          </div>
                        </div>
                      </div>

                      {/* Water */}
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Droplet className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                        <div className="min-w-0 truncate">
                          <div className="text-[10px] font-mono text-[var(--forge-text-secondary)] uppercase tracking-wide truncate">
                            Water
                          </div>
                          <div className="font-mono font-bold text-[var(--forge-text-primary)] truncate text-xs">
                            {formatWater(log.waterMl)}
                          </div>
                        </div>
                      </div>

                      {/* Body Weight */}
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Scale className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                        <div className="min-w-0 truncate">
                          <div className="text-[10px] font-mono text-[var(--forge-text-secondary)] uppercase tracking-wide truncate">
                            Body Weight
                          </div>
                          <div className="font-mono font-bold text-[var(--forge-text-primary)] truncate text-xs">
                            {formatWeight(log.weightKg)}
                          </div>
                        </div>
                      </div>

                      {/* Energy */}
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <div className="min-w-0 truncate">
                          <div className="text-[10px] font-mono text-[var(--forge-text-secondary)] uppercase tracking-wide truncate">
                            Energy
                          </div>
                          <div className="font-mono font-bold text-[var(--forge-text-primary)] truncate text-xs capitalize">
                            {formatCapitalized(log.energy)}
                          </div>
                        </div>
                      </div>

                      {/* Mood */}
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Smile className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <div className="min-w-0 truncate">
                          <div className="text-[10px] font-mono text-[var(--forge-text-secondary)] uppercase tracking-wide truncate">
                            Mood
                          </div>
                          <div className="font-mono font-bold text-[var(--forge-text-primary)] truncate text-xs capitalize">
                            {formatCapitalized(log.mood)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

