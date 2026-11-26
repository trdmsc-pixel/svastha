import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Tabs, router } from 'expo-router';
import { BlurView } from 'expo-blur';
import { tokens } from '@/theme/tokens';
import { Icon, IconName } from '@/components/Icon';
import { useScanLauncher } from '@/store/useScanLauncher';

function TabIcon({ name, focused }: { name: IconName; focused: boolean }) {
  return (
    <View style={[styles.tabItem, focused && styles.tabItemActive]}>
      <Icon name={name} size={22} color={focused ? tokens.color.white : '#A8A29B'} strokeWidth={focused ? 2.4 : 2} />
      {focused && <View style={styles.activeDot} />}
    </View>
  );
}

/** Frosted charcoal floating tab bar; the glowing Scan button opens the phone camera immediately. */
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: styles.tabBar,
        tabBarBackground: () => (Platform.OS === 'ios' ? <BlurView intensity={50} tint="dark" style={[StyleSheet.absoluteFill, { borderRadius: 34, overflow: 'hidden' }]} /> : null),
      }}
    >
      <Tabs.Screen name="index" options={{ tabBarAccessibilityLabel: 'Today', tabBarIcon: ({ focused }) => <TabIcon name="home" focused={focused} /> }} />
      <Tabs.Screen name="health" options={{ tabBarAccessibilityLabel: 'Health reports', tabBarIcon: ({ focused }) => <TabIcon name="report" focused={focused} /> }} />
      <Tabs.Screen
        name="scan"
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            useScanLauncher.getState().request('camera');
            router.navigate('/(tabs)/scan');
          },
        }}
        options={{
          tabBarAccessibilityLabel: 'Scan a meal with the camera',
          tabBarIcon: () => (
            <View style={styles.scanButton}>
              <Icon name="camera" size={24} color={tokens.color.onAccent} strokeWidth={2.2} />
            </View>
          ),
        }}
      />
      <Tabs.Screen name="plan" options={{ tabBarAccessibilityLabel: 'Plan and recipes', tabBarIcon: ({ focused }) => <TabIcon name="star" focused={focused} /> }} />
      <Tabs.Screen name="me" options={{ tabBarAccessibilityLabel: 'Profile and settings', tabBarIcon: ({ focused }) => <TabIcon name="user" focused={focused} /> }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Platform.OS === 'ios' ? 'rgba(32,30,28,0.78)' : tokens.color.glassDark,
    height: 72,
    borderTopWidth: 0,
    borderRadius: 34,
    marginHorizontal: 16,
    marginBottom: Platform.OS === 'ios' ? 24 : 14,
    position: 'absolute',
    paddingBottom: 0,
    paddingTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.22,
    shadowRadius: 24,
    elevation: 10,
  },
  tabItem: { alignItems: 'center', justifyContent: 'center', minWidth: 48, minHeight: 44, borderRadius: 16 },
  tabItemActive: {},
  activeDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: tokens.color.accent, marginTop: 4, shadowColor: tokens.color.accent, shadowOpacity: 0.9, shadowRadius: 4, shadowOffset: { width: 0, height: 0 } },
  scanButton: {
    width: 60,
    height: 60,
    borderRadius: 22,
    backgroundColor: tokens.color.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 26,
    borderWidth: 4,
    borderColor: tokens.color.bg,
    ...tokens.shadow.glow,
  },
});
