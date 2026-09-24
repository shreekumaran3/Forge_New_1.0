import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import {
  ShieldCheck,
  Check,
  Award,
  Zap,
  Flame,
  ShieldAlert,
  RotateCcw,
  AlertTriangle,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { useTheme } from '../../theme/ThemeContext';
import {
  getRetentionData,
  confirmRetentionDate,
  recordRelapse,
  undoRelapse,
  getPendingBackfillDates,
  formatDateKey,
  parseDateKey,
  RetentionData,
  RETENTION_MILESTONES,
  RETENTION_CONFIRM_XP,
  RETENTION_LATE_CONFIRM_XP,
  getRetentionXpAmount,
} from '../../services/retentionService';
import { db } from '../../db/database';
import { playUISound } from '../../services/soundManager';
import {
  cancelRetentionReminder,
  reconcileNotifications,
} from '../../services/notificationManager';

export const RetentionCard: React.FC = () => {
  const { grantXpToPlayerAndStats } = useGame();
  const { currentMode } = useTheme();
  const isLight = currentMode === 'light';

  const [data, setData] = useState<RetentionData | null>(null);
  const [selectedUnconfirmedDate, setSelectedUnconfirmedDate] = useState<string | null>(null);
  const [pendingRelapseDate, setPendingRelapseDate] = useState<string | null>(null);
  const [undoDate, setUndoDate] = useState<string | null>(null);
  const [undoTimer, setUndoTimer] = useState<number>(0);

  // Stateful viewed month (defaults to current month)
  const [viewedMonth, setViewedMonth] = useState(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), 1);
  });

  const todayStr = formatDateKey(new Date());

  const loadData = async () => {
    const res = await getRetentionData();
    setData(res);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Undo countdown timer
  useEffect(() => {
    if (undoTimer <= 0) {
      setUndoDate(null);
      return;
    }
    const interval = setInterval(() => {
      setUndoTimer((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [undoTimer]);

  if (!data) return null;

  const isConfirmedToday = (data.confirmedDates || []).includes(todayStr);

  // Handle confirming a specific date (Today or Backfill date)
  const handleConfirmDate = async (dateStr: string) => {
    if (!data) return;

    // Close any active interactive prompt
    setSelectedUnconfirmedDate(null);
    setPendingRelapseDate(null);

    const { updatedData, xpToAward, newMilestones } = await confirmRetentionDate(dateStr, data);
    setData(updatedData);

    // Audio Feedback based on action type
    if (newMilestones && newMilestones.length > 0) {
      playUISound('achievement');
    } else if (dateStr === todayStr) {
      playUISound('retentionConfirm');
    } else {
      playUISound('retentionLate');
    }

    // If new milestones were achieved, log to chronicle
    for (const milestone of newMilestones) {
      await db.chronicle.add({
        title: `Retention Milestone: ${milestone.title}`,
        subtitle: milestone.description,
        category: 'milestone',
        date: dateStr,
        icon: 'ShieldCheck',
        xpReward: 0,
        details: `Mastered ${milestone.days} consecutive days of self-control. Chronicle achievement permanently unlocked.`,
      });
    }

    // Award XP if legitimate new confirmation (idempotent)
    if (xpToAward > 0) {
      await grantXpToPlayerAndStats({
        generalXp: xpToAward,
        title: dateStr === todayStr ? 'Daily Retention Check-in' : `Retention Check-in (${dateStr})`,
        category: 'Discipline',
      });
    }

    if (dateStr === todayStr) {
      await cancelRetentionReminder();
    }
    reconcileNotifications().catch(() => {});
  };

  // Handle Executing a Relapse for a specific date
  const handleExecuteRelapse = async (dateStr: string) => {
    if (!data) return;
    setPendingRelapseDate(null);
    setSelectedUnconfirmedDate(null);

    const updatedData = await recordRelapse(dateStr, data);
    setData(updatedData);
    playUISound('relapse');

    if (dateStr === todayStr) {
      await cancelRetentionReminder();
    }
    reconcileNotifications().catch(() => {});

    // 5-second undo option
    setUndoDate(dateStr);
    setUndoTimer(5);

    await db.chronicle.add({
      title: 'Retention Relapse Recorded',
      subtitle: 'Discipline reset. Rekindling the Forge today.',
      category: 'record',
      date: dateStr,
      icon: 'ShieldAlert',
      details: `Retention streak reset to 0 following recorded relapse on ${dateStr}.`,
    });
  };

  // Handle Undo Relapse
  const handleUndo = async () => {
    if (!data || !undoDate) return;
    const updatedData = await undoRelapse(undoDate, data);
    setData(updatedData);
    playUISound('confirm');
    setUndoDate(null);
    setUndoTimer(0);
    reconcileNotifications().catch(() => {});
  };

  // Find next milestone
  const nextMilestone =
    RETENTION_MILESTONES.find((m) => m.days > data.currentStreak) ||
    RETENTION_MILESTONES[RETENTION_MILESTONES.length - 1];
  const progressPercent = Math.min(100, Math.round((data.currentStreak / nextMilestone.days) * 100));

  // Month navigation calculations
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const isCurrentMonth =
    viewedMonth.getFullYear() === currentYear &&
    viewedMonth.getMonth() === currentMonth;

  const handlePrevMonth = () => {
    setViewedMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    if (isCurrentMonth) return;
    setViewedMonth((prev) => {
      const next = new Date(prev.getFullYear(), prev.getMonth() + 1, 1);
      if (
        next.getFullYear() > currentYear ||
        (next.getFullYear() === currentYear && next.getMonth() > currentMonth)
      ) {
        return new Date(currentYear, currentMonth, 1);
      }
      return next;
    });
  };

  // Generate Calendar Grid for viewed month
  const year = viewedMonth.getFullYear();
  const month = viewedMonth.getMonth();
  const monthName = viewedMonth.toLocaleString('default', { month: 'long' });

  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 = Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const mondayFirstDay = (firstDayOfMonth + 6) % 7;

  const confirmedSet = new Set(data.confirmedDates || []);
  const relapseSet = new Set(data.relapseDates || []);

  // Hard 7-day backfill boundary (today - 7 previous calendar days)
  const backfillCutoff = new Date();
  backfillCutoff.setHours(0, 0, 0, 0);
  backfillCutoff.setDate(backfillCutoff.getDate() - 7);
  const backfillCutoffStr = formatDateKey(backfillCutoff);

  const calendarDays = [];
  for (let i = 0; i < mondayFirstDay; i++) {
    calendarDays.push(null);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const isPast = dayStr < todayStr;
    const isToday = dayStr === todayStr;
    const isFuture = dayStr > todayStr;
    const isConfirmed = confirmedSet.has(dayStr);
    const isRelapse = relapseSet.has(dayStr);

    // Bounded reviewable past date: strictly within the 7 previous calendar days
    const isReviewablePastDate = isPast && dayStr >= backfillCutoffStr && !isConfirmed && !isRelapse;
    // Historical unconfirmed date older than 7 days: read-only, non-interactive
    const isHistoricalOutsideWindow = isPast && dayStr < backfillCutoffStr && !isConfirmed && !isRelapse;
    // An unconfirmed date is interactive ONLY if it is within the 7-day backfill window or is today
    const isUnconfirmed = isReviewablePastDate || (isToday && !isConfirmed && !isRelapse);

    calendarDays.push({
      dayNumber: d,
      dateStr: dayStr,
      isConfirmed,
      isRelapse,
      isUnconfirmed,
      isReviewablePastDate,
      isHistoricalOutsideWindow,
      isToday,
      isPast,
      isFuture,
    });
  }

  const formatDisplayDate = (dateStr: string) => {
    try {
      const d = parseDateKey(dateStr);
      return d.toLocaleDateString('default', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  // Authoritative maximum missed reviewable window is exactly 7 previous calendar days
  const pendingMissedDays = getPendingBackfillDates(data, 7);

  return (
    <Card id="retention-journey-card" className="space-y-4 border border-[var(--forge-border-accent,rgba(212,175,55,0.3))] bg-[var(--forge-surface,#080808)] relative overflow-hidden text-left">
      {/* 1. Retention Header (Sole title - Today confirmation action moved to card bottom) */}
      <div className="flex items-center justify-between gap-3 border-b border-[var(--forge-border,#1C1C1C)] pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-[var(--forge-primary-muted,rgba(212,175,55,0.1))] border border-[var(--forge-border-accent,rgba(212,175,55,0.3))] rounded-md text-[var(--forge-text-accent,#D4AF37)]">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-serif text-sm font-bold text-[var(--forge-text-primary,#E4E3E0)] tracking-wide">
              Retention Journey
            </h3>
            <p className="text-[10px] text-[var(--forge-text-secondary,#8E9299)]">
              Daily discipline & streak progression
            </p>
          </div>
        </div>
      </div>

      {/* 2. Streak Statistics & Next Milestone */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Current Streak */}
        <div className="p-3 bg-[var(--forge-bg-elevated,#050505)] border border-[var(--forge-border,#1A1A1A)] rounded-xl flex items-center gap-3">
          <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-400">
            <Flame className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[9px] uppercase font-bold tracking-wider text-[var(--forge-text-secondary,#8E9299)] block">
              Current Streak
            </span>
            <span className="font-mono text-xl font-bold text-[var(--forge-text-accent,#D4AF37)]">
              {data.currentStreak} Days
            </span>
          </div>
        </div>

        {/* Longest Streak */}
        <div className="p-3 bg-[var(--forge-bg-elevated,#050505)] border border-[var(--forge-border,#1A1A1A)] rounded-xl flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400">
            <Award className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[9px] uppercase font-bold tracking-wider text-[var(--forge-text-secondary,#8E9299)] block">
              Longest Streak
            </span>
            <span className="font-mono text-xl font-bold text-[var(--forge-text-primary,#E4E3E0)]">
              {data.longestStreak} Days
            </span>
          </div>
        </div>

        {/* Next Milestone Progress */}
        <div className="p-3 bg-[var(--forge-bg-elevated,#050505)] border border-[var(--forge-border,#1A1A1A)] rounded-xl space-y-1.5">
          <div className="flex items-center justify-between text-[10px]">
            <span className="uppercase font-bold tracking-wider text-[var(--forge-text-secondary,#8E9299)]">
              Next: {nextMilestone.days} Days
            </span>
            <span className="font-mono text-[var(--forge-text-accent,#D4AF37)] font-bold">
              {data.currentStreak}/{nextMilestone.days} Days
            </span>
          </div>
          <div className="w-full bg-[var(--forge-border,#1A1A1A)] h-2 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-amber-500 to-[var(--forge-primary,#D4AF37)] h-full rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="text-[9px] text-[var(--forge-text-accent,#D4AF37)] block text-right font-mono">
            Achievement: {nextMilestone.title}
          </span>
        </div>
      </div>

      {/* 3. Monthly Calendar View (Direct In-Calendar Check-ins & Navigation) */}
      <div className="space-y-2 pt-1 border-t border-[var(--forge-border,#181818)]">
        <div className="flex items-center justify-between gap-2 py-1">
          <div className="flex items-center gap-1 sm:gap-1.5">
            <button
              type="button"
              onClick={handlePrevMonth}
              aria-label="Previous month"
              className="p-1 rounded-md text-[var(--forge-text-secondary)] hover:text-[var(--forge-text-primary)] hover:bg-[var(--forge-surface-subtle)] border border-[var(--forge-border)] transition-colors cursor-pointer flex items-center justify-center w-7 h-7"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-serif font-bold text-xs sm:text-sm uppercase tracking-wider text-[var(--forge-text-primary)] min-w-[120px] text-center">
              {monthName} {year}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              disabled={isCurrentMonth}
              aria-label="Next month"
              className={`p-1 rounded-md border transition-colors flex items-center justify-center w-7 h-7 ${
                isCurrentMonth
                  ? 'border-transparent text-[var(--forge-text-muted)] opacity-30 cursor-not-allowed'
                  : 'text-[var(--forge-text-secondary)] hover:text-[var(--forge-text-primary)] hover:bg-[var(--forge-surface-subtle)] border-[var(--forge-border)] cursor-pointer'
              }`}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <span className="text-[10px] font-mono text-[var(--forge-text-secondary)] shrink-0">
            Confirmed: <strong className="text-emerald-400">{data.totalConfirmedDays}d</strong>
          </span>
        </div>

        {/* Day Headers */}
        <div className="grid grid-cols-7 gap-1 text-center text-[10px] uppercase font-mono font-bold text-[var(--forge-text-secondary,#8E9299)]">
          <div>Mo</div>
          <div>Tu</div>
          <div>We</div>
          <div>Th</div>
          <div>Fr</div>
          <div>Sa</div>
          <div>Su</div>
        </div>

        {/* Grid Cells */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((cell, idx) => {
            if (!cell) {
              return <div key={`empty-${idx}`} className="h-9 rounded bg-transparent" />;
            }

            const isSelected = selectedUnconfirmedDate === cell.dateStr;

            return (
              <button
                key={cell.dateStr}
                type="button"
                onClick={() => {
                  if (cell.isUnconfirmed) {
                    setSelectedUnconfirmedDate(cell.dateStr);
                  }
                }}
                disabled={cell.isFuture || cell.isConfirmed || cell.isRelapse || cell.isHistoricalOutsideWindow}
                className={`h-9 rounded flex items-center justify-center text-xs font-mono font-semibold relative transition-all ${
                  cell.isConfirmed
                    ? isLight
                      ? 'bg-emerald-700/10 border border-emerald-700/30 text-emerald-800 cursor-default'
                      : 'bg-emerald-950/40 border border-emerald-500/50 text-emerald-300 shadow-[0_0_6px_rgba(16,185,129,0.12)] cursor-default'
                    : cell.isRelapse
                    ? isLight
                      ? 'bg-rose-700/10 border border-rose-700/30 text-rose-800 cursor-default'
                      : 'bg-rose-950/50 border border-rose-500/50 text-rose-300 cursor-default'
                    : cell.isUnconfirmed
                    ? isSelected
                      ? isLight
                        ? 'bg-amber-500/25 border-2 border-amber-600 text-amber-900 shadow-xs cursor-pointer'
                        : 'bg-amber-500/20 border-2 border-amber-400 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.3)] cursor-pointer'
                      : isLight
                      ? 'bg-amber-600/15 border border-amber-600/40 text-amber-900 animate-pulse hover:bg-amber-600/25 cursor-pointer shadow-xs'
                      : 'bg-amber-950/40 border border-amber-500/60 text-amber-300 animate-pulse hover:bg-amber-900/50 cursor-pointer shadow-[0_0_8px_rgba(245,158,11,0.15)]'
                    : cell.isHistoricalOutsideWindow
                    ? 'bg-[var(--forge-surface-subtle)] border border-[var(--forge-border)] text-[var(--forge-text-muted)] cursor-not-allowed opacity-40'
                    : cell.isFuture
                    ? 'bg-[var(--forge-surface-subtle)] border border-[var(--forge-border)] text-[var(--forge-text-muted)] cursor-not-allowed opacity-40'
                    : 'bg-[var(--forge-surface-subtle)] border border-[var(--forge-border)] text-[var(--forge-text-muted)]'
                }`}
              >
                <span>{cell.dayNumber}</span>
                {cell.isConfirmed && (
                  <Check className={`w-3 h-3 absolute bottom-0.5 right-0.5 stroke-[2.5] ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`} />
                )}
                {cell.isRelapse && (
                  <ShieldAlert className={`w-2.5 h-2.5 absolute bottom-0.5 right-0.5 ${isLight ? 'text-rose-700' : 'text-rose-400'}`} />
                )}
                {cell.isUnconfirmed && (
                  <span className={`w-1.5 h-1.5 rounded-full absolute top-1 right-1 ${isLight ? 'bg-amber-600' : 'bg-amber-400'}`} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Past Retention Review Section (Positioned Under Calendar, Before Today Button) */}
      {(selectedUnconfirmedDate || pendingRelapseDate || (pendingMissedDays.length > 0) || (undoDate && undoTimer > 0)) && (
        <div className="space-y-3 pt-3 border-t border-[var(--forge-border,#181818)]">
          {/* A. Pending Missed Days Notice & Large Centered Review Action */}
          {pendingMissedDays.length > 0 && !selectedUnconfirmedDate && !pendingRelapseDate && (
            <div className="space-y-2">
              <div className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                isLight
                  ? 'bg-amber-50/80 border-amber-300 text-amber-950'
                  : 'bg-amber-950/30 border-amber-500/40 text-amber-300'
              }`}>
                <div className="flex items-center gap-2">
                  <Flame className={`w-4 h-4 shrink-0 animate-pulse ${isLight ? 'text-amber-600' : 'text-amber-400'}`} />
                  <span>
                    <strong>{pendingMissedDays.length} unconfirmed past day{pendingMissedDays.length > 1 ? 's' : ''}</strong>
                  </span>
                </div>
              </div>

              <button
                type="button"
                id="retention-review-btn"
                onClick={() => setSelectedUnconfirmedDate(pendingMissedDays[0])}
                className="w-full min-h-[48px] py-3.5 px-4 rounded-xl font-bold font-mono text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md bg-[var(--forge-button-bg,#D4AF37)] text-[var(--forge-button-text,#050505)] hover:brightness-110 active:scale-[0.99]"
              >
                <Flame className="w-4 h-4 fill-current" />
                <span>REVIEW RETENTION • {formatDisplayDate(pendingMissedDays[0])}</span>
              </button>
            </div>
          )}

          {/* B. Selected Past Date Review Popover */}
          {selectedUnconfirmedDate && !pendingRelapseDate && (
            <div className="bg-[var(--forge-surface)] border border-[var(--forge-border-accent)] p-4 rounded-xl space-y-3 shadow-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[var(--forge-text-accent)] font-serif font-bold text-xs uppercase tracking-wider">
                  <Flame className="w-4 h-4 text-[var(--forge-text-accent)]" />
                  <span>{selectedUnconfirmedDate === todayStr ? 'Check-in Today' : 'Review Past Date'} • {formatDisplayDate(selectedUnconfirmedDate)}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedUnconfirmedDate(null)}
                  className="p-1 text-[var(--forge-text-secondary)] hover:text-[var(--forge-text-primary)] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-[var(--forge-text-primary)] leading-relaxed">
                Did you maintain your retention goal on <strong>{formatDisplayDate(selectedUnconfirmedDate)}</strong>?
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleConfirmDate(selectedUnconfirmedDate)}
                  className="px-3 py-2.5 min-h-[44px] bg-[var(--forge-button-bg,#D4AF37)] hover:brightness-110 text-[var(--forge-button-text,#050505)] font-bold font-mono text-xs rounded-lg flex items-center justify-center gap-1.5 shadow-[0_0_10px_rgba(212,175,55,0.25)] cursor-pointer"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>
                    I MAINTAINED DISCIPLINE (+{getRetentionXpAmount(selectedUnconfirmedDate)} XP)
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setPendingRelapseDate(selectedUnconfirmedDate)}
                  className={`px-3 py-2.5 min-h-[44px] font-bold font-mono text-xs rounded-lg flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                    isLight
                      ? 'bg-rose-100 hover:bg-rose-200 border border-rose-300 text-rose-800'
                      : 'bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/60 text-rose-300'
                  }`}
                >
                  <ShieldAlert className="w-4 h-4" />
                  <span>I RELAPSED ON THIS DAY</span>
                </button>
              </div>
            </div>
          )}

          {/* C. Relapse Confirmation Dialog */}
          {pendingRelapseDate && (
            <div className={`border p-4 rounded-xl space-y-3 ${
              isLight
                ? 'bg-rose-50 border-rose-300 text-rose-950'
                : 'bg-rose-950/95 border-rose-500 text-rose-100'
            }`}>
              <div className="flex items-center justify-between">
                <div className={`flex items-center gap-2 font-bold text-sm ${isLight ? 'text-rose-800' : 'text-rose-300'}`}>
                  <ShieldAlert className={`w-5 h-5 ${isLight ? 'text-rose-700' : 'text-rose-400'}`} />
                  <span>Record Relapse for {formatDisplayDate(pendingRelapseDate)}?</span>
                </div>
                <button
                  type="button"
                  onClick={() => setPendingRelapseDate(null)}
                  className={`p-1 cursor-pointer ${isLight ? 'text-rose-700 hover:text-rose-900' : 'text-rose-400 hover:text-white'}`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className={`text-xs leading-relaxed ${isLight ? 'text-rose-900/90' : 'text-rose-200/90'}`}>
                Record relapse? This will set a relapse boundary on {formatDisplayDate(pendingRelapseDate)} and recalculate your current streak. All your historical confirmed days remain permanently saved in your record.
              </p>
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setPendingRelapseDate(null)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                    isLight
                      ? 'bg-stone-200 text-stone-800 hover:bg-stone-300'
                      : 'bg-black/60 text-white/80 hover:bg-black/80'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleExecuteRelapse(pendingRelapseDate)}
                  className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg text-xs tracking-wider cursor-pointer"
                >
                  Record Relapse
                </button>
              </div>
            </div>
          )}

          {/* D. Undo Relapse Banner */}
          {undoDate && undoTimer > 0 && (
            <div className={`border p-3 rounded-lg flex items-center justify-between text-xs animate-pulse ${
              isLight
                ? 'bg-amber-50 border-amber-400 text-amber-950'
                : 'bg-amber-950/80 border-amber-500 text-amber-200'
            }`}>
              <div className="flex items-center gap-2">
                <AlertTriangle className={`w-4 h-4 ${isLight ? 'text-amber-600' : 'text-amber-400'}`} />
                <span>Relapse recorded for {formatDisplayDate(undoDate)}. ({undoTimer}s to undo)</span>
              </div>
              <button
                type="button"
                onClick={handleUndo}
                className={`px-2.5 py-1 font-bold rounded flex items-center gap-1 cursor-pointer ${
                  isLight
                    ? 'bg-amber-600 text-white hover:bg-amber-700'
                    : 'bg-amber-500 text-black hover:bg-amber-400'
                }`}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>UNDO</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* 5. Authoritative Today Action (Moved to bottom of card, large, full-width, centered) */}
      <div className="pt-2 border-t border-[var(--forge-border,#181818)]">
        {isConfirmedToday ? (
          <div
            id="retention-today-confirmed-badge"
            className={`w-full min-h-[48px] py-3.5 px-4 rounded-xl font-bold font-mono text-xs uppercase tracking-wider flex items-center justify-center gap-2 border select-none ${
              isLight
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                : 'bg-emerald-950/30 border-emerald-500/40 text-emerald-400'
            }`}
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>✓ RETENTION CONFIRMED TODAY</span>
          </div>
        ) : (
          <button
            type="button"
            id="retention-today-confirm-btn"
            onClick={() => setSelectedUnconfirmedDate(todayStr)}
            className="w-full min-h-[48px] py-3.5 px-4 rounded-xl font-bold font-mono text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md bg-[var(--forge-button-bg,#D4AF37)] text-[var(--forge-button-text,#050505)] hover:brightness-110 active:scale-[0.99]"
          >
            <Zap className="w-4 h-4 fill-current" />
            <span>CONFIRM RETENTION TODAY</span>
          </button>
        )}
      </div>
    </Card>
  );
};
