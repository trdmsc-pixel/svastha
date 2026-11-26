import React from 'react';
import { StyleSheet, View } from 'react-native';
import { NormalizedBiomarkerValue } from '@/types/domain';
import { tokens } from '@/theme/tokens';

export function RangeBar({ item }: { item: NormalizedBiomarkerValue }) {
  let pct = 50;
  if (item.ref_operator === 'range' && item.ref_low !== null && item.ref_high !== null) {
    const span = Math.max(0.01, item.ref_high - item.ref_low);
    pct = Math.max(5, Math.min(95, ((item.value - item.ref_low) / span) * 60 + 20));
  } else if ((item.ref_operator === '<' || item.ref_operator === '<=') && item.ref_high) {
    pct = Math.max(10, Math.min(95, (item.value / (item.ref_high * 1.5)) * 100));
  } else if ((item.ref_operator === '>' || item.ref_operator === '>=') && item.ref_low) {
    pct = Math.max(5, Math.min(90, (item.value / (item.ref_low * 1.5)) * 100));
  }

  const dotColor =
    item.status === 'normal'
      ? tokens.color.ok
      : item.status === 'borderline_high' || item.status === 'borderline_low'
      ? tokens.color.watch
      : tokens.color.risk;

  return (
    <View style={styles.track} accessibilityElementsHidden>
      <View style={styles.okZone} />
      <View style={[styles.dot, { left: `${pct}%`, backgroundColor: dotColor }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 8,
    borderRadius: 999,
    backgroundColor: tokens.color.surfaceMuted,
    marginVertical: tokens.space.sm,
    justifyContent: 'center',
    position: 'relative',
  },
  okZone: {
    position: 'absolute',
    left: '20%',
    right: '20%',
    height: 8,
    borderRadius: 999,
    backgroundColor: tokens.color.okBg,
  },
  dot: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    marginLeft: -7,
    borderWidth: 2,
    borderColor: tokens.color.white,
  },
});
