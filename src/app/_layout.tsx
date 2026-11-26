import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';
import { Stack, router, useSegments } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { tokens } from '@/theme/tokens';
import { useAuthStore } from '@/store/useAuthStore';
import { switchUserData, useAppStore } from '@/store/useAppStore';
import { AppLock } from '@/components/AppLock';
import { ScreenBackground } from '@/components/ui';
import { useReminderSchedule } from '@/hooks/useHealthData';
import { applyReminderSchedule, configureNotificationChannels } from '@/lib/notifications';

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

export default function RootLayout() {
  const ready = useBootstrap();
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
              </Stack>
              {!ready && (
                <View style={[StyleSheet.absoluteFill, styles.splash]}>
                  <ScreenBackground />
                  <ActivityIndicator color={tokens.color.accentText} size="large" />
                </View>
              )}
              {ready && <ReminderSync />}
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
  splash: { alignItems: 'center', justifyContent: 'center', backgroundColor: tokens.color.bg, zIndex: 50 },
});
