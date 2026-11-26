import React, { useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { tokens } from '@/theme/tokens';
import { useAppStore } from '@/store/useAppStore';
import { useDailyTargets, useDayLog, useDayTotals, useTasksFor } from '@/hooks/useHealthData';
import {
  addMonths,
  formatTime12,
  friendlyDayLabel,
  fromDateKey,
  isSameMonth,
  monthGrid,
  monthTitle,
  todayKey,
  WEEKDAYS_SHORT,
} from '@/lib/dates';
import { calendarSupported, DeviceEvent, fetchDeviceEvents, getCalendarPermission, requestCalendarPermission, syncPlanToDeviceCalendar } from '@/lib/calendarSync';
import { router } from 'expo-router';
import { Screen, ScreenHeader, SectionTitle, IconButton } from '@/components/ui';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';

export default function CalendarScreen() {
  const {
    selectedDate,
    setSelectedDate,
    days,
    activePlan,
    tasks,
    deviceEventIds,
    setDeviceEventIds,
    toggleTaskDone,
    addWater,
    settings,
  } = useAppStore();
  const [calPerm, setCalPerm] = useState<'granted' | 'denied' | 'undetermined' | 'unsupported'>('unsupported');
  const [permTick, setPermTick] = useState(0);
  useEffect(() => {
    getCalendarPermission().then(setCalPerm).catch(() => setCalPerm('unsupported'));
  }, [permTick]);

  const [monthCursor, setMonthCursor] = useState(selectedDate);
  const [deviceEvents, setDeviceEvents] = useState<DeviceEvent[]>([]);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const dayLog = useDayLog(selectedDate);
  const dayTotals = useDayTotals(selectedDate);
  const dayTasks = useTasksFor(selectedDate);
  const targets = useDailyTargets();

  const grid = useMemo(() => monthGrid(monthCursor), [monthCursor]);
  const today = todayKey();

  useEffect(() => {
    if (!calendarSupported || calPerm !== 'granted' || !settings.showDeviceCalendarEvents) {
      setDeviceEvents([]);
      return;
    }
    const d = fromDateKey(selectedDate);
    const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0);
    const end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59);
    fetchDeviceEvents(start, end).then(setDeviceEvents).catch(() => setDeviceEvents([]));
  }, [selectedDate, calPerm, settings.showDeviceCalendarEvents]);

  const handleSync = async () => {
    const res = await syncPlanToDeviceCalendar(tasks, activePlan?.retest_date, deviceEventIds);
    if (res.ok) setDeviceEventIds(res.eventIds);
    setSyncMessage(res.message);
    setPermTick((t) => t + 1);
  };

  return (
    <Screen>
      <ScreenHeader
        title="Calendar"
        subtitle={selectedDate === todayKey() ? 'Tap a day to view or log it' : 'Viewing a different day'}
        right={
          <IconButton
            icon="calendar"
            label="Jump to today"
            onPress={() => {
              setSelectedDate(today);
              setMonthCursor(today);
            }}
          />
        }
      />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Month Grid */}
        <Card style={styles.calCard}>
          <View style={styles.monthBar}>
            <IconButton
              icon="chevronLeft"
              label="Previous month"
              size={38}
              onPress={() => setMonthCursor(addMonths(monthCursor, -1))}
            />
            <Text style={styles.monthText}>{monthTitle(monthCursor)}</Text>
            <IconButton
              icon="chevronRight"
              label="Next month"
              size={38}
              onPress={() => setMonthCursor(addMonths(monthCursor, 1))}
            />
          </View>

          <View style={styles.weekHeader}>
            {WEEKDAYS_SHORT.map((w) => (
              <Text key={w} style={styles.weekLabel}>
                {w}
              </Text>
            ))}
          </View>

          <View style={styles.grid}>
            {grid.map((key) => {
              const inMonth = isSameMonth(key, monthCursor);
              const isSelected = key === selectedDate;
              const isToday = key === today;
              const isRetest = activePlan?.retest_date === key;
              const log = days[key];
              const hasMeals = (log?.meals.length ?? 0) > 0;
              const metWater = (log?.waterMl ?? 0) >= targets.water_ml;
              const dayNum = parseInt(key.slice(8, 10), 10);

              return (
                <Pressable
                  key={key}
                  onPress={() => setSelectedDate(key)}
                  accessibilityRole="button"
                  accessibilityLabel={friendlyDayLabel(key)}
                  style={[
                    styles.cell,
                    isSelected && styles.cellSelected,
                    isRetest && !isSelected && styles.cellRetest,
                  ]}
                >
                  <Text
                    style={[
                      styles.cellNum,
                      !inMonth && styles.cellMuted,
                      isToday && !isSelected && styles.cellToday,
                      isSelected && styles.cellNumSelected,
                    ]}
                  >
                    {dayNum}
                  </Text>
                  <View style={styles.dotRow}>
                    {hasMeals && <View style={[styles.dot, { backgroundColor: tokens.color.accent }]} />}
                    {metWater && <View style={[styles.dot, { backgroundColor: tokens.color.ok }]} />}
                    {isRetest && <View style={[styles.dot, { backgroundColor: tokens.color.ink }]} />}
                  </View>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: tokens.color.accent }]} />
              <Text style={styles.legendText}>Meals</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: tokens.color.ok }]} />
              <Text style={styles.legendText}>Water goal</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: tokens.color.ink }]} />
              <Text style={styles.legendText}>Retest day</Text>
            </View>
          </View>
        </Card>

        {/* Selected Day Summary */}
        <SectionTitle style={styles.secHead}>{friendlyDayLabel(selectedDate)}</SectionTitle>
        <Card style={styles.mb}>
          <View style={styles.statRow}>
            <View style={styles.statBox}>
              <Text style={styles.statVal}>{dayTotals.kcal}</Text>
              <Text style={styles.statLabel}>kcal ({dayLog.meals.length} meals)</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statVal}>{dayLog.waterMl} ml</Text>
              <Text style={styles.statLabel}>of {targets.water_ml} ml water</Text>
            </View>
          </View>
          <Button
            label="+ 250 ml water for this day"
            variant="secondary"
            onPress={() => addWater(250, selectedDate)}
            style={{ marginTop: tokens.space.md }}
          />
        </Card>

        {/* Routine & Plan Tasks */}
        <SectionTitle style={styles.secHead}>Routine & Plan Tasks</SectionTitle>
        <Card style={styles.mb}>
          {dayTasks.length === 0 ? (
            <Text style={styles.muted}>No tasks scheduled for this day yet.</Text>
          ) : (
            dayTasks.map((task) => (
              <Pressable
                key={task.id}
                onPress={() => toggleTaskDone(task.id, selectedDate)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: task.done }}
                style={styles.taskRow}
              >
                <View style={[styles.checkbox, task.done && styles.checkboxDone]}>
                  {task.done && <Icon name="check" size={14} color={tokens.color.white} strokeWidth={3} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.taskTitle, task.done && styles.taskDone]}>{task.title}</Text>
                  <Text style={styles.muted}>{formatTime12(task.scheduled_at)}</Text>
                </View>
              </Pressable>
            ))
          )}
        </Card>

        {/* Device Calendar Sync */}
        <SectionTitle style={styles.secHead}>Phone Calendar Sync</SectionTitle>
        <Card style={styles.mb}>
          {activePlan && (
            <Text style={styles.retestLine}>
              Target Retest Day: {activePlan.retest_date} ({activePlan.retest_weeks} weeks)
            </Text>
          )}
          <Text style={styles.muted}>
            {Platform.OS === 'web'
              ? 'Open Svastha on iOS or Android to sync tasks into your phone’s “Svastha” calendar (Google Calendar / iCloud).'
              : 'Events live in a dedicated “Svastha” calendar so they sync to Google Calendar & iCloud automatically.'}
          </Text>
          {calendarSupported && calPerm !== 'granted' && (
            <Button
              label={calPerm === 'denied' ? 'Calendar access is off — enable in phone Settings' : 'Connect my phone calendar'}
              icon="calendar"
              variant="accent"
              disabled={calPerm === 'denied'}
              onPress={async () => { await requestCalendarPermission(); setPermTick((t) => t + 1); }}
              style={{ marginTop: tokens.space.md }}
            />
          )}
          {calPerm === 'granted' && settings.showDeviceCalendarEvents && (
            <View style={{ marginTop: tokens.space.sm, gap: 6 }}>
              <Text style={[styles.muted, { fontWeight: '700' }]}>From your phone calendar</Text>
              {deviceEvents.length === 0 ? (
                <Text style={styles.muted}>No events on this day.</Text>
              ) : (
                deviceEvents.slice(0, 8).map((ev) => (
                  <View key={ev.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: ev.color }} />
                    <Text style={[styles.eventItem, { flex: 1 }]}>
                      {ev.allDay ? 'All day' : new Date(ev.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {ev.title}
                    </Text>
                    <Text style={styles.muted}>{ev.calendarTitle}</Text>
                  </View>
                ))
              )}
            </View>
          )}
          {syncMessage && <Text style={styles.syncMsg}>{syncMessage}</Text>}
          <Button
            label="Sync to Device Calendar"
            variant="secondary"
            onPress={handleSync}
            style={{ marginTop: tokens.space.md }}
          />
          <Button label="Open this day on Today" icon="home" variant="ghost" onPress={() => router.navigate('/(tabs)')} />
        </Card>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: tokens.space.lg, paddingBottom: 48 },
  calCard: { padding: tokens.space.md, marginBottom: tokens.space.md },
  monthBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: tokens.space.sm,
  },
  monthText: { ...tokens.type.h2, color: tokens.color.ink },
  weekHeader: { flexDirection: 'row', marginBottom: 6 },
  weekLabel: {
    flex: 1,
    textAlign: 'center',
    ...tokens.type.caption,
    color: tokens.color.inkMuted,
    fontWeight: '600',
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: {
    width: '14.2857%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
  },
  cellSelected: { backgroundColor: tokens.color.ink },
  cellRetest: { borderWidth: 1.5, borderColor: tokens.color.accent },
  cellNum: { ...tokens.type.label, color: tokens.color.ink, fontVariant: ['tabular-nums'] },
  cellMuted: { color: '#B5ADA3' },
  cellToday: { color: tokens.color.accentText, fontWeight: '700' },
  cellNumSelected: { color: tokens.color.white, fontWeight: '700' },
  dotRow: { flexDirection: 'row', gap: 3, marginTop: 2, height: 6 },
  dot: { width: 5, height: 5, borderRadius: 2.5 },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: tokens.space.lg,
    marginTop: tokens.space.sm,
    paddingTop: tokens.space.sm,
    borderTopWidth: 1,
    borderTopColor: tokens.color.border,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendText: { ...tokens.type.caption, color: tokens.color.inkMuted },
  secHead: { marginTop: tokens.space.sm, marginBottom: tokens.space.xs },
  mb: { marginBottom: tokens.space.md, padding: tokens.space.lg },
  statRow: { flexDirection: 'row', gap: tokens.space.md },
  statBox: {
    flex: 1,
    backgroundColor: tokens.color.surfaceMuted,
    borderRadius: 16,
    padding: tokens.space.md,
  },
  statVal: { fontSize: 22, fontWeight: '700', color: tokens.color.ink, fontVariant: ['tabular-nums'] },
  statLabel: { ...tokens.type.caption, color: tokens.color.inkMuted, marginTop: 2 },
  muted: { ...tokens.type.caption, color: tokens.color.inkMuted },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space.md,
    paddingVertical: tokens.space.sm,
    minHeight: 46,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: tokens.color.inkMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxDone: { backgroundColor: tokens.color.ok, borderColor: tokens.color.ok },
  taskTitle: { ...tokens.type.body, color: tokens.color.ink },
  taskDone: { textDecorationLine: 'line-through', color: tokens.color.inkMuted },
  retestLine: { ...tokens.type.label, color: tokens.color.accentText, fontWeight: '700', marginBottom: 4 },
  eventItem: { ...tokens.type.caption, color: tokens.color.ink },
  syncMsg: { ...tokens.type.caption, color: tokens.color.accentText, marginTop: 8, fontWeight: '600' },
});