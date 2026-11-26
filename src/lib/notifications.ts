import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export interface NotificationPrefs {
  water: boolean;
  meals: boolean;
  medicines: boolean;
  routine: boolean;
  retest: boolean;
  quietStart: string; // HH:mm
  quietEnd: string; // HH:mm
  dailyCap: number; // default 12
}

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  water: true,
  meals: true,
  medicines: true,
  routine: true,
  retest: true,
  quietStart: '22:30',
  quietEnd: '07:00',
  dailyCap: 12,
};

export async function configureNotificationChannels() {
  if (Platform.OS === 'android') {
    const channels = ['water', 'meals', 'medicines', 'routine', 'retest'];
    for (const id of channels) {
      await Notifications.setNotificationChannelAsync(id, {
        name: `Svastha ${id.charAt(0).toUpperCase() + id.slice(1)}`,
        importance: id === 'medicines' ? Notifications.AndroidImportance.HIGH : Notifications.AndroidImportance.DEFAULT,
      });
    }
  }

  if (Platform.OS !== 'web') {
    await Notifications.setNotificationCategoryAsync('medicine_reminder', [
      { identifier: 'TAKEN', buttonTitle: 'Taken', options: { opensAppToForeground: false } },
      { identifier: 'SNOOZE_10', buttonTitle: 'Snooze 10 min', options: { opensAppToForeground: false } },
      { identifier: 'SKIP', buttonTitle: 'Skip', options: { opensAppToForeground: false } },
    ]);
  }
}

export async function cancelAllUserNotifications() {
  if (Platform.OS === 'web') return;
  await Notifications.cancelAllScheduledNotificationsAsync();
}
