import React, { useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeInRight, FadeOutLeft, useReducedMotion } from 'react-native-reanimated';
import { tokens } from '@/theme/tokens';
import { useAppStore } from '@/store/useAppStore';
import { useInbox, useWeeklyAdherence } from '@/hooks/useHealthData';
import { CURATED_RECIPES, FOCUS_LABELS, normaliseAiRecipe, rankRecipes } from '@/engine/recipeEngine';
import { callAi } from '@/lib/ai';
import { getLocalOrCdnImage } from '@/lib/cdn';
import { Recipe, RecipeFocus } from '@/types/domain';
import { Icon, IconName } from '@/components/Icon';
import { IconButton, Screen, Toggle } from '@/components/ui';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Sheet } from '@/components/Sheet';
import { DisclaimerFooter } from '@/components/DisclaimerFooter';

type PlanSection = 'Recipes' | 'Meals' | 'Sleep' | 'Exercise' | 'Supplements' | 'Medicines' | 'Measures';
const SECTIONS: PlanSection[] = ['Recipes', 'Meals', 'Sleep', 'Exercise', 'Supplements', 'Medicines', 'Measures'];

const CATEGORIES: Array<{ id: string; label: string; icon: IconName; bg: string }> = [
  { id: 'all', label: 'All', icon: 'utensils', bg: '#EFEAE3' },
  { id: 'vegan', label: 'Vegan', icon: 'leaf', bg: '#E7F3EA' },
  { id: 'protein', label: 'Protein', icon: 'zap', bg: '#FDE8DC' },
  { id: 'snacks', label: 'Snacks', icon: 'droplet', bg: '#FFF4DC' },
  { id: 'saved', label: 'Saved', icon: 'star', bg: '#F3ECE4' },
];

export default function PlanScreen() {
  const {
    activePlan,
    reports,
    profile,
    healthBackground,
    settings,
    aiRecipes,
    savedRecipeIds,
    updateSettings,
    setAiRecipes,
    toggleSavedRecipe,
  } = useAppStore();
  const { unread } = useInbox();
  const adherencePct = useWeeklyAdherence();

  const [section, setSection] = useState<PlanSection>('Recipes');
  const [selectedCat, setSelectedCat] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiStatus, setAiStatus] = useState<string | null>(null);
  const reducedMotion = useReducedMotion();
  const secEnter = reducedMotion ? undefined : FadeInRight.duration(240).springify().damping(22);
  const secExit = reducedMotion ? undefined : FadeOutLeft.duration(140);

  const focusAreas = useMemo<RecipeFocus[]>(() => {
    const latest = reports[0];
    if (!latest) return ['fibre', 'protein'];
    const flagged = latest.values.filter((v) => v.status !== 'normal').map((v) => v.biomarker_code);
    const out = new Set<RecipeFocus>(['fibre']);
    if (flagged.some((c) => c === 'ALT' || c === 'AST' || c === 'GGTP')) out.add('liver');
    if (flagged.some((c) => c === 'LDL' || c === 'NON_HDL')) out.add('ldl');
    if (flagged.includes('HDL')) out.add('hdl');
    if (flagged.some((c) => c === 'GLUCOSE_FASTING' || c === 'HBA1C')) out.add('glucose');
    return Array.from(out);
  }, [reports]);

  const rankedRecipes = useMemo(() => {
    const pool = [
      ...CURATED_RECIPES,
      ...(settings.aiRecipeSuggestions && aiRecipes ? aiRecipes.recipes : []),
    ];
    let list = rankRecipes(pool, { focus: focusAreas, profile, health: healthBackground });
    if (selectedCat === 'vegan') list = list.filter((r) => r.diet_tags.includes('vegan'));
    if (selectedCat === 'protein') list = list.filter((r) => r.focus.includes('protein'));
    if (selectedCat === 'snacks') list = list.filter((r) => r.slot === 'snack');
    if (selectedCat === 'saved') list = list.filter((r) => savedRecipeIds.includes(r.id));
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.cuisine.toLowerCase().includes(q) ||
          r.ingredients.some((i) => i.name.toLowerCase().includes(q))
      );
    }
    return list;
  }, [settings.aiRecipeSuggestions, aiRecipes, focusAreas, profile, healthBackground, selectedCat, savedRecipeIds, search]);

  const handleFetchAiRecipes = async () => {
    setAiBusy(true);
    setAiStatus(null);
    const res = await callAi<{ recipes: unknown[] }>('suggest-recipes', {
      diet_type: profile.diet_type,
      allergies: healthBackground.allergies,
      cuisine_prefs: profile.cuisine_prefs,
      focus: focusAreas,
    });
    setAiBusy(false);
    if (!res.ok) {
      setAiStatus(res.message);
      return;
    }
    const parsed = (res.data.recipes ?? [])
      .map((raw, i) => normaliseAiRecipe(raw, i))
      .filter((r): r is Recipe => r !== null);
    setAiRecipes(parsed);
    setAiStatus(`Added ${parsed.length} personalised AI recipes.`);
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Top Search + Notification Bell */}
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Icon name="search" size={18} color={tokens.color.inkMuted} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search recipes & plan"
              placeholderTextColor={tokens.color.inkMuted}
              style={styles.searchInput}
              accessibilityLabel="Search recipes and plan"
            />
          </View>
          <IconButton
            icon="bell"
            label="Notifications"
            badge={unread}
            onPress={() => router.push('/notifications')}
          />
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
                  <Icon name={cat.icon} size={22} color={tokens.color.ink} />
                </View>
                <Text style={[styles.catLabel, active && styles.catLabelActive]}>{cat.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Living Plan Header Summary */}
        {activePlan && (
          <Card delay={40} style={styles.mb}>
            <Text style={styles.accentLabel}>
              Target retest: {activePlan.retest_date} ({activePlan.retest_weeks} weeks)
            </Text>
            <Text style={styles.body}>
              Goal: {activePlan.targets.map((t) => `${t.biomarker_code} ${t.target} ${t.unit}`).join(', ')}
            </Text>
            <Text style={styles.caption}>
              Adherence this week: {adherencePct}% · {activePlan.retest_reasoning}
            </Text>
          </Card>
        )}

        {/* Section Switcher */}
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

        {/* RECIPES SECTION WITH AI TOGGLE */}
        <Animated.View key={section} entering={secEnter} exiting={secExit}>
        {section === 'Recipes' && (
          <View>
            <Card style={styles.toggleCard}>
              <View style={styles.rowBetween}>
                <View style={{ flex: 1, marginRight: 12 }}>
                  <Text style={styles.h2}>AI Personalised Recipes</Text>
                  <Text style={styles.caption}>
                    Tailored to your {profile.diet_type} diet & flagged labs ({focusAreas.map((f) => FOCUS_LABELS[f]).join(', ')})
                  </Text>
                </View>
                <Toggle
                  label="AI Personalised Recipes"
                  value={settings.aiRecipeSuggestions}
                  onValueChange={(v) => updateSettings({ aiRecipeSuggestions: v })}
                />
              </View>
              {settings.aiRecipeSuggestions && (
                <Button
                  label={aiBusy ? 'Generating recipes…' : 'Generate Fresh AI Recipes'}
                  variant="secondary"
                  disabled={aiBusy}
                  onPress={handleFetchAiRecipes}
                  style={{ marginTop: tokens.space.sm }}
                />
              )}
              {aiStatus && <Text style={styles.statusText}>{aiStatus}</Text>}
            </Card>

            <View style={styles.trendingHeader}>
              <View style={styles.trendingTitleRow}>
                <Text style={styles.sectionHeading}>Recommended Recipes</Text>
                <View style={styles.countBadge}>
                  <Text style={styles.countBadgeText}>{rankedRecipes.length}</Text>
                </View>
              </View>
            </View>

            {rankedRecipes.map((rec, index) => {
              const isSaved = savedRecipeIds.includes(rec.id);
              const kcal = rec.per_serving?.kcal ?? 420;
              return (
                <Card
                  key={rec.id}
                  delay={index * 50}
                  style={styles.recipeCard}
                  onPress={() => setSelectedRecipe(rec)}
                  accessibilityLabel={`${rec.name}, ${kcal} kcal`}
                >
                  <View style={styles.recipeTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.recipeTitle}>{rec.name}</Text>
                      <View style={styles.timeRow}>
                        <Icon name="clock" size={14} color={tokens.color.accentText} />
                        <Text style={styles.timeText}>
                          {rec.minutes} min · {rec.cuisine}
                          {rec.source === 'ai' ? ' · AI' : ''}
                        </Text>
                      </View>
                    </View>
                    <Pressable
                      onPress={() => toggleSavedRecipe(rec.id)}
                      accessibilityRole="button"
                      accessibilityLabel={isSaved ? 'Remove bookmark' : 'Bookmark recipe'}
                      hitSlop={10}
                    >
                      <Icon
                        name="star"
                        size={22}
                        color={isSaved ? tokens.color.accentText : tokens.color.inkMuted}
                      />
                    </Pressable>
                  </View>

                  {rec.image_key && (
                    <Image
                      source={getLocalOrCdnImage(rec.image_key)}
                      style={styles.bowlImage}
                      resizeMode="contain"
                    />
                  )}

                  {rec.why && <Text style={styles.whyText}>{rec.why}</Text>}

                  <View style={styles.recipeFooter}>
                    <View style={styles.difficultyRow}>
                      <Text style={styles.diffLabel}>
                        {rec.difficulty <= 2 ? 'Easy' : rec.difficulty === 3 ? 'Medium' : 'Chef'}
                      </Text>
                      {[1, 2, 3, 4, 5].map((bar) => (
                        <View
                          key={bar}
                          style={[
                            styles.diffPill,
                            bar <= rec.difficulty ? styles.diffPillActive : styles.diffPillMuted,
                          ]}
                        />
                      ))}
                    </View>
                    <Text style={styles.recipeKcal}>{kcal} kcal</Text>
                  </View>
                </Card>
              );
            })}
          </View>
        )}

        {section === 'Meals' && activePlan && (
          <Card delay={60} style={styles.mb}>
            <Text style={styles.h2}>Daily Nutrition Targets</Text>
            <Text style={styles.body}>
              {activePlan.daily_targets.kcal} kcal · Protein {activePlan.daily_targets.protein_g} g ·
              Carbs {activePlan.daily_targets.carbs_g} g · Fat {activePlan.daily_targets.fat_g} g ·
              Fibre {activePlan.daily_targets.fibre_g} g
            </Text>
            <Text style={styles.caption}>
              Hydration target: {activePlan.daily_targets.water_ml} ml/day · Built from IFCT 2017 Indian food composition data.
            </Text>
          </Card>
        )}

        {section === 'Sleep' && activePlan && (
          <Card delay={60} style={styles.mb}>
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

        {section === 'Exercise' && activePlan && (
          <Card delay={60} style={styles.mb}>
            <Text style={styles.h2}>Weekly Movement</Text>
            {activePlan.exercise_weekly.map((ex) => (
              <View key={ex.day} style={styles.exRow}>
                <Text style={styles.exDay}>{ex.day} — {ex.type} ({ex.minutes} min)</Text>
                <Text style={styles.caption}>{ex.intensity} · {ex.steps.join(' · ')}</Text>
              </View>
            ))}
          </Card>
        )}

        {section === 'Supplements' && activePlan && (
          <Card delay={60} style={styles.mb}>
            <Text style={styles.h2}>Options to Discuss with Your Doctor</Text>
            <Text style={styles.caption}>
              Hepatotoxic-risk supplements (niacin, kava, green-tea extract, high-dose vitamin A) are automatically excluded when liver enzymes are flagged.
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

        {section === 'Medicines' && activePlan && (
          <Card delay={60} style={styles.mb}>
            <Text style={styles.h2}>Doctor Talking Points</Text>
            <Text style={styles.caption}>
              Svastha never prescribes or adjusts doses. Use these points at your next visit:
            </Text>
            {activePlan.medication_talking_points.map((pt, i) => (
              <Text key={i} style={styles.bullet}>• {pt}</Text>
            ))}
          </Card>
        )}

        {section === 'Measures' && activePlan && (
          <Card delay={60} style={styles.mb}>
            <Text style={styles.h2}>Daily Measures</Text>
            {activePlan.measures.map((m, i) => (
              <Text key={i} style={styles.bullet}>• {m}</Text>
            ))}
          </Card>
        )}
        </Animated.View>

        <Button label="Open Routine Builder" variant="secondary" onPress={() => router.push('/routine')} />

        <DisclaimerFooter />
      </ScrollView>

      {/* Recipe Detail Sheet */}
      <Sheet
        visible={selectedRecipe !== null}
        onClose={() => setSelectedRecipe(null)}
        title={selectedRecipe?.name ?? ''}
      >
        {selectedRecipe && (
          <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
            {selectedRecipe.why && <Text style={styles.whyText}>{selectedRecipe.why}</Text>}
            <Text style={[styles.h2, { marginTop: 12 }]}>Ingredients</Text>
            {selectedRecipe.ingredients.map((ing, i) => (
              <Text key={i} style={styles.bullet}>
                • {ing.name} ({ing.grams} g)
              </Text>
            ))}
            <Text style={[styles.h2, { marginTop: 14 }]}>Steps</Text>
            {selectedRecipe.steps.map((step, i) => (
              <Text key={i} style={styles.bullet}>
                {i + 1}. {step}
              </Text>
            ))}
          </ScrollView>
        )}
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: tokens.space.lg, paddingBottom: 112 },
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
  catScroll: { marginBottom: tokens.space.lg },
  catItem: { alignItems: 'center', marginRight: 14 },
  catTile: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    ...tokens.shadow.card,
  },
  catTileActive: { borderWidth: 2, borderColor: tokens.color.accent },
  catLabel: { ...tokens.type.caption, color: tokens.color.inkMuted, marginTop: 6, fontWeight: '500' },
  catLabelActive: { color: tokens.color.ink, fontWeight: '700' },
  toggleCard: { marginBottom: tokens.space.md, padding: tokens.space.lg },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusText: { ...tokens.type.caption, color: tokens.color.accentText, marginTop: 8, fontWeight: '600' },
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
    minWidth: 24,
    height: 24,
    paddingHorizontal: 6,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countBadgeText: { fontSize: 12, fontWeight: '700', color: tokens.color.onAccent },
  recipeCard: { marginBottom: tokens.space.md, padding: tokens.space.lg },
  recipeTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 },
  recipeTitle: { fontSize: 18, fontWeight: '700', color: tokens.color.ink },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
  timeText: { ...tokens.type.caption, color: tokens.color.inkMuted },
  bowlImage: { width: '100%', height: 200, marginVertical: tokens.space.sm },
  whyText: { ...tokens.type.caption, color: tokens.color.inkMuted, marginTop: 4 },
  recipeFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  difficultyRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  diffLabel: { ...tokens.type.caption, color: tokens.color.inkMuted, marginRight: 4 },
  diffPill: { width: 8, height: 18, borderRadius: 4 },
  diffPillActive: { backgroundColor: tokens.color.accent },
  diffPillMuted: { backgroundColor: tokens.color.surfaceMuted },
  recipeKcal: { fontSize: 20, fontWeight: '700', color: tokens.color.ink, fontVariant: ['tabular-nums'] },
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