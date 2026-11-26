import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { tokens } from '@/theme/tokens';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { Banner, Field, Screen, ScreenHeader, ui } from '@/components/ui';
import { passwordStrength, useAuthStore } from '@/store/useAuthStore';

function Check({ on, onToggle, text }: { on: boolean; onToggle: () => void; text: string }) {
  return (
    <Pressable onPress={onToggle} accessibilityRole="checkbox" accessibilityState={{ checked: on }} style={[ui.row, { gap: 10, marginTop: 14, alignItems: 'flex-start', minHeight: 44 }]}>
      <View style={{ width: 24, height: 24, borderRadius: 7, borderWidth: 2, borderColor: on ? tokens.color.ok : tokens.color.inkMuted, backgroundColor: on ? tokens.color.ok : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
        {on && <Icon name="check" size={14} color={tokens.color.white} strokeWidth={3} />}
      </View>
      <Text style={[ui.label, { flex: 1 }]}>{text}</Text>
    </Pressable>
  );
}

export default function RegisterScreen() {
  const register = useAuthStore((s) => s.register);
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [adult, setAdult] = useState(false);
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const strength = passwordStrength(pw);
  const submit = async () => {
    if (pw !== pw2) return setError('Passwords do not match.');
    if (!adult) return setError('You must be 18 or older to use Svastha (DPDP Act 2023).');
    if (!consent) return setError('Please accept the health-data consent notice.');
    setBusy(true); setError(null);
    const r = await register(email, pw);
    setBusy(false);
    if (!r.ok) setError(r.error);
  };
  return (
    <Screen>
      <ScreenHeader title="Create account" />
      <ScrollView contentContainerStyle={ui.scroll} keyboardShouldPersistTaps="handled">
        <Text style={ui.h1}>Let’s get you set up</Text>
        <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
        <Field label="Password" value={pw} onChangeText={setPw} secureTextEntry hint={['Too short', 'Weak', 'Good', 'Strong'][strength] + ' · 8+ characters with a letter and a number'} />
        <Field label="Confirm password" value={pw2} onChangeText={setPw2} secureTextEntry />
        <Check on={adult} onToggle={() => setAdult(!adult)} text="I confirm I am 18 years or older." />
        <Check on={consent} onToggle={() => setConsent(!consent)} text="I consent (DPDP Act 2023) to Svastha processing my lab values and meal logs, hosted in Mumbai. Original photos/PDFs are never stored. I can export or delete my data anytime." />
        {error && <Banner tone="risk" icon="alert" text={error} style={{ marginTop: 14 }} />}
        <Button label="Create account" onPress={submit} loading={busy} style={{ marginTop: 20 }} />
        <Button label="I already have an account" variant="ghost" onPress={() => router.replace('/(auth)/login')} />
      </ScrollView>
    </Screen>
  );
}
