import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BiomarkerStatus } from '@/types/domain';
import { tokens } from '@/theme/tokens';

interface StatusChipProps {
  status: BiomarkerStatus;
}

const STATUS_META: Record<
  BiomarkerStatus,
  { icon: string; word: string; bg: string; fg: string }
> = {
  high: { icon: '▲', word: 'High', bg: tokens.color.riskBg, fg: tokens.color.risk },
  low: { icon: '▼', word: 'Low', bg: tokens.color.riskBg, fg: tokens.color.risk },
  borderline_high: { icon: '▲', word: 'Watch · High', bg: tokens.color.watchBg, fg: tokens.color.watch },
  borderline_low: { icon: '▼', word: 'Watch · Low', bg: tokens.color.watchBg, fg: tokens.color.watch },
  normal: { icon: '✓', word: 'Normal', bg: tokens.color.okBg, fg: tokens.color.ok },
};

/**
 * Always pairs colour with icon + word (WCAG 2.1 AA Section 5.3).
 */
export function StatusChip({ status }: StatusChipProps) {
  const meta = STATUS_META[status];
  return (
    <View
      accessible
      accessibilityLabel={`Status: ${meta.word}`}
      style={[styles.chip, { backgroundColor: meta.bg }]}
    >
      <Text style={[styles.text, { color: meta.fg }]}>
        {meta.icon} {meta.word}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderRadius: tokens.radius.chip,
    paddingHorizontal: tokens.space.md,
    paddingVertical: tokens.space.xs,
    alignSelf: 'flex-start',
  },
  text: {
    ...tokens.type.caption,
    fontWeight: '600',
  },
});
