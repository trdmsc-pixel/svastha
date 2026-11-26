import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { tokens } from '@/theme/tokens';

interface MacroRowProps {
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export function MacroRow({ proteinG, carbsG, fatG }: MacroRowProps) {
  return (
    <View style={styles.row}>
      <View style={styles.col}>
        <Text style={styles.label}>Protein</Text>
        <Text style={styles.val}>{Math.round(proteinG)}g</Text>
      </View>
      <View style={styles.col}>
        <Text style={styles.label}>Carbs</Text>
        <Text style={styles.val}>{Math.round(carbsG)}g</Text>
      </View>
      <View style={styles.col}>
        <Text style={styles.label}>Fat</Text>
        <Text style={styles.val}>{Math.round(fatG)}g</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginTop: tokens.space.sm,
    gap: tokens.space.xl,
  },
  col: {
    minWidth: 48,
  },
  label: {
    fontSize: 12,
    lineHeight: 16,
    color: tokens.color.inkMuted,
    fontWeight: '500',
  },
  val: {
    fontSize: 14,
    lineHeight: 18,
    color: tokens.color.ink,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    marginTop: 1,
  },
});