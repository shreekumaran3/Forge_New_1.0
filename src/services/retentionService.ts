/**
 * KEEP WALKING - Retention Journey Service
 * Strict progression, streak reconstruction, and idempotent XP integrity.
 */

import { db } from '../db/database';

export type RetentionDayStatus = 'confirmed' | 'unconfirmed' | 'relapse';

export interface RetentionDayRecord {
  date: string; // YYYY-MM-DD
  status: RetentionDayStatus;
  xpAwarded: boolean;
  confirmedAt?: string;
}

export interface RetentionData {
  lastConfirmedDate?: string; // YYYY-MM-DD
  confirmedDates: string[]; // List of YYYY-MM-DD
  relapseDates?: string[]; // List of YYYY-MM-DD
  dailyRecords?: Record<string, RetentionDayRecord>;
  lastRelapseDate?: string;
  currentStreak: number;
  longestStreak: number;
  totalConfirmedDays: number;
  claimedMilestones: number[]; // e.g. [7, 14, 30]
}

const RECORD_KEY = 'retention_journey_state';

export const RETENTION_CONFIRM_XP = 20;
export const RETENTION_LATE_CONFIRM_XP = Math.floor(RETENTION_CONFIRM_XP * 0.25); // 5 XP (25%)
export const DAILY_RETENTION_XP = RETENTION_CONFIRM_XP;

/**
 * Get retention XP award amount for a given date
 */
export function getRetentionXpAmount(dateStr: string): number {
  const todayStr = formatDateKey(new Date());
  if (dateStr === todayStr) {
    return RETENTION_CONFIRM_XP;
  }
  if (dateStr < todayStr) {
    return RETENTION_LATE_CONFIRM_XP;
  }
  return RETENTION_CONFIRM_XP;
}

export interface RetentionMilestone {
  days: number;
  xpReward: number; // 0 XP - Milestones are Chronicle achievements
  title: string;
  description: string;
}

export const RETENTION_MILESTONES: RetentionMilestone[] = [
  {
    days: 7,
    xpReward: 0,
    title: 'First Week',
    description: 'Maintained retention for 7 consecutive days.',
  },
  {
    days: 14,
    xpReward: 0,
    title: 'Two Weeks Strong',
    description: 'Maintained retention for 14 consecutive days.',
  },
  {
    days: 30,
    xpReward: 0,
    title: 'One Month',
    description: 'Maintained retention for 30 consecutive days.',
  },
  {
    days: 60,
    xpReward: 0,
    title: 'Two Months',
    description: 'Maintained retention for 60 consecutive days.',
  },
  {
    days: 90,
    xpReward: 0,
    title: 'Quarter Mastery',
    description: 'Maintained retention for 90 consecutive days.',
  },
  {
    days: 180,
    xpReward: 0,
    title: 'Half-Year Discipline',
    description: 'Maintained retention for 180 consecutive days.',
  },
  {
    days: 365,
    xpReward: 0,
    title: 'One Year',
    description: 'Maintained retention for 365 consecutive days.',
  },
];

/**
 * Format Date to YYYY-MM-DD in local time
 */
export function formatDateKey(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parse YYYY-MM-DD to local Date object
 */
export function parseDateKey(str: string): Date {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
}

/**
 * Calculate consecutive unbroken days backwards from a reference date
 */
export function calculateRetentionStreak(
  confirmedDates: string[],
  relapseDates: string[] = []
): { currentStreak: number; longestStreak: number; totalConfirmedDays: number } {
  const confirmedSet = new Set(confirmedDates);
  const relapseSet = new Set(relapseDates);

  const uniqueSortedDates = Array.from(confirmedSet).sort();
  const totalConfirmedDays = uniqueSortedDates.length;

  if (totalConfirmedDays === 0) {
    return { currentStreak: 0, longestStreak: 0, totalConfirmedDays: 0 };
  }

  const todayStr = formatDateKey(new Date());
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = formatDateKey(yesterday);

  // Latest relapse date
  const latestRelapseStr = relapseDates.length > 0
    ? [...relapseDates].sort().reverse()[0]
    : null;

  // 1. Calculate Current Streak
  // Start from today (if confirmed) or yesterday (if confirmed)
  // If neither today nor yesterday is confirmed, find the latest confirmed date that is after latest relapse
  let currentStreak = 0;
  let startCheckDate: Date | null = null;

  if (confirmedSet.has(todayStr)) {
    startCheckDate = parseDateKey(todayStr);
  } else if (confirmedSet.has(yesterdayStr)) {
    startCheckDate = parseDateKey(yesterdayStr);
  } else {
    // Check if the most recent confirmed date is still unbroken (e.g. prior to an unconfirmed period)
    const validConfirmed = uniqueSortedDates.filter(
      (d) => !latestRelapseStr || d > latestRelapseStr
    );
    if (validConfirmed.length > 0) {
      const latestDateStr = validConfirmed[validConfirmed.length - 1];
      // If within 7 days, count the unbroken streak ending at that date
      const latestDate = parseDateKey(latestDateStr);
      const diffDays = Math.round((new Date().getTime() - latestDate.getTime()) / (1000 * 3600 * 24));
      if (diffDays <= 7) {
        startCheckDate = latestDate;
      }
    }
  }

  if (startCheckDate) {
    const iterDate = new Date(startCheckDate);
    while (true) {
      const key = formatDateKey(iterDate);
      if (relapseSet.has(key)) {
        break; // Hit a relapse boundary
      }
      if (confirmedSet.has(key)) {
        currentStreak += 1;
        iterDate.setDate(iterDate.getDate() - 1);
      } else {
        break; // Hit an unconfirmed gap
      }
    }
  }

  // 2. Calculate Longest Historic Streak
  let longestStreak = currentStreak;
  let runningCount = 0;

  if (uniqueSortedDates.length > 0) {
    // Find consecutive dates in ascending order
    for (let i = 0; i < uniqueSortedDates.length; i++) {
      const curr = uniqueSortedDates[i];
      if (relapseSet.has(curr)) {
        runningCount = 0;
        continue;
      }

      if (i === 0) {
        runningCount = 1;
      } else {
        const prev = uniqueSortedDates[i - 1];
        const prevDate = parseDateKey(prev);
        prevDate.setDate(prevDate.getDate() + 1);
        const expectedNext = formatDateKey(prevDate);

        if (curr === expectedNext && !relapseSet.has(expectedNext)) {
          runningCount += 1;
        } else {
          runningCount = 1;
        }
      }

      if (runningCount > longestStreak) {
        longestStreak = runningCount;
      }
    }
  }

  return {
    currentStreak,
    longestStreak,
    totalConfirmedDays,
  };
}

/**
 * Get retention data cleanly from local database with backward-compatible schema
 */
export async function getRetentionData(): Promise<RetentionData> {
  try {
    const record = await db.personalRecords.get(RECORD_KEY);
    if (!record || !record.value) {
      return {
        confirmedDates: [],
        relapseDates: [],
        dailyRecords: {},
        currentStreak: 0,
        longestStreak: 0,
        totalConfirmedDays: 0,
        claimedMilestones: [],
      };
    }

    const raw = typeof record.value === 'string' ? JSON.parse(record.value) : record.value;
    const confirmedDates: string[] = Array.isArray(raw.confirmedDates) ? raw.confirmedDates : [];
    const relapseDates: string[] = Array.isArray(raw.relapseDates) ? raw.relapseDates : [];
    const claimedMilestones: number[] = Array.isArray(raw.claimedMilestones) ? raw.claimedMilestones : [];

    // Rebuild or normalize dailyRecords
    const dailyRecords: Record<string, RetentionDayRecord> = raw.dailyRecords || {};
    for (const d of confirmedDates) {
      if (!dailyRecords[d]) {
        dailyRecords[d] = {
          date: d,
          status: 'confirmed',
          xpAwarded: true,
        };
      }
    }
    for (const r of relapseDates) {
      if (!dailyRecords[r]) {
        dailyRecords[r] = {
          date: r,
          status: 'relapse',
          xpAwarded: false,
        };
      }
    }

    const { currentStreak, longestStreak, totalConfirmedDays } = calculateRetentionStreak(
      confirmedDates,
      relapseDates
    );

    return {
      lastConfirmedDate: raw.lastConfirmedDate || (confirmedDates.length > 0 ? [...confirmedDates].sort().reverse()[0] : undefined),
      confirmedDates,
      relapseDates,
      dailyRecords,
      lastRelapseDate: raw.lastRelapseDate || (relapseDates.length > 0 ? [...relapseDates].sort().reverse()[0] : undefined),
      currentStreak,
      longestStreak: Math.max(longestStreak, raw.longestStreak || 0),
      totalConfirmedDays,
      claimedMilestones,
    };
  } catch (e) {
    console.error('Failed to load retention data', e);
    return {
      confirmedDates: [],
      relapseDates: [],
      dailyRecords: {},
      currentStreak: 0,
      longestStreak: 0,
      totalConfirmedDays: 0,
      claimedMilestones: [],
    };
  }
}

/**
 * Save retention state locally
 */
export async function saveRetentionData(data: RetentionData): Promise<void> {
  await db.personalRecords.put({
    id: RECORD_KEY,
    key: RECORD_KEY,
    title: 'Retention Journey Record',
    value: JSON.stringify(data),
    unit: 'days',
    icon: 'Shield',
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Get unconfirmed dates within the bounded backfill window (default 7 days)
 */
export function getPendingBackfillDates(data: RetentionData, windowDays = 7): string[] {
  const confirmedSet = new Set(data.confirmedDates || []);
  const relapseSet = new Set(data.relapseDates || []);
  const todayStr = formatDateKey(new Date());

  const pending: string[] = [];
  const curr = new Date();

  for (let i = 1; i <= windowDays; i++) {
    const d = new Date(curr);
    d.setDate(d.getDate() - i);
    const dateKey = formatDateKey(d);

    if (!confirmedSet.has(dateKey) && !relapseSet.has(dateKey)) {
      pending.push(dateKey);
    }
  }

  return pending;
}

/**
 * Confirm a retention date with idempotent XP award
 */
export async function confirmRetentionDate(
  dateStr: string,
  currentData: RetentionData
): Promise<{
  updatedData: RetentionData;
  xpToAward: number;
  newMilestones: typeof RETENTION_MILESTONES;
}> {
  const existingRecord = currentData.dailyRecords?.[dateStr];
  const alreadyConfirmed = existingRecord?.status === 'confirmed' || currentData.confirmedDates.includes(dateStr);

  if (alreadyConfirmed && existingRecord?.xpAwarded) {
    // Idempotent: Already confirmed and XP granted
    return {
      updatedData: currentData,
      xpToAward: 0,
      newMilestones: [],
    };
  }

  const todayStr = formatDateKey(new Date());
  const isLate = dateStr < todayStr;
  const baseRetentionXp = isLate ? RETENTION_LATE_CONFIRM_XP : RETENTION_CONFIRM_XP;
  // If already had XP awarded previously on this record (defensive check), award 0 base XP
  const actualBaseXp = existingRecord?.xpAwarded ? 0 : baseRetentionXp;

  // Add to confirmedDates (unique, sorted)
  const confirmedDates = Array.from(new Set([...currentData.confirmedDates, dateStr])).sort();
  // Remove from relapseDates if present
  const relapseDates = (currentData.relapseDates || []).filter((d) => d !== dateStr);

  const dailyRecords: Record<string, RetentionDayRecord> = {
    ...(currentData.dailyRecords || {}),
    [dateStr]: {
      date: dateStr,
      status: 'confirmed',
      xpAwarded: true,
      confirmedAt: new Date().toISOString(),
    },
  };

  const { currentStreak, longestStreak, totalConfirmedDays } = calculateRetentionStreak(
    confirmedDates,
    relapseDates
  );

  // Check for new milestones unlocked by the new streak
  const claimedSet = new Set(currentData.claimedMilestones || []);
  const newMilestones = RETENTION_MILESTONES.filter(
    (m) => currentStreak >= m.days && !claimedSet.has(m.days)
  );

  // Retention milestones are Chronicle achievements and award 0 XP / 0 SP
  for (const m of newMilestones) {
    claimedSet.add(m.days);

    // Sync to legacyMilestones table for permanent persistence
    try {
      const milestoneId = `ret_${m.days}_days`;
      const existing = await db.legacyMilestones.get(milestoneId);
      if (existing) {
        if (!existing.isUnlocked) {
          await db.legacyMilestones.update(milestoneId, {
            isUnlocked: true,
            unlockedAt: dateStr,
          });
        }
      } else {
        await db.legacyMilestones.put({
          id: milestoneId,
          title: m.title,
          description: m.description,
          category: 'consistency',
          icon: 'ShieldCheck',
          isUnlocked: true,
          unlockedAt: dateStr,
          xpReward: 0,
        });
      }
    } catch (err) {
      console.warn('Could not sync legacy milestone record:', err);
    }
  }

  // Authoritative XP to award is purely the daily retention check-in XP (20 XP normal, 5 XP late, 0 XP if duplicate/already awarded)
  const xpToAward = actualBaseXp;

  const updatedData: RetentionData = {
    ...currentData,
    lastConfirmedDate: dateStr > (currentData.lastConfirmedDate || '') ? dateStr : currentData.lastConfirmedDate,
    confirmedDates,
    relapseDates,
    dailyRecords,
    currentStreak,
    longestStreak: Math.max(longestStreak, currentData.longestStreak),
    totalConfirmedDays,
    claimedMilestones: Array.from(claimedSet),
  };

  await saveRetentionData(updatedData);

  return {
    updatedData,
    xpToAward,
    newMilestones,
  };
}

/**
 * Record an explicit relapse event
 */
export async function recordRelapse(
  dateStr: string,
  currentData: RetentionData
): Promise<RetentionData> {
  const confirmedDates = currentData.confirmedDates.filter((d) => d !== dateStr);
  const relapseDates = Array.from(new Set([...(currentData.relapseDates || []), dateStr])).sort();

  const dailyRecords: Record<string, RetentionDayRecord> = {
    ...(currentData.dailyRecords || {}),
    [dateStr]: {
      date: dateStr,
      status: 'relapse',
      xpAwarded: false,
      confirmedAt: new Date().toISOString(),
    },
  };

  const { currentStreak, longestStreak, totalConfirmedDays } = calculateRetentionStreak(
    confirmedDates,
    relapseDates
  );

  const updatedData: RetentionData = {
    ...currentData,
    lastRelapseDate: dateStr,
    confirmedDates,
    relapseDates,
    dailyRecords,
    currentStreak: 0,
    longestStreak: Math.max(longestStreak, currentData.longestStreak),
    totalConfirmedDays,
  };

  await saveRetentionData(updatedData);
  return updatedData;
}

/**
 * Undo an accidental relapse event
 */
export async function undoRelapse(
  dateStr: string,
  currentData: RetentionData
): Promise<RetentionData> {
  const relapseDates = (currentData.relapseDates || []).filter((d) => d !== dateStr);
  const dailyRecords = { ...(currentData.dailyRecords || {}) };
  delete dailyRecords[dateStr];

  const { currentStreak, longestStreak, totalConfirmedDays } = calculateRetentionStreak(
    currentData.confirmedDates,
    relapseDates
  );

  const updatedData: RetentionData = {
    ...currentData,
    lastRelapseDate: relapseDates.length > 0 ? [...relapseDates].sort().reverse()[0] : undefined,
    relapseDates,
    dailyRecords,
    currentStreak,
    longestStreak,
    totalConfirmedDays,
  };

  await saveRetentionData(updatedData);
  return updatedData;
}
