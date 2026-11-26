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
        <Text style={styles.val}>{proteinG} g</Text>
      </View>
      <View style={styles.col}>
        <Text style={styles.label}>Carbs</Text>
        <Text style={styles.val}>{carbsG} g</Text>
      </View>
      <View style={styles.col}>
        <Text style={styles.label}>Fat</Text>
        <Text style={styles.val}>{fatG} g</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: tokens.space.sm,
    gap: tokens.space.md,
  },
  col: {
    flex: 1,
  },
  label: {
    ...tokens.type.caption,
    color: tokens.color.inkMuted,
  },
  val: {
    ...tokens.type.label,
    color: tokens.color.ink,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
});
