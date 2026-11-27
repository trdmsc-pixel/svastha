import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { ReminderCategory } from '@/types/domain';
import { ScheduledReminder } from '@/engine/reminderSchedule';
import { parseHHmm } from './dates';

export { DEFAULT_NOTIFICATION_PREFS } from '@/engine/reminderSchedule';

const CHANNELS: Array<{ id: ReminderCategory; name: string; high?: boolean }> = [
  { id: 'medicines', name: 'Medicines', high: true },
  { id: 'water', name: 'Water' },
  { id: 'meals', name: 'Meals' },
  { id: 'routine', name: 'Routine & plan tasks' },
  { id: 'retest', name: 'Retest' },
  { id: 'insights', name: 'Insights' },
];

let configured = false;

export async function configureNotificationChannels(): Promise<void> {
  if (Platform.OS === 'web' || configured) return;
  configured = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowAlert: true, shouldPlaySound: true, shouldSetBadge: false }),
  });
  if (Platform.OS === 'android') {
    for (const c of CHANNELS) {
      await Notifications.setNotificationChannelAsync(c.id, {
        name: `Svastha · ${c.name}`,
        importance: c.high ? Notifications.AndroidImportance.HIGH : Notifications.AndroidImportance.DEFAULT,
      });
    }
  }
  await Notifications.setNotificationCategoryAsync('medicine_reminder', [
    { identifier: 'TAKEN', buttonTitle: 'Taken', options: { opensAppToForeground: false } },
    { identifier: 'SNOOZE_10', buttonTitle: 'Snooze 10 min', options: { opensAppToForeground: false } },
    { identifier: 'SKIP', buttonTitle: 'Skip', options: { opensAppToForeground: false } },
  ]);
}

export type PermissionState = 'granted' | 'denied' | 'undetermined' | 'unsupported';

export async function getNotificationPermission(): Promise<PermissionState> {
  if (Platform.OS === 'web') {
    if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
    const p = window.Notification.permission;
    return p === 'default' ? 'undetermined' : (p as PermissionState);
  }
  const { status } = await Notifications.getPermissionsAsync();
  return status as PermissionState;
}

export async function requestNotificationPermission(): Promise<PermissionState> {
  if (Platform.OS === 'web') {
    if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
    const p = await window.Notification.requestPermission();
    return p === 'default' ? 'undetermined' : (p as PermissionState);
  }
  const { status } = await Notifications.requestPermissionsAsync();
  return status as PermissionState;
}

/**
 * Replaces all scheduled Svastha reminders with `schedule` (idempotent — safe to call after
 * every settings/plan change). Returns how many were scheduled on the device.
 */
export async function applyReminderSchedule(schedule: ScheduledReminder[], sound = true): Promise<number> {
  if (Platform.OS === 'web') return 0;
  await configureNotificationChannels();
  const perm = await getNotificationPermission();
  if (perm !== 'granted') return 0;
  await Notifications.cancelAllScheduledNotificationsAsync();
  let count = 0;
  for (const r of schedule) {
    const { h, m } = parseHHmm(r.time);
    const content: Notifications.NotificationContentInput = {
      title: r.title,
      body: r.body,
      sound: sound ? 'default' : undefined,
      data: { reminderId: r.id, category: r.category },
      categoryIdentifier: r.category === 'medicines' ? 'medicine_reminder' : undefined,
    };
    try {
      if (r.date) {
        const when = new Date(`${r.date}T${r.time}:00`);
        if (when.getTime() <= Date.now()) continue;
        await Notifications.scheduleNotificationAsync({
          content,
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: when, channelId: r.category },
        });
      } else if (r.weekday) {
        await Notifications.scheduleNotificationAsync({
          content,
          trigger: { type: Notifications.SchedulableTriggerInputTypes.WEEKLY, weekday: r.weekday, hour: h, minute: m, channelId: r.category },
        });
      } else {
        await Notifications.scheduleNotificationAsync({
          content,
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: h, minute: m, channelId: r.category },
        });
      }
      count++;
    } catch {
      // skip a single bad trigger rather than failing the whole schedule
    }
  }
  return count;
}

export async function sendTestNotification(): Promise<boolean> {
  if (Platform.OS === 'web') {
    if (typeof window === 'undefined' || !('Notification' in window)) return false;
    if (window.Notification.permission !== 'granted') return false;
    new window.Notification('Svastha', { body: 'Notifications are working. You’ll get gentle reminders for your plan.' });
    return true;
  }
  await configureNotificationChannels();
  if ((await getNotificationPermission()) !== 'granted') return false;
  await Notifications.scheduleNotificationAsync({
    content: { title: 'Svastha', body: 'Notifications are working. You’ll get gentle reminders for your plan.' },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 2, channelId: 'insights' },
  });
  return true;
}

export async function cancelAllUserNotifications(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {
    // ignore
  }
}
