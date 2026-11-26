import React from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { tokens } from '@/theme/tokens';
import { useAppStore } from '@/store/useAppStore';
import { Card } from '@/components/Card';

export default function RoutineScreen() {
  const { tasksToday } = useAppStore();
  return (
    <ScrollView style={styles.safe} contentContainerStyle={styles.scroll}>
      <Text style={styles.caption}>Templates: Morning · Work Day · Evening Wind-down · Fasting Day</Text>
      {tasksToday.map((t) => (
        <Card key={t.id} style={styles.mb}>
          <Text style={styles.time}>{t.scheduled_at}</Text>
          <Text style={styles.title}>{t.title}</Text>
          <Text style={styles.caption}>
            Repeat: {t.repeat_rule} · Reminder: {t.reminder ? 'On' : 'Off'} · Calendar sync:{' '}
            {t.calendar_sync ? 'On' : 'Off'}
          </Text>
        </Card>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: tokens.color.bg },
  scroll: { padding: tokens.space.lg },
  mb: { marginBottom: tokens.space.md },
  time: { ...tokens.type.label, color: tokens.color.accentText, fontWeight: '700' },
  title: { ...tokens.type.body, color: tokens.color.ink, fontWeight: '600', marginVertical: 2 },
  caption: { ...tokens.type.caption, color: tokens.color.inkMuted, marginBottom: 10 },
});
