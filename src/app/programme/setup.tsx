import React, { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { tokens } from '@/theme/tokens';
import { Card } from '@/components/Card';
import { Banner, Screen, ScreenHeader, Stepper, Toggle, ui, useScrollBottomPad } from '@/components/ui';
import { RESET_8 } from '@/programme/reset8';
import { useProgrammeStore } from '@/store/useProgrammeStore';
import { addDays, friendlyDayLabel, todayKey, weekdayIndex } from '@/lib/dates';
import { requestNotificationPermission } from '@/lib/notifications';
import { haptic } from '@/lib/haptics';

export default function ProgrammeSetup() {
  const bottomPad = useScrollBottomPad();
  const start = useProgrammeStore((s) => s.startProgramme);
  const setRemindersOn = useProgrammeStore((s) => s.setRemindersOn);
  const today = todayKey();
  const nextMonday = addDays(today, weekdayIndex(today) === 0 ? 7 : 7 - weekdayIndex(today));
  const [when, setWhen] = useState<'today' | 'monday'>(weekdayIndex(today) === 0 ? 'today' : 'monday');
  const [weight, setWeight] = useState(70);
  const [waist, setWaist] = useState(90);
  const [reminders, setReminders] = useState(true);
  const startDate = when === 'today' ? today : nextMonday;

  const go = async () => {
    haptic.success();
    if (reminders && Platform.OS !== 'web') await requestNotificationPermission().catch(() => undefined);
    setRemindersOn(reminders);
    start(RESET_8.id, startDate, { weightKg: weight, waistCm: waist });
    router.replace('/(tabs)');
  };

  return (
    <Screen>
      <ScreenHeader title="8-Week Reset" subtitle="Set up in 30 seconds" />
      <ScrollView contentContainerStyle={[ui.scroll, { paddingBottom: bottomPad }]}>
        <Animated.View entering={FadeInDown.duration(500)}>
          <Text style={styles.big}>Your day, planned.{'\n'}Your body, back.</Text>
          <Text style={[ui.muted, { fontSize: 15.5, lineHeight: 22, marginTop: 8 }]}>
            A complete daily routine with gentle reminders, a tasty vegetarian menu, 15-minute home workouts and a doctor checklist. Tick things off and watch the ring fill.
          </Text>
        </Animated.View>

        <Card variant="glow" delay={80} style={{ marginTop: 20 }}>
          <Text style={ui.h3}>When do we start?</Text>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
            {(['today', 'monday'] as const).map((k) => {
              const on = when === k;
              const d = k === 'today' ? today : nextMonday;
              return (
                <Pressable key={k} onPress={() => { haptic.select(); setWhen(k); }} style={[styles.opt, on && styles.optOn]} accessibilityRole="radio" accessibilityState={{ selected: on }}>
                  <Text style={[styles.optTitle, on && { color: tokens.color.white }]}>{k === 'today' ? 'Today' : 'Monday'}</Text>
                  <Text style={[ui.muted, on && { color: 'rgba(255,255,255,0.8)' }]}>{friendlyDayLabel(d)}</Text>
                </Pressable>
              );
            })}
          </View>
        </Card>

        <Card delay={140} style={{ marginTop: 14 }}>
          <Text style={ui.h3}>Starting numbers</Text>
          <Text style={[ui.muted, { marginTop: 2 }]}>Morning, before tea, after the toilet. You can change these later.</Text>
          <View style={[ui.between, { marginTop: 14 }]}>
            <Text style={styles.lbl}>Weight</Text>
            <Stepper label="Weight in kilograms" value={weight} onChange={setWeight} step={0.5} min={30} max={200} format={(v) => `${v.toFixed(1)} kg`} />
          </View>
          <View style={[ui.between, { marginTop: 12 }]}>
            <Text style={styles.lbl}>Waist (at navel)</Text>
            <Stepper label="Waist in centimetres" value={waist} onChange={setWaist} step={1} min={40} max={200} format={(v) => `${v} cm`} />
          </View>
        </Card>

        <Card delay={200} style={{ marginTop: 14 }}>
          <View style={ui.between}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={ui.h3}>Remind me through the day</Text>
              <Text style={ui.muted}>About 12 gentle nudges: water, fruit, sun, meals, exercise, sleep.</Text>
            </View>
            <Toggle label="Programme reminders" value={reminders} onValueChange={setReminders} />
          </View>
        </Card>

        <Banner style={{ marginTop: 14 }} text="This is a wellness routine, not medical treatment. Medicine reminders appear only after you add what your doctor prescribed." />

        <Pressable onPress={go} accessibilityRole="button" accessibilityLabel="Start my 8 weeks" style={({ pressed }) => [styles.cta, pressed && { transform: [{ scale: 0.98 }] }]}>
          <LinearGradient colors={tokens.gradient.peach} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[StyleSheet.absoluteFill, { borderRadius: 24 }]} />
          <Text style={styles.ctaText}>Start my 8 weeks ✨</Text>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  big: { fontSize: 32, lineHeight: 38, fontWeight: '800', color: tokens.color.ink, letterSpacing: -0.8, marginTop: 6 },
  opt: { flex: 1, padding: 14, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.8)', borderWidth: 1, borderColor: tokens.color.border, minHeight: 64 },
  optOn: { backgroundColor: tokens.color.ink, borderColor: tokens.color.ink },
  optTitle: { fontSize: 17, fontWeight: '800', color: tokens.color.ink },
  lbl: { fontSize: 16, fontWeight: '600', color: tokens.color.ink },
  cta: { marginTop: 22, height: 60, borderRadius: 24, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', ...tokens.shadow.glow },
  ctaText: { fontSize: 19, fontWeight: '800', color: tokens.color.onAccent },
});
