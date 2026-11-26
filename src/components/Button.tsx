import React from 'react';
import { Pressable, StyleProp, StyleSheet, Text, ViewStyle } from 'react-native';
import { tokens } from '@/theme/tokens';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'accent' | 'danger';
  disabled?: boolean;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  accessibilityHint,
  style,
}: ButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.base,
        variant === 'primary' && styles.primary,
        variant === 'secondary' && styles.secondary,
        variant === 'accent' && styles.accent,
        variant === 'danger' && styles.danger,
        pressed && styles.pressed,
        disabled && styles.disabled,
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
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: Math.max(tokens.a11y.minTouchTarget, 48),
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
  pressed: {
    opacity: 0.85,
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
    // Charcoal on peach (6.43:1) — never white on peach (WCAG AA)
    color: tokens.color.onAccent,
  },
  labelDanger: {
    color: tokens.color.risk,
  },
});
