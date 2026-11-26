import React, { useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { tokens } from '@/theme/tokens';
import { useAppStore } from '@/store/useAppStore';
import { Card } from '@/components/Card';
import { SegmentArc } from '@/components/SegmentArc';
import { MacroRow } from '@/components/MacroRow';
import { getLocalOrCdnImage } from '@/lib/cdn';

export default function TodayScreen() {
  const { activePlan, mealsToday, waterMlToday, tasksToday, addWater, toggleTaskDone, logQuickMeal } =
    useAppStore();
  const [quickAddOpen, setQuickAddOpen] = useState(false);

  const eatenKcal = mealsToday.reduce((sum, m) => sum + m.total.kcal, 0);
  const goalKcal = activePlan?.daily_targets.kcal ?? 2000;
  const waterGoal = activePlan?.daily_targets.water_ml ?? 2500;
  const glassesFilled = Math.round(waterMlToday / 250);
  const glassesTarget = Math.round(waterGoal / 250);
  const waterPct = Math.min(100, Math.round((waterMlToday / waterGoal) * 100));

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <Pressable
            onPress={() => router.push('/calendar')}
            accessibilityRole="button"
            accessibilityLabel="Open Calendar"
            style={styles.iconBtn}
          >
            <Ionicons name="calendar-outline" size={20} color={tokens.color.ink} />
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Dashboard</Text>
          </View>
          <Pressable
            onPress={() => router.push('/notifications')}
            accessibilityRole="button"
            accessibilityLabel="Notifications, 2 new"
            style={styles.iconBtn}
          >
            <Ionicons name="notifications-outline" size={20} color={tokens.color.ink} />
            <View style={styles.unreadDot} />
          </Pressable>
        </View>

        {/* Calorie Arc + "+" Add Bar */}
        <View style={styles.heroSection}>
          <SegmentArc
            eatenKcal={eatenKcal}
            goalKcal={goalKcal}
            dateLabel="Today, 26 Nov"
            onPress={() => router.push('/(tabs)/plan')}
          />
          <Pressable
            onPress={() => setQuickAddOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Quick add meal, water, or routine task"
            style={styles.addBar}
          >
            <Ionicons name="add" size={24} color={tokens.color.ink} />
          </Pressable>
        </View>

        {/* Meal Cards (reference left screen style) */}
        {[...mealsToday].reverse().map((meal, index) => {
          const pct = Math.round((meal.total.kcal / goalKcal) * 100);
          const timeLabel = new Date(meal.eaten_at).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          });
          const primaryImg = meal.items[0]?.image_key;
          return (
            <Card key={meal.id} delay={index * 70} style={styles.mealCard}>
              <View style={styles.mealTopRow}>
                <Image
                  source={getLocalOrCdnImage(primaryImg)}
                  style={styles.mealThumb}
                  resizeMode="cover"
                />
                <View style={styles.mealInfo}>
                  <Text style={styles.mealSlot}>
                    {meal.slot.charAt(0).toUpperCase() + meal.slot.slice(1)}
                  </Text>
                  <Text style={styles.mealTime}>{timeLabel}</Text>
                </View>
                <View style={styles.kcalCol}>
                  <Text style={styles.mealKcal}>{meal.total.kcal} kcal</Text>
                  <Text style={styles.pctText}>{pct}% of goal</Text>
                </View>
              </View>

              <View style={styles.mealBottomRow}>
                <MacroRow
                  proteinG={meal.total.protein_g}
                  carbsG={meal.total.carbs_g}
                  fatG={meal.total.fat_g}
                />
                <Pressable
                  onPress={() => router.push('/(tabs)/scan')}
                  accessibilityRole="button"
                  accessibilityLabel={`Edit ${meal.slot}`}
                  style={styles.editBtn}
                >
                  <Ionicons name="pencil" size={16} color={tokens.color.ink} />
                </Pressable>
              </View>
            </Card>
          );
        })}

        {/* Hydration Row */}
        <Card delay={140} style={styles.sectionCard}>
          <View style={styles.rowBetween}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={styles.sectionTitle}>Hydration</Text>
              <Text style={styles.mutedText}>
                {glassesFilled} / {glassesTarget} glasses · {waterMlToday} ml
              </Text>
              <View style={styles.waterTrack}>
                <View style={[styles.waterFill, { width: `${waterPct}%` }]} />
              </View>
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

        {/* Today's Plan Tasks */}
        <Text style={styles.groupHeading}>Today’s Plan Tasks</Text>
        <Card delay={200} style={styles.sectionCard}>
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
                  {done && <Ionicons name="checkmark" size={15} color={tokens.color.white} />}
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
          <Card delay={250} style={styles.retestCard} onPress={() => router.push('/(tabs)/health')}>
            <View style={styles.rowBetween}>
              <View style={{ flex: 1 }}>
                <Text style={styles.retestTitle}>
                  Next retest: {activePlan.retest_date} ({activePlan.retest_weeks} weeks)
                </Text>
                <Text style={styles.mutedText}>
                  {activePlan.targets.map((t) => `${t.biomarker_code} ${t.target}`).join(' · ')}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={tokens.color.accentText} />
            </View>
          </Card>
        )}
      </ScrollView>

      {/* Quick-Add Sheet */}
      <Modal visible={quickAddOpen} transparent animationType="fade" onRequestClose={() => setQuickAddOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setQuickAddOpen(false)}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Quick Add</Text>
            <Pressable
              style={styles.sheetOption}
              onPress={() => {
                setQuickAddOpen(false);
                router.push('/(tabs)/scan');
              }}
            >
              <Ionicons name="camera-outline" size={20} color={tokens.color.ink} />
              <Text style={styles.sheetOptionText}>Scan meal or lab report</Text>
            </Pressable>
            <Pressable
              style={styles.sheetOption}
              onPress={() => {
                logQuickMeal('ifct_makhana', 25, 'snack');
                setQuickAddOpen(false);
              }}
            >
              <Ionicons name="nutrition-outline" size={20} color={tokens.color.ink} />
              <Text style={styles.sheetOptionText}>Log Roasted Makhana (1 katori · 87 kcal)</Text>
            </Pressable>
            <Pressable
              style={styles.sheetOption}
              onPress={() => {
                addWater(250);
                setQuickAddOpen(false);
              }}
            >
              <Ionicons name="water-outline" size={20} color={tokens.color.ink} />
              <Text style={styles.sheetOptionText}>Add 250 ml water</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: tokens.color.bg },
  scroll: { padding: tokens.space.lg, paddingBottom: 112 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: tokens.space.sm,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: tokens.color.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...tokens.shadow.card,
  },
  unreadDot: {
    position: 'absolute',
    top: 10,
    right: 11,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: tokens.color.accent,
    borderWidth: 1.5,
    borderColor: tokens.color.surface,
  },
  headerCenter: { alignItems: 'center' },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: tokens.color.ink,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: tokens.space.lg,
  },
  addBar: {
    marginTop: tokens.space.sm,
    width: '100%',
    height: 48,
    borderRadius: tokens.radius.chip,
    backgroundColor: tokens.color.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mealCard: {
    marginBottom: tokens.space.md,
    padding: tokens.space.lg,
  },
  mealTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space.md,
  },
  mealThumb: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: tokens.color.surfaceMuted,
  },
  mealInfo: { flex: 1 },
  mealSlot: {
    fontSize: 17,
    fontWeight: '700',
    color: tokens.color.ink,
  },
  mealTime: {
    ...tokens.type.caption,
    color: tokens.color.inkMuted,
    marginTop: 2,
  },
  kcalCol: { alignItems: 'flex-end' },
  mealKcal: {
    fontSize: 20,
    fontWeight: '700',
    color: tokens.color.ink,
    fontVariant: ['tabular-nums'],
  },
  pctText: {
    fontSize: 12,
    color: tokens.color.accentText,
    fontWeight: '600',
    marginTop: 2,
  },
  mealBottomRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: tokens.space.xs,
  },
  editBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionCard: { marginBottom: tokens.space.md, padding: tokens.space.lg },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { ...tokens.type.body, fontWeight: '700', color: tokens.color.ink },
  mutedText: { ...tokens.type.caption, color: tokens.color.inkMuted, marginTop: 2 },
  waterTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: tokens.color.surfaceMuted,
    marginTop: 8,
    overflow: 'hidden',
  },
  waterFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: tokens.color.accent,
  },
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
    marginTop: tokens.space.xs,
    marginBottom: tokens.space.sm,
  },
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
  taskTitle: { ...tokens.type.body, color: tokens.color.ink, fontWeight: '500' },
  taskDone: { textDecorationLine: 'line-through', color: tokens.color.inkMuted },
  retestCard: { marginTop: tokens.space.xs, padding: tokens.space.lg },
  retestTitle: { ...tokens.type.body, fontWeight: '700', color: tokens.color.accentText },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(43,43,43,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: tokens.color.surface,
    borderTopLeftRadius: tokens.radius.sheet,
    borderTopRightRadius: tokens.radius.sheet,
    padding: tokens.space.xl,
    paddingBottom: 40,
    gap: tokens.space.md,
  },
  sheetTitle: { ...tokens.type.h2, color: tokens.color.ink },
  sheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space.md,
    padding: tokens.space.md,
    borderRadius: 18,
    backgroundColor: tokens.color.surfaceMuted,
  },
  sheetOptionText: { ...tokens.type.body, color: tokens.color.ink, fontWeight: '600' },
});