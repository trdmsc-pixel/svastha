import React, { useState } from 'react';
import { ScrollView, Text } from 'react-native';
import { router } from 'expo-router';
import { Button } from '@/components/Button';
import { Banner, Field, Screen, ScreenHeader, ui } from '@/components/ui';
import { useAuthStore } from '@/store/useAuthStore';
import { isSupabaseConfigured } from '@/lib/supabase';

export default function LoginScreen() {
  const { login, requestPasswordReset, startDemo } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true); setError(null);
    const r = await login(email, password);
    setBusy(false);
    if (!r.ok) setError(r.error);
  };
  return (
    <Screen>
      <ScreenHeader title="Log in" />
      <ScrollView contentContainerStyle={ui.scroll} keyboardShouldPersistTaps="handled">
        <Text style={ui.h1}>Welcome back</Text>
        <Text style={ui.muted}>{isSupabaseConfigured ? 'Secure cloud account (Mumbai region).' : 'Accounts are stored securely on this device.'}</Text>
        <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
        <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="password" error={error} onSubmitEditing={submit} />
        {info && <Banner tone="ok" text={info} style={{ marginTop: 12 }} />}
        <Button label="Log in" onPress={submit} loading={busy} style={{ marginTop: 20 }} />
        <Button label="Forgot password?" variant="ghost" onPress={async () => { const r = await requestPasswordReset(email); r.ok ? setInfo('Reset link sent — check your email.') : setError(r.error); }} />
        <Button label="Create an account" variant="secondary" onPress={() => router.replace('/(auth)/register')} />
        <Button label="Explore with demo account" variant="ghost" icon="sparkles" onPress={startDemo} />
      </ScrollView>
    </Screen>
  );
}
