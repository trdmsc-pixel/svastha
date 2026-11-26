import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import Animated, { FadeInRight, FadeOutLeft, useReducedMotion } from 'react-native-reanimated';
import { tokens } from '@/theme/tokens';
import { useAppStore } from '@/store/useAppStore';
import { useScanLauncher } from '@/store/useScanLauncher';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { Sheet } from '@/components/Sheet';
import { Banner, ChipSelect, Pill, Screen, Segmented, ShimmerBar, Stepper, ui } from '@/components/ui';
import { FoodItem, MealSlot } from '@/types/domain';
import { ALL_FOODS, defaultServing, searchFoods } from '@/engine/foodMatcher';
import { AiMealAnalysis, draftFromFood, MealDraftItem, mapAiMealToDraft, rescaleDraftItem, suggestSlot, sumNutrients } from '@/engine/mealAnalysis';
import { buildReportFromParsed, ParsedReportPayload } from '@/engine/reportSummary';
import { callAi } from '@/lib/ai';
import { captureWithCamera, pickImages, pickPdf, toEphemeral } from '@/lib/mediaIngest';
import { friendlyDayLabel } from '@/lib/dates';
import { haptic } from '@/lib/haptics';

type Phase = 'idle' | 'working' | 'review';
const STEPS = [
  'Stripping location & camera metadata',
  'Recognising exact dishes & portions with Gemini Vision',
  'Checking cloud food DB & auto-cataloguing new foods',
  'Original photo discarded — nothing stored',
];

export default function ScanScreen() {
  const s = useAppStore();
  const [mode, setMode] = useState<'meal' | 'report'>('meal');
  const [phase, setPhase] = useState<Phase>('idle');
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<MealDraftItem[]>([]);
  const [slot, setSlot] = useState<MealSlot>(suggestSlot());
  const [note, setNote] = useState<string | null>(null);
  const [noteTone, setNoteTone] = useState<'watch' | 'ok' | 'accent'>('watch');
  const [query, setQuery] = useState('');
  const [aiMealText, setAiMealText] = useState('');
  const [consentOpen, setConsentOpen] = useState<null | (() => void)>(null);

  const combinedCatalog = useMemo<FoodItem[]>(() => [...s.customFoods, ...ALL_FOODS], [s.customFoods]);
  const results = useMemo(() => searchFoods(query, combinedCatalog), [query, combinedCatalog]);
  const reducedMotion = useReducedMotion();
  const stateEnter = reducedMotion ? undefined : FadeInRight.duration(260).springify().damping(20);
  const stateExit = reducedMotion ? undefined : FadeOutLeft.duration(160);

  const withConsent = (purpose: 'meal_photo_processing' | 'report_processing', fn: () => void) => {
    if (s.hasConsent(purpose)) return fn();
    setConsentOpen(() => () => { s.grantConsent(purpose); fn(); });
  };

  const processAiMealResponse = useCallback(async (analysis: AiMealAnalysis) => {
    setStep(2);
    // Refresh cloud food catalog first so existing AI-catalogued items are reused
    const freshCatalog = [...useAppStore.getState().customFoods, ...ALL_FOODS];
    const items = mapAiMealToDraft(analysis, freshCatalog);

    if (!analysis.is_food || items.length === 0) {
      setNoteTone('watch');
      setNote('We couldn’t spot food in that image. Try a clearer shot, or search below.');
      setDraft([]);
      setPhase('review');
      return;
    }

    // Auto-insert any newly discovered dishes into the cloud `foods` database
    const newFoods = items.map((i) => i.newCatalogFood).filter((f): f is FoodItem => Boolean(f));
    if (newFoods.length > 0) {
      const savedCloud = await useAppStore.getState().registerCustomFoods(newFoods);
      setNoteTone('ok');
      setNote(
        `Gemini recognised ${items.length} item${items.length === 1 ? '' : 's'} — ${newFoods.length} new food${newFoods.length === 1 ? '' : 's'} automatically added to ${savedCloud > 0 ? 'your cloud food database' : 'your food catalog'}.`
      );
    } else {
      setNoteTone('ok');
      setNote(`Gemini matched ${items.length} item${items.length === 1 ? '' : 's'} directly from the food database.`);
    }

    setStep(3);
    haptic.success();
    setDraft(items);
    setPhase('review');
  }, []);

  const analyseMeal = useCallback(async (source: 'camera' | 'gallery') => {
    setNote(null);
    const picked = source === 'camera'
      ? await captureWithCamera()
      : await pickImages(false).then((r) => (r.ok ? { ok: true as const, value: r.value[0] } : r));
    if (!picked.ok) {
      if (!picked.cancelled) {
        setNoteTone('watch');
        setNote(picked.error);
      }
      return;
    }
    setPhase('working');
    setStep(0);
    const img = await toEphemeral(picked.value, { maxEdge: 768, quality: 0.62 });
    setStep(1);
    if (!useAppStore.getState().settings.aiMealPhotoAnalysis) {
      img.discard();
      setPhase('review');
      setNoteTone('watch');
      setNote('AI photo analysis is off in Settings. Search to add items.');
      return;
    }
    // Run cloud catalog sync in parallel with Gemini Vision to save an entire round-trip
    const [res] = await Promise.all([
      callAi<{ analysis: AiMealAnalysis }>('analyse-meal', {
        imageBase64: img.base64,
        mimeType: img.mimeType,
        dietType: useAppStore.getState().profile.diet_type,
      }),
      useAppStore.getState().syncCloudFoods(),
    ]);
    img.discard();
    if (!res.ok) {
      setPhase('review');
      setNoteTone('watch');
      setNote(`${res.message} Your photo was discarded — search below to log it instead.`);
      return;
    }
    await processAiMealResponse(res.data.analysis);
  }, [processAiMealResponse]);

  const analyseMealText = async () => {
    const text = aiMealText.trim();
    if (!text) return;
    setNote(null);
    setPhase('working');
    setStep(1);
    const res = await callAi<{ analysis: AiMealAnalysis }>('analyse-meal', {
      textHint: text,
      dietType: useAppStore.getState().profile.diet_type,
    });
    if (!res.ok) {
      setPhase('idle');
      setNoteTone('watch');
      setNote(res.message);
      return;
    }
    setAiMealText('');
    await processAiMealResponse(res.data.analysis);
  };

  const importReport = async (kind: 'camera' | 'photos' | 'pdf') => {
    setNote(null);
    let body: { pagesBase64?: Array<{ mimeType: string; data: string }>; pdfBase64?: string } = {};
    let discard: () => void = () => undefined;
    if (kind === 'pdf') {
      const r = await pickPdf();
      if (!r.ok) { if (!r.cancelled) { setNoteTone('watch'); setNote(r.error); } return; }
      setPhase('working'); setStep(1);
      body = { pdfBase64: r.value.base64 }; discard = r.value.discard;
    } else {
      const r = kind === 'camera'
        ? await captureWithCamera().then((x) => (x.ok ? { ok: true as const, value: [x.value] } : x))
        : await pickImages(true, 6);
      if (!r.ok) { if (!r.cancelled) { setNoteTone('watch'); setNote(r.error); } return; }
      setPhase('working'); setStep(0);
      const pages = await Promise.all(r.value.map((asset) => toEphemeral(asset)));
      setStep(1);
      body = { pagesBase64: pages.map((p) => ({ mimeType: p.mimeType, data: p.base64 })) };
      discard = () => pages.forEach((p) => p.discard());
    }
    const res = await callAi<{ parsed: ParsedReportPayload }>('parse-report', body, 120_000);
    discard(); body = {};
    setPhase('idle');
    if (!res.ok) {
      setNoteTone('watch');
      setNote(`${res.message} The file was discarded. You can try the sample report meanwhile.`);
      return;
    }
    const { report, unrecognisedCount } = buildReportFromParsed(res.data.parsed, kind === 'pdf' ? 'pdf' : 'photo');
    if (report.values.length === 0) {
      setNoteTone('watch');
      setNote('No lab values could be read. Try clearer photos with the results table in frame.');
      return;
    }
    s.addReport(report);
    s.buildPlanForReport(report.id);
    haptic.success();
    setNoteTone('ok');
    setNote(`Read ${report.values.length} values${unrecognisedCount ? ` (${unrecognisedCount} unrecognised)` : ''}. Your plan has been updated.`);
    router.navigate('/(tabs)/health');
  };

  useFocusEffect(
    useCallback(() => {
      const a = useScanLauncher.getState().consume();
      if (a === 'camera' || a === 'gallery') { setMode('meal'); withConsent('meal_photo_processing', () => analyseMeal(a)); }
      if (a === 'search') { setMode('meal'); setPhase('review'); setDraft([]); }
      if (a === 'report') setMode('report');
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [analyseMeal])
  );

  const total = sumNutrients(draft);
  const save = () => {
    if (draft.length === 0) return;
    s.logMeal(
      draft.map(({ key: _k, per100: _p, newCatalogFood: _ncf, ...i }) => i),
      slot,
      draft.some((d) => d.confidence !== undefined) ? 'photo' : 'search',
      { aiConfidence: draft[0]?.confidence }
    );
    haptic.success();
    setDraft([]); setPhase('idle'); setQuery(''); setNote(null);
    router.navigate('/(tabs)');
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={ui.scroll} keyboardShouldPersistTaps="handled">
        <Text style={[ui.h1, { marginTop: 12 }]}>AI Scanner</Text>
        <Text style={[ui.muted, { marginBottom: 12 }]}>Logging to {friendlyDayLabel(s.selectedDate)}</Text>
        <Segmented
          value={mode}
          onChange={(m) => { setMode(m); setPhase('idle'); setNote(null); }}
          options={[
            { value: 'meal', label: 'Meal Vision', icon: 'utensils' },
            { value: 'report', label: 'Lab Report', icon: 'report' },
          ]}
        />
        <Banner
          icon="shield"
          style={{ marginTop: 12 }}
          text="Zero-storage privacy: photos & PDFs are analysed in memory by Gemini and discarded immediately. New dishes are auto-catalogued as nutrition text only."
        />
        {note && <Banner tone={noteTone} icon={noteTone === 'ok' ? 'sparkles' : 'info'} text={note} style={{ marginTop: 10 }} />}

        {phase === 'working' && (
          <Animated.View key="working" entering={stateEnter} exiting={stateExit}>
            <Card variant="glow" style={{ marginTop: 14 }}>
              <View style={[ui.row, { gap: 8, marginBottom: 8 }]}>
                <Icon name="sparkles" size={18} color={tokens.color.accentText} />
                <Text style={ui.h3}>Gemini AI is analysing…</Text>
              </View>
              <ShimmerBar width="88%" height={12} style={{ marginBottom: 8 }} />
              <ShimmerBar width="65%" height={12} style={{ marginBottom: 14 }} />
              {STEPS.map((t, i) => (
                <View key={t} style={[ui.row, { gap: 10, marginTop: 8, opacity: i <= step ? 1 : 0.4 }]}>
                  <Icon name={i < step ? 'check' : 'clock'} size={16} color={i < step ? tokens.color.ok : tokens.color.inkMuted} />
                  <Text style={ui.label}>{t}</Text>
                </View>
              ))}
            </Card>
          </Animated.View>
        )}

        {mode === 'meal' && phase === 'idle' && (
          <Animated.View key="meal-idle" entering={stateEnter} exiting={stateExit} style={{ marginTop: 14, gap: 12 }}>
            <Card variant="glow" onPress={() => withConsent('meal_photo_processing', () => analyseMeal('camera'))} accessibilityLabel="Take a meal photo">
              <View style={ui.row}>
                <View style={styles.bigIcon}><Icon name="camera" size={26} color={tokens.color.onAccent} /></View>
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={ui.h3}>Snap your plate</Text>
                  <Text style={ui.muted}>Gemini identifies exact dishes, estimates grams & auto-saves new foods to your cloud catalog</Text>
                </View>
              </View>
            </Card>
            <Button label="Choose meal photo from gallery" icon="image" variant="secondary" onPress={() => withConsent('meal_photo_processing', () => analyseMeal('gallery'))} />

            <Card style={{ marginTop: 4 }}>
              <Text style={ui.h3}>Or describe your meal to AI</Text>
              <Text style={ui.muted}>e.g. “2 paneer parathas with curd and mango pickle”</Text>
              <View style={[ui.row, { gap: 8, marginTop: 10 }]}>
                <TextInput
                  value={aiMealText}
                  onChangeText={setAiMealText}
                  placeholder="Describe what you ate…"
                  placeholderTextColor={tokens.color.inkMuted}
                  style={[styles.input, { flex: 1, marginTop: 0 }]}
                  accessibilityLabel="Describe your meal"
                />
                <Button label="Analyse" icon="sparkles" variant="accent" onPress={analyseMealText} disabled={!aiMealText.trim()} />
              </View>
            </Card>

            <Button label="Search food catalog manually" icon="search" variant="ghost" onPress={() => { setDraft([]); setPhase('review'); }} />
          </Animated.View>
        )}

        {mode === 'meal' && phase === 'review' && (
          <Animated.View key="meal-review" entering={stateEnter} exiting={stateExit}>
            <Card variant="glow" style={{ marginTop: 14 }}>
              <Text style={ui.h2}>Review recognised meal</Text>
              <Text style={ui.muted}>Adjust portion grams — totals update instantly. Newly discovered foods are saved in your cloud database.</Text>
              {draft.map((d) => (
                <View key={d.key} style={styles.item}>
                  <View style={ui.between}>
                    <Text style={[ui.body, { fontWeight: '700', flex: 1 }]}>{d.name}</Text>
                    <Pressable onPress={() => setDraft(draft.filter((x) => x.key !== d.key))} accessibilityLabel={`Remove ${d.name}`} hitSlop={8}>
                      <Icon name="close" size={18} />
                    </Pressable>
                  </View>
                  <View style={[ui.row, { gap: 6, marginTop: 4, flexWrap: 'wrap' }]}>
                    {d.match === 'ai_catalogued' ? (
                      <Pill icon="sparkles" label="New · Auto-saved to food DB" tone="accent" />
                    ) : (
                      <Pill icon="check" label="Matched in food DB" tone="ok" />
                    )}
                    {d.confidence !== undefined && (
                      <Pill label={`${Math.round(d.confidence * 100)}% match`} tone="muted" />
                    )}
                  </View>
                  <Text style={[ui.muted, { marginTop: 6 }]}>
                    {d.nutrients.kcal} kcal · P {d.nutrients.protein_g}g · C {d.nutrients.carbs_g}g · F {d.nutrients.fat_g}g · Fibre {d.nutrients.fibre_g}g
                  </Text>
                  <View style={{ marginTop: 8, alignSelf: 'flex-start' }}>
                    <Stepper
                      label={`${d.name} grams`}
                      value={d.grams}
                      step={25}
                      min={5}
                      max={1500}
                      format={(v) => `${v} g`}
                      onChange={(g) => setDraft(draft.map((x) => (x.key === d.key ? rescaleDraftItem(x, g, combinedCatalog) : x)))}
                    />
                  </View>
                </View>
              ))}
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Add another food from catalog (incl. AI-saved dishes)…"
                placeholderTextColor={tokens.color.inkMuted}
                style={styles.input}
                accessibilityLabel="Search food"
              />
              {results.map((f) => (
                <Pressable
                  key={f.id}
                  style={styles.result}
                  onPress={() => {
                    const sv = defaultServing(f);
                    setDraft([...draft, draftFromFood(f, sv.grams, 1, sv.unit)]);
                    setQuery('');
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Add ${f.name}`}
                >
                  <Text style={[ui.label, { flex: 1 }]}>
                    {f.name}{f.source === 'ai_gemini' ? ' ✨' : ''}
                  </Text>
                  <Text style={ui.muted}>{f.per_100g.kcal} kcal/100g</Text>
                  <Icon name="plus" size={16} />
                </Pressable>
              ))}
              <Text style={[ui.label, { marginTop: 14, marginBottom: 6 }]}>Meal slot</Text>
              <ChipSelect
                multi={false}
                selected={[slot]}
                onToggle={setSlot}
                options={(['breakfast', 'lunch', 'snack', 'dinner'] as MealSlot[]).map((v) => ({
                  value: v,
                  label: v[0].toUpperCase() + v.slice(1),
                }))}
              />
              <Text style={[ui.h3, { marginTop: 14 }]}>
                Total {total.kcal} kcal · P {total.protein_g}g · C {total.carbs_g}g · F {total.fat_g}g
              </Text>
              <Button label="Log meal" icon="check" onPress={save} disabled={draft.length === 0} style={{ marginTop: 12 }} />
              <Button label="Retake photo" icon="camera" variant="ghost" onPress={() => analyseMeal('camera')} />
            </Card>
          </Animated.View>
        )}

        {mode === 'report' && phase !== 'working' && (
          <Animated.View key="report-idle" entering={stateEnter} exiting={stateExit} style={{ marginTop: 14, gap: 10 }}>
            <Card variant="glow">
              <Text style={ui.h2}>Import your lab report</Text>
              <Text style={ui.muted}>
                Supports native multi-page PDFs & report photos (Dr Lal PathLabs, SRL, Thyrocare, Metropolis). Gemini extracts every test value; status, severity & red flags are computed deterministically from your lab’s own ranges.
              </Text>
            </Card>
            <Button label="Import PDF report" icon="upload" onPress={() => withConsent('report_processing', () => importReport('pdf'))} />
            <Button label="Photograph report pages" icon="camera" variant="accent" onPress={() => withConsent('report_processing', () => importReport('camera'))} />
            <Button label="Choose page photos (up to 6)" icon="image" variant="secondary" onPress={() => withConsent('report_processing', () => importReport('photos'))} />
            <Button label="Try the sample report" icon="sparkles" variant="ghost" onPress={() => { const r = s.loadSampleReport(); s.buildPlanForReport(r.id); router.navigate('/(tabs)/health'); }} />
          </Animated.View>
        )}
      </ScrollView>

      <Sheet visible={!!consentOpen} onClose={() => setConsentOpen(null)} title="Your consent (DPDP Act 2023)">
        {[
          'Your photo/PDF is sent once over an encrypted connection and analysed in memory.',
          'Location (EXIF) metadata is stripped on your device before upload.',
          'The original file is discarded immediately — never saved to cloud storage, database, GitHub or logs.',
          'Only structured nutrition values or lab numbers are saved to your account.',
          'You can withdraw consent, export or delete all your data anytime in Settings.',
        ].map((t) => (
          <View key={t} style={[ui.row, { gap: 10, alignItems: 'flex-start', marginBottom: 10 }]}>
            <Icon name="check" size={16} color={tokens.color.ok} />
            <Text style={[ui.label, { flex: 1 }]}>{t}</Text>
          </View>
        ))}
        <Button label="I agree — continue" onPress={() => { const fn = consentOpen; setConsentOpen(null); fn?.(); }} style={{ marginTop: 8 }} />
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  bigIcon: { width: 56, height: 56, borderRadius: 20, backgroundColor: tokens.color.accent, alignItems: 'center', justifyContent: 'center', ...tokens.shadow.glow },
  item: { paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: tokens.color.border },
  input: { marginTop: 14, minHeight: 48, borderRadius: 16, borderWidth: 1, borderColor: tokens.color.border, backgroundColor: tokens.color.white, paddingHorizontal: 14, color: tokens.color.ink, fontSize: 16 },
  result: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, minHeight: 44 },
});
