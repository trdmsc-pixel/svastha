import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { tokens } from '@/theme/tokens';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  muted?: boolean;
}

export function Card({ children, style, muted = false }: CardProps) {
  return (
    <View
      style={[
        styles.card,
        muted && styles.muted,
        style,
      ]}
    >
      {children}
    </View>
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
