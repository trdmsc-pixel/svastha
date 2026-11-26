import React from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { tokens } from '@/theme/tokens';
import { useAppStore } from '@/store/useAppStore';
import { Card } from '@/components/Card';

export default function CalendarScreen() {
  const { activePlan, mealsToday, waterMlToday, tasksToday } = useAppStore();

  return (
    <ScrollView style={styles.safe} contentContainerStyle={styles.scroll}>
      <Card style={styles.mb}>
        <Text style={styles.h2}>Today, 26 Nov 2026</Text>
        <Text style={styles.body}>Meals logged: {mealsToday.length}</Text>
        <Text style={styles.body}>Water logged: {waterMlToday} ml</Text>
        <Text style={styles.body}>
          Routine tasks done: {tasksToday.filter((t) => t.status_today === 'done').length} /{' '}
          {tasksToday.length}
        </Text>
      </Card>
      {activePlan && (
        <Card>
          <Text style={styles.h2}>Target Retest Day</Text>
          <Text style={styles.accent}>{activePlan.retest_date}</Text>
          <Text style={styles.caption}>
            Synced to your phone’s “Svastha” calendar (Google Calendar / iCloud).
          </Text>
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: tokens.color.bg },
  scroll: { padding: tokens.space.lg },
  mb: { marginBottom: tokens.space.md },
  h2: { ...tokens.type.h2, color: tokens.color.ink, marginBottom: 6 },
  body: { ...tokens.type.body, color: tokens.color.ink, marginBottom: 4 },
  accent: { ...tokens.type.h2, color: tokens.color.accentText },
  caption: { ...tokens.type.caption, color: tokens.color.inkMuted, marginTop: 4 },
});
