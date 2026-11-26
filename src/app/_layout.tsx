import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { tokens } from '@/theme/tokens';

const queryClient = new QueryClient();

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="dark" backgroundColor={tokens.color.bg} />
        <View style={styles.outerShell}>
          <View style={styles.mobileFrame}>
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: tokens.color.bg },
              }}
            >
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="(auth)/welcome" />
              <Stack.Screen name="(auth)/register" />
              <Stack.Screen name="(auth)/login" />
              <Stack.Screen name="(auth)/profile-setup" />
              <Stack.Screen name="calendar" options={{ headerShown: true, title: 'Calendar' }} />
              <Stack.Screen name="notifications" options={{ headerShown: true, title: 'Notifications' }} />
              <Stack.Screen name="routine" options={{ headerShown: true, title: 'Daily Routine' }} />
              <Stack.Screen name="report/chat" options={{ headerShown: true, title: 'Ask About This Report' }} />
            </Stack>
          </View>
        </View>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  outerShell: {
    flex: 1,
    backgroundColor: Platform.OS === 'web' ? '#E4DDD4' : tokens.color.bg,
    alignItems: 'center',
  },
  mobileFrame: {
    flex: 1,
    width: '100%',
    maxWidth: Platform.OS === 'web' ? 430 : undefined,
    backgroundColor: tokens.color.bg,
    overflow: 'hidden',
    ...(Platform.OS === 'web'
      ? {
          shadowColor: '#2B2B2B',
          shadowOffset: { width: 0, height: 12 },
          shadowOpacity: 0.12,
          shadowRadius: 32,
        }
      : {}),
  },
});