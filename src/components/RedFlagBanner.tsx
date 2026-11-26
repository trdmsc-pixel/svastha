import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { RedFlagAlert } from '@/types/domain';
import { tokens } from '@/theme/tokens';

interface RedFlagBannerProps {
  alerts: RedFlagAlert[];
}

/**
 * Section 2.1.4 Red-flag banner.
 */
export function RedFlagBanner({ alerts }: RedFlagBannerProps) {
  if (alerts.length === 0) return null;

  return (
    <View
      accessible
      accessibilityRole="alert"
      style={styles.banner}
    >
      <Text style={styles.title}>
        ⚠ Some values need prompt medical attention. Please contact a doctor soon.
      </Text>
      {alerts.map((a) => (
        <Text key={a.rule_id} style={styles.detail}>
          • {a.display_name}: {a.value} {a.unit} — {a.message}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: tokens.color.riskBg,
    borderWidth: 1.5,
    borderColor: tokens.color.risk,
    borderRadius: tokens.radius.card,
    padding: tokens.space.lg,
    marginBottom: tokens.space.lg,
  },
  title: {
    ...tokens.type.body,
    color: tokens.color.risk,
    fontWeight: '700',
    marginBottom: tokens.space.xs,
  },
  detail: {
    ...tokens.type.label,
    color: tokens.color.ink,
    marginTop: 4,
  },
});
