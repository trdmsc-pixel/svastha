import React from 'react';
import { Platform, Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import Animated, { FadeInDown, useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { tokens } from '@/theme/tokens';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** muted = flat cream chip surface; glass = frosted translucent surface */
  variant?: 'solid' | 'glass' | 'muted' | 'dark';
  /** @deprecated use variant="muted" */
  muted?: boolean;
  delay?: number;
  onPress?: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Glassy card: translucent white with a bright hairline edge, soft warm shadow and (on iOS/web)
 * a real backdrop blur. Springs on press and fades up on mount (respects Reduce Motion).
 */
export function Card({ children, style, variant, muted = false, delay = 0, onPress, accessibilityLabel, accessibilityHint }: CardProps) {
  const reducedMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const v = variant ?? (muted ? 'muted' : 'glass');
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const entering = reducedMotion ? undefined : FadeInDown.duration(420).delay(delay).springify().damping(18);

  const surface = [styles.card, v === 'muted' && styles.muted, v === 'solid' && styles.solid, v === 'glass' && styles.glass, v === 'dark' && styles.dark, style];
  const blur =
    v === 'glass' && Platform.OS !== 'android' ? (
      <BlurView intensity={28} tint="light" style={[StyleSheet.absoluteFill, styles.blurClip]} pointerEvents="none" />
    ) : null;

  if (onPress) {
    return (
      <AnimatedPressable
        entering={entering}
        onPress={onPress}
        onPressIn={() => {
          if (!reducedMotion) scale.value = withSpring(0.98, { damping: 16, stiffness: 320 });
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
    backgroundColor: Platform.OS === 'android' ? 'rgba(255,255,255,0.9)' : tokens.color.glass,
    borderWidth: 1,
    borderColor: tokens.color.glassBorder,
  },
  solid: { backgroundColor: tokens.color.surface },
  muted: {
    backgroundColor: tokens.color.surfaceMuted,
    shadowOpacity: 0,
    elevation: 0,
  },
  dark: { backgroundColor: tokens.color.ink },
});

export function Divider({ style }: { style?: StyleProp<ViewStyle> }) {
  return <View style={[{ height: StyleSheet.hairlineWidth, backgroundColor: tokens.color.border, marginVertical: tokens.space.md }, style]} />;
}
