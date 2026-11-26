import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { tokens } from '@/theme/tokens';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { matchFoodByQuery, computeNutrientsForGrams, SEED_FOODS } from '@/engine/foodMatcher';
import { useAppStore } from '@/store/useAppStore';
import { MealSlot } from '@/types/domain';

export default function ScanScreen() {
  const [mode, setMode] = useState<'meal' | 'report'>('meal');
  const [query, setQuery] = useState('');
  const [grams, setGrams] = useState('180');
  const [slot, setSlot] = useState<MealSlot>('dinner');
  const { logQuickMeal, loadSampleReport } = useAppStore();

  const matched = matchFoodByQuery(query) ?? SEED_FOODS[1];
  const preview = computeNutrientsForGrams(matched, parseFloat(grams) || 100);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Scan</Text>

        {/* Mode Switch */}
        <View style={styles.switchRow}>
          <Pressable
            onPress={() => setMode('meal')}
            accessibilityRole="tab"
            accessibilityState={{ selected: mode === 'meal' }}
            style={[styles.switchBtn, mode === 'meal' && styles.switchActive]}
          >
            <Text style={[styles.switchText, mode === 'meal' && styles.switchTextActive]}>
              Meal Mode
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setMode('report')}
            accessibilityRole="tab"
            accessibilityState={{ selected: mode === 'report' }}
            style={[styles.switchBtn, mode === 'report' && styles.switchActive]}
          >
            <Text style={[styles.switchText, mode === 'report' && styles.switchTextActive]}>
              Report Mode
            </Text>
          </Pressable>
        </View>

        <Card muted style={styles.mb}>
          <Text style={styles.privacyText}>
            🔒 Privacy guarantee: Photos and PDFs are processed in memory and discarded immediately.
            Never stored in the cloud, database, or logs.
          </Text>
        </Card>

        {mode === 'meal' ? (
          <Card style={styles.mb}>
            <Text style={styles.h2}>Log or Scan a Meal</Text>
            <Text style={styles.label}>Describe food or search IFCT 2017 Indian food database</Text>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="e.g. Dal tadka, 2 roti, idli sambar, poha..."
              placeholderTextColor={tokens.color.inkMuted}
              style={styles.input}
              accessibilityLabel="Food search input"
            />
            <Text style={styles.label}>Portion weight (grams)</Text>
            <TextInput
              value={grams}
              onChangeText={setGrams}
              keyboardType="numeric"
              style={styles.input}
              accessibilityLabel="Portion grams input"
            />

            <View style={styles.slotRow}>
              {(['breakfast', 'lunch', 'snack', 'dinner'] as MealSlot[]).map((s) => (
                <Pressable
                  key={s}
                  onPress={() => setSlot(s)}
                  style={[styles.slotChip, slot === s && styles.slotChipActive]}
                >
                  <Text style={styles.slotText}>{s}</Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.previewBox}>
              <Text style={styles.h3}>Matched: {matched.name}</Text>
              <Text style={styles.caption}>
                Source: {matched.source} · {preview.kcal} kcal · P {preview.protein_g}g · C{' '}
                {preview.carbs_g}g · F {preview.fat_g}g
              </Text>
            </View>

            <Button
              label="Confirm & Log Meal"
              onPress={() => {
                logQuickMeal(matched.id, parseFloat(grams) || 100, slot);
                router.push('/(tabs)');
              }}
            />
          </Card>
        ) : (
          <Card style={styles.mb}>
            <Text style={styles.h2}>Import Lab Report (PDF or Photo)</Text>
            <Text style={styles.body}>
              Supports copy-restricted Indian lab PDFs (Dr Lal PathLabs, SRL, Thyrocare, Metropolis)
              and multi-page camera scans.
            </Text>
            <Button
              label="Load Section 14 Sample Report (Dr Lal PathLabs)"
              onPress={() => {
                loadSampleReport();
                router.push('/(tabs)/health');
              }}
              style={{ marginTop: 12 }}
            />
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: tokens.color.bg },
  scroll: { padding: tokens.space.lg, paddingBottom: 110 },
  title: { ...tokens.type.h1, color: tokens.color.ink, marginBottom: tokens.space.md },
  h2: { ...tokens.type.h2, color: tokens.color.ink, marginBottom: tokens.space.sm },
  h3: { ...tokens.type.body, fontWeight: '700', color: tokens.color.ink },
  body: { ...tokens.type.body, color: tokens.color.ink },
  caption: { ...tokens.type.caption, color: tokens.color.inkMuted, marginTop: 2 },
  label: { ...tokens.type.label, color: tokens.color.ink, marginTop: tokens.space.sm, marginBottom: 4 },
  mb: { marginBottom: tokens.space.md },
  switchRow: { flexDirection: 'row', backgroundColor: tokens.color.surfaceMuted, borderRadius: tokens.radius.chip, padding: 4, marginBottom: tokens.space.md },
  switchBtn: { flex: 1, minHeight: 44, borderRadius: tokens.radius.chip, alignItems: 'center', justifyContent: 'center' },
  switchActive: { backgroundColor: tokens.color.ink },
  switchText: { ...tokens.type.label, color: tokens.color.ink, fontWeight: '600' },
  switchTextActive: { color: tokens.color.white },
  privacyText: { ...tokens.type.caption, color: tokens.color.ink },
  input: {
    backgroundColor: tokens.color.bg,
    borderRadius: tokens.radius.input,
    paddingHorizontal: tokens.space.md,
    minHeight: 46,
    color: tokens.color.ink,
    borderWidth: 1,
    borderColor: tokens.color.border,
  },
  slotRow: { flexDirection: 'row', gap: 8, marginVertical: tokens.space.md },
  slotChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: tokens.radius.chip, backgroundColor: tokens.color.surfaceMuted },
  slotChipActive: { backgroundColor: tokens.color.accent },
  slotText: { ...tokens.type.caption, fontWeight: '600', color: tokens.color.onAccent, textTransform: 'capitalize' },
  previewBox: { padding: tokens.space.md, borderRadius: tokens.radius.input, backgroundColor: tokens.color.bg, marginBottom: tokens.space.md },
});
