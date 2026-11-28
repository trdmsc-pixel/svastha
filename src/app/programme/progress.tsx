import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient as SvgGrad, Path, Rect, Stop, Text as SvgText } from 'react-native-svg';
import { tokens } from '@/theme/tokens';
import { Card } from '@/components/Card';
import { Banner, Screen, ScreenHeader, SectionTitle, Stepper, ui, useScrollBottomPad } from '@/components/ui';
import { RESET_8 } from '@/programme/reset8';
import { dayPosition, targetBand, weekSummaries, weightChange } from '@/engine/programmeEngine';
import { getProgramme, useProgrammeFlags } from '@/hooks/useProgramme';
import { useProgrammeStore } from '@/store/useProgrammeStore';
import { diffDays, friendlyDayLabel, fromDateKey, todayKey } from '@/lib/dates';
import { haptic } from '@/lib/haptics';

function WeightChart({ points, startDate, startKg, weeks }: { points: Array<{ date: string; weightKg: number }>; startDate: string; startKg: number; weeks: number }) {
  const W = 320;
  const H = 170;
  const pad = 28;
  const days = weeks * 7;
  const end = targetBand(startKg, weeks);
  const ys = [...points.map((p) => p.weightKg), startKg + 1, end.min - 0.5];
  const maxY = Math.max(...ys);
  const minY = Math.min(...ys);
  const x = (d: string) => pad + (Math.max(0, Math.min(days, diffDays(startDate, d))) / days) * (W - pad * 2);
  const y = (kg: number) => 14 + ((maxY - kg) / Math.max(0.5, maxY - minY)) * (H - 40);
  const endX = W - pad;
  const band = `M ${pad} ${y(startKg)} L ${endX} ${y(end.max)} L ${endX} ${y(end.min)} Z`;
  const line = points.map((p, i) => `${i ? 'L' : 'M'} ${x(p.date).toFixed(1)} ${y(p.weightKg).toFixed(1)}`).join(' ');
  return (
    <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} accessibilityLabel="Weight chart with the safe-pace band">
      <Defs>
        <SvgGrad id="band" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#CFE5D3" stopOpacity="0.2" />
          <Stop offset="1" stopColor="#CFE5D3" stopOpacity="0.9" />
        </SvgGrad>
      </Defs>
      <Rect x={0} y={0} width={W} height={H} fill="transparent" />
      <Path d={band} fill="url(#band)" />
      <SvgText x={endX} y={y(end.min) + 14} fontSize={10} fill={tokens.color.ok} textAnchor="end" fontWeight="700">safe pace</SvgText>
      {points.length > 1 ? <Path d={line} stroke={tokens.color.accentDeep} strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" /> : null}
      {points.map((p, i) => (
        <React.Fragment key={p.date}>
          <Circle cx={x(p.date)} cy={y(p.weightKg)} r={i === points.length - 1 ? 7 : 4.5} fill={i === points.length - 1 ? tokens.color.accent : '#fff'} stroke={tokens.color.accentDeep} strokeWidth={2} />
          {i === points.length - 1 ? <SvgText x={x(p.date)} y={y(p.weightKg) - 12} fontSize={12} fontWeight="800" fill={tokens.color.ink} textAnchor="middle">{p.weightKg}</SvgText> : null}
        </React.Fragment>
      ))}
      <SvgText x={pad} y={H - 6} fontSize={10} fill={tokens.color.inkMuted}>Week 1</SvgText>
      <SvgText x={endX} y={H - 6} fontSize={10} fill={tokens.color.inkMuted} textAnchor="end">Week {weeks}</SvgText>
    </Svg>
  );
}

export default function ProgressScreen() {
  const bottomPad = useScrollBottomPad();
  const st = useProgrammeStore();
  const flags = useProgrammeFlags();
  const p = getProgramme(st.programmeId) ?? RESET_8;
  const today = todayKey();
  const startDate = st.startDate ?? today;
  const pos = dayPosition(p, startDate, today);
  const weeks = useMemo(() => weekSummaries(p, startDate, today, st.checks, flags), [p, startDate, today, st.checks, flags]);
  const wc = weightChange(st.weighIns);
  const last = st.weighIns[st.weighIns.length - 1];
  const [kg, setKg] = useState(last?.weightKg ?? 70);
  const [waist, setWaist] = useState(last?.waistCm ?? 90);
  const [energy, setEnergy] = useState(last?.energy ?? 6);
  const [saved, setSaved] = useState(false);
  const wonTotal = weeks.reduce((a, w) => a + w.wonDays, 0);

  const save = () => {
    haptic.success();
    st.addWeighIn({ date: today, weightKg: Math.round(kg * 10) / 10, waistCm: waist, energy });
    setSaved(true);
  };

  return (
    <Screen>
      <ScreenHeader title="Progress" subtitle={`Day ${Math.max(1, Math.min(pos.day, pos.totalDays))} of ${pos.totalDays}`} />
      <ScrollView contentContainerStyle={[ui.scroll, { paddingBottom: bottomPad }]} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.duration(450)} style={styles.summary}>
          <LinearGradient colors={['#3A3633', '#221F1D']} style={[StyleSheet.absoluteFill, { borderRadius: 28 }]} />
          <View style={styles.sumCol}><Text style={styles.sumV}>{wc ? `${wc.changeKg > 0 ? '+' : ''}${wc.changeKg}` : '—'}</Text><Text style={styles.sumL}>kg</Text></View>
          <View style={styles.sumDiv} />
          <View style={styles.sumCol}><Text style={styles.sumV}>{wc?.waistChangeCm != null ? `${wc.waistChangeCm > 0 ? '+' : ''}${wc.waistChangeCm}` : '—'}</Text><Text style={styles.sumL}>cm waist</Text></View>
          <View style={styles.sumDiv} />
          <View style={styles.sumCol}><Text style={[styles.sumV, { color: '#8BD19A' }]}>{wonTotal}</Text><Text style={styles.sumL}>winning days</Text></View>
        </Animated.View>

        <SectionTitle>8 weeks at a glance</SectionTitle>
        <Card>
          {weeks.map((w) => (
            <View key={w.week} style={styles.weekRow}>
              <Text style={[styles.wkLabel, w.week === pos.week && { color: tokens.color.accentText }]}>Wk {w.week}</Text>
              <View style={styles.dots}>
                {w.days.map((d) => (
                  <Animated.View
                    key={d.date}
                    entering={d.won ? ZoomIn.delay(w.week * 30).springify() : undefined}
                    accessibilityLabel={`${friendlyDayLabel(d.date)}: ${d.future ? 'upcoming' : `${Math.round(d.pct * 100)} percent`}`}
                    style={[
                      styles.dot,
                      d.future ? styles.dotFuture : { backgroundColor: d.won ? tokens.color.ok : `rgba(240,154,106,${0.15 + d.pct * 0.7})` },
                      d.won && styles.dotWon,
                      d.date === today && styles.dotToday,
                    ]}
                  >
                    {d.won ? <Text style={styles.dotTick}>✓</Text> : null}
                  </Animated.View>
                ))}
              </View>
              <Text style={styles.wkScore}>{w.wonDays}/7</Text>
            </View>
          ))}
          <Text style={[ui.muted, { marginTop: 6 }]}>Green = 80%+ ticked. A missed day is fine. Two in a row is a habit breaking.</Text>
        </Card>

        <SectionTitle>Weight</SectionTitle>
        <Card>
          {wc && st.weighIns.length > 0 ? (
            <WeightChart points={st.weighIns} startDate={startDate} startKg={wc.startKg} weeks={p.weeks} />
          ) : (
            <Text style={ui.muted}>Add your first weigh-in below to see the chart.</Text>
          )}
          <Text style={[ui.muted, { marginTop: 6 }]}>Real fat loss is ½ to ¾ kg a week. The green band shows that pace.</Text>
        </Card>

        <SectionTitle>{fromDateKey(today).getDay() === 0 ? 'Sunday check 📏' : 'Add a weigh-in'}</SectionTitle>
        <Card variant="glow">
          <View style={[ui.between, styles.formRow]}><Text style={styles.lbl}>Weight</Text><Stepper label="Weight" value={kg} onChange={setKg} step={0.1} min={30} max={200} format={(v) => `${v.toFixed(1)} kg`} /></View>
          <View style={[ui.between, styles.formRow]}><Text style={styles.lbl}>Waist</Text><Stepper label="Waist" value={waist} onChange={setWaist} step={0.5} min={40} max={200} format={(v) => `${v} cm`} /></View>
          <View style={[ui.between, styles.formRow]}><Text style={styles.lbl}>Energy (1–10)</Text><Stepper label="Energy" value={energy} onChange={setEnergy} step={1} min={1} max={10} /></View>
          <Pressable onPress={save} accessibilityRole="button" style={({ pressed }) => [styles.save, pressed && { transform: [{ scale: 0.98 }] }]}>
            <LinearGradient colors={tokens.gradient.peach} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[StyleSheet.absoluteFill, { borderRadius: 20 }]} />
            <Text style={styles.saveText}>{saved ? 'Saved ✓' : 'Save for today'}</Text>
          </Pressable>
        </Card>

        {st.weighIns.length > 0 ? (
          <>
            <SectionTitle>History</SectionTitle>
            <Card>
              {[...st.weighIns].reverse().map((w, i) => (
                <View key={w.date} style={[ui.between, { paddingVertical: 10 }, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: tokens.color.border }]}>
                  <Text style={styles.lbl}>{friendlyDayLabel(w.date)}</Text>
                  <Text style={styles.hist}>{w.weightKg} kg{w.waistCm ? ` · ${w.waistCm} cm` : ''}{w.energy ? ` · ⚡${w.energy}` : ''}</Text>
                </View>
              ))}
            </Card>
          </>
        ) : null}

        <Banner style={{ marginTop: 16 }} text="Photo rule: take a front and a side photo on day 1 and on day 56 in the same clothes. Photos show change the scale misses. Keep them in your phone’s gallery; Svastha never stores photos." />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  summary: { flexDirection: 'row', borderRadius: 28, padding: 20, overflow: 'hidden', marginTop: 4, ...tokens.shadow.card },
  sumCol: { flex: 1, alignItems: 'center' },
  sumV: { color: '#fff', fontSize: 30, fontWeight: '800', fontVariant: ['tabular-nums'], letterSpacing: -0.8 },
  sumL: { color: 'rgba(255,255,255,0.7)', fontSize: 12.5, fontWeight: '600', marginTop: 2 },
  sumDiv: { width: 1, backgroundColor: 'rgba(255,255,255,0.15)' },
  weekRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 5 },
  wkLabel: { width: 44, fontSize: 13, fontWeight: '800', color: tokens.color.inkSoft },
  dots: { flex: 1, flexDirection: 'row', justifyContent: 'space-between' },
  dot: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  dotFuture: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: tokens.color.border, borderStyle: 'dashed' },
  dotWon: { shadowColor: tokens.color.ok, shadowOpacity: 0.5, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
  dotToday: { borderWidth: 2.5, borderColor: tokens.color.ink },
  dotTick: { color: '#fff', fontSize: 13, fontWeight: '900' },
  wkScore: { width: 38, textAlign: 'right', fontSize: 13, fontWeight: '800', color: tokens.color.inkMuted },
  formRow: { paddingVertical: 8 },
  lbl: { fontSize: 15.5, fontWeight: '600', color: tokens.color.ink },
  save: { marginTop: 14, height: 54, borderRadius: 20, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', ...tokens.shadow.glow },
  saveText: { fontSize: 17, fontWeight: '800', color: tokens.color.onAccent },
  hist: { fontSize: 15, fontWeight: '700', color: tokens.color.ink },
});
