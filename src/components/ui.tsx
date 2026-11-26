import React, { useEffect } from 'react';
import { Pressable, StyleProp, StyleSheet, Text, TextInput, TextInputProps, TextStyle, View, ViewStyle } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import Animated, { interpolateColor, useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { tokens } from '@/theme/tokens';
import { haptic } from '@/lib/haptics';
import { Icon, IconName } from './Icon';

/* ───────────────────────── Ambient background ───────────────────────── */

/** Warm cream canvas with two soft peach/gold light blooms — the base of every screen. */
export function ScreenBackground() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width="100%" height="100%" preserveAspectRatio="none">
        <Defs>
          <RadialGradient id="bloomA" cx="85%" cy="4%" r="60%">
            <Stop offset="0" stopColor="#FAD3BB" stopOpacity="0.9" />
            <Stop offset="1" stopColor="#FAD3BB" stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="bloomB" cx="0%" cy="55%" r="55%">
            <Stop offset="0" stopColor="#F8E2BF" stopOpacity="0.7" />
            <Stop offset="1" stopColor="#F8E2BF" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={tokens.color.bg} />
        <Rect width="100%" height="100%" fill="url(#bloomA)" />
        <Rect width="100%" height="100%" fill="url(#bloomB)" />
      </Svg>
    </View>
  );
}

/** Screen shell: ambient background + safe-area top padding. */
export function Screen({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[{ flex: 1, paddingTop: insets.top, backgroundColor: tokens.color.bg }, style]}>
      <ScreenBackground />
      {children}
    </View>
  );
}

/* ───────────────────────── Header & buttons ───────────────────────── */

export function IconButton({
  icon,
  onPress,
  label,
  badge,
  size = 44,
  tone = 'glass',
  iconColor,
  style,
}: {
  icon: IconName;
  onPress: () => void;
  label: string;
  badge?: number;
  size?: number;
  tone?: 'glass' | 'ink' | 'accent' | 'plain';
  iconColor?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const bg = tone === 'ink' ? tokens.color.ink : tone === 'accent' ? tokens.color.accent : tone === 'plain' ? 'transparent' : tokens.color.glassStrong;
  const fg = iconColor ?? (tone === 'ink' ? tokens.color.white : tokens.color.ink);
  return (
    <Pressable
      onPress={() => {
        haptic.tap();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={badge ? `${label}, ${badge} new` : label}
      hitSlop={6}
      style={({ pressed }) => [
        styles.iconBtn,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: bg, opacity: pressed ? 0.75 : 1 },
        tone === 'glass' && styles.iconBtnGlass,
        style,
      ]}
    >
      <Icon name={icon} size={Math.round(size * 0.45)} color={fg} />
      {!!badge && badge > 0 && (
        <View style={styles.badge} accessibilityElementsHidden>
          <Text style={styles.badgeText}>{badge > 9 ? '9+' : badge}</Text>
        </View>
      )}
    </Pressable>
  );
}

export function ScreenHeader({
  title,
  subtitle,
  back = true,
  right,
  onBack,
}: {
  title: string;
  subtitle?: string;
  back?: boolean;
  right?: React.ReactNode;
  onBack?: () => void;
}) {
  return (
    <View style={styles.header}>
      {back ? (
        <IconButton
          icon="chevronLeft"
          label="Back"
          onPress={() => {
            if (onBack) return onBack();
            if (router.canGoBack()) router.back();
            else router.replace('/');
          }}
        />
      ) : (
        <View style={{ width: 44 }} />
      )}
      <View style={styles.headerCenter}>
        <Text style={styles.headerTitle} numberOfLines={1} accessibilityRole="header">
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.headerSub} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <View style={styles.headerRight}>{right ?? <View style={{ width: 44 }} />}</View>
    </View>
  );
}

export function SectionTitle({ children, action, onAction, style }: { children: string; action?: string; onAction?: () => void; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.sectionRow, style]}>
      <Text style={styles.sectionTitle} accessibilityRole="header">
        {children}
      </Text>
      {action && onAction ? (
        <Pressable onPress={onAction} accessibilityRole="button" hitSlop={10}>
          <Text style={styles.sectionAction}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/* ───────────────────────── Toggle ───────────────────────── */

export function Toggle({ value, onValueChange, label, disabled }: { value: boolean; onValueChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  const reduced = useReducedMotion();
  const p = useSharedValue(value ? 1 : 0);
  useEffect(() => {
    p.value = reduced ? (value ? 1 : 0) : withSpring(value ? 1 : 0, { damping: 18, stiffness: 260 });
  }, [value, reduced, p]);
  const track = useAnimatedStyle(() => ({ backgroundColor: interpolateColor(p.value, [0, 1], ['#D9D1C7', tokens.color.accent]) }));
  const knob = useAnimatedStyle(() => ({ transform: [{ translateX: 2 + p.value * 20 }] }));
  return (
    <Pressable
      onPress={() => {
        if (disabled) return;
        haptic.select();
        onValueChange(!value);
      }}
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value, disabled }}
      hitSlop={8}
      style={{ opacity: disabled ? 0.45 : 1 }}
    >
      <Animated.View style={[styles.toggleTrack, track]}>
        <Animated.View style={[styles.toggleKnob, knob]}>{value ? <Icon name="check" size={12} color={tokens.color.onAccent} strokeWidth={3} /> : null}</Animated.View>
      </Animated.View>
    </Pressable>
  );
}

/* ───────────────────────── Setting row ───────────────────────── */

export function SettingRow({
  icon,
  iconBg = tokens.color.accentSoft,
  title,
  subtitle,
  right,
  onPress,
  danger,
  last,
}: {
  icon: IconName;
  iconBg?: string;
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  onPress?: () => void;
  danger?: boolean;
  last?: boolean;
}) {
  const content = (
    <View style={[styles.settingRow, !last && styles.settingRowBorder]}>
      <View style={[styles.settingIcon, { backgroundColor: danger ? tokens.color.riskBg : iconBg }]}>
        <Icon name={icon} size={18} color={danger ? tokens.color.risk : tokens.color.ink} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.settingTitle, danger && { color: tokens.color.risk }]}>{title}</Text>
        {subtitle ? <Text style={styles.settingSub}>{subtitle}</Text> : null}
      </View>
      {right ?? (onPress ? <Icon name="chevronRight" size={18} color={tokens.color.inkMuted} /> : null)}
    </View>
  );
  if (!onPress) return content;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={subtitle ? `${title}. ${subtitle}` : title} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
      {content}
    </Pressable>
  );
}

/* ───────────────────────── Segmented control ───────────────────────── */

export function Segmented<T extends string>({ options, value, onChange, style }: { options: Array<{ value: T; label: string; icon?: IconName }>; value: T; onChange: (v: T) => void; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.segmented, style]} accessibilityRole="tablist">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => {
              haptic.select();
              onChange(o.value);
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            style={[styles.segment, active && styles.segmentActive]}
          >
            {o.icon ? <Icon name={o.icon} size={16} color={active ? tokens.color.white : tokens.color.ink} /> : null}
            <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/* ───────────────────────── Chips ───────────────────────── */

export function ChipSelect<T extends string>({
  options,
  selected,
  onToggle,
  multi = true,
}: {
  options: Array<{ value: T; label: string }>;
  selected: T[];
  onToggle: (v: T) => void;
  multi?: boolean;
}) {
  return (
    <View style={styles.chipWrap} accessibilityRole={multi ? undefined : 'radiogroup'}>
      {options.map((o) => {
        const on = selected.includes(o.value);
        return (
          <Pressable
            key={o.value}
            onPress={() => {
              haptic.select();
              onToggle(o.value);
            }}
            accessibilityRole={multi ? 'checkbox' : 'radio'}
            accessibilityState={multi ? { checked: on } : { selected: on }}
            style={[styles.chip, on && styles.chipOn]}
          >
            {on ? <Icon name="check" size={14} color={tokens.color.onAccent} strokeWidth={2.6} /> : null}
            <Text style={[styles.chipText, on && styles.chipTextOn]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/* ───────────────────────── Stepper ───────────────────────── */

export function Stepper({ value, onChange, step = 1, min = 0, max = 9999, format, label }: { value: number; onChange: (v: number) => void; step?: number; min?: number; max?: number; format?: (v: number) => string; label: string }) {
  const set = (v: number) => {
    haptic.select();
    onChange(Math.min(max, Math.max(min, Number(v.toFixed(2)))));
  };
  return (
    <View style={styles.stepper} accessible accessibilityRole="adjustable" accessibilityLabel={label} accessibilityValue={{ text: format ? format(value) : String(value) }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => set(value + (e.nativeEvent.actionName === 'increment' ? step : -step))}
    >
      <Pressable onPress={() => set(value - step)} style={styles.stepBtn} accessibilityLabel={`Decrease ${label}`} hitSlop={6}>
        <Icon name="minus" size={16} />
      </Pressable>
      <Text style={styles.stepValue}>{format ? format(value) : value}</Text>
      <Pressable onPress={() => set(value + step)} style={styles.stepBtn} accessibilityLabel={`Increase ${label}`} hitSlop={6}>
        <Icon name="plus" size={16} />
      </Pressable>
    </View>
  );
}

/* ───────────────────────── Text field ───────────────────────── */

export function Field({ label, error, hint, style, inputStyle, right, ...props }: TextInputProps & { label: string; error?: string | null; hint?: string; style?: StyleProp<ViewStyle>; inputStyle?: StyleProp<TextStyle>; right?: React.ReactNode }) {
  return (
    <View style={[{ marginTop: tokens.space.md }, style]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={[styles.fieldBox, !!error && { borderColor: tokens.color.risk }]}>
        <TextInput placeholderTextColor={tokens.color.inkMuted} accessibilityLabel={label} style={[styles.fieldInput, inputStyle]} {...props} />
        {right}
      </View>
      {error ? (
        <Text style={styles.fieldError} accessibilityRole="alert">
          {error}
        </Text>
      ) : hint ? (
        <Text style={styles.fieldHint}>{hint}</Text>
      ) : null}
    </View>
  );
}

/* ───────────────────────── Progress ───────────────────────── */

export function GlowBar({ pct, color = tokens.color.accent, height = 8, label }: { pct: number; color?: string; height?: number; label?: string }) {
  const reduced = useReducedMotion();
  const w = useSharedValue(0);
  const clamped = Math.max(0, Math.min(100, pct));
  useEffect(() => {
    w.value = reduced ? clamped : withTiming(clamped, { duration: 900 });
  }, [clamped, reduced, w]);
  const fill = useAnimatedStyle(() => ({ width: `${w.value}%` }));
  return (
    <View style={[styles.barTrack, { height, borderRadius: height }]} accessibilityRole="progressbar" accessibilityLabel={label} accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped) }}>
      <Animated.View style={[{ height: '100%', borderRadius: height, backgroundColor: color, shadowColor: color, shadowOpacity: 0.6, shadowRadius: 6, shadowOffset: { width: 0, height: 0 } }, fill]} />
    </View>
  );
}

/** Small circular progress ring (calendar cells, macro dials). */
export function MiniRing({ pct, size = 30, stroke = 3, color = tokens.color.accent, track = 'rgba(43,43,43,0.08)', children }: { pct: number; size?: number; stroke?: number; color?: string; track?: string; children?: React.ReactNode }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(1, pct));
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
        {p > 0 ? (
          <Circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={`${c * p} ${c}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
        ) : null}
      </Svg>
      {children}
    </View>
  );
}

/* ───────────────────────── Misc ───────────────────────── */

export function Pill({ icon, label, tone = 'muted', style }: { icon?: IconName; label: string; tone?: 'muted' | 'accent' | 'ok' | 'watch' | 'risk' | 'ink'; style?: StyleProp<ViewStyle> }) {
  const map = {
    muted: [tokens.color.surfaceMuted, tokens.color.ink],
    accent: [tokens.color.accentSoft, tokens.color.accentText],
    ok: [tokens.color.okBg, tokens.color.ok],
    watch: [tokens.color.watchBg, tokens.color.watch],
    risk: [tokens.color.riskBg, tokens.color.risk],
    ink: [tokens.color.ink, tokens.color.white],
  } as const;
  const [bg, fg] = map[tone];
  return (
    <View style={[styles.pill, { backgroundColor: bg }, style]}>
      {icon ? <Icon name={icon} size={13} color={fg} strokeWidth={2.4} /> : null}
      <Text style={[styles.pillText, { color: fg }]}>{label}</Text>
    </View>
  );
}

export function EmptyState({ icon, title, body, children }: { icon: IconName; title: string; body: string; children?: React.ReactNode }) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Icon name={icon} size={26} color={tokens.color.accentText} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyBody}>{body}</Text>
      {children}
    </View>
  );
}

export function Banner({ tone = 'accent', icon = 'info', text, style }: { tone?: 'accent' | 'risk' | 'ok' | 'watch'; icon?: IconName; text: string; style?: StyleProp<ViewStyle> }) {
  const map = { accent: [tokens.color.accentSoft, tokens.color.accentText], risk: [tokens.color.riskBg, tokens.color.risk], ok: [tokens.color.okBg, tokens.color.ok], watch: [tokens.color.watchBg, tokens.color.watch] } as const;
  const [bg, fg] = map[tone];
  return (
    <View style={[styles.banner, { backgroundColor: bg }, style]} accessibilityRole={tone === 'risk' ? 'alert' : 'text'}>
      <Icon name={icon} size={18} color={fg} />
      <Text style={[styles.bannerText, { color: tone === 'accent' ? tokens.color.ink : fg }]}>{text}</Text>
    </View>
  );
}

export const ui = StyleSheet.create({
  h1: { ...tokens.type.h1, color: tokens.color.ink },
  h2: { ...tokens.type.h2, color: tokens.color.ink },
  h3: { ...tokens.type.h3, color: tokens.color.ink },
  body: { ...tokens.type.body, color: tokens.color.ink },
  label: { ...tokens.type.label, color: tokens.color.ink },
  muted: { ...tokens.type.caption, color: tokens.color.inkMuted },
  micro: { ...tokens.type.micro, color: tokens.color.inkMuted, textTransform: 'uppercase' },
  accent: { ...tokens.type.label, color: tokens.color.accentText, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center' },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  scroll: { paddingHorizontal: tokens.space.lg, paddingBottom: 130 },
});

const styles = StyleSheet.create({
  iconBtn: { alignItems: 'center', justifyContent: 'center' },
  iconBtnGlass: { borderWidth: 1, borderColor: tokens.color.glassBorder, ...tokens.shadow.soft },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: tokens.color.accent,
    borderWidth: 2,
    borderColor: tokens.color.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontSize: 10, fontWeight: '800', color: tokens.color.onAccent },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: tokens.space.lg, paddingTop: tokens.space.sm, paddingBottom: tokens.space.md, gap: tokens.space.md },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: tokens.color.ink, letterSpacing: -0.2 },
  headerSub: { ...tokens.type.caption, color: tokens.color.inkMuted },
  headerRight: { minWidth: 44, alignItems: 'flex-end' },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: tokens.space.xl, marginBottom: tokens.space.sm },
  sectionTitle: { ...tokens.type.h2, color: tokens.color.ink },
  sectionAction: { ...tokens.type.label, color: tokens.color.accentText, fontWeight: '700' },
  toggleTrack: { width: 48, height: 28, borderRadius: 14, justifyContent: 'center' },
  toggleKnob: { width: 24, height: 24, borderRadius: 12, backgroundColor: tokens.color.white, alignItems: 'center', justifyContent: 'center', ...tokens.shadow.soft },
  settingRow: { flexDirection: 'row', alignItems: 'center', gap: tokens.space.md, paddingVertical: tokens.space.md, minHeight: 56 },
  settingRowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: tokens.color.border },
  settingIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  settingTitle: { ...tokens.type.body, fontWeight: '600', color: tokens.color.ink },
  settingSub: { ...tokens.type.caption, color: tokens.color.inkMuted, marginTop: 1 },
  segmented: { flexDirection: 'row', backgroundColor: 'rgba(239,234,227,0.9)', borderRadius: tokens.radius.chip, padding: 4 },
  segment: { flex: 1, minHeight: 42, borderRadius: tokens.radius.chip, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 },
  segmentActive: { backgroundColor: tokens.color.ink, ...tokens.shadow.soft },
  segmentText: { ...tokens.type.label, fontWeight: '600', color: tokens.color.ink },
  segmentTextActive: { color: tokens.color.white },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, minHeight: 40, borderRadius: tokens.radius.chip, backgroundColor: tokens.color.glassStrong, borderWidth: 1, borderColor: tokens.color.border },
  chipOn: { backgroundColor: tokens.color.accent, borderColor: tokens.color.accent },
  chipText: { ...tokens.type.label, color: tokens.color.ink },
  chipTextOn: { color: tokens.color.onAccent, fontWeight: '700' },
  stepper: { flexDirection: 'row', alignItems: 'center', backgroundColor: tokens.color.surfaceMuted, borderRadius: tokens.radius.chip, padding: 3 },
  stepBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: tokens.color.white, alignItems: 'center', justifyContent: 'center' },
  stepValue: { minWidth: 70, textAlign: 'center', ...tokens.type.label, fontWeight: '700', color: tokens.color.ink, fontVariant: ['tabular-nums'] },
  fieldLabel: { ...tokens.type.label, color: tokens.color.ink, marginBottom: 6, fontWeight: '600' },
  fieldBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: tokens.color.glassStrong, borderRadius: tokens.radius.input, borderWidth: 1, borderColor: tokens.color.border, paddingRight: 6 },
  fieldInput: { flex: 1, minHeight: 50, paddingHorizontal: 14, ...tokens.type.body, color: tokens.color.ink },
  fieldError: { ...tokens.type.caption, color: tokens.color.risk, marginTop: 4, fontWeight: '600' },
  fieldHint: { ...tokens.type.caption, color: tokens.color.inkMuted, marginTop: 4 },
  barTrack: { backgroundColor: 'rgba(43,43,43,0.07)', overflow: 'visible' },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: tokens.radius.chip, alignSelf: 'flex-start' },
  pillText: { fontSize: 12, lineHeight: 16, fontWeight: '700' },
  empty: { alignItems: 'center', paddingVertical: tokens.space.xxl, paddingHorizontal: tokens.space.lg },
  emptyIcon: { width: 60, height: 60, borderRadius: 22, backgroundColor: tokens.color.accentSoft, alignItems: 'center', justifyContent: 'center', marginBottom: tokens.space.md },
  emptyTitle: { ...tokens.type.h3, color: tokens.color.ink, textAlign: 'center' },
  emptyBody: { ...tokens.type.caption, color: tokens.color.inkMuted, textAlign: 'center', marginTop: 4, maxWidth: 300 },
  banner: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', padding: tokens.space.md, borderRadius: 18 },
  bannerText: { ...tokens.type.caption, flex: 1, fontWeight: '500' },
});
