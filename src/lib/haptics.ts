import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import { useAppStore } from '@/store/useAppStore';

const enabled = () => Platform.OS !== 'web' && useAppStore.getState().settings.haptics;

export const haptic = {
  tap: () => {
    if (enabled()) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
  },
  select: () => {
    if (enabled()) Haptics.selectionAsync().catch(() => undefined);
  },
  success: () => {
    if (enabled()) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
  },
  warn: () => {
    if (enabled()) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
  },
};
