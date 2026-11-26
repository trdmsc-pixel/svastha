import React, { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { tokens } from '@/theme/tokens';
import { useAppStore } from '@/store/useAppStore';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { DisclaimerFooter } from '@/components/DisclaimerFooter';
import { getLocalOrCdnImage } from '@/lib/cdn';

type PlanSection = 'Meals' | 'Sleep' | 'Exercise' | 'Supplements' | 'Medicines' | 'Measures';
const SECTIONS: PlanSection[] = ['Meals', 'Sleep', 'Exercise', 'Supplements', 'Medicines', 'Measures'];

const CATEGORIES = [
  { id: 'all', label: 'All', icon: 'apps' as const, bg: '#EFEAE3' },
  { id: 'vegan', label: 'Vegan', icon: 'leaf' as const, bg: '#E7F3EA' },
  { id: 'protein', label: 'Protein', icon: 'flash' as const, bg: '#FDE8DC' },
  { id: 'snacks', label: 'Snacks', icon: 'cafe' as const, bg: '#FFF4DC' },
];

export default function PlanScreen() {
  const { activePlan } = useAppStore();
  const [section, setSection] = useState<PlanSection>('Meals');
  const [selectedCat, setSelectedCat] = useState('all');
  const [search, setSearch] = useState('');
  const [starred, setStarred] = useState(true);

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
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Top Search + Notification Bell (reference right screen) */}
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={18} color={tokens.color.inkMuted} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search recipes & plan"
              placeholderTextColor={tokens.color.inkMuted}
              style={styles.searchInput}
              accessibilityLabel="Search recipes and plan"
            />
          </View>
          <Pressable
            onPress={() => router.push('/notifications')}
            accessibilityRole="button"
            accessibilityLabel="Notifications"
            style={styles.bellBtn}
          >
            <Ionicons name="notifications-outline" size={20} color={tokens.color.ink} />
          </Pressable>
        </View>

        {/* Category Icon Tiles */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
          {CATEGORIES.map((cat) => {
            const active = selectedCat === cat.id;
            return (
              <Pressable
                key={cat.id}
                onPress={() => setSelectedCat(cat.id)}
                style={styles.catItem}
                accessibilityRole="button"
                accessibilityLabel={cat.label}
              >
                <View style={[styles.catTile, { backgroundColor: cat.bg }, active && styles.catTileActive]}>
                  <Ionicons name={cat.icon} size={24} color={tokens.color.ink} />
                </View>
                <Text style={[styles.catLabel, active && styles.catLabelActive]}>{cat.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Trending Recipes Hero Card (reference right screen) */}
        <View style={styles.trendingHeader}>
          <View style={styles.trendingTitleRow}>
            <Text style={styles.sectionHeading}>Recommended Meals</Text>
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>8</Text>
            </View>
          </View>
          <Text style={styles.seeAll}>See All</Text>
        </View>

        <Card delay={60} style={styles.recipeCard}>
          <View style={styles.recipeTop}>
            <View>
              <Text style={styles.recipeTitle}>Quinoa Veggie Bowl</Text>
              <View style={styles.timeRow}>
                <Ionicons name="time" size={14} color={tokens.color.accentText} />
                <Text style={styles.timeText}>20 min · Liver & Lipid Friendly</Text>
              </View>
            </View>
            <Pressable
              onPress={() => setStarred(!starred)}
              accessibilityRole="button"
              accessibilityLabel="Bookmark recipe"
              hitSlop={8}
            >
              <Ionicons
                name={starred ? 'star' : 'star-outline'}
                size={22}
                color={tokens.color.ink}
              />
            </Pressable>
          </View>

          <Image
            source={getLocalOrCdnImage('recipes/quinoa-veggie-bowl.webp')}
            style={styles.bowlImage}
            resizeMode="contain"
          />

          <View style={styles.recipeFooter}>
            <View style={styles.difficultyRow}>
              <Text style={styles.diffLabel}>Easy</Text>
              {[1, 2, 3, 4, 5].map((bar) => (
                <View
                  key={bar}
                  style={[styles.diffPill, bar <= 2 ? styles.diffPillActive : styles.diffPillMuted]}
                />
              ))}
            </View>
            <Text style={styles.recipeKcal}>420 kcal</Text>
          </View>
        </Card>

        {/* Living Plan Header Summary */}
        <Card delay={120} style={styles.mb}>
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

        {/* Plan Section Switcher */}
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
          <Card delay={160} style={styles.mb}>
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
          <Card delay={160} style={styles.mb}>
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
          <Card delay={160} style={styles.mb}>
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
          <Card delay={160} style={styles.mb}>
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
          <Card delay={160} style={styles.mb}>
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
          <Card delay={160} style={styles.mb}>
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
  scroll: { padding: tokens.space.lg, paddingBottom: 112 },
  title: { ...tokens.type.h1, color: tokens.color.ink, marginBottom: tokens.space.md },
  searchRow: { flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: tokens.space.md },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: tokens.color.surface,
    borderRadius: tokens.radius.chip,
    paddingHorizontal: 16,
    height: 46,
    gap: 8,
    ...tokens.shadow.card,
  },
  searchInput: { flex: 1, ...tokens.type.body, color: tokens.color.ink },
  bellBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: tokens.color.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...tokens.shadow.card,
  },
  catScroll: { marginBottom: tokens.space.lg },
  catItem: { alignItems: 'center', marginRight: 14 },
  catTile: {
    width: 68,
    height: 68,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    ...tokens.shadow.card,
  },
  catTileActive: {
    borderWidth: 2,
    borderColor: tokens.color.accent,
  },
  catLabel: { ...tokens.type.caption, color: tokens.color.inkMuted, marginTop: 6, fontWeight: '500' },
  catLabelActive: { color: tokens.color.ink, fontWeight: '700' },
  trendingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: tokens.space.sm,
  },
  trendingTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionHeading: { ...tokens.type.h2, color: tokens.color.ink },
  countBadge: {
    backgroundColor: tokens.color.accent,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countBadgeText: { fontSize: 12, fontWeight: '700', color: tokens.color.onAccent },
  seeAll: { ...tokens.type.label, color: tokens.color.inkMuted },
  recipeCard: { marginBottom: tokens.space.lg, padding: tokens.space.lg },
  recipeTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  recipeTitle: { fontSize: 18, fontWeight: '700', color: tokens.color.ink },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  timeText: { ...tokens.type.caption, color: tokens.color.inkMuted },
  bowlImage: { width: '100%', height: 210, marginVertical: tokens.space.sm },
  recipeFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  difficultyRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  diffLabel: { ...tokens.type.caption, color: tokens.color.inkMuted, marginRight: 4 },
  diffPill: { width: 8, height: 18, borderRadius: 4 },
  diffPillActive: { backgroundColor: tokens.color.accent },
  diffPillMuted: { backgroundColor: tokens.color.surfaceMuted },
  recipeKcal: { fontSize: 22, fontWeight: '700', color: tokens.color.ink, fontVariant: ['tabular-nums'] },
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