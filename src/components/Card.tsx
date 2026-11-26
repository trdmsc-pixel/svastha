import React from 'react';
import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { tokens } from '@/theme/tokens';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  muted?: boolean;
  delay?: number;
  onPress?: () => void;
  accessibilityLabel?: string;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function Card({
  children,
  style,
  muted = false,
  delay = 0,
  onPress,
  accessibilityLabel,
}: CardProps) {
  const reducedMotion = useReducedMotion();
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const entering = reducedMotion
    ? undefined
    : FadeInDown.duration(380).delay(delay).springify().damping(18);

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
        style={[styles.card, muted && styles.muted, animStyle, style]}
      >
        {children}
      </AnimatedPressable>
    );
  }

  return (
    <Animated.View
      entering={entering}
      style={[styles.card, muted && styles.muted, style]}
    >
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: tokens.color.surface,
    borderRadius: tokens.radius.card,
    padding: tokens.space.xl,
    ...tokens.shadow.card,
  },
  muted: {
    backgroundColor: tokens.color.surfaceMuted,
    shadowOpacity: 0,
    elevation: 0,
  },
});