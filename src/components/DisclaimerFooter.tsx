import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { tokens } from '@/theme/tokens';

/**
 * Persistent medical disclaimer footer on Summary and Plan screens (Section 2.1.7).
 */
export function DisclaimerFooter() {
  return (
    <View style={styles.wrap} accessible accessibilityRole="text">
      <Text style={styles.text}>
        AI-generated guidance for general wellness. Not medical advice. Always confirm with a
        qualified doctor.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: tokens.space.xxl,
    marginBottom: tokens.space.xxxl,
    padding: tokens.space.md,
    borderRadius: tokens.radius.input,
    backgroundColor: tokens.color.surfaceMuted,
  },
  text: {
    ...tokens.type.caption,
    color: tokens.color.inkMuted,
    textAlign: 'center',
  },
});
