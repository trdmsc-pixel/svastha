import React, { useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { tokens } from '@/theme/tokens';
import { Card } from '@/components/Card';
import { DEFAULT_NOTIFICATION_PREFS } from '@/lib/notifications';

export default function NotificationsScreen() {
  const [prefs, setPrefs] = useState(DEFAULT_NOTIFICATION_PREFS);

  return (
    <ScrollView style={styles.safe} contentContainerStyle={styles.scroll}>
      <Card>
        <Text style={styles.h2}>Reminder Categories</Text>
        <Text style={styles.caption}>
          Quiet hours: {prefs.quietStart} – {prefs.quietEnd} · Daily cap: {prefs.dailyCap} notifications
        </Text>
        {(['water', 'meals', 'medicines', 'routine', 'retest'] as const).map((key) => (
          <View key={key} style={styles.row}>
            <Text style={styles.label}>{key.charAt(0).toUpperCase() + key.slice(1)} reminders</Text>
            <Switch
              value={prefs[key]}
              onValueChange={(val) => setPrefs((p) => ({ ...p, [key]: val }))}
            />
          </View>
        ))}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: tokens.color.bg },
  scroll: { padding: tokens.space.lg },
  h2: { ...tokens.type.h2, color: tokens.color.ink, marginBottom: 6 },
  caption: { ...tokens.type.caption, color: tokens.color.inkMuted, marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  label: { ...tokens.type.body, color: tokens.color.ink },
});
