import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { tokens } from '@/theme/tokens';
import { useAppStore } from '@/store/useAppStore';
import { Card } from '@/components/Card';
import { SegmentArc } from '@/components/SegmentArc';
import { MacroRow } from '@/components/MacroRow';

export default function TodayScreen() {
  const { activePlan, mealsToday, waterMlToday, tasksToday, addWater, toggleTaskDone } =
    useAppStore();

  const eatenKcal = mealsToday.reduce((sum, m) => sum + m.total.kcal, 0);
  const goalKcal = activePlan?.daily_targets.kcal ?? 2000;
  const waterGoal = activePlan?.daily_targets.water_ml ?? 2500;
  const glassesFilled = Math.round(waterMlToday / 250);
  const glassesTarget = Math.round(waterGoal / 250);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <Pressable
            onPress={() => router.push('/calendar')}
            accessibilityRole="button"
            accessibilityLabel="Open Calendar"
            style={styles.iconBtn}
          >
            <Text style={styles.iconText}>📅</Text>
          </Pressable>
          <Text style={styles.headerDate}>Today, 26 Nov</Text>
          <Pressable
            onPress={() => router.push('/notifications')}
            accessibilityRole="button"
            accessibilityLabel="Notifications, 2 new"
            style={styles.iconBtn}
          >
            <Text style={styles.iconText}>🔔</Text>
          </Pressable>
        </View>

        {/* Calorie Arc */}
        <Card style={styles.arcCard}>
          <SegmentArc
            eatenKcal={eatenKcal}
            goalKcal={goalKcal}
            dateLabel="Daily Calories"
            onPress={() => router.push('/(tabs)/plan')}
          />
          <Pressable
            onPress={() => router.push('/(tabs)/scan')}
            accessibilityRole="button"
            accessibilityLabel="Quick add meal, water, or routine task"
            style={styles.addBar}
          >
            <Text style={styles.addBarText}>+  Scan meal · Search food · Add water</Text>
          </Pressable>
        </Card>

        {/* Water Row */}
        <Card style={styles.sectionCard}>
          <View style={styles.rowBetween}>
            <View>
              <Text style={styles.sectionTitle}>Hydration</Text>
              <Text style={styles.mutedText}>
                {glassesFilled} / {glassesTarget} glasses ({waterMlToday} ml / {waterGoal} ml)
              </Text>
            </View>
            <Pressable
              onPress={() => addWater(250)}
              accessibilityRole="button"
              accessibilityLabel="Add 250 millilitres of water"
              style={styles.waterBtn}
            >
              <Text style={styles.waterBtnText}>+ 250 ml</Text>
            </Pressable>
          </View>
        </Card>

        {/* Meals */}
        <Text style={styles.groupHeading}>Today’s Meals</Text>
        {mealsToday.map((meal) => {
          const pct = Math.round((meal.total.kcal / goalKcal) * 100);
          return (
            <Card key={meal.id} style={styles.sectionCard}>
              <View style={styles.rowBetween}>
                <View>
                  <Text style={styles.mealSlot}>
                    {meal.slot.charAt(0).toUpperCase() + meal.slot.slice(1)}
                  </Text>
                  <Text style={styles.mealName}>
                    {meal.items.map((i) => i.name).join(', ')}
                  </Text>
                </View>
                <View style={styles.kcalCol}>
                  <Text style={styles.mealKcal}>{meal.total.kcal} kcal</Text>
                  <Text style={styles.pctText}>{pct}% of goal</Text>
                </View>
              </View>
              <MacroRow
                proteinG={meal.total.protein_g}
                carbsG={meal.total.carbs_g}
                fatG={meal.total.fat_g}
              />
            </Card>
          );
        })}

        {/* Today's Plan Tasks */}
        <Text style={styles.groupHeading}>Today’s Plan Tasks</Text>
        <Card style={styles.sectionCard}>
          {tasksToday.map((task) => {
            const done = task.status_today === 'done';
            return (
              <Pressable
                key={task.id}
                onPress={() => toggleTaskDone(task.id)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: done }}
                accessibilityLabel={task.title}
                style={styles.taskRow}
              >
                <View style={[styles.checkbox, done && styles.checkboxDone]}>
                  {done && <Text style={styles.checkGlyph}>✓</Text>}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.taskTitle, done && styles.taskDone]}>{task.title}</Text>
                  <Text style={styles.mutedText}>{task.scheduled_at}</Text>
                </View>
              </Pressable>
            );
          })}
        </Card>

        {/* Retest Countdown */}
        {activePlan && (
          <Card style={styles.retestCard}>
            <Text style={styles.retestTitle}>
              Next retest target: {activePlan.retest_date} ({activePlan.retest_weeks} weeks)
            </Text>
            <Text style={styles.mutedText}>
              Targets: {activePlan.targets.map((t) => `${t.biomarker_code} ${t.target}`).join(' · ')}
            </Text>
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: tokens.color.bg },
  scroll: { padding: tokens.space.lg, paddingBottom: 110 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: tokens.space.md,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: tokens.color.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: { fontSize: 18 },
  headerDate: { ...tokens.type.h2, color: tokens.color.ink },
  arcCard: { marginBottom: tokens.space.lg, alignItems: 'center' },
  addBar: {
    marginTop: tokens.space.md,
    width: '100%',
    minHeight: 46,
    borderRadius: tokens.radius.chip,
    backgroundColor: tokens.color.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBarText: { ...tokens.type.label, color: tokens.color.ink, fontWeight: '600' },
  sectionCard: { marginBottom: tokens.space.md },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { ...tokens.type.body, fontWeight: '600', color: tokens.color.ink },
  mutedText: { ...tokens.type.caption, color: tokens.color.inkMuted, marginTop: 2 },
  waterBtn: {
    minHeight: 44,
    paddingHorizontal: tokens.space.lg,
    borderRadius: tokens.radius.chip,
    backgroundColor: tokens.color.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  waterBtnText: { ...tokens.type.label, color: tokens.color.onAccent, fontWeight: '700' },
  groupHeading: {
    ...tokens.type.h2,
    color: tokens.color.ink,
    marginTop: tokens.space.sm,
    marginBottom: tokens.space.sm,
  },
  mealSlot: { ...tokens.type.caption, color: tokens.color.inkMuted, fontWeight: '600' },
  mealName: { ...tokens.type.body, color: tokens.color.ink, fontWeight: '600', maxWidth: 210 },
  kcalCol: { alignItems: 'flex-end' },
  mealKcal: { ...tokens.type.body, fontWeight: '700', color: tokens.color.ink, fontVariant: ['tabular-nums'] },
  pctText: { ...tokens.type.caption, color: tokens.color.accentText, fontWeight: '600' },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: tokens.space.sm,
    minHeight: 48,
    gap: tokens.space.md,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: tokens.color.inkMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxDone: {
    backgroundColor: tokens.color.ok,
    borderColor: tokens.color.ok,
  },
  checkGlyph: { color: tokens.color.white, fontWeight: '700', fontSize: 14 },
  taskTitle: { ...tokens.type.body, color: tokens.color.ink },
  taskDone: { textDecorationLine: 'line-through', color: tokens.color.inkMuted },
  retestCard: { marginTop: tokens.space.sm, backgroundColor: tokens.color.surface },
  retestTitle: { ...tokens.type.body, fontWeight: '700', color: tokens.color.accentText },
});
