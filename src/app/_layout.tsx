import React, { useEffect, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { Stack, router, useSegments } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import Animated, {
  FadeInUp,
  FadeOut,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import * as Notifications from 'expo-notifications';
import { tokens } from '@/theme/tokens';
import { itemToTickFromAction, NOTIFICATION_ACTIONS } from '@/engine/programmeEngine';
import { selectFlags, useProgrammeStore } from '@/store/useProgrammeStore';
import { getProgramme } from '@/hooks/useProgramme';
import { todayKey } from '@/lib/dates';
import { useAuthStore } from '@/store/useAuthStore';
import { switchUserData, useAppStore } from '@/store/useAppStore';
import { AppLock } from '@/components/AppLock';
import { Icon } from '@/components/Icon';
import { ScreenBackground } from '@/components/ui';
import { useReminderSchedule } from '@/hooks/useHealthData';
import { applyReminderSchedule, configureNotificationChannels, snoozeNotification } from '@/lib/notifications';

const queryClient = new QueryClient();

/** Loads the signed-in user's own data namespace once auth storage has hydrated. */
function useBootstrap(): boolean {
  const authHydrated = useAuthStore((s) => s.hasHydrated);
  const session = useAuthStore((s) => s.session);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!authHydrated) return;
    let alive = true;
    switchUserData(session?.userId ?? null, { seedDemo: session?.mode === 'demo' }).finally(() => alive && setReady(true));
    configureNotificationChannels().catch(() => undefined);
    return () => {
      alive = false;
    };
    // Only on first hydration — later sign-ins switch namespaces themselves.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authHydrated]);
  return ready;
}

/** Redirects between welcome → onboarding → app based on session state. */
function useRouteGuard(ready: boolean) {
  const segments = useSegments();
  const session = useAuthStore((s) => s.session);
  const onboarded = useAppStore((s) => s.onboardingComplete);
  useEffect(() => {
    if (!ready) return;
    const seg = segments as string[];
    const inAuth = seg[0] === '(auth)';
    const screen = seg[1];
    if (!session) {
      if (!inAuth || screen === 'profile-setup') router.replace('/(auth)/welcome');
    } else if (!onboarded) {
      if (screen !== 'profile-setup') router.replace('/(auth)/profile-setup');
    } else if (inAuth && screen !== 'profile-setup') {
      router.replace('/(tabs)');
    }
  }, [ready, session, onboarded, segments]);
}

/** Keeps device notifications in sync with prefs, plan tasks and profile times. */
function ReminderSync() {
  const schedule = useReminderSchedule();
  const sound = useAppStore((s) => s.notificationPrefs.sound);
  const session = useAuthStore((s) => s.session);
  useEffect(() => {
    if (!session || Platform.OS === 'web') return;
    const t = setTimeout(() => {
      applyReminderSchedule(schedule, sound).catch(() => undefined);
    }, 800);
    return () => clearTimeout(t);
  }, [schedule, sound, session]);
  return null;
}

/**
 * Handles notification action buttons. "Done ✓" (routine) and "Taken" (medicine) tick today's
 * item without opening the app — only if it isn't ticked yet. "Snooze 10 min" re-sends in 10 min.
 * Mounted only after the user's data namespace has loaded, so ticks land in the right account.
 */
const handledResponses = new Set<string>();
function NotificationActions() {
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const handle = async (resp: Notifications.NotificationResponse | null) => {
      if (!resp) return;
      const key = `${resp.notification.request.identifier}:${resp.actionIdentifier}:${resp.notification.date}`;
      if (handledResponses.has(key)) return;
      handledResponses.add(key);
      const action = resp.actionIdentifier;
      const data = (resp.notification.request.content.data ?? {}) as { reminderId?: string; itemId?: string | null };
      if (action === NOTIFICATION_ACTIONS.snooze) {
        await snoozeNotification(resp.notification.request.content).catch(() => undefined);
      } else if (action === NOTIFICATION_ACTIONS.done || action === NOTIFICATION_ACTIONS.taken) {
        const st = useProgrammeStore.getState();
        const p = getProgramme(st.programmeId);
        const today = todayKey();
        const itemId = p ? itemToTickFromAction(p, today, action, data.reminderId ?? '', st.checks[today], selectFlags(st), data.itemId) : null;
        if (itemId) st.toggleCheck(today, itemId);
      }
      if (action !== Notifications.DEFAULT_ACTION_IDENTIFIER) {
        await Notifications.dismissNotificationAsync(resp.notification.request.identifier).catch(() => undefined);
      }
    };
    Notifications.getLastNotificationResponseAsync().then(handle).catch(() => undefined);
    const sub = Notifications.addNotificationResponseReceivedListener((r) => {
      handle(r).catch(() => undefined);
    });
    return () => sub.remove();
  }, []);
  return null;
}

function AnimatedLaunchOverlay() {
  const reduced = useReducedMotion();
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (reduced) return;
    pulse.value = withRepeat(
      withSequence(withTiming(1.08, { duration: 700 }), withTiming(1, { duration: 700 })),
      -1,
      true
    );
  }, [reduced, pulse]);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  return (
    <Animated.View
      exiting={reduced ? undefined : FadeOut.duration(320)}
      style={[StyleSheet.absoluteFill, styles.splash]}
    >
      <ScreenBackground />
      <Animated.View style={[styles.splashRing, ringStyle]}>
        <View style={styles.splashBadge}>
          <Icon name="zap" size={32} color={tokens.color.onAccent} strokeWidth={2.4} />
        </View>
      </Animated.View>
      <Animated.View entering={reduced ? undefined : FadeInUp.duration(420)} style={{ alignItems: 'center' }}>
        <Text style={styles.splashTitle}>Svastha</Text>
        <Text style={styles.splashSub}>Your Lab Report, Decoded By AI</Text>
      </Animated.View>
    </Animated.View>
  );
}

export default function RootLayout() {
  const hydrated = useBootstrap();
  const [minDelayDone, setMinDelayDone] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMinDelayDone(true), 650);
    return () => clearTimeout(t);
  }, []);
  const ready = hydrated && minDelayDone;
  useRouteGuard(ready);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style="dark" />
          <View style={styles.outerShell}>
            <View style={styles.mobileFrame}>
              <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: tokens.color.bg }, animation: 'slide_from_right' }}>
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="(auth)/welcome" options={{ animation: 'fade' }} />
                <Stack.Screen name="(auth)/register" />
                <Stack.Screen name="(auth)/login" />
                <Stack.Screen name="(auth)/profile-setup" />
                <Stack.Screen name="calendar" />
                <Stack.Screen name="notifications" />
                <Stack.Screen name="routine" />
                <Stack.Screen name="report/chat" />
                <Stack.Screen name="programme/setup" options={{ animation: 'fade_from_bottom' }} />
                <Stack.Screen name="programme/food" />
                <Stack.Screen name="programme/move" />
                <Stack.Screen name="programme/progress" />
                <Stack.Screen name="programme/doctor" />
                <Stack.Screen name="programme/times" />
              </Stack>
              {!ready && <AnimatedLaunchOverlay />}
              {ready && <ReminderSync />}
              {ready && <NotificationActions />}
              <AppLock />
            </View>
          </View>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  outerShell: {
    flex: 1,
    backgroundColor: Platform.OS === 'web' ? '#E7DED3' : tokens.color.bg,
    alignItems: 'center',
  },
  mobileFrame: {
    flex: 1,
    width: '100%',
    maxWidth: Platform.OS === 'web' ? 440 : undefined,
    backgroundColor: tokens.color.bg,
    overflow: 'hidden',
    ...(Platform.OS === 'web' ? { shadowColor: '#5A3A22', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.14, shadowRadius: 40 } : {}),
  },
  splash: { alignItems: 'center', justifyContent: 'center', backgroundColor: tokens.color.bg, zIndex: 50, gap: 18 },
  splashRing: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: 'rgba(240, 154, 106, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashBadge: {
    width: 72,
    height: 72,
    borderRadius: 26,
    backgroundColor: tokens.color.accent,
    alignItems: 'center',
    justifyContent: 'center',
    ...tokens.shadow.glow,
  },
  splashTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: tokens.color.ink,
    letterSpacing: -0.6,
  },
  splashSub: {
    ...tokens.type.label,
    color: tokens.color.inkMuted,
    marginTop: 4,
  },
});
