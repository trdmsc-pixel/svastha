import React from 'react';
import { Pressable, StyleProp, StyleSheet, Text, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { tokens } from '@/theme/tokens';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'accent' | 'danger';
  disabled?: boolean;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  accessibilityHint,
  style,
}: ButtonProps) {
  const reducedMotion = useReducedMotion();
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      onPress={onPress}
      disabled={disabled}
      onPressIn={() => {
        if (!reducedMotion && !disabled) {
          scale.value = withSpring(0.97, { damping: 16, stiffness: 340 });
        }
      }}
      onPressOut={() => {
        if (!reducedMotion) {
          scale.value = withSpring(1, { damping: 16, stiffness: 340 });
        }
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      style={[
        styles.base,
        variant === 'primary' && styles.primary,
        variant === 'secondary' && styles.secondary,
        variant === 'accent' && styles.accent,
        variant === 'danger' && styles.danger,
        disabled && styles.disabled,
        animStyle,
        style,
      ]}
    >
      <Text
        style={[
          styles.label,
          variant === 'primary' && styles.labelPrimary,
          variant === 'secondary' && styles.labelSecondary,
          variant === 'accent' && styles.labelOnAccent,
          variant === 'danger' && styles.labelDanger,
        ]}
      >
        {label}
      </Text>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: Math.max(tokens.a11y.minTouchTarget, 52),
    borderRadius: tokens.radius.button,
    paddingHorizontal: tokens.space.xl,
    paddingVertical: tokens.space.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: {
    backgroundColor: tokens.color.ink,
  },
  secondary: {
    backgroundColor: tokens.color.surfaceMuted,
  },
  accent: {
    backgroundColor: tokens.color.accent,
  },
  danger: {
    backgroundColor: tokens.color.riskBg,
    borderWidth: 1,
    borderColor: tokens.color.risk,
  },
  disabled: {
    opacity: 0.45,
  },
  label: {
    ...tokens.type.body,
    fontWeight: '600',
  },
  labelPrimary: {
    color: tokens.color.white,
  },
  labelSecondary: {
    color: tokens.color.ink,
  },
  labelOnAccent: {
    color: tokens.color.onAccent,
  },
  labelDanger: {
    color: tokens.color.risk,
  },
});