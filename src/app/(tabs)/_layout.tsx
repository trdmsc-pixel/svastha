import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Tabs } from 'expo-router';
import { tokens } from '@/theme/tokens';

function TabIcon({ glyph, label, focused }: { glyph: string; label: string; focused: boolean }) {
  return (
    <View style={styles.tabItem} accessibilityLabel={label}>
      <Text style={[styles.glyph, { color: focused ? tokens.color.accent : '#CFCAC4' }]}>
        {glyph}
      </Text>
      <Text style={[styles.tabLabel, { color: focused ? tokens.color.white : '#CFCAC4' }]}>
        {label}
      </Text>
    </View>
  );
}

/**
 * Dark charcoal 5-slot bottom tab bar with raised peach Scan button (charcoal icon, 6.43:1 WCAG AA).
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
          tabBarIcon: ({ focused }) => <TabIcon glyph="⌂" label="Today" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="health"
        options={{
          title: 'Health',
          tabBarAccessibilityLabel: 'Health reports tab',
          tabBarIcon: ({ focused }) => <TabIcon glyph="◫" label="Health" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: 'Scan',
          tabBarAccessibilityLabel: 'Scan meal or lab report',
          tabBarIcon: () => (
            <View style={styles.scanButton} accessible accessibilityLabel="Scan">
              <Text style={styles.scanGlyph}>⊞</Text>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="plan"
        options={{
          title: 'Plan',
          tabBarAccessibilityLabel: 'Health plan tab',
          tabBarIcon: ({ focused }) => <TabIcon glyph="★" label="Plan" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="me"
        options={{
          title: 'Me',
          tabBarAccessibilityLabel: 'Profile and settings tab',
          tabBarIcon: ({ focused }) => <TabIcon glyph="⚙" label="Me" focused={focused} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: tokens.color.ink,
    height: 76,
    borderTopWidth: 0,
    borderRadius: 32,
    marginHorizontal: 14,
    marginBottom: 14,
    position: 'absolute',
    paddingBottom: 6,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 48,
    minHeight: 44,
  },
  glyph: {
    fontSize: 20,
  },
  tabLabel: {
    fontSize: 11,
    marginTop: 2,
    fontWeight: '500',
  },
  scanButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: tokens.color.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
    borderWidth: 4,
    borderColor: tokens.color.bg,
  },
  scanGlyph: {
    fontSize: 24,
    fontWeight: '700',
    color: tokens.color.onAccent, // Charcoal on peach (6.43:1)
  },
});
