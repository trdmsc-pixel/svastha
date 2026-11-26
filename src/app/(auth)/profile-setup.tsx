import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { tokens } from '@/theme/tokens';
import { Button } from '@/components/Button';
import { useAuthStore } from '@/store/useAuthStore';

const STEPS = ['Basics', 'Body', 'Health Background', 'Lifestyle', 'Goals & Reminders'];

export default function ProfileSetupScreen() {
  const { profile, updateProfile, completeOnboarding } = useAuthStore();
  const [step, setStep] = useState(0);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.caption}>Step {step + 1} of {STEPS.length}</Text>
        <Text style={styles.title}>{STEPS[step]}</Text>

        {step === 0 && (
          <>
            <Text style={styles.label}>Full Name</Text>
            <TextInput
              value={profile.full_name}
              onChangeText={(full_name) => updateProfile({ full_name })}
              style={styles.input}
            />
            <Text style={styles.label}>City (for weather-aware hydration)</Text>
            <TextInput
              value={profile.city ?? ''}
              onChangeText={(city) => updateProfile({ city })}
              style={styles.input}
            />
          </>
        )}

        {step === 1 && (
          <>
            <Text style={styles.label}>Height (cm)</Text>
            <TextInput
              value={String(profile.height_cm)}
              keyboardType="numeric"
              onChangeText={(v) => updateProfile({ height_cm: parseFloat(v) || profile.height_cm })}
              style={styles.input}
            />
            <Text style={styles.label}>Weight (kg)</Text>
            <TextInput
              value={String(profile.weight_kg)}
              keyboardType="numeric"
              onChangeText={(v) => updateProfile({ weight_kg: parseFloat(v) || profile.weight_kg })}
              style={styles.input}
            />
          </>
        )}

        {step >= 2 && (
          <Text style={styles.body}>
            Diet: {profile.diet_type} · Wake: {profile.wake_time} · Sleep: {profile.sleep_time} ·
            Goals: {profile.goals.join(', ')}.
          </Text>
        )}

        <View style={styles.navRow}>
          {step > 0 && <Button label="Back" variant="secondary" onPress={() => setStep(step - 1)} />}
          {step < STEPS.length - 1 ? (
            <Button label="Continue" onPress={() => setStep(step + 1)} />
          ) : (
            <Button
              label="Finish Setup"
              onPress={() => {
                completeOnboarding();
                router.replace('/(tabs)');
              }}
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: tokens.color.bg },
  scroll: { padding: tokens.space.xl },
  caption: { ...tokens.type.caption, color: tokens.color.accentText, fontWeight: '700' },
  title: { ...tokens.type.h1, color: tokens.color.ink, marginBottom: tokens.space.lg },
  label: { ...tokens.type.label, color: tokens.color.ink, marginTop: tokens.space.md, marginBottom: 4 },
  body: { ...tokens.type.body, color: tokens.color.ink, marginVertical: tokens.space.md },
  input: { backgroundColor: tokens.color.surface, borderRadius: tokens.radius.input, minHeight: 48, paddingHorizontal: 14, borderWidth: 1, borderColor: tokens.color.border, color: tokens.color.ink },
  navRow: { flexDirection: 'row', gap: 12, marginTop: tokens.space.xxl },
});
