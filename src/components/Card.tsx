import React from 'react';
import { Platform, Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import Animated, { FadeInDown, useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { tokens } from '@/theme/tokens';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** muted = flat cream chip surface; glass = frosted translucent surface; glow = luminous peach-accented glass */
  variant?: 'solid' | 'glass' | 'glow' | 'muted' | 'dark';
  /** @deprecated use variant="muted" */
  muted?: boolean;
  delay?: number;
  onPress?: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const webGlassStyle =
  Platform.OS === 'web'
    ? ({
        backdropFilter: 'blur(20px) saturate(160%)',
        WebkitBackdropFilter: 'blur(20px) saturate(160%)',
      } as unknown as ViewStyle)
    : undefined;

/**
 * Glassy card: translucent frosted surface with luminous hairline edge, warm ambient shadow,
 * real backdrop blur on iOS & Web, and spring press physics (respects Reduce Motion).
 */
export function Card({ children, style, variant, muted = false, delay = 0, onPress, accessibilityLabel, accessibilityHint }: CardProps) {
  const reducedMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const v = variant ?? (muted ? 'muted' : 'glass');
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const entering = reducedMotion ? undefined : FadeInDown.duration(400).delay(delay).springify().damping(18);

  const isGlassy = v === 'glass' || v === 'glow';
  const surface = [
    styles.card,
    v === 'muted' && styles.muted,
    v === 'solid' && styles.solid,
    v === 'glass' && styles.glass,
    v === 'glow' && styles.glowCard,
    v === 'dark' && styles.dark,
    isGlassy && webGlassStyle,
    style,
  ];

  const blur =
    isGlassy && Platform.OS === 'ios' ? (
      <BlurView intensity={32} tint="light" style={[StyleSheet.absoluteFill, styles.blurClip]} pointerEvents="none" />
    ) : null;

  if (onPress) {
    return (
      <AnimatedPressable
        entering={entering}
        onPress={onPress}
        onPressIn={() => {
          if (!reducedMotion) scale.value = withSpring(0.975, { damping: 16, stiffness: 320 });
        }}
        onPressOut={() => {
          if (!reducedMotion) scale.value = withSpring(1, { damping: 16, stiffness: 320 });
        }}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        style={[surface, animStyle]}
      >
        {blur}
        {children}
      </AnimatedPressable>
    );
  }

  return (
    <Animated.View entering={entering} style={surface}>
      {blur}
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: tokens.radius.card,
    padding: tokens.space.xl,
    ...tokens.shadow.card,
  },
  blurClip: { borderRadius: tokens.radius.card, overflow: 'hidden' },
  glass: {
    backgroundColor: Platform.OS === 'android' ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.92)',
  },
  glowCard: {
    backgroundColor: Platform.OS === 'android' ? 'rgba(255,250,245,0.95)' : 'rgba(255,249,243,0.78)',
    borderWidth: 1.5,
    borderColor: 'rgba(240,154,106,0.45)',
    shadowColor: '#E8774A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 5,
  },
  solid: { backgroundColor: tokens.color.surface },
  muted: {
    backgroundColor: tokens.color.surfaceMuted,
    shadowOpacity: 0,
    elevation: 0,
  },
  dark: {
    backgroundColor: tokens.color.ink,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
});

export function Divider({ style }: { style?: StyleProp<ViewStyle> }) {
  return <View style={[{ height: StyleSheet.hairlineWidth, backgroundColor: tokens.color.border, marginVertical: tokens.space.md }, style]} />;
}
