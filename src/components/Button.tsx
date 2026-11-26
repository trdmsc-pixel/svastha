import React from 'react';
import { ActivityIndicator, Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { tokens } from '@/theme/tokens';
import { haptic } from '@/lib/haptics';
import { Icon, IconName } from './Icon';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'accent' | 'danger' | 'ghost';
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
  compact?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function Button({ label, onPress, variant = 'primary', icon, loading = false, disabled = false, accessibilityHint, style, compact }: ButtonProps) {
  const reducedMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const isDisabled = disabled || loading;
  const fg =
    variant === 'primary' ? tokens.color.white : variant === 'danger' ? tokens.color.risk : variant === 'accent' ? tokens.color.onAccent : tokens.color.ink;

  return (
    <AnimatedPressable
      onPress={() => {
        haptic.tap();
        onPress();
      }}
      disabled={isDisabled}
      onPressIn={() => {
        if (!reducedMotion && !isDisabled) scale.value = withSpring(0.97, { damping: 16, stiffness: 340 });
      }}
      onPressOut={() => {
        if (!reducedMotion) scale.value = withSpring(1, { damping: 16, stiffness: 340 });
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={[styles.base, compact && styles.compact, styles[variant], isDisabled && styles.disabled, animStyle, style]}
    >
      {variant === 'accent' && (
        <View style={[StyleSheet.absoluteFill, styles.gradClip]} pointerEvents="none">
          <Svg width="100%" height="100%" preserveAspectRatio="none">
            <Defs>
              <LinearGradient id="btnPeach" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor={tokens.gradient.peach[0]} />
                <Stop offset="1" stopColor={tokens.gradient.peach[1]} />
              </LinearGradient>
            </Defs>
            <Rect width="100%" height="100%" fill="url(#btnPeach)" />
          </Svg>
        </View>
      )}
      {loading ? <ActivityIndicator color={fg} /> : icon ? <Icon name={icon} size={18} color={fg} /> : null}
      <Text style={[styles.label, { color: fg }]}>{label}</Text>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 54,
    borderRadius: tokens.radius.button,
    paddingHorizontal: tokens.space.xl,
    paddingVertical: tokens.space.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    overflow: 'hidden',
  },
  compact: { minHeight: 44, paddingVertical: 8, paddingHorizontal: tokens.space.lg },
  gradClip: { borderRadius: tokens.radius.button, overflow: 'hidden' },
  primary: { backgroundColor: tokens.color.ink, ...tokens.shadow.soft },
  secondary: { backgroundColor: 'rgba(239,234,227,0.95)' },
  accent: { backgroundColor: tokens.color.accent, ...tokens.shadow.glow, shadowOpacity: 0.35 },
  danger: { backgroundColor: tokens.color.riskBg, borderWidth: 1, borderColor: tokens.color.risk },
  ghost: { backgroundColor: 'transparent' },
  disabled: { opacity: 0.45 },
  label: { ...tokens.type.body, fontWeight: '700' },
});
