import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Card } from '@/components/Card';
import { Screen, ScreenHeader, Toggle, ui } from '@/components/ui';
import { useAppStore } from '@/store/useAppStore';
import { formatTime12 } from '@/lib/dates';

export default function RoutineScreen() {
  const { tasks, upsertTask } = useAppStore();
  return (
    <Screen>
      <ScreenHeader title="Daily routine" />
      <ScrollView contentContainerStyle={ui.scroll}>
        {tasks.map((t) => (
          <Card key={t.id} style={{ marginBottom: 10 }}>
            <Text style={ui.accent}>{formatTime12(t.scheduled_at)}</Text>
            <Text style={ui.h3}>{t.title}</Text>
            <View style={[ui.between, { marginTop: 8 }]}><Text style={ui.label}>Reminder</Text><Toggle label="Reminder" value={t.reminder} onValueChange={(v) => upsertTask({ ...t, reminder: v })} /></View>
            <View style={[ui.between, { marginTop: 8 }]}><Text style={ui.label}>Sync to phone calendar</Text><Toggle label="Calendar sync" value={t.calendar_sync} onValueChange={(v) => upsertTask({ ...t, calendar_sync: v })} /></View>
          </Card>
        ))}
      </ScrollView>
    </Screen>
  );
}
