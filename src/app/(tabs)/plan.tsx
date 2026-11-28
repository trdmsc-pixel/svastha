import React, { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeInRight, FadeOutLeft, useReducedMotion } from 'react-native-reanimated';
import { tokens } from '@/theme/tokens';
import { useAppStore } from '@/store/useAppStore';
import { useDailyTargets, useDayTotals, useInbox, useWeeklyAdherence } from '@/hooks/useHealthData';
import { CURATED_RECIPES, FOCUS_LABELS, normaliseAiRecipe, rankRecipes } from '@/engine/recipeEngine';
import { ALL_FOODS } from '@/engine/foodMatcher';
import { callAi } from '@/lib/ai';
import { getLocalOrCdnImage } from '@/lib/cdn';
import { MealSlot, Recipe, RecipeFocus } from '@/types/domain';
import { Icon, IconName } from '@/components/Icon';
import { IconButton, Pill, Screen, ShimmerBar, Toggle, ui, useScrollBottomPad } from '@/components/ui';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Sheet } from '@/components/Sheet';
import { DisclaimerFooter } from '@/components/DisclaimerFooter';
import { haptic } from '@/lib/haptics';

type PlanSection = 'Recipes' | 'Meals' | 'Sleep' | 'Exercise' | 'Supplements' | 'Medicines' | 'Measures';
const SECTIONS: PlanSection[] = ['Recipes', 'Meals', 'Sleep', 'Exercise', 'Supplements', 'Medicines', 'Measures'];

const CATEGORIES: Array<{ id: string; label: string; icon: IconName; bg: string }> = [
  { id: 'all', label: 'All', icon: 'utensils', bg: '#EFEAE3' },
  { id: 'ai', label: 'AI Chef', icon: 'sparkles', bg: '#FDE8DC' },
  { id: 'vegan', label: 'Vegan', icon: 'leaf', bg: '#E7F3EA' },
  { id: 'protein', label: 'Protein', icon: 'zap', bg: '#E6EEFD' },
  { id: 'snacks', label: 'Snacks', icon: 'droplet', bg: '#FFF4DC' },
  { id: 'saved', label: 'Saved', icon: 'star', bg: '#F3ECE4' },
];

const QUICK_CRAVINGS = [
  'Quick under 15 mins',
  'High-protein dinner',
  'Warm Indian comfort food',
  'Crispy healthy snack',
  'South Indian breakfast',
  'Light sweet craving',
];

export default function PlanScreen() {
  const bottomPad = useScrollBottomPad();
  const {
    activePlan,
    reports,
    profile,
    healthBackground,
    settings,
    aiRecipes,
    savedRecipeIds,
    customFoods,
    pendingRecipeCraving,
    updateSettings,
    appendAiRecipes,
    toggleSavedRecipe,
    setPendingRecipeCraving,
    logMeal,
  } = useAppStore();
  const { unread } = useInbox();
  const adherencePct = useWeeklyAdherence();
  const totals = useDayTotals();
  const dailyTargets = useDailyTargets();

  const [section, setSection] = useState<PlanSection>('Recipes');
  const [selectedCat, setSelectedCat] = useState('all');
  const [search, setSearch] = useState('');
  const [craving, setCraving] = useState('');
  const [slotFilter, setSlotFilter] = useState<'any' | MealSlot>('any');
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiStatus, setAiStatus] = useState<string | null>(null);
  const reducedMotion = useReducedMotion();
  const secEnter = reducedMotion ? undefined : FadeInRight.duration(240).springify().damping(22);
  const secExit = reducedMotion ? undefined : FadeOutLeft.duration(140);

  // If launched from Smart Coach on Today screen, pre-fill the craving automatically!
  useEffect(() => {
    if (pendingRecipeCraving) {
      setSection('Recipes');
      setCraving(pendingRecipeCraving);
      setPendingRecipeCraving(null);
    }
  }, [pendingRecipeCraving, setPendingRecipeCraving]);

  const latestReport = reports[0] ?? null;
  const flaggedBiomarkers = useMemo(
    () =>
      (latestReport?.values ?? [])
        .filter((v) => v.status !== 'normal')
        .map((v) => ({
          code: v.biomarker_code,
          name: v.display_name,
          value: v.value,
          unit: v.unit,
          ref: v.ref_raw,
          status: v.status,
        })),
    [latestReport]
  );

  const focusAreas = useMemo<RecipeFocus[]>(() => {
    if (!latestReport) return ['fibre', 'protein'];
    const flagged = flaggedBiomarkers.map((v) => v.code);
    const out = new Set<RecipeFocus>(['fibre']);
    if (flagged.some((c) => c === 'ALT' || c === 'AST' || c === 'GGTP')) out.add('liver');
    if (flagged.some((c) => c === 'LDL' || c === 'NON_HDL')) out.add('ldl');
    if (flagged.includes('HDL')) out.add('hdl');
    if (flagged.some((c) => c === 'GLUCOSE_FASTING' || c === 'HBA1C')) out.add('glucose');
    if (flagged.includes('HAEMOGLOBIN') || flagged.includes('FERRITIN')) out.add('iron');
    if (flagged.includes('VITAMIN_B12')) out.add('b12');
    if (flagged.includes('VITAMIN_D')) out.add('vitamin_d');
    return Array.from(out);
  }, [latestReport, flaggedBiomarkers]);

  const combinedCatalog = useMemo(() => [...customFoods, ...ALL_FOODS], [customFoods]);

  const rankedRecipes = useMemo(() => {
    const pool = [
      ...CURATED_RECIPES,
      ...(settings.aiRecipeSuggestions && aiRecipes ? aiRecipes.recipes : []),
    ];
    let list = rankRecipes(pool, { focus: focusAreas, profile, health: healthBackground }, combinedCatalog);
    if (selectedCat === 'ai') list = list.filter((r) => r.source === 'ai');
    if (selectedCat === 'vegan') list = list.filter((r) => r.diet_tags.includes('vegan'));
    if (selectedCat === 'protein') list = list.filter((r) => r.focus.includes('protein'));
    if (selectedCat === 'snacks') list = list.filter((r) => r.slot === 'snack');
    if (selectedCat === 'saved') list = list.filter((r) => savedRecipeIds.includes(r.id));
    if (slotFilter !== 'any') list = list.filter((r) => r.slot === slotFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.cuisine.toLowerCase().includes(q) ||
          (r.why ?? '').toLowerCase().includes(q) ||
          r.ingredients.some((i) => i.name.toLowerCase().includes(q))
      );
    }
    return list;
  }, [settings.aiRecipeSuggestions, aiRecipes, focusAreas, profile, healthBackground, combinedCatalog, selectedCat, savedRecipeIds, slotFilter, search]);

  const handleFetchAiRecipes = async (overrideCraving?: string) => {
    const activeCraving = (overrideCraving ?? craving).trim();
    setAiBusy(true);
    setAiStatus(null);
    const res = await callAi<{ recipes: unknown[] }>('suggest-recipes', {
      craving: activeCraving || 'Fresh everyday home-cooked variety matching my lab goals',
      meal_slot: slotFilter === 'any' ? undefined : slotFilter,
      diet_type: profile.diet_type,
      allergies: healthBackground.allergies,
      conditions: healthBackground.conditions,
      pregnant: healthBackground.pregnant,
      fasting_practices: profile.fasting_practices,
      cuisine_prefs: profile.cuisine_prefs,
      budget_level: profile.budget_level,
      goals: profile.goals,
      focus: focusAreas,
      flagged_biomarkers: flaggedBiomarkers,
      daily_targets: dailyTargets,
      remaining_today: {
        kcal: Math.max(0, dailyTargets.kcal - totals.kcal),
        protein_g: Math.max(0, Math.round(dailyTargets.protein_g - totals.protein_g)),
        carbs_g: Math.max(0, Math.round(dailyTargets.carbs_g - totals.carbs_g)),
        fat_g: Math.max(0, Math.round(dailyTargets.fat_g - totals.fat_g)),
      },
    });
    setAiBusy(false);
    if (!res.ok) {
      setAiStatus(res.message);
      return;
    }
    const parsed = (res.data.recipes ?? [])
      .map((raw, i) => normaliseAiRecipe(raw, i, activeCraving || undefined))
      .filter((r): r is Recipe => r !== null);
    if (parsed.length === 0) {
      setAiStatus('No safe recipes matched your constraints. Try broadening your craving.');
      return;
    }
    appendAiRecipes(parsed, activeCraving || undefined);
    haptic.success();
    setAiStatus(`Crafted ${parsed.length} fresh AI recipes tailored to your labs & cravings!`);
  };

  const handleLogRecipe = (rec: Recipe) => {
    const ps = rec.per_serving ?? { kcal: 380, protein_g: 16, carbs_g: 42, fat_g: 12, fibre_g: 6 };
    logMeal(
      [
        {
          food_id: rec.id,
          name: rec.name,
          qty: 1,
          unit: 'serving',
          grams: rec.ingredients.reduce((sum, i) => sum + i.grams, 0) || 250,
          nutrients: ps,
          image_key: rec.image_key,
          match: rec.source === 'ai' ? 'ai_catalogued' : 'db',
        },
      ],
      rec.slot,
      'plan'
    );
    haptic.success();
    setSelectedRecipe(null);
    router.navigate('/(tabs)');
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: bottomPad }]} showsVerticalScrollIndicator={false}>
        {/* Top Search + Notification Bell */}
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Icon name="search" size={18} color={tokens.color.inkMuted} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search 30+ recipes & plan"
              placeholderTextColor={tokens.color.inkMuted}
              style={styles.searchInput}
              accessibilityLabel="Search recipes and plan"
            />
          </View>
          <IconButton icon="bell" label="Notifications" badge={unread} onPress={() => router.push('/notifications')} />
        </View>

        {/* Category Icon Tiles */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
          {CATEGORIES.map((cat) => {
            const active = selectedCat === cat.id;
            return (
              <Pressable
                key={cat.id}
                onPress={() => { haptic.select(); setSelectedCat(cat.id); }}
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
              onPress={() => { haptic.select(); setSection(s); }}
              style={[styles.chip, section === s && styles.chipActive]}
            >
              <Text style={[styles.chipText, section === s && styles.chipTextActive]}>{s}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <Animated.View key={section} entering={secEnter} exiting={secExit}>
          {section === 'Recipes' && (
            <View>
              {/* AI Personalised Chef Studio Card */}
              <Card variant="glow" style={styles.toggleCard}>
                <View style={styles.rowBetween}>
                  <View style={{ flex: 1, marginRight: 12 }}>
                    <View style={[ui.row, { gap: 6 }]}>
                      <Icon name="sparkles" size={18} color={tokens.color.accentText} />
                      <Text style={styles.h2}>AI Personalised Chef</Text>
                    </View>
                    <Text style={styles.caption}>
                      Reassesses your {profile.diet_type} profile, {Math.max(0, dailyTargets.kcal - totals.kcal)} kcal left today &{' '}
                      {flaggedBiomarkers.length > 0
                        ? `flagged labs (${flaggedBiomarkers.slice(0, 3).map((b) => b.code).join(', ')})`
                        : focusAreas.map((f) => FOCUS_LABELS[f]).join(', ')}
                    </Text>
                  </View>
                  <Toggle
                    label="AI Personalised Recipes"
                    value={settings.aiRecipeSuggestions}
                    onValueChange={(v) => updateSettings({ aiRecipeSuggestions: v })}
                  />
                </View>

                {settings.aiRecipeSuggestions && (
                  <View style={{ marginTop: 12 }}>
                    <TextInput
                      value={craving}
                      onChangeText={setCraving}
                      placeholder="What do you feel like eating? e.g. crispy paneer wrap, South Indian..."
                      placeholderTextColor={tokens.color.inkMuted}
                      style={styles.cravingInput}
                      accessibilityLabel="What do you want to eat"
                    />
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                      {QUICK_CRAVINGS.map((q) => (
                        <Pressable
                          key={q}
                          onPress={() => { haptic.select(); setCraving(q); }}
                          style={[styles.quickChip, craving === q && styles.quickChipActive]}
                        >
                          <Text style={[styles.quickChipText, craving === q && { color: tokens.color.onAccent, fontWeight: '700' }]}>
                            {q}
                          </Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                    <Button
                      label={aiBusy ? 'Crafting personalised recipes…' : 'Generate Fresh AI Recipes'}
                      icon="sparkles"
                      variant="accent"
                      disabled={aiBusy}
                      onPress={() => handleFetchAiRecipes()}
                      style={{ marginTop: 12 }}
                    />
                  </View>
                )}

                {aiBusy && (
                  <View style={{ marginTop: 12, gap: 8 }}>
                    <ShimmerBar width="90%" height={12} />
                    <ShimmerBar width="70%" height={12} />
                  </View>
                )}
                {aiStatus && <Text style={styles.statusText}>{aiStatus}</Text>}
              </Card>

              {/* Meal Slot Quick Filter */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                {(['any', 'breakfast', 'lunch', 'snack', 'dinner'] as const).map((sl) => (
                  <Pressable
                    key={sl}
                    onPress={() => { haptic.select(); setSlotFilter(sl); }}
                    style={[styles.slotPill, slotFilter === sl && styles.slotPillActive]}
                  >
                    <Text style={[styles.slotPillText, slotFilter === sl && { color: tokens.color.white }]}>
                      {sl === 'any' ? 'All meals' : sl[0].toUpperCase() + sl.slice(1)}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>

              <View style={styles.trendingHeader}>
                <View style={styles.trendingTitleRow}>
                  <Text style={styles.sectionHeading}>Personalised Recipes</Text>
                  <View style={styles.countBadge}>
                    <Text style={styles.countBadgeText}>{rankedRecipes.length}</Text>
                  </View>
                </View>
              </View>

              {rankedRecipes.map((rec, index) => {
                const isSaved = savedRecipeIds.includes(rec.id);
                const kcal = rec.per_serving?.kcal ?? 380;
                return (
                  <Card
                    key={rec.id}
                    variant={rec.source === 'ai' ? 'glow' : 'glass'}
                    delay={Math.min(index * 35, 280)}
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
                            {rec.minutes} min · {rec.cuisine} · {rec.slot}
                          </Text>
                        </View>
                      </View>
                      <Pressable
                        onPress={() => { haptic.select(); toggleSavedRecipe(rec.id); }}
                        accessibilityRole="button"
                        accessibilityLabel={isSaved ? 'Remove bookmark' : 'Bookmark recipe'}
                        hitSlop={10}
                      >
                        <Icon name="star" size={22} color={isSaved ? tokens.color.accentText : tokens.color.inkMuted} />
                      </Pressable>
                    </View>

                    {/* Biomarker / Focus Pills */}
                    <View style={[ui.row, { gap: 6, flexWrap: 'wrap', marginTop: 8 }]}>
                      {rec.source === 'ai' && <Pill icon="sparkles" label="AI Chef" tone="accent" />}
                      {(rec.biomarker_benefits ?? []).slice(0, 2).map((b) => (
                        <Pill key={b} label={b} tone="ok" />
                      ))}
                      {rec.matchedFocus.slice(0, 2).map((f) => (
                        <Pill key={f} label={FOCUS_LABELS[f]} tone="muted" />
                      ))}
                    </View>

                    {rec.image_key && (
                      <Image source={getLocalOrCdnImage(rec.image_key)} style={styles.bowlImage} resizeMode="contain" />
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
                            style={[styles.diffPill, bar <= rec.difficulty ? styles.diffPillActive : styles.diffPillMuted]}
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
                Bedtime {activePlan.sleep.bed} · Wake {activePlan.sleep.wake} · Caffeine cut-off {activePlan.sleep.caffeine_cutoff}
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
                  <Text style={styles.exDay}>{sup.name} ({sup.evidence} evidence)</Text>
                  <Text style={styles.body}>Why: {sup.why_biomarker} · Form: {sup.typical_form}</Text>
                  {sup.caution && <Text style={styles.cautionText}>⚠ {sup.caution}</Text>}
                </View>
              ))}
            </Card>
          )}

          {section === 'Medicines' && activePlan && (
            <Card delay={60} style={styles.mb}>
              <Text style={styles.h2}>Doctor Talking Points</Text>
              <Text style={styles.caption}>Svastha never prescribes or adjusts doses. Use these points at your next visit:</Text>
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

      {/* Recipe Detail Sheet with 1-tap Log Meal */}
      <Sheet visible={selectedRecipe !== null} onClose={() => setSelectedRecipe(null)} title={selectedRecipe?.name ?? ''}>
        {selectedRecipe && (
          <ScrollView style={{ maxHeight: 460 }} showsVerticalScrollIndicator={false}>
            {selectedRecipe.per_serving && (
              <Text style={styles.accentLabel}>
                {selectedRecipe.per_serving.kcal} kcal · P {selectedRecipe.per_serving.protein_g}g · C{' '}
                {selectedRecipe.per_serving.carbs_g}g · F {selectedRecipe.per_serving.fat_g}g · Fibre{' '}
                {selectedRecipe.per_serving.fibre_g}g
              </Text>
            )}
            {selectedRecipe.why && <Text style={styles.whyText}>{selectedRecipe.why}</Text>}
            <Text style={[styles.h2, { marginTop: 12 }]}>Ingredients</Text>
            {selectedRecipe.ingredients.map((ing, i) => (
              <Text key={i} style={styles.bullet}>• {ing.name} ({ing.grams} g)</Text>
            ))}
            <Text style={[styles.h2, { marginTop: 14 }]}>Steps</Text>
            {selectedRecipe.steps.map((step, i) => (
              <Text key={i} style={styles.bullet}>{i + 1}. {step}</Text>
            ))}
            <Button
              label={`Log to Today’s ${selectedRecipe.slot}`}
              icon="check"
              onPress={() => handleLogRecipe(selectedRecipe)}
              style={{ marginTop: 16 }}
            />
          </ScrollView>
        )}
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: tokens.space.lg, paddingBottom: 118 },
  searchRow: { flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: tokens.space.md },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: tokens.color.glassStrong,
    borderRadius: tokens.radius.chip,
    borderWidth: 1,
    borderColor: tokens.color.glassBorder,
    paddingHorizontal: 16,
    height: 46,
    gap: 8,
    ...tokens.shadow.card,
  },
  searchInput: { flex: 1, ...tokens.type.body, color: tokens.color.ink },
  catScroll: { marginBottom: tokens.space.lg },
  catItem: { alignItems: 'center', marginRight: 14 },
  catTile: { width: 62, height: 62, borderRadius: 20, alignItems: 'center', justifyContent: 'center', ...tokens.shadow.card },
  catTileActive: { borderWidth: 2, borderColor: tokens.color.accent },
  catLabel: { ...tokens.type.caption, color: tokens.color.inkMuted, marginTop: 6, fontWeight: '500' },
  catLabelActive: { color: tokens.color.ink, fontWeight: '700' },
  toggleCard: { marginBottom: tokens.space.md, padding: tokens.space.lg },
  cravingInput: {
    minHeight: 46,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: tokens.color.border,
    backgroundColor: tokens.color.white,
    paddingHorizontal: 14,
    color: tokens.color.ink,
    fontSize: 15,
  },
  quickChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, backgroundColor: tokens.color.surfaceMuted, marginRight: 8 },
  quickChipActive: { backgroundColor: tokens.color.accent },
  quickChipText: { ...tokens.type.caption, color: tokens.color.ink },
  slotPill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: tokens.color.glassStrong, borderWidth: 1, borderColor: tokens.color.border, marginRight: 8 },
  slotPillActive: { backgroundColor: tokens.color.ink, borderColor: tokens.color.ink },
  slotPillText: { ...tokens.type.caption, fontWeight: '600', color: tokens.color.ink },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusText: { ...tokens.type.caption, color: tokens.color.accentText, marginTop: 10, fontWeight: '600' },
  trendingHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: tokens.space.sm },
  trendingTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionHeading: { ...tokens.type.h2, color: tokens.color.ink },
  countBadge: { backgroundColor: tokens.color.accent, minWidth: 26, height: 24, paddingHorizontal: 7, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  countBadgeText: { fontSize: 12, fontWeight: '700', color: tokens.color.onAccent },
  recipeCard: { marginBottom: tokens.space.md, padding: tokens.space.lg },
  recipeTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 },
  recipeTitle: { fontSize: 18, fontWeight: '700', color: tokens.color.ink },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
  timeText: { ...tokens.type.caption, color: tokens.color.inkMuted },
  bowlImage: { width: '100%', height: 190, marginVertical: tokens.space.sm },
  whyText: { ...tokens.type.caption, color: tokens.color.inkMuted, marginTop: 6 },
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