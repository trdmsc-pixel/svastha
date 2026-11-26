import React, { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Banner, ChipSelect, Field, Screen, ScreenHeader, Segmented, Stepper, Toggle, ui } from '@/components/ui';
import { useAppStore } from '@/store/useAppStore';
import { ActivityLevel, DietType, HealthBackground, UserProfile } from '@/types/domain';
import { ageFromDob, minutesToHHmm, hhmmToMinutes, formatTime12 } from '@/lib/dates';

const STEPS = ['Basics', 'Body', 'Health background', 'Lifestyle', 'Goals & AI'];
const opts = <T extends string>(xs: T[]) => xs.map((v) => ({ value: v, label: v.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase()) }));
const toggle = (arr: string[], v: string) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

/** Onboarding wizard, and (with ?mode=edit) the profile & health-background editor. */
export default function ProfileSetupScreen() {
  const { mode, section } = useLocalSearchParams<{ mode?: string; section?: string }>();
  const edit = mode === 'edit';
  const store = useAppStore();
  const [p, setP] = useState<UserProfile>(store.profile);
  const [h, setH] = useState<HealthBackground>(store.healthBackground);
  const [step, setStep] = useState(section === 'health' ? 2 : 0);
  const [error, setError] = useState<string | null>(null);
  const [medText, setMedText] = useState((store.healthBackground.medications ?? []).join(', '));
  const [allergyText, setAllergyText] = useState(store.healthBackground.allergies.join(', '));
  const age = ageFromDob(p.dob);
  const up = (patch: Partial<UserProfile>) => setP({ ...p, ...patch });
  const uh = (patch: Partial<HealthBackground>) => setH({ ...h, ...patch });

  const validate = (): string | null => {
    if (!p.full_name.trim()) return 'Please enter your name.';
    if (age === null) return 'Enter date of birth as YYYY-MM-DD.';
    if (age < 18) return 'Svastha is for adults 18+ (DPDP Act 2023).';
    if (p.height_cm < 100 || p.height_cm > 230 || p.weight_kg < 25 || p.weight_kg > 300) return 'Check height and weight.';
    return null;
  };
  const save = () => {
    const err = validate();
    if (err) { setError(err); setStep(err.includes('height') ? 1 : 0); return; }
    const health = { ...h, medications: medText.split(',').map((x) => x.trim()).filter(Boolean), allergies: allergyText.split(',').map((x) => x.trim()).filter(Boolean) };
    store.saveProfileAndHealth(p, health);
    if (!edit) {
      store.completeOnboarding();
      router.replace('/(tabs)');
    } else router.back();
  };
  const shiftTime = (k: 'wake_time' | 'sleep_time', d: number) => up({ [k]: minutesToHHmm(hhmmToMinutes(p[k]) + d) } as Partial<UserProfile>);

  const sections = [
    <View key="0">
      <Field label="Full name" value={p.full_name} onChangeText={(v) => up({ full_name: v })} />
      <Field label="Date of birth (YYYY-MM-DD)" value={p.dob} onChangeText={(v) => up({ dob: v })} placeholder="1994-05-14" hint={age !== null ? `Age ${age}` : undefined} />
      <Text style={[ui.label, { marginTop: 14, marginBottom: 6 }]}>Sex (for reference ranges)</Text>
      <Segmented value={p.sex} onChange={(v) => up({ sex: v })} options={[{ value: 'M', label: 'Male' }, { value: 'F', label: 'Female' }, { value: 'other', label: 'Other' }]} />
      <Field label="City" value={p.city ?? ''} onChangeText={(v) => up({ city: v })} hint="Used for weather-aware hydration" />
    </View>,
    <View key="1" style={{ gap: 14, marginTop: 10 }}>
      {([['Height', 'height_cm', 1, 'cm'], ['Weight', 'weight_kg', 0.5, 'kg'], ['Waist', 'waist_cm', 1, 'cm'], ['Target weight', 'target_weight_kg', 0.5, 'kg']] as const).map(([l, k, st, u]) => (
        <View key={k} style={ui.between}><Text style={ui.body}>{l}</Text><Stepper label={l} value={(p[k] as number | null) ?? (k === 'waist_cm' ? 80 : p.weight_kg)} step={st} min={20} max={250} format={(v) => `${v} ${u}`} onChange={(v) => up({ [k]: v } as Partial<UserProfile>)} /></View>
      ))}
    </View>,
    <View key="2">
      <Text style={[ui.label, { marginTop: 10, marginBottom: 6 }]}>Conditions</Text>
      <ChipSelect selected={h.conditions} onToggle={(v) => uh({ conditions: toggle(h.conditions, v) })} options={opts(['Diabetes', 'Prediabetes', 'High BP', 'Thyroid', 'PCOS', 'Fatty liver', 'High cholesterol', 'Kidney disease', 'Anaemia', 'Asthma'])} />
      <Text style={[ui.label, { marginTop: 14, marginBottom: 6 }]}>Family history</Text>
      <ChipSelect selected={h.family_history} onToggle={(v) => uh({ family_history: toggle(h.family_history, v) })} options={opts(['Heart disease', 'Diabetes', 'High BP', 'Stroke', 'Cancer', 'Thyroid'])} />
      <Field label="Allergies / intolerances (comma separated)" value={allergyText} onChangeText={setAllergyText} placeholder="peanut, lactose" hint="Recipes containing these are always excluded" />
      <Field label="Prescribed medicines (names, comma separated)" value={medText} onChangeText={setMedText} hint="Used only for reminders. Svastha never changes doses." />
      <Text style={[ui.label, { marginTop: 14, marginBottom: 6 }]}>Smoking</Text>
      <Segmented value={h.smoking} onChange={(v) => uh({ smoking: v })} options={[{ value: 'never', label: 'Never' }, { value: 'former', label: 'Former' }, { value: 'current', label: 'Current' }]} />
      <View style={[ui.between, { marginTop: 14 }]}><Text style={ui.body}>Alcohol (units/week)</Text><Stepper label="Alcohol units" value={h.alcohol_units_week} onChange={(v) => uh({ alcohol_units_week: v })} max={60} /></View>
      {p.sex !== 'M' && <View style={[ui.between, { marginTop: 14 }]}><Text style={ui.body}>Pregnant</Text><Toggle label="Pregnant" value={h.pregnant} onValueChange={(v) => uh({ pregnant: v })} /></View>}
      <View style={[ui.between, { marginTop: 14 }]}><Text style={[ui.body, { flex: 1 }]}>Under active medical supervision</Text><Toggle label="Under medical supervision" value={!!h.under_medical_supervision} onValueChange={(v) => uh({ under_medical_supervision: v })} /></View>
    </View>,
    <View key="3">
      <Text style={[ui.label, { marginTop: 10, marginBottom: 6 }]}>Diet</Text>
      <ChipSelect multi={false} selected={[p.diet_type]} onToggle={(v) => up({ diet_type: v as DietType })} options={opts<DietType>(['vegetarian', 'eggetarian', 'non_veg', 'vegan', 'jain', 'sattvic'])} />
      <Text style={[ui.label, { marginTop: 14, marginBottom: 6 }]}>Activity</Text>
      <ChipSelect multi={false} selected={[p.activity_level]} onToggle={(v) => up({ activity_level: v as ActivityLevel })} options={opts<ActivityLevel>(['sedentary', 'light', 'moderate', 'active', 'very_active'])} />
      <Text style={[ui.label, { marginTop: 14, marginBottom: 6 }]}>Cuisines you enjoy</Text>
      <ChipSelect selected={p.cuisine_prefs} onToggle={(v) => up({ cuisine_prefs: toggle(p.cuisine_prefs, v) })} options={opts(['North Indian', 'South Indian', 'Gujarati', 'Bengali', 'Maharashtrian', 'Coastal', 'Modern Indian'])} />
      {(['wake_time', 'sleep_time'] as const).map((k) => (
        <View key={k} style={[ui.between, { marginTop: 14 }]}><Text style={ui.body}>{k === 'wake_time' ? 'Wake up' : 'Bedtime'}</Text><Stepper label={k} value={hhmmToMinutes(p[k])} step={15} min={0} max={1439} format={(v) => formatTime12(minutesToHHmm(v))} onChange={(v) => shiftTime(k, v - hhmmToMinutes(p[k]))} /></View>
      ))}
    </View>,
    <View key="4">
      <Text style={[ui.label, { marginTop: 10, marginBottom: 6 }]}>Goals</Text>
      <ChipSelect selected={p.goals} onToggle={(v) => up({ goals: toggle(p.goals, v) })} options={opts(['Improve lab report', 'Lose weight', 'Gain muscle', 'More energy', 'Better sleep', 'Manage sugar'])} />
      <Card style={{ marginTop: 16 }}>
        <View style={ui.between}>
          <View style={{ flex: 1, marginRight: 10 }}><Text style={ui.h3}>Suggest amazing recipes with AI</Text><Text style={ui.muted}>Uses your lab report focus areas + these profile details. Allergies & diet are always respected.</Text></View>
          <Toggle label="AI recipe suggestions" value={store.settings.aiRecipeSuggestions} onValueChange={(v) => store.updateSettings({ aiRecipeSuggestions: v })} />
        </View>
      </Card>
    </View>,
  ];

  return (
    <Screen>
      <ScreenHeader title={edit ? 'Edit profile & health' : 'Set up your profile'} subtitle={`Step ${step + 1} of ${STEPS.length} · ${STEPS[step]}`} back={edit || step > 0} onBack={() => (step > 0 ? setStep(step - 1) : router.back())} />
      <ScrollView contentContainerStyle={ui.scroll} keyboardShouldPersistTaps="handled">
        {edit && <Segmented style={{ marginBottom: 8 }} value={String(step)} onChange={(v) => setStep(Number(v))} options={STEPS.map((s, i) => ({ value: String(i), label: s.split(' ')[0] }))} />}
        <Text style={ui.h1}>{STEPS[step]}</Text>
        {sections[step]}
        {error && <Banner tone="risk" icon="alert" text={error} style={{ marginTop: 14 }} />}
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 24 }}>
          {step < STEPS.length - 1 && <Button label="Continue" onPress={() => setStep(step + 1)} style={{ flex: 1 }} />}
          {(edit || step === STEPS.length - 1) && <Button label={edit ? 'Save changes' : 'Finish setup'} variant={edit && step < STEPS.length - 1 ? 'accent' : 'primary'} icon="check" onPress={save} style={{ flex: 1 }} />}
        </View>
      </ScrollView>
    </Screen>
  );
}
