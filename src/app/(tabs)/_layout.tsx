import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { tokens } from '@/theme/tokens';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

function TabIcon({
  name,
  activeName,
  focused,
  label,
}: {
  name: IoniconName;
  activeName: IoniconName;
  focused: boolean;
  label: string;
}) {
  return (
    <View style={styles.tabItem} accessibilityLabel={label}>
      <Ionicons
        name={focused ? activeName : name}
        size={22}
        color={focused ? tokens.color.white : '#9A958E'}
      />
      {focused && <View style={styles.activeDot} />}
    </View>
  );
}

/**
 * Dark charcoal 5-slot floating bottom tab bar with raised peach squircle Scan button
 * (charcoal icon on peach = 6.43:1 WCAG AA).
 */
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: styles.tabBar,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Today',
          tabBarAccessibilityLabel: 'Today tab',
          tabBarIcon: ({ focused }) => (
            <TabIcon name="home-outline" activeName="home" focused={focused} label="Today" />
          ),
        }}
      />
      <Tabs.Screen
        name="health"
        options={{
          title: 'Health',
          tabBarAccessibilityLabel: 'Health reports tab',
          tabBarIcon: ({ focused }) => (
            <TabIcon
              name="document-text-outline"
              activeName="document-text"
              focused={focused}
              label="Health"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: 'Scan',
          tabBarAccessibilityLabel: 'Scan meal or lab report',
          tabBarIcon: () => (
            <View style={styles.scanButton} accessible accessibilityLabel="Scan">
              <Ionicons name="scan-outline" size={24} color={tokens.color.onAccent} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="plan"
        options={{
          title: 'Plan',
          tabBarAccessibilityLabel: 'Health plan tab',
          tabBarIcon: ({ focused }) => (
            <TabIcon name="star-outline" activeName="star" focused={focused} label="Plan" />
          ),
        }}
      />
      <Tabs.Screen
        name="me"
        options={{
          title: 'Me',
          tabBarAccessibilityLabel: 'Profile and settings tab',
          tabBarIcon: ({ focused }) => (
            <TabIcon
              name="settings-outline"
              activeName="settings"
              focused={focused}
              label="Me"
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: tokens.color.ink,
    height: 70,
    borderTopWidth: 0,
    borderRadius: 34,
    marginHorizontal: 16,
    marginBottom: 14,
    position: 'absolute',
    paddingBottom: 0,
    paddingTop: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 20,
    elevation: 8,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 48,
    minHeight: 44,
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: tokens.color.accent,
    marginTop: 4,
  },
  scanButton: {
    width: 56,
    height: 56,
    borderRadius: 20,
    backgroundColor: tokens.color.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    borderWidth: 4,
    borderColor: tokens.color.bg,
    shadowColor: tokens.color.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
});