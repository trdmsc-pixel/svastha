import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { tokens } from '@/theme/tokens';
import { Button } from '@/components/Button';
import { useAuthStore } from '@/store/useAuthStore';

export default function RegisterScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [is18Plus, setIs18Plus] = useState(false);
  const [dpdpConsent, setDpdpConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { signInDemo, grantDpdpConsent } = useAuthStore();

  const handleRegister = () => {
    if (!email.includes('@')) return setError('Please enter a valid email address.');
    if (password.length < 8) return setError('Password must be at least 8 characters.');
    if (!is18Plus) return setError('You must confirm you are 18 or older to use Svastha (DPDP Act 2023).');
    if (!dpdpConsent) return setError('Please review and accept the itemised health data consent notice.');
    setError(null);
    grantDpdpConsent();
    signInDemo(email);
    router.replace('/(auth)/profile-setup');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Create Your Account</Text>
        <Text style={styles.label}>Email address</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          style={styles.input}
          accessibilityLabel="Email address"
        />
        <Text style={styles.label}>Password (min 8 characters)</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          style={styles.input}
          accessibilityLabel="Password"
        />

        <Pressable
          onPress={() => setIs18Plus((v) => !v)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: is18Plus }}
          style={styles.checkRow}
        >
          <Text style={styles.checkBox}>{is18Plus ? '☑' : '☐'}</Text>
          <Text style={styles.checkText}>I confirm I am 18 years or older.</Text>
        </Pressable>

        <Pressable
          onPress={() => setDpdpConsent((v) => !v)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: dpdpConsent }}
          style={styles.checkRow}
        >
          <Text style={styles.checkBox}>{dpdpConsent ? '☑' : '☐'}</Text>
          <Text style={styles.checkText}>
            I consent under India’s DPDP Act 2023 to process my lab values and meal logs in Mumbai
            (ap-south-1). Original photos/PDFs are never stored.
          </Text>
        </Pressable>

        {error && <Text style={styles.error} accessibilityRole="alert">{error}</Text>}

        <Button label="Create Account" onPress={handleRegister} style={{ marginTop: 16 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: tokens.color.bg },
  scroll: { padding: tokens.space.xl },
  title: { ...tokens.type.h1, color: tokens.color.ink, marginBottom: tokens.space.lg },
  label: { ...tokens.type.label, color: tokens.color.ink, marginTop: tokens.space.md, marginBottom: 4 },
  input: { backgroundColor: tokens.color.surface, borderRadius: tokens.radius.input, minHeight: 48, paddingHorizontal: 14, borderWidth: 1, borderColor: tokens.color.border, color: tokens.color.ink },
  checkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: tokens.space.md, minHeight: 44 },
  checkBox: { fontSize: 20, color: tokens.color.ink },
  checkText: { ...tokens.type.caption, color: tokens.color.ink, flex: 1 },
  error: { ...tokens.type.label, color: tokens.color.risk, marginTop: tokens.space.md },
});
