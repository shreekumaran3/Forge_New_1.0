/**
 * FORGE — Smart, Low-Spam Local Notification System
 * 
 * Philosophy: A Quiet RPG Companion.
 * Strict maximum of 3 notifications per calendar day (typically 0–2).
 * Priority hierarchy:
 *   1. CRITICAL: Active timed quest requiring attention (timer reached duration)
 *   2. HIGH: Retention confirmation deadline (10:00 PM) & Missed day review
 *   3. MEDIUM: Scheduled activities
 *   4. LOW: 3-day Inactivity reminder
 * 
 * Features:
 *   - Local Android notifications via @capacitor/local-notifications
 *   - Pure offline, 0 backend, 0 push dependencies, 0 Gemini
 *   - Strict daily rate limiting & daily budget tracking
 *   - Quiet hours enforcement (11:00 PM - 8:00 AM)
 *   - State reconciliation on app launch & action triggers
 *   - Auto-cancellation when user completes actions beforehand
 *   - Deep linking to Quest Execution Screen and Retention Journey
 */

import { LocalNotifications, LocalNotificationSchema, Channel } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import {
  ForgeNotificationSettings,
  NotificationBudgetState,
  NotificationPriority,
  NotificationType,
  NotificationDeepLink,
  NotificationRecordItem,
  QuestExecution,
} from '../types';
import { formatDateKey, getRetentionData, getPendingBackfillDates } from './retentionService';
import { getActiveQuestExecution } from './questExecutionService';
import { db } from '../db/database';

// Storage Keys
const SETTINGS_STORAGE_KEY = 'forge_notification_settings';
const BUDGET_STORAGE_KEY = 'forge_notification_budget_state';

// Deterministic Notification IDs
export const NOTIFICATION_IDS = {
  RETENTION_TODAY: 1001,
  RETENTION_MISSED: 1002,
  QUEST_INACTIVITY: 1003,
  TEST_NOTIFICATION: 9999,
  QUEST_COMPLETE_BASE: 20000,
};

// Android Notification Channels
export const NOTIFICATION_CHANNELS = {
  QUESTS: 'forge_quests',
  REMINDERS: 'forge_reminders',
};

// Default Settings
export const DEFAULT_NOTIFICATION_SETTINGS: ForgeNotificationSettings = {
  enabled: true,
  questReminders: true,
  retentionReminders: true,
  inactivityReminders: true,
  quietHoursEnabled: true,
  quietHoursStart: '23:00',
  quietHoursEnd: '08:00',
};

// Global Hard Daily Ceiling
export const MAX_NOTIFICATIONS_PER_DAY = 3;

/**
 * Loads current notification user settings
 */
export function getNotificationSettings(): ForgeNotificationSettings {
  if (typeof window === 'undefined') return DEFAULT_NOTIFICATION_SETTINGS;
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_NOTIFICATION_SETTINGS;
    return { ...DEFAULT_NOTIFICATION_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_NOTIFICATION_SETTINGS;
  }
}

/**
 * Saves updated notification user settings
 */
export function saveNotificationSettings(
  updates: Partial<ForgeNotificationSettings>
): ForgeNotificationSettings {
  const current = getNotificationSettings();
  const updated = { ...current, ...updates };
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('forge_notification_settings_changed', { detail: updated }));
  } catch (err) {
    console.error('[NotificationManager] Failed to save settings:', err);
  }
  return updated;
}

/**
 * Retrieves the daily budget state with automatic new-day reset
 */
export function getNotificationBudgetState(): NotificationBudgetState {
  const todayStr = formatDateKey(new Date());
  const fallback: NotificationBudgetState = {
    currentDate: todayStr,
    sentCount: 0,
    sentHistory: [],
  };

  if (typeof window === 'undefined') return fallback;

  try {
    const raw = localStorage.getItem(BUDGET_STORAGE_KEY);
    if (!raw) return fallback;

    const parsed: NotificationBudgetState = JSON.parse(raw);

    // If new calendar day, reset count to 0 while keeping historical logs
    if (parsed.currentDate !== todayStr) {
      parsed.currentDate = todayStr;
      parsed.sentCount = 0;
      saveNotificationBudgetState(parsed);
    }

    return parsed;
  } catch {
    return fallback;
  }
}

/**
 * Persists the daily budget state
 */
export function saveNotificationBudgetState(state: NotificationBudgetState): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(BUDGET_STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.error('[NotificationManager] Failed to save budget state:', err);
  }
}

/**
 * Checks if current time or target time falls within quiet hours (default: 11 PM to 8 AM)
 */
export function isWithinQuietHours(targetDate: Date = new Date()): boolean {
  const settings = getNotificationSettings();
  if (!settings.quietHoursEnabled) return false;

  const [startHour, startMin] = settings.quietHoursStart.split(':').map(Number);
  const [endHour, endMin] = settings.quietHoursEnd.split(':').map(Number);

  const hour = targetDate.getHours();
  const min = targetDate.getMinutes();
  const currentMinutes = hour * 60 + min;

  const startMinutes = startHour * 60 + startMin; // 23 * 60 = 1380
  const endMinutes = endHour * 60 + endMin; // 8 * 60 = 480

  // If start is later than end (e.g., 23:00 to 08:00 overnight)
  if (startMinutes > endMinutes) {
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  }

  return currentMinutes >= startMinutes && currentMinutes < endMinutes;
}

/**
 * Evaluates whether a notification can be scheduled or delivered based on:
 * - Master & specific category toggle
 * - Strict 3/day daily budget
 * - Quiet hours
 */
export function canSendNotification(
  type: NotificationType,
  priority: NotificationPriority,
  targetTime: Date = new Date()
): { allowed: boolean; reason?: string } {
  const settings = getNotificationSettings();

  // 1. Master toggle
  if (!settings.enabled) {
    return { allowed: false, reason: 'Notifications disabled in Forge settings' };
  }

  // 2. Specific feature toggle
  if (type === 'quest_complete' && !settings.questReminders) {
    return { allowed: false, reason: 'Quest completion notifications disabled' };
  }
  if ((type === 'retention_reminder' || type === 'retention_missed') && !settings.retentionReminders) {
    return { allowed: false, reason: 'Retention reminders disabled' };
  }
  if (type === 'quest_inactivity' && !settings.inactivityReminders) {
    return { allowed: false, reason: 'Inactivity reminders disabled' };
  }

  // 3. Check Daily Budget Limit (Max 3 per calendar day)
  const budget = getNotificationBudgetState();
  if (budget.sentCount >= MAX_NOTIFICATIONS_PER_DAY && type !== 'test') {
    return {
      allowed: false,
      reason: `Daily notification budget reached (${budget.sentCount}/${MAX_NOTIFICATIONS_PER_DAY})`,
    };
  }

  // 4. Quiet hours check (allow CRITICAL quest complete if user scheduled it, but suppress lower priorities)
  if (isWithinQuietHours(targetTime) && priority !== 'CRITICAL' && type !== 'test') {
    return { allowed: false, reason: 'Target time is within Quiet Hours (11 PM - 8 AM)' };
  }

  return { allowed: true };
}

/**
 * Records that a notification was sent, decrementing the daily budget
 */
export function recordNotificationSent(item: NotificationRecordItem): void {
  const budget = getNotificationBudgetState();
  const isTest = item.type === 'test' || Boolean(item.isTest);

  if (!isTest) {
    budget.sentCount += 1;
  }
  budget.sentHistory = [item, ...(budget.sentHistory || [])].slice(0, 30);

  if (item.type === 'quest_inactivity') {
    budget.lastInactivityNotificationDate = formatDateKey(new Date());
  }

  saveNotificationBudgetState(budget);
}

/**
 * Initializes Android notification channels via Capacitor
 */
let channelsInitialized = false;
export async function initNotificationChannels(): Promise<void> {
  if (channelsInitialized) return;
  if (!Capacitor.isPluginAvailable('LocalNotifications')) return;

  try {
    const questChannel: Channel = {
      id: NOTIFICATION_CHANNELS.QUESTS,
      name: 'Forge Quests',
      description: 'Active quest countdown and mission completion alerts',
      importance: 5, // HIGH / MAX
      visibility: 1, // PUBLIC
      vibration: true,
      lights: true,
      lightColor: '#D4AF37',
    };

    const reminderChannel: Channel = {
      id: NOTIFICATION_CHANNELS.REMINDERS,
      name: 'Forge Reminders',
      description: 'Discipline check-ins and low-frequency Forge reminders',
      importance: 3, // DEFAULT
      visibility: 1,
      vibration: true,
      lights: true,
      lightColor: '#D4AF37',
    };

    await LocalNotifications.createChannel(questChannel);
    await LocalNotifications.createChannel(reminderChannel);
    channelsInitialized = true;
  } catch (err) {
    console.warn('[NotificationManager] Channel creation note:', err);
  }
}

/**
 * Checks permission status for local notifications
 */
export async function checkNotificationPermissions(): Promise<'granted' | 'denied' | 'prompt' | 'unsupported'> {
  if (Capacitor.isPluginAvailable('LocalNotifications')) {
    try {
      const status = await LocalNotifications.checkPermissions();
      if (status.display === 'granted') return 'granted';
      if (status.display === 'denied') return 'denied';
      return 'prompt';
    } catch {
      return 'prompt';
    }
  }

  if (typeof window !== 'undefined' && 'Notification' in window) {
    const perm = Notification.permission;
    if (perm === 'granted') return 'granted';
    if (perm === 'denied') return 'denied';
    return 'prompt';
  }

  return 'unsupported';
}

/**
 * Requests permission for local notifications from user
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  if (Capacitor.isPluginAvailable('LocalNotifications')) {
    try {
      await initNotificationChannels();
      const status = await LocalNotifications.requestPermissions();
      return status.display === 'granted';
    } catch (err) {
      console.warn('[NotificationManager] Permission request note:', err);
      return false;
    }
  }

  if (typeof window !== 'undefined' && 'Notification' in window) {
    try {
      const perm = await Notification.requestPermission();
      return perm === 'granted';
    } catch {
      return false;
    }
  }

  return false;
}

/**
 * Helper: Safely schedules a local notification on native Android or Web fallback
 */
async function scheduleNativeNotification(schema: LocalNotificationSchema): Promise<boolean> {
  if (Capacitor.isPluginAvailable('LocalNotifications')) {
    try {
      await initNotificationChannels();
      await LocalNotifications.schedule({
        notifications: [schema],
      });
      return true;
    } catch (err) {
      console.warn('[NotificationManager] Schedule error:', err);
      return false;
    }
  }

  // Web Browser / PWA fallback for preview
  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    if (schema.schedule?.at) {
      const delayMs = Math.max(0, schema.schedule.at.getTime() - Date.now());
      if (delayMs > 0 && delayMs < 2147483647) {
        setTimeout(() => {
          try {
            new Notification(schema.title, {
              body: schema.body,
              data: schema.extra,
            });
          } catch (e) {
            // ignore
          }
        }, delayMs);
      }
    } else {
      try {
        new Notification(schema.title, {
          body: schema.body,
          data: schema.extra,
        });
      } catch (e) {
        // ignore
      }
    }
    return true;
  }

  return false;
}

/**
 * Helper: Cancels a scheduled local notification by ID
 */
async function cancelNativeNotification(id: number): Promise<void> {
  if (Capacitor.isPluginAvailable('LocalNotifications')) {
    try {
      await LocalNotifications.cancel({
        notifications: [{ id }],
      });
    } catch (err) {
      console.warn(`[NotificationManager] Cancel note for ${id}:`, err);
    }
  }
}

/**
 * 1. QUEST EXECUTION NOTIFICATION
 * Schedules a notification for when an active timed quest reaches completion.
 * Silent during the quest. Only alerts at duration completion.
 */
export async function scheduleQuestCompletionNotification(execution: QuestExecution): Promise<boolean> {
  if (!execution || execution.status !== 'ACTIVE') {
    return false;
  }

  const scheduledTimeMs = execution.startedAt + execution.durationSeconds * 1000;
  const targetDate = new Date(scheduledTimeMs);

  // If already in the past, no future notification needed
  if (scheduledTimeMs <= Date.now()) {
    return false;
  }

  const check = canSendNotification('quest_complete', 'CRITICAL', targetDate);
  if (!check.allowed) {
    console.info('[NotificationManager] Quest notification skipped:', check.reason);
    return false;
  }

  const notifId = NOTIFICATION_IDS.QUEST_COMPLETE_BASE + (Math.abs(execution.questId || 1) % 10000);

  // Cancel any prior quest complete alerts to avoid duplicate stacking
  await cancelNativeNotification(notifId);

  const schema: LocalNotificationSchema = {
    id: notifId,
    title: '⚔ Quest Time Complete',
    body: `"${execution.questTitle}" has reached its intended duration. Open Forge to confirm your quest completion.`,
    channelId: NOTIFICATION_CHANNELS.QUESTS,
    schedule: {
      at: targetDate,
      allowWhileIdle: true,
    },
    extra: {
      deepLink: 'forge_execution' as NotificationDeepLink,
      executionId: execution.executionId,
      questId: execution.questId,
    },
  };

  const scheduled = await scheduleNativeNotification(schema);
  if (scheduled) {
    // Check if this execution was already recorded to keep reconciliation idempotent
    const budget = getNotificationBudgetState();
    const alreadyRecorded = (budget.sentHistory || []).some(
      (h) => h.type === 'quest_complete' && (h.executionId === execution.executionId || (h.id === notifId && h.reason?.includes(execution.executionId)))
    );

    if (!alreadyRecorded) {
      recordNotificationSent({
        id: notifId,
        type: 'quest_complete',
        title: '⚔ Quest Time Complete',
        sentAt: new Date().toISOString(),
        priority: 'CRITICAL',
        reason: `Quest completion reminder: ${execution.executionId}`,
        executionId: execution.executionId,
      });
    }
  }

  return scheduled;
}

/**
 * Cancels pending quest completion notification
 */
export async function cancelQuestCompletionNotification(questId?: number): Promise<void> {
  if (questId) {
    const notifId = NOTIFICATION_IDS.QUEST_COMPLETE_BASE + (Math.abs(questId) % 10000);
    await cancelNativeNotification(notifId);
  } else {
    // Cancel range
    for (let i = 0; i < 50; i++) {
      await cancelNativeNotification(NOTIFICATION_IDS.QUEST_COMPLETE_BASE + i);
    }
  }
}

/**
 * 2. RETENTION TODAY CONFIRMATION REMINDER
 * Scheduled for 10:00 PM local time if not yet confirmed.
 * Cancelled automatically if confirmed beforehand.
 */
export async function scheduleRetentionReminder(retentionData?: any): Promise<boolean> {
  const todayStr = formatDateKey(new Date());
  const data = retentionData || (await getRetentionData());

  const isConfirmed = (data.confirmedDates || []).includes(todayStr);
  const isRelapsed = (data.relapseDates || []).includes(todayStr);

  // If already confirmed or resolved for today: cancel pending reminder!
  if (isConfirmed || isRelapsed) {
    await cancelRetentionReminder();
    return false;
  }

  const now = new Date();
  const reminderTime = new Date();
  reminderTime.setHours(22, 0, 0, 0); // 10:00 PM local time

  // If already past 10 PM today, do not schedule for today (avoid late spam in quiet hours)
  if (now.getTime() >= reminderTime.getTime()) {
    return false;
  }

  const check = canSendNotification('retention_reminder', 'HIGH', reminderTime);
  if (!check.allowed) {
    return false;
  }

  await cancelRetentionReminder();

  const schema: LocalNotificationSchema = {
    id: NOTIFICATION_IDS.RETENTION_TODAY,
    title: '⚒ Retention Confirmation',
    body: "You haven't confirmed today's retention yet. Open Forge to record today's status.",
    channelId: NOTIFICATION_CHANNELS.REMINDERS,
    schedule: {
      at: reminderTime,
      allowWhileIdle: true,
    },
    extra: {
      deepLink: 'retention_today' as NotificationDeepLink,
      date: todayStr,
    },
  };

  const scheduled = await scheduleNativeNotification(schema);
  if (scheduled) {
    const budget = getNotificationBudgetState();
    const alreadyRecorded = (budget.sentHistory || []).some(
      (h) => h.type === 'retention_reminder' && (h.dateKey === todayStr || (h.sentAt && formatDateKey(new Date(h.sentAt)) === todayStr))
    );

    if (!alreadyRecorded) {
      recordNotificationSent({
        id: NOTIFICATION_IDS.RETENTION_TODAY,
        type: 'retention_reminder',
        title: '⚒ Retention Confirmation',
        sentAt: new Date().toISOString(),
        priority: 'HIGH',
        reason: `Daily retention confirmation reminder for ${todayStr}`,
        dateKey: todayStr,
      });
    }
  }

  return scheduled;
}

/**
 * Cancels today's retention reminder
 */
export async function cancelRetentionReminder(): Promise<void> {
  await cancelNativeNotification(NOTIFICATION_IDS.RETENTION_TODAY);
}

/**
 * 3. MISSED RETENTION DAY REMINDER
 * One reminder scheduled for the morning (09:00 AM) if previous day was missed.
 */
export async function scheduleMissedRetentionReminder(pendingDates?: string[]): Promise<boolean> {
  const data = await getRetentionData();
  const unconfirmed = pendingDates || getPendingBackfillDates(data, 3);

  if (unconfirmed.length === 0) {
    await cancelMissedRetentionReminder();
    return false;
  }

  const now = new Date();
  const morningSlot = new Date();
  morningSlot.setHours(9, 0, 0, 0); // 9:00 AM local time

  // Target next available 9:00 AM slot
  if (now.getTime() > morningSlot.getTime()) {
    morningSlot.setDate(morningSlot.getDate() + 1);
  }

  const check = canSendNotification('retention_missed', 'HIGH', morningSlot);
  if (!check.allowed) {
    return false;
  }

  await cancelMissedRetentionReminder();

  const schema: LocalNotificationSchema = {
    id: NOTIFICATION_IDS.RETENTION_MISSED,
    title: '⚒ Retention Check Needed',
    body: "Yesterday's retention status hasn't been confirmed. Open Forge to review it.",
    channelId: NOTIFICATION_CHANNELS.REMINDERS,
    schedule: {
      at: morningSlot,
      allowWhileIdle: true,
    },
    extra: {
      deepLink: 'retention_missed' as NotificationDeepLink,
      unconfirmedDates: unconfirmed,
    },
  };

  const scheduled = await scheduleNativeNotification(schema);
  if (scheduled) {
    const todayStr = formatDateKey(new Date());
    const budget = getNotificationBudgetState();
    const alreadyRecorded = (budget.sentHistory || []).some(
      (h) => h.type === 'retention_missed' && (h.dateKey === todayStr || (h.sentAt && formatDateKey(new Date(h.sentAt)) === todayStr))
    );

    if (!alreadyRecorded) {
      recordNotificationSent({
        id: NOTIFICATION_IDS.RETENTION_MISSED,
        type: 'retention_missed',
        title: '⚒ Retention Check Needed',
        sentAt: new Date().toISOString(),
        priority: 'HIGH',
        reason: `Missed retention reminder for ${unconfirmed.join(', ')}`,
        dateKey: todayStr,
      });
    }
  }

  return scheduled;
}

/**
 * Cancels missed retention reminder
 */
export async function cancelMissedRetentionReminder(): Promise<void> {
  await cancelNativeNotification(NOTIFICATION_IDS.RETENTION_MISSED);
}

/**
 * 4. QUEST INACTIVITY REMINDER
 * Triggered only after 3 full days without completed quests.
 * 72-hour cooldown before repeating.
 */
export async function evaluateInactivityReminder(lastCompletedDateStr?: string): Promise<boolean> {
  const budget = getNotificationBudgetState();
  const todayStr = formatDateKey(new Date());

  // Enforce 72h cooldown since last inactivity notification
  if (budget.lastInactivityNotificationDate) {
    const lastNotifDate = new Date(budget.lastInactivityNotificationDate);
    const diffHours = (Date.now() - lastNotifDate.getTime()) / (1000 * 3600);
    if (diffHours < 72) {
      return false;
    }
  }

  // Calculate days since last completed quest
  let daysInactive = 0;
  if (lastCompletedDateStr) {
    const lastDate = new Date(lastCompletedDateStr);
    daysInactive = Math.floor((Date.now() - lastDate.getTime()) / (1000 * 3600 * 24));
  } else {
    // Check quest logs in DB
    try {
      const recentLogs = await db.questLogs.orderBy('completedAt').reverse().limit(1).toArray();
      if (recentLogs.length > 0 && recentLogs[0].completedAt) {
        const lastDate = new Date(recentLogs[0].completedAt);
        daysInactive = Math.floor((Date.now() - lastDate.getTime()) / (1000 * 3600 * 24));
      } else {
        daysInactive = 0;
      }
    } catch {
      daysInactive = 0;
    }
  }

  // Under 3 days: NO notification
  if (daysInactive < 3) {
    await cancelInactivityReminder();
    return false;
  }

  // Exactly or over 3 days: Schedule low-priority reminder at 10:30 AM
  const targetDate = new Date();
  targetDate.setHours(10, 30, 0, 0);
  if (targetDate.getTime() <= Date.now()) {
    targetDate.setDate(targetDate.getDate() + 1);
  }

  const check = canSendNotification('quest_inactivity', 'LOW', targetDate);
  if (!check.allowed) {
    return false;
  }

  await cancelInactivityReminder();

  const schema: LocalNotificationSchema = {
    id: NOTIFICATION_IDS.QUEST_INACTIVITY,
    title: '⚔ Forge Awaits',
    body: "You haven't completed a quest in a few days. Ready to continue your build?",
    channelId: NOTIFICATION_CHANNELS.REMINDERS,
    schedule: {
      at: targetDate,
      allowWhileIdle: true,
    },
    extra: {
      deepLink: 'forge_quests' as NotificationDeepLink,
    },
  };

  const scheduled = await scheduleNativeNotification(schema);
  if (scheduled) {
    const alreadyRecorded = (budget.sentHistory || []).some(
      (h) => h.type === 'quest_inactivity' && (h.dateKey === todayStr || (h.sentAt && formatDateKey(new Date(h.sentAt)) === todayStr))
    );

    if (!alreadyRecorded) {
      recordNotificationSent({
        id: NOTIFICATION_IDS.QUEST_INACTIVITY,
        type: 'quest_inactivity',
        title: '⚔ Forge Awaits',
        sentAt: new Date().toISOString(),
        priority: 'LOW',
        reason: '3-day inactivity reminder',
        dateKey: todayStr,
      });
    }
  }

  return scheduled;
}

/**
 * Cancels inactivity reminder
 */
export async function cancelInactivityReminder(): Promise<void> {
  await cancelNativeNotification(NOTIFICATION_IDS.QUEST_INACTIVITY);
}

/**
 * 5. MASTER RECONCILIATION ENGINE
 * Authoritative synchronization called on app launch, resume, and major actions.
 * Inspects all subsystems and reconciles scheduled notifications.
 */
export async function reconcileNotifications(): Promise<void> {
  try {
    // 1. Reconcile Active Quest Execution
    const activeExec = getActiveQuestExecution();
    if (activeExec && activeExec.status === 'ACTIVE') {
      await scheduleQuestCompletionNotification(activeExec);
    } else {
      await cancelQuestCompletionNotification();
    }

    // 2. Reconcile Retention Status
    const retentionData = await getRetentionData();
    await scheduleRetentionReminder(retentionData);

    // 3. Reconcile Missed Retention Days
    const pendingDates = getPendingBackfillDates(retentionData, 3);
    if (pendingDates.length > 0) {
      await scheduleMissedRetentionReminder(pendingDates);
    } else {
      await cancelMissedRetentionReminder();
    }

    // 4. Reconcile Inactivity
    await evaluateInactivityReminder();
  } catch (err) {
    console.error('[NotificationManager] Reconciliation error:', err);
  }
}

/**
 * Sends a safe test notification to verify channel and native setup
 */
export async function sendTestNotification(): Promise<{ success: boolean; message: string }> {
  const perm = await requestNotificationPermissions();
  if (!perm) {
    return {
      success: false,
      message: 'Notification permission not granted. Please enable in device settings.',
    };
  }

  const schema: LocalNotificationSchema = {
    id: NOTIFICATION_IDS.TEST_NOTIFICATION,
    title: '⚔ Forge Ready',
    body: 'Notification system verified. Notifications will remain quiet until meaningful actions occur.',
    channelId: NOTIFICATION_CHANNELS.QUESTS,
    extra: {
      deepLink: 'forge_quests' as NotificationDeepLink,
    },
  };

  const success = await scheduleNativeNotification(schema);
  if (success) {
    recordNotificationSent({
      id: NOTIFICATION_IDS.TEST_NOTIFICATION,
      type: 'test',
      title: '⚔ Forge Ready',
      sentAt: new Date().toISOString(),
      priority: 'LOW',
      reason: 'Manual test from Settings',
      isTest: true,
    });
    return { success: true, message: 'Test notification sent successfully.' };
  }

  return { success: false, message: 'Failed to schedule notification.' };
}

/**
 * Removes delivered notifications belonging to Forge from notification tray / badge
 */
export async function clearDeliveredForgeNotifications(specificId?: number): Promise<void> {
  // 1. Capacitor / Native Android Notification Tray Cleanup
  if (Capacitor.isPluginAvailable('LocalNotifications')) {
    try {
      if (typeof specificId === 'number') {
        await LocalNotifications.removeDeliveredNotifications({
          notifications: [{ id: specificId, title: '', body: '' }],
        });
        return;
      }

      const delivered = await LocalNotifications.getDeliveredNotifications();
      if (delivered && delivered.notifications && delivered.notifications.length > 0) {
        const forgeDelivered = delivered.notifications.filter((n) => {
          const id = n.id;
          return (
            id === NOTIFICATION_IDS.RETENTION_TODAY ||
            id === NOTIFICATION_IDS.RETENTION_MISSED ||
            id === NOTIFICATION_IDS.QUEST_INACTIVITY ||
            id === NOTIFICATION_IDS.TEST_NOTIFICATION ||
            (id >= NOTIFICATION_IDS.QUEST_COMPLETE_BASE && id < NOTIFICATION_IDS.QUEST_COMPLETE_BASE + 10000)
          );
        });

        if (forgeDelivered.length > 0) {
          await LocalNotifications.removeDeliveredNotifications({
            notifications: forgeDelivered,
          });
        }
      }
    } catch (err) {
      console.warn('[NotificationManager] clearDeliveredForgeNotifications error:', err);
    }
  }

  // 2. Web Notification / Service Worker Cleanup (safe fallback for web/PWA)
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration && typeof registration.getNotifications === 'function') {
        const webNotifs = await registration.getNotifications();
        if (webNotifs && webNotifs.length > 0) {
          for (const n of webNotifs) {
            if (typeof specificId === 'number') {
              if (n.tag === `forge_${specificId}` || (n.data && n.data.id === specificId)) {
                n.close();
              }
            } else if (n.tag?.startsWith('forge') || n.data?.deepLink || n.title?.includes('Forge')) {
              n.close();
            }
          }
        }
      }
    } catch {
      // Safe no-op on web
    }
  }
}

/**
 * Attaches native action listeners for background deep-link clicks
 */
export function setupNotificationListeners(
  onNavigate: (deepLink: NotificationDeepLink, extra?: any) => void
): () => void {
  if (typeof window === 'undefined') return () => {};

  let isCleanedUp = false;
  const listenerHandles: Promise<{ remove: () => Promise<void> }>[] = [];

  // 1. Capacitor Native Action Performed Listener
  if (Capacitor.isPluginAvailable('LocalNotifications')) {
    try {
      const handlePromise = LocalNotifications.addListener(
        'localNotificationActionPerformed',
        async (notificationAction) => {
          if (isCleanedUp) return;
          const notifId = notificationAction.notification?.id;
          if (typeof notifId === 'number') {
            await clearDeliveredForgeNotifications(notifId);
          }
          const extra = notificationAction.notification?.extra;
          const deepLink = extra?.deepLink as NotificationDeepLink;
          if (deepLink) {
            onNavigate(deepLink, extra);
          }
        }
      );
      listenerHandles.push(handlePromise);
    } catch (err) {
      console.warn('[NotificationManager] Listener setup note:', err);
    }
  }

  // 2. App Lifecycle Resume / Foreground Listener for Auto-Reconciliation & Delivered Notification Cleanup
  try {
    if (Capacitor.isPluginAvailable('App') || Capacitor.isNativePlatform()) {
      const appHandlePromise = CapApp.addListener('appStateChange', (state) => {
        if (isCleanedUp) return;
        if (state.isActive) {
          clearDeliveredForgeNotifications().catch(() => {});
          reconcileNotifications();
        }
      });
      listenerHandles.push(appHandlePromise);
    }
  } catch {
    // ignore
  }

  // 3. Web visibility change fallback (foreground resume)
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible' && !isCleanedUp) {
      clearDeliveredForgeNotifications().catch(() => {});
      reconcileNotifications();
    }
  };
  document.addEventListener('visibilitychange', handleVisibilityChange);

  // 4. Window focus fallback (active foreground)
  const handleWindowFocus = () => {
    if (!isCleanedUp) {
      clearDeliveredForgeNotifications().catch(() => {});
    }
  };
  window.addEventListener('focus', handleWindowFocus);

  // 5. Custom Window Deep Link Event Listener
  const handleCustomNav = (e: Event) => {
    if (isCleanedUp) return;
    const custom = e as CustomEvent;
    if (custom.detail?.deepLink) {
      onNavigate(custom.detail.deepLink, custom.detail.extra);
    }
  };
  window.addEventListener('forge_navigate_deep_link', handleCustomNav);

  return () => {
    isCleanedUp = true;
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('focus', handleWindowFocus);
    window.removeEventListener('forge_navigate_deep_link', handleCustomNav);
    listenerHandles.forEach((promise) => {
      promise.then((handle) => handle?.remove?.()).catch(() => {});
    });
  };
}
