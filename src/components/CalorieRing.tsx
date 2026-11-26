import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, RadialGradient, Stop } from 'react-native-svg';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { tokens } from '@/theme/tokens';
import { Icon } from './Icon';

/** Smoothly tweens a number toward `target` (ease-out cubic) — drives the arc and the counter together. */
function useTween(target: number, duration: number, reduced: boolean): number {
  const [value, setValue] = useState(reduced ? target : 0);
  const current = useRef(reduced ? target : 0);
  useEffect(() => {
    if (reduced) {
      current.current = target;
      setValue(target);
      return;
    }
    const from = current.current;
    if (Math.abs(from - target) < 0.0001) return;
    let raf = 0;
    const start = Date.now();
    const tick = () => {
      const p = Math.min(1, (Date.now() - start) / duration);
      const e = 1 - Math.pow(1 - p, 3);
      current.current = from + (target - from) * e;
      setValue(current.current);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, reduced]);
  return value;
}

const W = 300;
const H = 252;
const CX = 150;
const CY = 140;
const R = 110;
const STROKE = 18;
const START = 135; // degrees, screen coords (clockwise from +x)
const SWEEP = 270;

function pt(deg: number, r = R) {
  const rad = (deg * Math.PI) / 180;
  return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) };
}

function arc(fromDeg: number, toDeg: number, r = R): string {
  const a = pt(fromDeg, r);
  const b = pt(toDeg, r);
  const large = toDeg - fromDeg > 180 ? 1 : 0;
  return `M ${a.x.toFixed(2)} ${a.y.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${b.x.toFixed(2)} ${b.y.toFixed(2)}`;
}

interface Macro {
  key: string;
  label: string;
  value: number;
  target: number;
  color: string;
}

interface CalorieRingProps {
  eatenKcal: number;
  goalKcal: number;
  dateLabel: string;
  macros?: Macro[];
  onPress?: () => void;
}

/**
 * Glowing, flowing daily calorie ring:
 * - 270° arc with a gold→peach→terracotta gradient, layered halo glow and a glassy sheen line
 * - progress sweeps smoothly whenever intake changes, with the centre number counting in sync
 * - a luminous "comet head" pulses at the leading edge; an ambient bloom breathes behind
 * - empty track keeps the ≥3:1 `segmentEmptyStroke` outline (WCAG non-text contrast)
 * - full progressbar semantics; all motion is disabled under Reduce Motion
 */
export function CalorieRing({ eatenKcal, goalKcal, dateLabel, macros = [], onPress }: CalorieRingProps) {
  const reduced = useReducedMotion();
  const ratio = goalKcal > 0 ? eatenKcal / goalKcal : 0;
  const p = useTween(Math.min(1, ratio), 1200, reduced);
  const shownKcal = Math.round(useTween(eatenKcal, 1200, reduced));
  const remaining = goalKcal - eatenKcal;
  const over = remaining < 0;

  // ambient breathing bloom + head pulse (UI-thread animations)
  const breathe = useSharedValue(0);
  useEffect(() => {
    if (reduced) return;
    breathe.value = withRepeat(withSequence(withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.sin) }), withTiming(0, { duration: 2600, easing: Easing.inOut(Easing.sin) })), -1);
  }, [reduced, breathe]);
  const bloomStyle = useAnimatedStyle(() => ({ opacity: 0.55 + breathe.value * 0.35, transform: [{ scale: 0.94 + breathe.value * 0.08 }] }));
  const headPulse = useAnimatedStyle(() => ({ opacity: 0.35 + breathe.value * 0.45, transform: [{ scale: 0.85 + breathe.value * 0.5 }] }));

  const endDeg = START + SWEEP * Math.max(0.0001, p);
  const head = pt(endDeg);
  const showProgress = p > 0.004;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="progressbar"
      accessibilityLabel={`${eatenKcal.toLocaleString()} of ${goalKcal.toLocaleString()} kilocalories eaten. ${over ? `${Math.abs(remaining).toLocaleString()} over goal` : `${remaining.toLocaleString()} remaining`}`}
      accessibilityValue={{ min: 0, max: goalKcal, now: Math.min(eatenKcal, goalKcal) }}
      style={styles.wrap}
    >
      <View style={styles.ringBox}>
        <Animated.View style={[styles.bloom, bloomStyle]} pointerEvents="none">
          <Svg width={W} height={W}>
            <Defs>
              <RadialGradient id="bloom" cx="50%" cy="50%" r="50%">
                <Stop offset="0" stopColor={tokens.color.accent} stopOpacity="0.38" />
                <Stop offset="0.55" stopColor={tokens.color.gold} stopOpacity="0.14" />
                <Stop offset="1" stopColor={tokens.color.gold} stopOpacity="0" />
              </RadialGradient>
            </Defs>
            <Circle cx={W / 2} cy={W / 2} r={W / 2} fill="url(#bloom)" />
          </Svg>
        </Animated.View>

        <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
          <Defs>
            <LinearGradient id="ringGrad" x1="0" y1="1" x2="1" y2="0.2">
              <Stop offset="0" stopColor={tokens.gradient.ring[0]} />
              <Stop offset="0.55" stopColor={tokens.gradient.ring[1]} />
              <Stop offset="1" stopColor={tokens.gradient.ring[2]} />
            </LinearGradient>
            <LinearGradient id="glowGrad" x1="0" y1="1" x2="1" y2="0.2">
              <Stop offset="0" stopColor={tokens.color.gold} />
              <Stop offset="1" stopColor={tokens.color.accentDeep} />
            </LinearGradient>
          </Defs>

          {/* Track: 1.5px ≥3:1 outline + soft cream fill */}
          <Path d={arc(START, START + SWEEP)} stroke={tokens.color.segmentEmptyStroke} strokeWidth={STROKE + 3} strokeLinecap="round" fill="none" opacity={0.55} />
          <Path d={arc(START, START + SWEEP)} stroke={tokens.color.segmentEmpty} strokeWidth={STROKE} strokeLinecap="round" fill="none" />
          {/* Tick marks every 10% for a precise, instrument-like feel */}
          {Array.from({ length: 11 }).map((_, i) => {
            const d = START + (SWEEP * i) / 10;
            const a = pt(d, R - STROKE / 2 - 8);
            const b = pt(d, R - STROKE / 2 - (i % 5 === 0 ? 15 : 11));
            return <Path key={i} d={`M ${a.x} ${a.y} L ${b.x} ${b.y}`} stroke={tokens.color.segmentEmptyStroke} strokeWidth={i % 5 === 0 ? 2 : 1.2} strokeLinecap="round" opacity={0.7} />;
          })}

          {showProgress && (
            <>
              {/* layered halo = glow that renders the same on iOS, Android and web */}
              <Path d={arc(START, endDeg)} stroke="url(#glowGrad)" strokeWidth={STROKE + 22} strokeLinecap="round" fill="none" opacity={0.08} />
              <Path d={arc(START, endDeg)} stroke="url(#glowGrad)" strokeWidth={STROKE + 12} strokeLinecap="round" fill="none" opacity={0.16} />
              <Path d={arc(START, endDeg)} stroke="url(#ringGrad)" strokeWidth={STROKE} strokeLinecap="round" fill="none" />
              {/* glassy sheen along the inner edge */}
              <Path d={arc(START, endDeg, R - 4)} stroke="#FFFFFF" strokeWidth={2.5} strokeLinecap="round" fill="none" opacity={0.45} />
              {/* comet head */}
              <Circle cx={head.x} cy={head.y} r={STROKE / 2 + 2} fill="#FFFFFF" />
              <Circle cx={head.x} cy={head.y} r={STROKE / 2 - 3} fill={tokens.color.accent} />
            </>
          )}
        </Svg>

        {showProgress && !reduced ? (
          <Animated.View pointerEvents="none" style={[styles.headGlow, { left: head.x - 22, top: head.y - 22 }, headPulse]} />
        ) : null}

        <View style={styles.center} pointerEvents="none">
          <View style={styles.flameBadge}>
            <Icon name="flame" size={18} color={tokens.color.accentText} />
          </View>
          <Text style={styles.date}>{dateLabel}</Text>
          <Text style={styles.kcal} accessibilityElementsHidden>
            {shownKcal.toLocaleString()}
          </Text>
          <Text style={styles.goal}>of {goalKcal.toLocaleString()} kcal</Text>
          <View style={[styles.remainPill, over && { backgroundColor: tokens.color.watchBg }]}>
            <Icon name={over ? 'alert' : 'target'} size={12} color={over ? tokens.color.watch : tokens.color.accentText} strokeWidth={2.4} />
            <Text style={[styles.remainText, over && { color: tokens.color.watch }]}>
              {over ? `${Math.abs(remaining).toLocaleString()} over` : `${remaining.toLocaleString()} left`}
            </Text>
          </View>
        </View>
      </View>

      {macros.length > 0 && (
        <View style={styles.macroRow}>
          {macros.map((m) => (
            <MacroBar key={m.key} label={m.label} value={m.value} target={m.target} color={m.color} reduced={reduced} />
          ))}
        </View>
      )}
    </Pressable>
  );
}

function MacroBar({ label, value, target, color, reduced }: Omit<Macro, 'key'> & { reduced: boolean }) {
  const pct = target > 0 ? Math.min(1, value / target) : 0;
  const w = useTween(pct, 1100, reduced);
  return (
    <View style={styles.macro} accessible accessibilityLabel={`${label}: ${Math.round(value)} of ${target} grams`}>
      <View style={styles.macroHead}>
        <View style={[styles.macroDot, { backgroundColor: color }]} />
        <Text style={styles.macroLabel}>{label}</Text>
      </View>
      <View style={styles.macroTrack}>
        <View style={[styles.macroFill, { width: `${w * 100}%`, backgroundColor: color, shadowColor: color }]}>
          <View style={styles.macroSheen} />
        </View>
      </View>
      <Text style={styles.macroVal}>
        {Math.round(value)}
        <Text style={styles.macroTarget}> / {target} g</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', width: '100%' },
  ringBox: { width: W, height: H, alignItems: 'center' },
  bloom: { position: 'absolute', top: CY - W / 2, left: 0, width: W, height: W },
  headGlow: { position: 'absolute', width: 44, height: 44, borderRadius: 22, backgroundColor: tokens.color.accentGlow },
  center: { position: 'absolute', top: 58, alignItems: 'center', width: W },
  flameBadge: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(253,232,220,0.95)', alignItems: 'center', justifyContent: 'center', marginBottom: 4, ...tokens.shadow.glow, shadowOpacity: 0.3 },
  date: { ...tokens.type.caption, color: tokens.color.inkMuted, fontWeight: '600' },
  kcal: { fontSize: 46, lineHeight: 52, fontWeight: '800', color: tokens.color.ink, letterSpacing: -1.5, fontVariant: ['tabular-nums'] },
  goal: { ...tokens.type.label, color: tokens.color.inkMuted, fontWeight: '600', marginTop: -2 },
  remainPill: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: tokens.color.accentSoft },
  remainText: { fontSize: 12, fontWeight: '800', color: tokens.color.accentText, fontVariant: ['tabular-nums'] },
  macroRow: { flexDirection: 'row', gap: 14, width: '100%', marginTop: -6 },
  macro: { flex: 1 },
  macroHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  macroDot: { width: 8, height: 8, borderRadius: 4 },
  macroLabel: { fontSize: 12, fontWeight: '600', color: tokens.color.inkMuted },
  macroTrack: { height: 8, borderRadius: 4, backgroundColor: 'rgba(43,43,43,0.07)' },
  macroFill: { height: 8, borderRadius: 4, shadowOpacity: 0.7, shadowRadius: 6, shadowOffset: { width: 0, height: 0 }, overflow: 'hidden' },
  macroSheen: { position: 'absolute', top: 1, left: 3, right: 3, height: 2, borderRadius: 1, backgroundColor: 'rgba(255,255,255,0.55)' },
  macroVal: { marginTop: 5, fontSize: 14, fontWeight: '800', color: tokens.color.ink, fontVariant: ['tabular-nums'] },
  macroTarget: { fontSize: 12, fontWeight: '500', color: tokens.color.inkMuted },
});
