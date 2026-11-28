import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeInDown, FadeInRight, FadeOutLeft } from 'react-native-reanimated';
import { tokens } from '@/theme/tokens';
import { Card } from '@/components/Card';
import { Banner, GlowBar, Screen, ScreenHeader, SectionTitle, Stepper, ui, useScrollBottomPad } from '@/components/ui';
import { ProgressHalo } from '@/components/programme/ProgrammeUI';
import { RESET_8 } from '@/programme/reset8';
import { Move } from '@/programme/types';
import { dayPosition, workoutFor } from '@/engine/programmeEngine';
import { getProgramme } from '@/hooks/useProgramme';
import { useProgrammeStore } from '@/store/useProgrammeStore';
import { todayKey, WEEKDAYS_SHORT } from '@/lib/dates';
import { haptic } from '@/lib/haptics';

/** Full-screen guided workout: one move at a time, rounds, countdown for timed moves, rest between rounds. */
function Guided({ moves, phaseIndex, rounds, onClose, onFinish }: { moves: Move[]; phaseIndex: 0 | 1 | 2; rounds: number; onClose: () => void; onFinish: () => void }) {
  const [round, setRound] = useState(1);
  const [idx, setIdx] = useState(0);
  const [resting, setResting] = useState(false);
  const [left, setLeft] = useState<number | null>(null);
  const move = moves[idx];
  const secs = move.seconds?.[phaseIndex] ?? null;
  const total = moves.length * rounds;
  const doneCount = (round - 1) * moves.length + idx;

  useEffect(() => {
    setLeft(resting ? 60 : secs);
  }, [idx, round, resting, secs]);

  useEffect(() => {
    if (left == null || left <= 0) return;
    const t = setTimeout(() => setLeft((v) => (v == null ? v : v - 1)), 1000);
    return () => clearTimeout(t);
  }, [left]);

  useEffect(() => {
    if (left === 0) haptic.success();
  }, [left]);

  const next = () => {
    haptic.tap();
    if (resting) {
      setResting(false);
      return;
    }
    if (idx < moves.length - 1) setIdx(idx + 1);
    else if (round < rounds) {
      setRound(round + 1);
      setIdx(0);
      setResting(true);
    } else onFinish();
  };

  return (
    <View style={StyleSheet.absoluteFill}>
      <LinearGradient colors={['#2C2926', '#1B1917']} style={StyleSheet.absoluteFill} />
      <View style={styles.gHead}>
        <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close workout" style={styles.gClose}>
          <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>Close</Text>
        </Pressable>
        <Text style={styles.gRound}>Round {round} of {rounds}</Text>
      </View>
      <View style={{ paddingHorizontal: 20 }}>
        <GlowBar pct={(doneCount / total) * 100} label="Workout progress" />
      </View>
      <View style={styles.gBody}>
        {resting ? (
          <Animated.View key="rest" entering={FadeIn.duration(300)} style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 56 }}>🌿</Text>
            <Text style={styles.gName}>Rest</Text>
            <Text style={styles.gHow}>Sip some water. Breathe slowly.</Text>
            <Text style={styles.gTimer}>{left ?? 0}s</Text>
          </Animated.View>
        ) : (
          <Animated.View key={`${round}-${idx}`} entering={FadeInRight.duration(350)} exiting={FadeOutLeft.duration(200)} style={{ alignItems: 'center' }}>
            <Text style={styles.gCount}>{idx + 1} / {moves.length}</Text>
            <Text style={styles.gName}>{move.name}</Text>
            <Text style={styles.gReps}>{move.reps[phaseIndex]}</Text>
            <Text style={styles.gHow}>{move.how}</Text>
            {secs ? (
              <View style={{ marginTop: 26 }}>
                <ProgressHalo pct={left == null ? 0 : 1 - left / secs} size={150} stroke={12} center={<Text style={styles.gTimerIn}>{left ?? secs}</Text>} won={left === 0} />
              </View>
            ) : null}
          </Animated.View>
        )}
      </View>
      <Pressable onPress={next} accessibilityRole="button" accessibilityLabel={resting ? 'Skip rest' : 'Done, next move'} style={({ pressed }) => [styles.gNext, pressed && { transform: [{ scale: 0.98 }] }]}>
        <LinearGradient colors={tokens.gradient.peach} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[StyleSheet.absoluteFill, { borderRadius: 24 }]} />
        <Text style={styles.gNextText}>{resting ? 'Start next round' : idx === moves.length - 1 && round === rounds ? 'Finish 🎉' : 'Done · Next'}</Text>
      </Pressable>
    </View>
  );
}

export default function MoveScreen() {
  const bottomPad = useScrollBottomPad();
  const id = useProgrammeStore((s) => s.programmeId);
  const startDate = useProgrammeStore((s) => s.startDate) ?? todayKey();
  const steps = useProgrammeStore((s) => s.steps);
  const setSteps = useProgrammeStore((s) => s.setSteps);
  const checks = useProgrammeStore((s) => s.checks);
  const toggleCheck = useProgrammeStore((s) => s.toggleCheck);
  const p = getProgramme(id) ?? RESET_8;
  const today = todayKey();
  const pos = dayPosition(p, startDate, today);
  const phase = pos.phase;
  const wo = useMemo(() => workoutFor(p, today), [p, today]);
  const [guided, setGuided] = useState(false);
  const todaySteps = steps[today] ?? 0;

  const finish = () => {
    setGuided(false);
    if (!(checks[today] ?? []).includes('exercise')) toggleCheck(today, 'exercise');
    haptic.success();
  };

  return (
    <Screen>
      <ScreenHeader title="Move" subtitle={`Week ${pos.week} · ${phase.label}`} />
      <ScrollView contentContainerStyle={[ui.scroll, { paddingBottom: bottomPad }]} showsVerticalScrollIndicator={false}>
        <Card variant="glow">
          <Text style={ui.micro}>Today · 5:15 PM</Text>
          <Text style={styles.big}>{wo.type === 'strength' ? '💪 Walk + Strength' : wo.type === 'yoga' ? '🧘‍♀️ Walk + Yoga' : '🌿 Rest day'}</Text>
          <View style={styles.stats}>
            <View style={styles.stat}><Text style={styles.statV}>{phase.walkMin}</Text><Text style={styles.statL}>min walk</Text></View>
            <View style={styles.stat}><Text style={styles.statV}>{wo.type === 'rest' ? '—' : 15}</Text><Text style={styles.statL}>min {wo.type === 'yoga' ? 'yoga' : 'strength'}</Text></View>
            <View style={styles.stat}><Text style={styles.statV}>{wo.type === 'strength' ? phase.rounds : wo.type === 'yoga' ? 1 : '—'}</Text><Text style={styles.statL}>rounds</Text></View>
          </View>
          {wo.type !== 'rest' ? (
            <Pressable onPress={() => { haptic.tap(); setGuided(true); }} accessibilityRole="button" accessibilityLabel="Start guided workout" style={({ pressed }) => [styles.start, pressed && { transform: [{ scale: 0.98 }] }]}>
              <LinearGradient colors={tokens.gradient.ink} style={[StyleSheet.absoluteFill, { borderRadius: 20 }]} />
              <Text style={styles.startText}>▶  Start guided workout</Text>
            </Pressable>
          ) : (
            <Text style={[ui.muted, { marginTop: 10, fontSize: 15 }]}>A relaxed family walk is perfect today.</Text>
          )}
        </Card>

        <SectionTitle>Steps today</SectionTitle>
        <Card>
          <View style={ui.between}>
            <Text style={styles.statV}>{todaySteps.toLocaleString('en-IN')}</Text>
            <Stepper label="Steps today" value={todaySteps} onChange={(v) => setSteps(today, v)} step={500} min={0} max={40000} format={(v) => `${(v / 1000).toFixed(1)}k`} />
          </View>
          <Text style={[ui.muted, { marginTop: 2 }]}>Goal {phase.steps.toLocaleString('en-IN')} · copy from your phone’s health app</Text>
          <View style={{ marginTop: 12 }}><GlowBar pct={(todaySteps / phase.steps) * 100} color={tokens.color.ok} label="Steps progress" /></View>
        </Card>

        {wo.moves.length > 0 ? (
          <>
            <SectionTitle>{wo.type === 'strength' ? 'The 7 moves' : 'The yoga flow'}</SectionTitle>
            {wo.moves.map((m, i) => (
              <Animated.View key={m.id} entering={FadeInDown.delay(i * 50).duration(380)} style={styles.move}>
                <View style={styles.num}><Text style={styles.numText}>{i + 1}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.moveName}>{m.name}</Text>
                  <Text style={styles.moveHow}>{m.how}</Text>
                </View>
                <Text style={styles.reps}>{m.reps[phase.index]}</Text>
              </Animated.View>
            ))}
          </>
        ) : null}

        <SectionTitle>The 8 weeks</SectionTitle>
        <Card>
          {p.phases.map((ph) => (
            <View key={ph.label} style={[styles.phaseRow, ph.index === phase.index && styles.phaseOn]}>
              <Text style={styles.phaseName}>Wk {ph.fromWeek}–{ph.toWeek} · {ph.label}</Text>
              <Text style={ui.muted}>{ph.walkMin} min · {ph.steps.toLocaleString('en-IN')} steps · {ph.rounds} rounds</Text>
            </View>
          ))}
          <Text style={[ui.muted, { marginTop: 10 }]}>Week plan: {WEEKDAYS_SHORT.map((d, i) => `${d} ${p.workoutByWeekday[i as 0].slice(0, 1).toUpperCase()}`).join(' · ')}  (S = strength, Y = yoga, R = rest)</Text>
        </Card>

        <Banner tone="risk" icon="alert" style={{ marginTop: 16 }} text="Stop and rest if you feel chest pain, dizziness, or so breathless you can't talk. On heavy period days, just walk. If a pregnancy test is positive, stop the strength workout and ask your doctor first." />
        <Banner tone="watch" icon="info" style={{ marginTop: 10 }} text="Delhi smog: if AQI is over 300, walk indoors or on the stairs instead." />
      </ScrollView>
      {guided ? <Guided moves={wo.moves} phaseIndex={phase.index} rounds={wo.type === 'strength' ? phase.rounds : 1} onClose={() => setGuided(false)} onFinish={finish} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  big: { fontSize: 26, fontWeight: '800', color: tokens.color.ink, marginTop: 4, letterSpacing: -0.5 },
  stats: { flexDirection: 'row', gap: 10, marginTop: 14 },
  stat: { flex: 1, backgroundColor: 'rgba(255,255,255,0.8)', borderRadius: 18, padding: 12, alignItems: 'center' },
  statV: { fontSize: 24, fontWeight: '800', color: tokens.color.ink, fontVariant: ['tabular-nums'] },
  statL: { fontSize: 12.5, color: tokens.color.inkMuted, fontWeight: '600' },
  start: { marginTop: 16, height: 56, borderRadius: 20, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  startText: { color: tokens.color.white, fontSize: 17, fontWeight: '800' },
  move: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.76)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.95)', marginBottom: 10, ...tokens.shadow.soft },
  num: { width: 36, height: 36, borderRadius: 18, backgroundColor: tokens.color.accent, alignItems: 'center', justifyContent: 'center' },
  numText: { fontSize: 16, fontWeight: '800', color: tokens.color.onAccent },
  moveName: { fontSize: 16.5, fontWeight: '800', color: tokens.color.ink },
  moveHow: { fontSize: 13.5, color: tokens.color.inkMuted, lineHeight: 18, marginTop: 2 },
  reps: { fontSize: 15, fontWeight: '800', color: tokens.color.accentText, maxWidth: 90, textAlign: 'right' },
  phaseRow: { padding: 12, borderRadius: 16, marginBottom: 6 },
  phaseOn: { backgroundColor: tokens.color.accentSoft },
  phaseName: { fontSize: 16, fontWeight: '800', color: tokens.color.ink },
  gHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16 },
  gClose: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.12)' },
  gRound: { color: 'rgba(255,255,255,0.8)', fontSize: 15, fontWeight: '700' },
  gBody: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },
  gCount: { color: tokens.color.gold, fontSize: 14, fontWeight: '800', letterSpacing: 1.2 },
  gName: { color: '#fff', fontSize: 34, fontWeight: '800', textAlign: 'center', marginTop: 8, letterSpacing: -0.6 },
  gReps: { color: tokens.color.accent, fontSize: 28, fontWeight: '800', marginTop: 6 },
  gHow: { color: 'rgba(255,255,255,0.78)', fontSize: 17, lineHeight: 24, textAlign: 'center', marginTop: 12 },
  gTimer: { color: '#fff', fontSize: 64, fontWeight: '800', marginTop: 18, fontVariant: ['tabular-nums'] },
  gTimerIn: { color: tokens.color.ink, fontSize: 44, fontWeight: '800', fontVariant: ['tabular-nums'] },
  gNext: { marginHorizontal: 20, marginBottom: 44, height: 64, borderRadius: 24, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', ...tokens.shadow.glow },
  gNextText: { fontSize: 19, fontWeight: '800', color: tokens.color.onAccent },
});
