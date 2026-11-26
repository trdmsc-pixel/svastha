import React, { useEffect } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { tokens } from '@/theme/tokens';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Icon, IconName } from '@/components/Icon';
import { EmptyState, Screen, ScreenHeader, SectionTitle, Stepper, Toggle, ui } from '@/components/ui';
import { useAppStore } from '@/store/useAppStore';
import { useInbox } from '@/hooks/useHealthData';
import { ReminderCategory } from '@/types/domain';
import { formatTime12, hhmmToMinutes, minutesToHHmm } from '@/lib/dates';
import { requestNotificationPermission, sendTestNotification } from '@/lib/notifications';

const CAT: Record<ReminderCategory, [IconName, string]> = { water: ['droplet', 'Water'], meals: ['utensils', 'Meals'], medicines: ['pill', 'Medicines'], routine: ['activity', 'Routine & tasks'], retest: ['target', 'Retest'], insights: ['sparkles', 'Insights'] };

/** Notification inbox + rich reminder preferences. */
export default function NotificationsScreen() {
  const { items, isRead } = useInbox();
  const { markInboxRead, notificationPrefs: p, updateNotificationPrefs: set } = useAppStore();
  useEffect(() => () => markInboxRead(items.map((i) => i.id)), [items, markInboxRead]);
  const time = (k: 'quietStart' | 'quietEnd', label: string) => (
    <View style={[ui.between, { marginTop: 10 }]}><Text style={ui.body}>{label}</Text><Stepper label={label} value={hhmmToMinutes(p[k])} step={30} min={0} max={1439} format={(v) => formatTime12(minutesToHHmm(v))} onChange={(v) => set({ [k]: minutesToHHmm(v) })} /></View>
  );
  return (
    <Screen>
      <ScreenHeader title="Notifications" />
      <ScrollView contentContainerStyle={ui.scroll}>
        {items.length === 0 ? <EmptyState icon="bell" title="You’re all caught up" body="Reminders and insights for today will appear here." /> : items.map((n) => (
          <Card key={n.id} style={{ marginBottom: 10, opacity: isRead(n.id) ? 0.7 : 1 }} onPress={() => { markInboxRead([n.id]); if (n.route) router.navigate(n.route as never); }} accessibilityLabel={n.title}>
            <View style={[ui.row, { gap: 12 }]}>
              <Icon name={CAT[n.category][0]} color={tokens.color.accentText} />
              <View style={{ flex: 1 }}><Text style={ui.h3}>{n.title}</Text><Text style={ui.muted}>{n.body}</Text></View>
              {!isRead(n.id) && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: tokens.color.accent }} />}
            </View>
          </Card>
        ))}
        <SectionTitle>Reminder preferences</SectionTitle>
        <Card>
          <View style={ui.between}><Text style={ui.h3}>All reminders</Text><Toggle label="All reminders" value={p.enabled} onValueChange={async (v) => { if (v) await requestNotificationPermission(); set({ enabled: v }); }} /></View>
          {(Object.keys(CAT) as ReminderCategory[]).map((c) => (
            <View key={c} style={[ui.between, { marginTop: 12 }]}><View style={[ui.row, { gap: 10 }]}><Icon name={CAT[c][0]} size={18} /><Text style={ui.body}>{CAT[c][1]}</Text></View><Toggle label={CAT[c][1]} value={p.categories[c]} disabled={!p.enabled} onValueChange={(v) => set({ categories: { ...p.categories, [c]: v } })} /></View>
          ))}
          <View style={[ui.between, { marginTop: 12 }]}><Text style={ui.body}>Water every</Text><Stepper label="Water interval" value={p.waterIntervalMin} step={15} min={45} max={240} format={(v) => `${v} min`} onChange={(v) => set({ waterIntervalMin: v })} /></View>
          {time('quietStart', 'Quiet hours from')}
          {time('quietEnd', 'Quiet hours until')}
          <View style={[ui.between, { marginTop: 10 }]}><Text style={ui.body}>Daily cap</Text><Stepper label="Daily cap" value={p.dailyCap} min={1} max={30} onChange={(v) => set({ dailyCap: v })} /></View>
          <View style={[ui.between, { marginTop: 12 }]}><Text style={ui.body}>Sound</Text><Toggle label="Sound" value={p.sound} onValueChange={(v) => set({ sound: v })} /></View>
          <View style={[ui.between, { marginTop: 12 }]}><Text style={ui.body}>Weekly summary</Text><Toggle label="Weekly summary" value={p.weeklySummary} onValueChange={(v) => set({ weeklySummary: v })} /></View>
          <Button label="Send a test notification" icon="bell" variant="secondary" style={{ marginTop: 16 }} onPress={async () => { await requestNotificationPermission(); await sendTestNotification(); }} />
        </Card>
      </ScrollView>
    </Screen>
  );
}
