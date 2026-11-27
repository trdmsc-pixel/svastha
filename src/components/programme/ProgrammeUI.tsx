import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, RadialGradient, Stop } from 'react-native-svg';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeOut,
  ZoomIn,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { tokens } from '@/theme/tokens';
import { Icon, IconName } from '@/components/Icon';
import { haptic } from '@/lib/haptics';
import { formatTime12 } from '@/lib/dates';
import { RoutineItem } from '@/programme/types';

/* ───────────────────────── helpers ───────────────────────── */

/** Ease-out tween of a number (JS-driven so it renders identically on iOS, Android and web). */
export function useTween(target: number, duration = 900): number {
  const reduced = useReducedMotion();
  const [value, setValue] = useState(reduced ? target : 0);
  const cur = useRef(reduced ? target : 0);
  useEffect(() => {
    if (reduced) {
      cur.current = target;
      setValue(target);
      return;
    }
    const from = cur.current;
    if (Math.abs(from - target) < 0.0001) return;
    let raf = 0;
    const t0 = Date.now();
    const step = () => {
      const p = Math.min(1, (Date.now() - t0) / duration);
      cur.current = from + (target - from) * (1 - Math.pow(1 - p, 3));
      setValue(cur.current);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, reduced]);
  return value;
}

/** Soft breathing glow — used behind the halo and on the "now" item. */
function useBreath(min = 0.45, max = 1, ms = 1800) {
  const reduced = useReducedMotion();
  const v = useSharedValue(max);
  useEffect(() => {
    if (reduced) return;
    v.value = withRepeat(withSequence(withTiming(min, { duration: ms, easing: Easing.inOut(Easing.sin) }), withTiming(max, { duration: ms, easing: Easing.inOut(Easing.sin) })), -1, true);
  }, [reduced, v, min, max, ms]);
  return v;
}

/* ───────────────────────── Progress halo ───────────────────────── */

export function ProgressHalo({ pct, size = 168, stroke = 16, center, won }: { pct: number; size?: number; stroke?: number; center: React.ReactNode; won?: boolean }) {
  const p = useTween(Math.max(0, Math.min(1, pct)));
  const breath = useBreath(0.35, 0.85, 2200);
  const glow = useAnimatedStyle(() => ({ opacity: breath.value, transform: [{ scale: 0.92 + breath.value * 0.1 }] }));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(pct * 100) }}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.haloGlow, { borderRadius: size / 2, backgroundColor: won ? 'rgba(46,107,58,0.16)' : 'rgba(240,154,106,0.22)' }, glow]} />
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Defs>
          <SvgGradient id="haloGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={won ? '#8BD19A' : tokens.color.gold} />
            <Stop offset="0.55" stopColor={won ? '#4FA36A' : tokens.color.accent} />
            <Stop offset="1" stopColor={won ? tokens.color.ok : tokens.color.accentDeep} />
          </SvgGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(43,43,43,0.07)" strokeWidth={stroke} fill="rgba(255,255,255,0.55)" />
        {p > 0.001 ? (
          <Circle cx={size / 2} cy={size / 2} r={r} stroke="url(#haloGrad)" strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={`${c * p} ${c}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
        ) : null}
      </Svg>
      {center}
    </View>
  );
}

/* ───────────────────────── Hero ───────────────────────── */

export function ProgrammeHero({
  name,
  day,
  totalDays,
  week,
  phaseLabel,
  done,
  total,
  pct,
  won,
  streak,
  goals,
}: {
  name: string;
  day: number;
  totalDays: number;
  week: number;
  phaseLabel: string;
  done: number;
  total: number;
  pct: number;
  won: boolean;
  streak: number;
  goals: string[];
}) {
  const counter = Math.round(useTween(done, 600));
  const before = day < 1;
  return (
    <Animated.View entering={FadeInDown.duration(500).springify().damping(18)} style={styles.hero}>
      <LinearGradient colors={['rgba(255,247,240,0.95)', 'rgba(255,236,222,0.88)']} style={[StyleSheet.absoluteFill, { borderRadius: 32 }]} />
      <View style={styles.heroTop}>
        <View style={styles.heroBadge}>
          <Text style={styles.heroBadgeText}>{name.toUpperCase()}</Text>
        </View>
        {streak > 0 ? (
          <Animated.View entering={ZoomIn.springify()} style={styles.streak} accessibilityLabel={`${streak} day streak`}>
            <Text style={{ fontSize: 15 }}>🔥</Text>
            <Text style={styles.streakText}>{streak}</Text>
          </Animated.View>
        ) : null}
      </View>
      <View style={styles.heroBody}>
        <ProgressHalo
          pct={pct}
          won={won}
          center={
            <View style={{ alignItems: 'center' }}>
              <Text style={styles.haloBig}>
                {counter}
                <Text style={styles.haloOf}>/{total}</Text>
              </Text>
              <Text style={styles.haloSub}>{won ? 'Winning day 🎉' : 'ticks today'}</Text>
            </View>
          }
        />
        <View style={{ flex: 1, marginLeft: 18 }}>
          <Text style={styles.heroDay}>{before ? `Starts in ${1 - day} day${1 - day === 1 ? '' : 's'}` : `Day ${Math.min(day, totalDays)}`}</Text>
          <Text style={styles.heroOf}>of {totalDays}</Text>
          <View style={styles.phasePill}>
            <Text style={styles.phaseText}>Week {week} · {phaseLabel}</Text>
          </View>
          <View style={styles.dayBar}>
            <View style={[styles.dayBarFill, { width: `${Math.max(2, Math.min(100, (Math.max(0, day) / totalDays) * 100))}%` }]} />
          </View>
        </View>
      </View>
      <View style={styles.goalRow}>
        {goals.map((g) => (
          <View key={g} style={styles.goalChip}>
            <Text style={styles.goalText}>{g}</Text>
          </View>
        ))}
      </View>
    </Animated.View>
  );
}

/* ───────────────────────── Next up ───────────────────────── */

export function NextUpCard({ item, isNow, minutesAway, onDone }: { item: RoutineItem; isNow: boolean; minutesAway: number; onDone: () => void }) {
  const breath = useBreath(0.3, 1, 900);
  const dot = useAnimatedStyle(() => ({ opacity: breath.value, transform: [{ scale: 0.8 + breath.value * 0.4 }] }));
  const when = isNow ? 'NOW' : minutesAway >= 60 ? `IN ${Math.floor(minutesAway / 60)} H ${minutesAway % 60 ? `${minutesAway % 60} MIN` : ''}`.trim() : `IN ${minutesAway} MIN`;
  return (
    <Animated.View key={item.id} entering={FadeIn.duration(450)} exiting={FadeOut.duration(250)} style={styles.next}>
      <LinearGradient colors={['#3A3633', '#221F1D']} style={[StyleSheet.absoluteFill, { borderRadius: 28 }]} />
      <Svg width={240} height={240} style={styles.nextGlow} pointerEvents="none">
        <Defs>
          <RadialGradient id="nextGlow" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={tokens.color.accent} stopOpacity="0.45" />
            <Stop offset="1" stopColor={tokens.color.accent} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Circle cx={120} cy={120} r={120} fill="url(#nextGlow)" />
      </Svg>
      <View style={styles.nextHead}>
        <Animated.View style={[styles.liveDot, dot, !isNow && { backgroundColor: tokens.color.gold }]} />
        <Text style={styles.nextWhen}>{when}</Text>
        <Text style={styles.nextTime}>{formatTime12(item.time)}{item.endTime ? ` – ${formatTime12(item.endTime)}` : ''}</Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <Text style={{ fontSize: 40 }}>{item.emoji}</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.nextTitle}>{item.title}</Text>
          {item.detail ? <Text style={styles.nextDetail}>{item.detail}</Text> : null}
        </View>
      </View>
      {item.track ? (
        <Pressable
          onPress={() => {
            haptic.success();
            onDone();
          }}
          accessibilityRole="button"
          accessibilityLabel={`Mark ${item.title} done`}
          style={({ pressed }) => [styles.doneBtn, pressed && { transform: [{ scale: 0.97 }] }]}
        >
          <LinearGradient colors={tokens.gradient.peach} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[StyleSheet.absoluteFill, { borderRadius: 20 }]} />
          <Icon name="check" size={20} color={tokens.color.onAccent} strokeWidth={3} />
          <Text style={styles.doneText}>Done</Text>
        </Pressable>
      ) : null}
    </Animated.View>
  );
}

/* ───────────────────────── Timeline ───────────────────────── */

function CheckDot({ checked }: { checked: boolean }) {
  const reduced = useReducedMotion();
  const s = useSharedValue(1);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (reduced || !checked) return;
    s.value = withSequence(withSpring(1.3, { damping: 6, stiffness: 400 }), withSpring(1, { damping: 10, stiffness: 300 }));
  }, [checked, reduced, s]);
  const a = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return (
    <Animated.View style={[styles.check, checked && styles.checkOn, a]}>
      {checked ? <Icon name="check" size={18} color={tokens.color.white} strokeWidth={3.2} /> : null}
    </Animated.View>
  );
}

function TimelineRow({ item, checked, isNow, past, onToggle, index }: { item: RoutineItem; checked: boolean; isNow: boolean; past: boolean; onToggle: () => void; index: number }) {
  const breath = useBreath(0.35, 1, 1300);
  const glow = useAnimatedStyle(() => ({ opacity: breath.value }));
  const reduced = useReducedMotion();
  const body = (
    <View style={[styles.row, item.key && styles.rowKey, isNow && styles.rowNow, (past && !checked && item.track) && { opacity: 0.72 }]}>
      {isNow ? <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.rowNowGlow, glow]} /> : null}
      <Text style={styles.rowEmoji}>{item.emoji}</Text>
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowTitle, checked && styles.rowTitleDone]}>{item.title}</Text>
        {item.detail ? <Text style={styles.rowDetail}>{item.detail}</Text> : null}
      </View>
      {item.track ? <CheckDot checked={checked} /> : <View style={styles.infoDot}><Icon name="clock" size={14} color={tokens.color.inkMuted} /></View>}
    </View>
  );
  return (
    <Animated.View entering={reduced ? undefined : FadeInDown.delay(Math.min(index, 10) * 45).duration(380)} style={styles.tlRow}>
      <View style={styles.tlTimeCol}>
        <View style={{ width: 50 }}>
          <Text style={[styles.tlTime, isNow && { color: tokens.color.accentText }]}>{formatTime12(item.time).split(' ')[0].replace(':00', '')}</Text>
          <Text style={[styles.tlAmPm, isNow && { color: tokens.color.accentText }]}>{formatTime12(item.time).split(' ')[1]}</Text>
        </View>
        <View style={[styles.tlNode, checked && { backgroundColor: tokens.color.ok, borderColor: tokens.color.ok }, isNow && styles.tlNodeNow]} />
      </View>
      {item.track ? (
        <Pressable
          style={{ flex: 1 }}
          onPress={() => {
            if (checked) haptic.tap();
            else haptic.success();
            onToggle();
          }}
          accessibilityRole="checkbox"
          accessibilityState={{ checked }}
          accessibilityLabel={`${formatTime12(item.time)}. ${item.title}`}
        >
          {body}
        </Pressable>
      ) : (
        <View style={{ flex: 1 }} accessibilityLabel={`${formatTime12(item.time)}. ${item.title}`}>{body}</View>
      )}
    </Animated.View>
  );
}

export function RoutineTimeline({ items, checked, nowId, hhmm, onToggle }: { items: RoutineItem[]; checked: readonly string[]; nowId?: string | null; hhmm?: string | null; onToggle: (id: string) => void }) {
  const set = new Set(checked);
  const nowMin = hhmm ? parseInt(hhmm.slice(0, 2), 10) * 60 + parseInt(hhmm.slice(3), 10) : null;
  return (
    <View style={styles.timeline}>
      <View style={styles.tlLine} />
      {items.map((it, i) => {
        const [h, m] = (it.endTime ?? it.time).split(':').map(Number);
        const past = nowMin != null && it.id !== nowId && h * 60 + m + 30 < nowMin;
        return <TimelineRow key={it.id} index={i} item={it} checked={set.has(it.id)} isNow={it.id === nowId} past={past} onToggle={() => onToggle(it.id)} />;
      })}
    </View>
  );
}

/* ───────────────────────── Tiles ───────────────────────── */

export interface Tile {
  key: string;
  emoji: string;
  title: string;
  value: string;
  sub?: string;
  icon?: IconName;
  onPress: () => void;
}

export function QuickTiles({ tiles }: { tiles: Tile[] }) {
  return (
    <View style={styles.tiles}>
      {tiles.map((t, i) => (
        <Animated.View key={t.key} entering={FadeInDown.delay(80 + i * 60).duration(420)} style={{ width: '48%' }}>
          <Pressable
            onPress={() => {
              haptic.tap();
              t.onPress();
            }}
            accessibilityRole="button"
            accessibilityLabel={`${t.title}: ${t.value}`}
            style={({ pressed }) => [styles.tile, pressed && { transform: [{ scale: 0.97 }] }]}
          >
            <Text style={{ fontSize: 26 }}>{t.emoji}</Text>
            <Text style={styles.tileTitle}>{t.title}</Text>
            <Text style={styles.tileValue} numberOfLines={2}>{t.value}</Text>
            {t.sub ? <Text style={styles.tileSub} numberOfLines={1}>{t.sub}</Text> : null}
          </Pressable>
        </Animated.View>
      ))}
    </View>
  );
}

/* ───────────────────────── Win toast ───────────────────────── */

export function WinToast({ visible, onHide }: { visible: boolean; onHide: () => void }) {
  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(onHide, 2600);
    return () => clearTimeout(t);
  }, [visible, onHide]);
  if (!visible) return null;
  return (
    <Animated.View entering={ZoomIn.springify().damping(12)} exiting={FadeOut.duration(300)} style={styles.toast} pointerEvents="none" accessibilityLiveRegion="polite">
      <LinearGradient colors={['#4FA36A', tokens.color.ok]} style={[StyleSheet.absoluteFill, { borderRadius: 26 }]} />
      <Text style={{ fontSize: 30 }}>🎉</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.toastTitle}>Winning day!</Text>
        <Text style={styles.toastSub}>80% of today ticked. Keep the streak going.</Text>
      </View>
    </Animated.View>
  );
}

/* ───────────────────────── styles ───────────────────────── */

const styles = StyleSheet.create({
  haloGlow: { shadowColor: tokens.color.accent, shadowOpacity: 0.7, shadowRadius: 28, shadowOffset: { width: 0, height: 0 } },
  hero: { borderRadius: 32, padding: 20, marginTop: 14, borderWidth: 1.5, borderColor: 'rgba(240,154,106,0.45)', overflow: 'hidden', shadowColor: '#E8774A', shadowOpacity: 0.18, shadowRadius: 26, shadowOffset: { width: 0, height: 12 }, elevation: 5 },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  heroBadge: { backgroundColor: tokens.color.ink, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999 },
  heroBadgeText: { color: tokens.color.white, fontSize: 11, fontWeight: '800', letterSpacing: 1.2 },
  streak: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.85)', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(240,154,106,0.5)' },
  streakText: { fontSize: 15, fontWeight: '800', color: tokens.color.accentText },
  heroBody: { flexDirection: 'row', alignItems: 'center' },
  haloBig: { fontSize: 44, fontWeight: '800', color: tokens.color.ink, letterSpacing: -1.5, fontVariant: ['tabular-nums'] },
  haloOf: { fontSize: 20, fontWeight: '700', color: tokens.color.inkMuted },
  haloSub: { fontSize: 13, fontWeight: '700', color: tokens.color.inkMuted, marginTop: -2 },
  heroDay: { fontSize: 32, fontWeight: '800', color: tokens.color.ink, letterSpacing: -0.8 },
  heroOf: { fontSize: 15, fontWeight: '600', color: tokens.color.inkMuted, marginTop: -2 },
  phasePill: { alignSelf: 'flex-start', marginTop: 10, backgroundColor: tokens.color.accentSoft, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  phaseText: { fontSize: 13, fontWeight: '800', color: tokens.color.accentText },
  dayBar: { height: 6, borderRadius: 3, backgroundColor: 'rgba(43,43,43,0.08)', marginTop: 12, overflow: 'hidden' },
  dayBarFill: { height: '100%', borderRadius: 3, backgroundColor: tokens.color.accent },
  goalRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 16 },
  goalChip: { backgroundColor: 'rgba(255,255,255,0.8)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: 'rgba(255,255,255,0.95)' },
  goalText: { fontSize: 12.5, fontWeight: '700', color: tokens.color.inkSoft },

  next: { borderRadius: 28, padding: 20, marginTop: 14, overflow: 'hidden', ...tokens.shadow.card, shadowOpacity: 0.25 },
  nextGlow: { position: 'absolute', right: -90, top: -100 },
  nextHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  liveDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: tokens.color.accent, shadowColor: tokens.color.accent, shadowOpacity: 1, shadowRadius: 8, shadowOffset: { width: 0, height: 0 } },
  nextWhen: { color: tokens.color.white, fontSize: 13, fontWeight: '800', letterSpacing: 1.4 },
  nextTime: { color: 'rgba(255,255,255,0.65)', fontSize: 13, fontWeight: '600', marginLeft: 'auto' },
  nextTitle: { color: tokens.color.white, fontSize: 21, fontWeight: '800', lineHeight: 26, letterSpacing: -0.3 },
  nextDetail: { color: 'rgba(255,255,255,0.75)', fontSize: 14.5, lineHeight: 20, marginTop: 3 },
  doneBtn: { marginTop: 16, height: 54, borderRadius: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, overflow: 'hidden', ...tokens.shadow.glow },
  doneText: { fontSize: 18, fontWeight: '800', color: tokens.color.onAccent },

  timeline: { marginTop: 4, position: 'relative' },
  tlLine: { position: 'absolute', left: 61, top: 18, bottom: 18, width: 2, backgroundColor: 'rgba(43,43,43,0.08)', borderRadius: 1 },
  tlRow: { flexDirection: 'row', alignItems: 'stretch', marginBottom: 10 },
  tlTimeCol: { width: 70, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingRight: 4 },
  tlTime: { fontSize: 17, fontWeight: '800', color: tokens.color.ink, fontVariant: ['tabular-nums'], letterSpacing: -0.3 },
  tlAmPm: { fontSize: 11, fontWeight: '700', color: tokens.color.inkMuted, marginTop: -2 },
  tlNode: { width: 12, height: 12, borderRadius: 6, backgroundColor: tokens.color.bg, borderWidth: 2, borderColor: tokens.color.segmentEmptyStroke },
  tlNodeNow: { backgroundColor: tokens.color.accent, borderColor: tokens.color.accentDeep, shadowColor: tokens.color.accent, shadowOpacity: 1, shadowRadius: 8, shadowOffset: { width: 0, height: 0 } },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 14, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.74)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.95)', minHeight: 64, overflow: 'hidden', ...tokens.shadow.soft },
  rowKey: { backgroundColor: 'rgba(255,249,243,0.92)', borderColor: 'rgba(240,154,106,0.35)' },
  rowNow: { borderColor: tokens.color.accent, borderWidth: 2 },
  rowNowGlow: { borderRadius: 22, backgroundColor: 'rgba(240,154,106,0.12)' },
  rowEmoji: { fontSize: 26 },
  rowTitle: { fontSize: 16.5, fontWeight: '700', color: tokens.color.ink, lineHeight: 21 },
  rowTitleDone: { color: tokens.color.inkMuted, textDecorationLine: 'line-through' },
  rowDetail: { fontSize: 13.5, color: tokens.color.inkMuted, lineHeight: 18, marginTop: 2 },
  check: { width: 34, height: 34, borderRadius: 12, borderWidth: 2.5, borderColor: tokens.color.segmentEmptyStroke, backgroundColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center' },
  checkOn: { backgroundColor: tokens.color.ok, borderColor: tokens.color.ok, shadowColor: tokens.color.ok, shadowOpacity: 0.45, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
  infoDot: { width: 34, alignItems: 'center' },

  tiles: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12, marginTop: 14 },
  tile: { borderRadius: 24, padding: 16, minHeight: 128, backgroundColor: 'rgba(255,255,255,0.74)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.95)', ...tokens.shadow.soft },
  tileTitle: { fontSize: 12, fontWeight: '800', letterSpacing: 1, color: tokens.color.accentText, marginTop: 8, textTransform: 'uppercase' },
  tileValue: { fontSize: 16, fontWeight: '800', color: tokens.color.ink, marginTop: 2, lineHeight: 20 },
  tileSub: { fontSize: 12.5, color: tokens.color.inkMuted, marginTop: 2 },

  toast: { position: 'absolute', top: 70, left: 16, right: 16, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 26, overflow: 'hidden', zIndex: 40, shadowColor: tokens.color.ok, shadowOpacity: 0.4, shadowRadius: 20, shadowOffset: { width: 0, height: 10 }, elevation: 12 },
  toastTitle: { color: tokens.color.white, fontSize: 18, fontWeight: '800' },
  toastSub: { color: 'rgba(255,255,255,0.9)', fontSize: 13.5, marginTop: 1 },
});
