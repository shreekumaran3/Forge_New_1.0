import { db } from '../db/database';
import { HealthLog } from '../types';

/**
 * Get Health Log for today
 */
export async function getTodayHealthLog(): Promise<HealthLog> {
  const todayStr = new Date().toISOString().split('T')[0];
  let log = await db.healthLogs.where('date').equals(todayStr).first();

  if (!log) {
    log = {
      date: todayStr,
      stepCount: undefined,
      sleepHours: undefined,
      waterMl: undefined,
      weightKg: undefined,
      syncedAt: new Date().toISOString(),
    };
  }
  return log;
}

/**
 * Save manual health log for today
 */
export async function saveManualHealthLog(logData: Partial<HealthLog>): Promise<HealthLog> {
  const todayStr = new Date().toISOString().split('T')[0];
  let existing = await db.healthLogs.where('date').equals(todayStr).first();

  const updatedLog: HealthLog = {
    ...(existing || { date: todayStr }),
    ...logData,
    syncedAt: new Date().toISOString(),
  };

  if (existing && existing.id) {
    await db.healthLogs.put({ ...updatedLog, id: existing.id });
  } else {
    const id = await db.healthLogs.add(updatedLog);
    updatedLog.id = id;
  }

  return updatedLog;
}

/**
 * Get all saved health logs sorted newest to oldest
 */
export async function getAllHealthLogs(): Promise<HealthLog[]> {
  try {
    const logs = await db.healthLogs.toArray();
    return logs
      .filter(
        (l) =>
          l.date &&
          (l.stepCount !== undefined ||
            l.sleepHours !== undefined ||
            l.waterMl !== undefined ||
            l.weightKg !== undefined ||
            Boolean(l.mood) ||
            Boolean(l.energy))
      )
      .sort((a, b) => b.date.localeCompare(a.date));
  } catch (err) {
    console.warn('[healthService] Error retrieving all health logs:', err);
    return [];
  }
}
