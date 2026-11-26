import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { tokens } from '@/theme/tokens';
import { useAppStore } from '@/store/useAppStore';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { DisclaimerFooter } from '@/components/DisclaimerFooter';

type PlanSection = 'Meals' | 'Sleep' | 'Exercise' | 'Supplements' | 'Medicines' | 'Measures';
const SECTIONS: PlanSection[] = ['Meals', 'Sleep', 'Exercise', 'Supplements', 'Medicines', 'Measures'];

export default function PlanScreen() {
  const { activePlan } = useAppStore();
  const [section, setSection] = useState<PlanSection>('Meals');

  if (!activePlan) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.scroll}>
          <Text style={styles.title}>Your Plan</Text>
          <Card>
            <Text style={styles.body}>Import a lab report first to generate your personal plan.</Text>
          </Card>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Your Living Plan</Text>

        {/* Header summary */}
        <Card style={styles.mb}>
          <Text style={styles.accentLabel}>
            Target retest: {activePlan.retest_date} ({activePlan.retest_weeks} weeks)
          </Text>
          <Text style={styles.body}>
            Goal: {activePlan.targets.map((t) => `${t.biomarker_code} ${t.target} ${t.unit}`).join(', ')}
          </Text>
          <Text style={styles.caption}>
            Adherence this week: {activePlan.adherence_pct}% · {activePlan.retest_reasoning}
          </Text>
        </Card>

        {/* Horizontal section chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
          {SECTIONS.map((s) => (
            <Pressable
              key={s}
              onPress={() => setSection(s)}
              style={[styles.chip, section === s && styles.chipActive]}
            >
              <Text style={[styles.chipText, section === s && styles.chipTextActive]}>{s}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {section === 'Meals' && (
          <Card style={styles.mb}>
            <Text style={styles.h2}>Daily Nutrition Targets</Text>
            <Text style={styles.body}>
              {activePlan.daily_targets.kcal} kcal · Protein {activePlan.daily_targets.protein_g} g ·
              Carbs {activePlan.daily_targets.carbs_g} g · Fat {activePlan.daily_targets.fat_g} g ·
              Fibre {activePlan.daily_targets.fibre_g} g
            </Text>
            <Text style={styles.caption}>
              Hydration target: {activePlan.daily_targets.water_ml} ml/day · All meals built from IFCT 2017 Indian food composition data.
            </Text>
          </Card>
        )}

        {section === 'Sleep' && (
          <Card style={styles.mb}>
            <Text style={styles.h2}>Sleep Schedule</Text>
            <Text style={styles.body}>
              Bedtime {activePlan.sleep.bed} · Wake {activePlan.sleep.wake} · Caffeine cut-off{' '}
              {activePlan.sleep.caffeine_cutoff}
            </Text>
            {activePlan.sleep.wind_down.map((w, i) => (
              <Text key={i} style={styles.bullet}>• {w}</Text>
            ))}
          </Card>
        )}

        {section === 'Exercise' && (
          <Card style={styles.mb}>
            <Text style={styles.h2}>Weekly Movement</Text>
            {activePlan.exercise_weekly.map((ex) => (
              <View key={ex.day} style={styles.exRow}>
                <Text style={styles.exDay}>{ex.day} — {ex.type} ({ex.minutes} min)</Text>
                <Text style={styles.caption}>{ex.intensity} · {ex.steps.join(' · ')}</Text>
              </View>
            ))}
          </Card>
        )}

        {section === 'Supplements' && (
          <Card style={styles.mb}>
            <Text style={styles.h2}>Options to Discuss with Your Doctor</Text>
            <Text style={styles.caption}>
              Hepatotoxic-risk supplements (niacin, kava, green-tea extract, high-dose vitamin A) are automatically excluded because liver enzymes are flagged.
            </Text>
            {activePlan.supplements_to_discuss.map((sup) => (
              <View key={sup.name} style={styles.exRow}>
                <Text style={styles.exDay}>
                  {sup.name} ({sup.evidence} evidence)
                </Text>
                <Text style={styles.body}>Why: {sup.why_biomarker} · Form: {sup.typical_form}</Text>
                {sup.caution && <Text style={styles.cautionText}>⚠ {sup.caution}</Text>}
              </View>
            ))}
          </Card>
        )}

        {section === 'Medicines' && (
          <Card style={styles.mb}>
            <Text style={styles.h2}>Doctor Talking Points</Text>
            <Text style={styles.caption}>
              Svastha never prescribes or adjusts doses. Use these points at your next visit:
            </Text>
            {activePlan.medication_talking_points.map((pt, i) => (
              <Text key={i} style={styles.bullet}>• {pt}</Text>
            ))}
          </Card>
        )}

        {section === 'Measures' && (
          <Card style={styles.mb}>
            <Text style={styles.h2}>Daily Measures</Text>
            {activePlan.measures.map((m, i) => (
              <Text key={i} style={styles.bullet}>• {m}</Text>
            ))}
          </Card>
        )}

        <Button label="Open Routine Builder" variant="secondary" onPress={() => router.push('/routine')} />

        <DisclaimerFooter />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: tokens.color.bg },
  scroll: { padding: tokens.space.lg, paddingBottom: 110 },
  title: { ...tokens.type.h1, color: tokens.color.ink, marginBottom: tokens.space.md },
  h2: { ...tokens.type.h2, color: tokens.color.ink, marginBottom: tokens.space.xs },
  body: { ...tokens.type.body, color: tokens.color.ink, marginBottom: 4 },
  caption: { ...tokens.type.caption, color: tokens.color.inkMuted },
  accentLabel: { ...tokens.type.label, color: tokens.color.accentText, fontWeight: '700', marginBottom: 4 },
  mb: { marginBottom: tokens.space.md },
  chipScroll: { marginBottom: tokens.space.md },
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: tokens.radius.chip, backgroundColor: tokens.color.surfaceMuted, marginRight: 8 },
  chipActive: { backgroundColor: tokens.color.ink },
  chipText: { ...tokens.type.label, color: tokens.color.ink, fontWeight: '600' },
  chipTextActive: { color: tokens.color.white },
  bullet: { ...tokens.type.body, color: tokens.color.ink, marginTop: 6 },
  exRow: { marginTop: tokens.space.md, paddingTop: tokens.space.sm, borderTopWidth: 1, borderTopColor: tokens.color.border },
  exDay: { ...tokens.type.body, fontWeight: '700', color: tokens.color.ink },
  cautionText: { ...tokens.type.caption, color: tokens.color.watch, fontWeight: '600', marginTop: 2 },
});
