import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { tokens } from '@/theme/tokens';
import { useAppStore } from '@/store/useAppStore';
import { useScanLauncher } from '@/store/useScanLauncher';
import { Card } from '@/components/Card';
import { CalorieRing } from '@/components/CalorieRing';
import { MacroRow } from '@/components/MacroRow';
import { FoodThumb } from '@/components/FoodThumb';
import { Icon } from '@/components/Icon';
import { Sheet, SheetOption } from '@/components/Sheet';
import { GlowBar, IconButton, MiniRing, Pill, Screen, SectionTitle, ui } from '@/components/ui';
import { buildSmartCoachTip } from '@/engine/smartCoach';
import { useDailyTargets, useDayLog, useDayTotals, useInbox, useTasksFor } from '@/hooks/useHealthData';
import { diffDays, formatTime12, friendlyDayLabel, fromDateKey, greetingFor, todayKey, WEEKDAYS_SHORT, weekOf } from '@/lib/dates';
import { haptic } from '@/lib/haptics';
import { useProgrammeDay } from '@/hooks/useProgramme';
import { useProgrammeStore } from '@/store/useProgrammeStore';
import { menuFor, weightChange, workoutFor } from '@/engine/programmeEngine';
import { NextUpCard, ProgrammeHero, QuickTiles, RoutineTimeline, WinToast } from '@/components/programme/ProgrammeUI';

export default function TodayScreen() {
  const s = useAppStore();
  const date = s.selectedDate;
  const isToday = date === todayKey();
  const day = useDayLog();
  const totals = useDayTotals();
  const targets = useDailyTargets();
  const tasks = useTasksFor();
  const { unread } = useInbox();
  const [quickAdd, setQuickAdd] = useState(false);
  const firstName = s.profile.full_name.split(' ')[0] || 'there';
  const waterPct = Math.min(100, Math.round((day.waterMl / targets.water_ml) * 100));
  const week = weekOf(date);
  const prog = useProgrammeDay(date);
  const toggleCheck = useProgrammeStore((st) => st.toggleCheck);
  const weighIns = useProgrammeStore((st) => st.weighIns);
  const doctorDone = useProgrammeStore((st) => st.doctorDone);
  const [winToast, setWinToast] = useState(false);
  const tick = (id: string) => {
    if (!prog) return;
    const wasWon = prog.score.won;
    const nowChecked = toggleCheck(date, id);
    if (nowChecked && !wasWon && prog.score.total > 0 && (prog.score.done + 1) / prog.score.total >= prog.programme.winThreshold) setWinToast(true);
  };

  useEffect(() => {
    void s.syncCloudFoods();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const coachTip = useMemo(
    () =>
      buildSmartCoachTip({
        now: new Date(),
        totals,
        targets,
        waterMl: day.waterMl,
        meals: day.meals,
        latestReport: s.reports[0] ?? null,
        plan: s.activePlan,
        profile: s.profile,
      }),
    [totals, targets, day.waterMl, day.meals, s.reports, s.activePlan, s.profile]
  );

  const scan = (a: 'camera' | 'gallery' | 'search') => {
    setQuickAdd(false);
    useScanLauncher.getState().request(a);
    router.navigate('/(tabs)/scan');
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={ui.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <IconButton icon="calendar" label="Open calendar" onPress={() => router.push('/calendar')} />
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={ui.muted}>{greetingFor()},</Text>
            <Text style={styles.name}>{firstName}</Text>
          </View>
          <IconButton icon="bell" label="Notifications" badge={unread} onPress={() => router.push('/notifications')} />
        </View>

        {/* Week strip — selecting a day re-syncs the whole app to that date */}
        <View style={styles.week}>
          {week.map((k, i) => {
            const sel = k === date;
            const dl = s.days[k];
            const kcal = dl ? dl.meals.reduce((a, m) => a + m.total.kcal, 0) : 0;
            return (
              <Pressable key={k} onPress={() => { haptic.select(); s.setSelectedDate(k); }} accessibilityRole="button" accessibilityState={{ selected: sel }} accessibilityLabel={friendlyDayLabel(k)} style={[styles.dayCell, sel && styles.dayCellSel]}>
                <Text style={[styles.dayName, sel && { color: tokens.color.white }]}>{WEEKDAYS_SHORT[i][0]}</Text>
                <MiniRing pct={kcal / targets.kcal} size={30} color={tokens.color.accent} track={sel ? 'rgba(255,255,255,0.25)' : 'rgba(43,43,43,0.08)'}>
                  <Text style={[styles.dayNum, sel && { color: tokens.color.white }, k === todayKey() && !sel && { color: tokens.color.accentText }]}>{fromDateKey(k).getDate()}</Text>
                </MiniRing>
              </Pressable>
            );
          })}
        </View>
        {!isToday && (
          <Pressable onPress={s.goToday} style={styles.backToday} accessibilityRole="button">
            <Icon name="refresh" size={14} color={tokens.color.accentText} />
            <Text style={ui.accent}>Back to today · viewing {diffDays(todayKey(), date) < 0 ? 'past' : 'future'} day</Text>
          </Pressable>
        )}

        {prog ? (
          <>
            <ProgrammeHero
              name={prog.programme.name}
              day={prog.position.day}
              totalDays={prog.position.totalDays}
              week={prog.position.week}
              phaseLabel={prog.position.phase.label}
              done={prog.score.done}
              total={prog.score.total}
              pct={prog.score.pct}
              won={prog.score.won}
              streak={prog.streak}
              goals={prog.programme.goals}
            />
            {prog.next ? <NextUpCard item={prog.next.item} isNow={prog.next.isNow} minutesAway={prog.next.minutesAway} onDone={() => tick(prog.next!.item.id)} /> : null}
            <QuickTiles
              tiles={(() => {
                const menu = menuFor(prog.programme, date);
                const wo = workoutFor(prog.programme, date);
                const wc = weightChange(weighIns);
                return [
                  { key: 'food', emoji: '🥗', title: 'Food', value: menu.lunch.title, sub: 'Today’s lunch', onPress: () => router.push('/programme/food') },
                  { key: 'move', emoji: wo.type === 'rest' ? '🌿' : '💪', title: 'Move', value: wo.type === 'strength' ? 'Strength · 15 min' : wo.type === 'yoga' ? 'Yoga · 15 min' : 'Rest day', sub: `+ ${prog.position.phase.walkMin} min walk`, onPress: () => router.push('/programme/move') },
                  { key: 'progress', emoji: '📈', title: 'Progress', value: wc ? `${wc.changeKg > 0 ? '+' : ''}${wc.changeKg} kg` : 'Add weigh-in', sub: wc ? `${wc.latestKg} kg now` : 'Sunday morning', onPress: () => router.push('/programme/progress') },
                  { key: 'doctor', emoji: '🩺', title: 'Doctor', value: `${doctorDone.filter((d) => prog.programme.doctor.some((x) => x.id === d)).length}/${prog.programme.doctor.length} done`, sub: 'Tests & medicines', onPress: () => router.push('/programme/doctor') },
                ];
              })()}
            />
            <SectionTitle action="Full plan" onAction={() => router.push('/programme/food')}>{isToday ? 'Your day' : friendlyDayLabel(date)}</SectionTitle>
            <RoutineTimeline items={prog.items} checked={prog.checked} nowId={prog.next?.isNow ? prog.next.item.id : null} hhmm={prog.hhmm} onToggle={tick} />
          </>
        ) : (
          <Card variant="glow" style={{ marginTop: 14 }} onPress={() => router.push('/programme/setup')} accessibilityLabel="Start the 8-Week Reset">
            <Pill icon="sparkles" label="New" tone="accent" />
            <Text style={[ui.h2, { marginTop: 8 }]}>Start the 8-Week Reset</Text>
            <Text style={[ui.muted, { marginTop: 4, fontSize: 15, lineHeight: 21 }]}>A full daily routine with reminders, a vegetarian menu, home workouts and a doctor checklist.</Text>
            <Text style={[ui.accent, { marginTop: 10 }]}>Set it up →</Text>
          </Card>
        )}

        <Card variant="glow" style={[styles.hero, prog ? { marginTop: 22 } : null]}>
          <CalorieRing
            eatenKcal={totals.kcal}
            goalKcal={targets.kcal}
            dateLabel={friendlyDayLabel(date)}
            onPress={() => router.navigate('/(tabs)/plan')}
            macros={[
              { key: 'p', label: 'Protein', value: totals.protein_g, target: targets.protein_g, color: tokens.color.protein },
              { key: 'c', label: 'Carbs', value: totals.carbs_g, target: targets.carbs_g, color: tokens.color.carbs },
              { key: 'f', label: 'Fat', value: totals.fat_g, target: targets.fat_g, color: tokens.color.fat },
            ]}
          />
          <Pressable onPress={() => setQuickAdd(true)} style={styles.addBar} accessibilityRole="button" accessibilityLabel="Quick add meal, water or task">
            <Icon name="plus" size={20} />
            <Text style={ui.label}>Quick add</Text>
          </Pressable>
        </Card>

        {/* Smart Biomarker-Aware Daily Coach */}
        <Card
          variant="glow"
          delay={60}
          style={{ marginTop: 14 }}
          onPress={() => {
            haptic.tap();
            if (coachTip.recipeCraving) s.setPendingRecipeCraving(coachTip.recipeCraving);
            if (coachTip.route === '/(tabs)/scan') useScanLauncher.getState().request('report');
            router.navigate(coachTip.route);
          }}
          accessibilityLabel={coachTip.title}
        >
          <View style={ui.between}>
            <Pill icon="sparkles" label={coachTip.badge} tone={coachTip.tone} />
            <Text style={ui.accent}>{coachTip.actionLabel} →</Text>
          </View>
          <Text style={[ui.h3, { marginTop: 8 }]}>{coachTip.title}</Text>
          <Text style={[ui.muted, { marginTop: 4 }]}>{coachTip.body}</Text>
        </Card>

        <SectionTitle action="Scan meal" onAction={() => scan('camera')}>Meals</SectionTitle>
        {day.meals.length === 0 ? (
          <Card><Text style={ui.muted}>Nothing logged for {friendlyDayLabel(date).toLowerCase()}. Tap the camera to snap your plate — AI identifies the food and portion.</Text></Card>
        ) : (
          day.meals.map((meal, i) => (
            <Card key={meal.id} delay={i * 60} style={styles.mealCard}>
              <View style={ui.row}>
                <FoodThumb imageKey={meal.items[0]?.image_key} slot={meal.slot} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={ui.h3}>{meal.slot[0].toUpperCase() + meal.slot.slice(1)}</Text>
                  <Text style={ui.muted} numberOfLines={1}>{meal.items.map((it) => it.name).join(', ')}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.kcal}>{meal.total.kcal} kcal</Text>
                  <Text style={styles.pct}>{Math.round((meal.total.kcal / targets.kcal) * 100)}% of goal</Text>
                </View>
              </View>
              <View style={ui.between}>
                <MacroRow proteinG={meal.total.protein_g} carbsG={meal.total.carbs_g} fatG={meal.total.fat_g} />
                <IconButton icon="trash" size={36} tone="plain" label={`Delete ${meal.slot}`} onPress={() => s.deleteMeal(date, meal.id)} />
              </View>
            </Card>
          ))
        )}

        <SectionTitle>Hydration</SectionTitle>
        <Card>
          <View style={ui.between}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={ui.h3}>{day.waterMl} / {targets.water_ml} ml</Text>
              <Text style={[ui.muted, { marginBottom: 8 }]}>{Math.round(day.waterMl / 250)} glasses · {waterPct}%</Text>
              <GlowBar pct={waterPct} color={tokens.color.water} label="Water progress" />
            </View>
            <IconButton icon="minus" label="Undo last water" onPress={() => s.undoWater()} />
            <Pressable onPress={() => { haptic.success(); s.addWater(250); }} style={styles.waterBtn} accessibilityRole="button" accessibilityLabel="Add 250 millilitres of water">
              <Icon name="droplet" size={16} color={tokens.color.onAccent} />
              <Text style={styles.waterText}>+250</Text>
            </Pressable>
          </View>
        </Card>

        <SectionTitle action="Routine" onAction={() => router.push('/routine')}>Plan tasks</SectionTitle>
        <Card>
          {tasks.length === 0 ? (
            <Text style={ui.muted}>Import a lab report to get a personalised daily plan.</Text>
          ) : (
            tasks.map((t) => (
              <Pressable key={t.id} onPress={() => { haptic.success(); s.toggleTaskDone(t.id); }} accessibilityRole="checkbox" accessibilityState={{ checked: t.done }} accessibilityLabel={t.title} style={styles.taskRow}>
                <View style={[styles.check, t.done && styles.checkDone]}>{t.done && <Icon name="check" size={14} color={tokens.color.white} strokeWidth={3} />}</View>
                <View style={{ flex: 1 }}>
                  <Text style={[ui.body, { fontWeight: '600' }, t.done && styles.strike]}>{t.title}</Text>
                  <Text style={ui.muted}>{formatTime12(t.scheduled_at)}</Text>
                </View>
              </Pressable>
            ))
          )}
        </Card>

        {s.activePlan && (
          <Card style={{ marginTop: 16 }} onPress={() => router.push('/calendar')} accessibilityLabel="Retest countdown">
            <View style={ui.between}>
              <View style={{ flex: 1 }}>
                <Text style={[ui.h3, { color: tokens.color.accentText }]}>Retest in {Math.max(0, diffDays(todayKey(), s.activePlan.retest_date))} days</Text>
                <Text style={ui.muted}>{s.activePlan.targets.slice(0, 3).map((t) => `${t.marker} ${t.target}`).join(' · ')}</Text>
              </View>
              <Icon name="target" color={tokens.color.accentText} />
            </View>
          </Card>
        )}
      </ScrollView>
      <WinToast visible={winToast} onHide={() => setWinToast(false)} />

      <Sheet visible={quickAdd} onClose={() => setQuickAdd(false)} title="Quick add" subtitle={`Logging to ${friendlyDayLabel(date)}`}>
        <SheetOption icon="camera" tone="accent" title="Snap a meal" subtitle="Opens your camera · AI finds food & portions" onPress={() => scan('camera')} />
        <SheetOption icon="image" title="Meal from gallery" onPress={() => scan('gallery')} />
        <SheetOption icon="search" title="Search Indian food database" onPress={() => scan('search')} />
        <SheetOption icon="droplet" title="Add 250 ml water" onPress={() => { s.addWater(250); setQuickAdd(false); }} />
        <SheetOption icon="report" title="Import lab report" subtitle="PDF or photos" onPress={() => { setQuickAdd(false); useScanLauncher.getState().request('report'); router.navigate('/(tabs)/scan'); }} />
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center', marginTop: 8, marginBottom: 12 },
  name: { fontSize: 20, fontWeight: '800', color: tokens.color.ink },
  week: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: tokens.color.glass, borderRadius: 24, padding: 6, borderWidth: 1, borderColor: tokens.color.glassBorder },
  dayCell: { alignItems: 'center', paddingVertical: 6, borderRadius: 18, width: 44, gap: 4 },
  dayCellSel: { backgroundColor: tokens.color.ink },
  dayName: { fontSize: 11, fontWeight: '700', color: tokens.color.inkMuted },
  dayNum: { fontSize: 12, fontWeight: '800', color: tokens.color.ink },
  backToday: { flexDirection: 'row', gap: 6, alignItems: 'center', alignSelf: 'center', marginTop: 8 },
  hero: { marginTop: 14, alignItems: 'center', paddingTop: 12 },
  addBar: { marginTop: 16, flexDirection: 'row', gap: 8, width: '100%', height: 48, borderRadius: 999, backgroundColor: tokens.color.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  mealCard: { marginBottom: 10, padding: 16 },
  kcal: { fontSize: 18, fontWeight: '800', color: tokens.color.ink },
  pct: { fontSize: 12, fontWeight: '700', color: tokens.color.accentText },
  waterBtn: { flexDirection: 'row', gap: 4, marginLeft: 8, minHeight: 44, paddingHorizontal: 14, borderRadius: 999, backgroundColor: tokens.color.accent, alignItems: 'center' },
  waterText: { fontWeight: '800', color: tokens.color.onAccent },
  taskRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52 },
  check: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: tokens.color.inkMuted, alignItems: 'center', justifyContent: 'center' },
  checkDone: { backgroundColor: tokens.color.ok, borderColor: tokens.color.ok },
  strike: { textDecorationLine: 'line-through', color: tokens.color.inkMuted },
});
