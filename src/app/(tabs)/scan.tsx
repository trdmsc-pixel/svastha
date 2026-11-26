import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { tokens } from '@/theme/tokens';
import { useAppStore } from '@/store/useAppStore';
import { useScanLauncher } from '@/store/useScanLauncher';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { Sheet } from '@/components/Sheet';
import { Banner, ChipSelect, Screen, Segmented, Stepper, ui } from '@/components/ui';
import { MealSlot } from '@/types/domain';
import { ALL_FOODS, defaultServing, searchFoods } from '@/engine/foodMatcher';
import { AiMealAnalysis, draftFromFood, MealDraftItem, mapAiMealToDraft, rescaleDraftItem, suggestSlot, sumNutrients } from '@/engine/mealAnalysis';
import { buildReportFromParsed, ParsedReportPayload } from '@/engine/reportSummary';
import { callAi } from '@/lib/ai';
import { captureWithCamera, pickImages, pickPdf, toEphemeral } from '@/lib/mediaIngest';
import { friendlyDayLabel } from '@/lib/dates';
import { haptic } from '@/lib/haptics';

type Phase = 'idle' | 'working' | 'review';
const STEPS = ['Stripping location & camera data', 'Analysing in memory with AI', 'Matching to IFCT 2017 food data', 'Original discarded — nothing stored'];

export default function ScanScreen() {
  const s = useAppStore();
  const [mode, setMode] = useState<'meal' | 'report'>('meal');
  const [phase, setPhase] = useState<Phase>('idle');
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<MealDraftItem[]>([]);
  const [slot, setSlot] = useState<MealSlot>(suggestSlot());
  const [note, setNote] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [consentOpen, setConsentOpen] = useState<null | (() => void)>(null);
  const results = useMemo(() => searchFoods(query), [query]);

  const withConsent = (purpose: 'meal_photo_processing' | 'report_processing', fn: () => void) => {
    if (s.hasConsent(purpose)) return fn();
    setConsentOpen(() => () => { s.grantConsent(purpose); fn(); });
  };

  const analyseMeal = useCallback(async (source: 'camera' | 'gallery') => {
    setNote(null);
    const picked = source === 'camera' ? await captureWithCamera() : await pickImages(false).then((r) => (r.ok ? { ok: true as const, value: r.value[0] } : r));
    if (!picked.ok) { if (!picked.cancelled) setNote(picked.error); return; }
    setPhase('working'); setStep(0);
    const img = await toEphemeral(picked.value);
    setStep(1);
    if (!useAppStore.getState().settings.aiMealPhotoAnalysis) {
      img.discard(); setPhase('review'); setNote('AI photo analysis is off in Settings. Search to add items.'); return;
    }
    const res = await callAi<{ analysis: AiMealAnalysis }>('analyse-meal', { imageBase64: img.base64, mimeType: img.mimeType, dietType: useAppStore.getState().profile.diet_type });
    img.discard();
    setStep(3);
    if (!res.ok) { setPhase('review'); setNote(`${res.message} Your photo was discarded — search below to log it instead.`); return; }
    const items = mapAiMealToDraft(res.data.analysis);
    if (!res.data.analysis.is_food || items.length === 0) setNote('We couldn’t spot food in that photo. Try again closer, or search below.');
    haptic.success();
    setDraft(items); setPhase('review');
  }, []);

  const importReport = async (kind: 'camera' | 'photos' | 'pdf') => {
    setNote(null);
    let body: { pagesBase64?: Array<{ mimeType: string; data: string }>; pdfBase64?: string } = {};
    let discard: () => void = () => undefined;
    if (kind === 'pdf') {
      const r = await pickPdf();
      if (!r.ok) { if (!r.cancelled) setNote(r.error); return; }
      setPhase('working'); setStep(1);
      body = { pdfBase64: r.value.base64 }; discard = r.value.discard;
    } else {
      const r = kind === 'camera' ? await captureWithCamera().then((x) => (x.ok ? { ok: true as const, value: [x.value] } : x)) : await pickImages(true, 6);
      if (!r.ok) { if (!r.cancelled) setNote(r.error); return; }
      setPhase('working'); setStep(0);
      const pages = await Promise.all(r.value.map(toEphemeral));
      setStep(1);
      body = { pagesBase64: pages.map((p) => ({ mimeType: p.mimeType, data: p.base64 })) };
      discard = () => pages.forEach((p) => p.discard());
    }
    const res = await callAi<{ parsed: ParsedReportPayload }>('parse-report', body, 120_000);
    discard(); body = {};
    setPhase('idle');
    if (!res.ok) { setNote(`${res.message} The file was discarded. You can try the sample report meanwhile.`); return; }
    const { report, unrecognisedCount } = buildReportFromParsed(res.data.parsed, kind === 'pdf' ? 'pdf' : 'photo');
    if (report.values.length === 0) { setNote('No lab values could be read. Try clearer photos with the results table in frame.'); return; }
    s.addReport(report);
    s.buildPlanForReport(report.id);
    haptic.success();
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
    s.logMeal(draft.map(({ key: _k, per100: _p, ...i }) => i), slot, draft.some((d) => d.confidence !== undefined) ? 'photo' : 'search', { aiConfidence: draft[0]?.confidence });
    haptic.success();
    setDraft([]); setPhase('idle'); setQuery('');
    router.navigate('/(tabs)');
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={ui.scroll} keyboardShouldPersistTaps="handled">
        <Text style={[ui.h1, { marginTop: 12 }]}>Scan</Text>
        <Text style={[ui.muted, { marginBottom: 12 }]}>Logging to {friendlyDayLabel(s.selectedDate)}</Text>
        <Segmented value={mode} onChange={(m) => { setMode(m); setPhase('idle'); }} options={[{ value: 'meal', label: 'Meal', icon: 'utensils' }, { value: 'report', label: 'Lab report', icon: 'report' }]} />
        <Banner icon="shield" style={{ marginTop: 12 }} text="Privacy guarantee: photos and PDFs are processed in memory and discarded immediately — never stored in the cloud, database or logs. Location data is stripped first." />
        {note && <Banner tone="watch" icon="info" text={note} style={{ marginTop: 10 }} />}

        {phase === 'working' && (
          <Card style={{ marginTop: 14 }}>
            <Text style={ui.h3}>Analysing…</Text>
            {STEPS.map((t, i) => (
              <View key={t} style={[ui.row, { gap: 10, marginTop: 10, opacity: i <= step ? 1 : 0.4 }]}>
                <Icon name={i < step ? 'check' : 'clock'} size={16} color={i < step ? tokens.color.ok : tokens.color.inkMuted} />
                <Text style={ui.label}>{t}</Text>
              </View>
            ))}
          </Card>
        )}

        {mode === 'meal' && phase === 'idle' && (
          <View style={{ marginTop: 14, gap: 10 }}>
            <Card onPress={() => withConsent('meal_photo_processing', () => analyseMeal('camera'))} accessibilityLabel="Take a meal photo">
              <View style={ui.row}><View style={styles.bigIcon}><Icon name="camera" size={26} color={tokens.color.onAccent} /></View>
                <View style={{ flex: 1, marginLeft: 14 }}><Text style={ui.h3}>Snap your plate</Text><Text style={ui.muted}>Opens the camera · Gemini AI identifies each food & portion</Text></View></View>
            </Card>
            <Button label="Choose from gallery" icon="image" variant="secondary" onPress={() => withConsent('meal_photo_processing', () => analyseMeal('gallery'))} />
            <Button label="Search food instead" icon="search" variant="secondary" onPress={() => { setDraft([]); setPhase('review'); }} />
          </View>
        )}

        {mode === 'meal' && phase === 'review' && (
          <Card style={{ marginTop: 14 }}>
            <Text style={ui.h2}>Review meal</Text>
            <Text style={ui.muted}>Adjust portions — calories are computed from the IFCT 2017 food database, not by AI.</Text>
            {draft.map((d) => (
              <View key={d.key} style={styles.item}>
                <View style={ui.between}>
                  <Text style={[ui.body, { fontWeight: '700', flex: 1 }]}>{d.name}</Text>
                  <Pressable onPress={() => setDraft(draft.filter((x) => x.key !== d.key))} accessibilityLabel={`Remove ${d.name}`} hitSlop={8}><Icon name="close" size={18} /></Pressable>
                </View>
                <Text style={ui.muted}>{d.nutrients.kcal} kcal · P {d.nutrients.protein_g}g · C {d.nutrients.carbs_g}g · F {d.nutrients.fat_g}g{d.match === 'ai_estimate' ? ' · AI estimate (not in IFCT database)' : ''}{d.confidence !== undefined ? ` · ${Math.round(d.confidence * 100)}% sure` : ''}</Text>
                <View style={{ marginTop: 8, alignSelf: 'flex-start' }}><Stepper label={`${d.name} grams`} value={d.grams} step={25} min={5} max={1500} format={(v) => `${v} g`} onChange={(g) => setDraft(draft.map((x) => (x.key === d.key ? rescaleDraftItem(x, g) : x)))} /></View>
              </View>
            ))}
            <TextInput value={query} onChangeText={setQuery} placeholder="Add food: dal, 2 roti, idli, paneer…" placeholderTextColor={tokens.color.inkMuted} style={styles.input} accessibilityLabel="Search food" />
            {results.map((f) => (
              <Pressable key={f.id} style={styles.result} onPress={() => { const sv = defaultServing(f); setDraft([...draft, draftFromFood(f, sv.grams, 1, sv.unit)]); setQuery(''); }} accessibilityRole="button" accessibilityLabel={`Add ${f.name}`}>
                <Text style={[ui.label, { flex: 1 }]}>{f.name}</Text><Text style={ui.muted}>{f.per_100g.kcal} kcal/100g</Text><Icon name="plus" size={16} />
              </Pressable>
            ))}
            <Text style={[ui.label, { marginTop: 14, marginBottom: 6 }]}>Meal</Text>
            <ChipSelect multi={false} selected={[slot]} onToggle={setSlot} options={(['breakfast', 'lunch', 'snack', 'dinner'] as MealSlot[]).map((v) => ({ value: v, label: v[0].toUpperCase() + v.slice(1) }))} />
            <Text style={[ui.h3, { marginTop: 14 }]}>Total {total.kcal} kcal · P {total.protein_g}g · C {total.carbs_g}g · F {total.fat_g}g</Text>
            <Button label="Log meal" icon="check" onPress={save} disabled={draft.length === 0} style={{ marginTop: 12 }} />
            <Button label="Retake photo" icon="camera" variant="ghost" onPress={() => analyseMeal('camera')} />
          </Card>
        )}

        {mode === 'report' && phase !== 'working' && (
          <View style={{ marginTop: 14, gap: 10 }}>
            <Card>
              <Text style={ui.h2}>Import your lab report</Text>
              <Text style={ui.muted}>Works with Dr Lal PathLabs, SRL, Thyrocare, Metropolis and most Indian lab formats. AI reads the values; status, severity and red flags are computed in code from your lab’s own ranges.</Text>
            </Card>
            <Button label="Import PDF" icon="upload" onPress={() => withConsent('report_processing', () => importReport('pdf'))} />
            <Button label="Photograph report pages" icon="camera" variant="accent" onPress={() => withConsent('report_processing', () => importReport('camera'))} />
            <Button label="Choose page photos (up to 6)" icon="image" variant="secondary" onPress={() => withConsent('report_processing', () => importReport('photos'))} />
            <Button label="Try the sample report" icon="sparkles" variant="ghost" onPress={() => { const r = s.loadSampleReport(); s.buildPlanForReport(r.id); router.navigate('/(tabs)/health'); }} />
          </View>
        )}
      </ScrollView>

      <Sheet visible={!!consentOpen} onClose={() => setConsentOpen(null)} title="Your consent (DPDP Act 2023)">
        {['Your photo/PDF is sent once over an encrypted connection to our AI service in India and analysed in memory.', 'Location (EXIF) data is removed on your phone before upload.', 'The original file is discarded immediately — never saved to cloud storage, database, GitHub or logs.', 'Only the extracted numbers (food items or lab values) are saved to your account.', 'You can withdraw consent, export or delete all your data anytime in Settings.'].map((t) => (
          <View key={t} style={[ui.row, { gap: 10, alignItems: 'flex-start', marginBottom: 10 }]}><Icon name="check" size={16} color={tokens.color.ok} /><Text style={[ui.label, { flex: 1 }]}>{t}</Text></View>
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
void ALL_FOODS;
