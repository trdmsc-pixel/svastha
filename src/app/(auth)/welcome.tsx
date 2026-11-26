import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { tokens } from '@/theme/tokens';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';

const SLIDES = [
  {
    title: 'Your Lab Report, Decoded By AI',
    body: 'Upload a report. Get a clear summary and a personal wellness plan in minutes.',
    pill: 'ALT 99.8 → Target < 50',
  },
  {
    title: 'Your Food, Decoded By AI',
    body: 'Snap a meal. Calories and macros logged automatically using IFCT 2017 Indian food data.',
    pill: '512 kcal · Dal & 2 Roti',
  },
  {
    title: 'Retest. Compare. Improve.',
    body: 'Every plan has a target retest date. Import your next report and watch your numbers move.',
    pill: '12-Week Retest Loop',
  },
];

export default function WelcomeScreen() {
  const [idx, setIdx] = useState(0);
  const slide = SLIDES[idx];

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.pill}>
          <Text style={styles.pillText}>{slide.pill}</Text>
        </View>
        <Card style={styles.card}>
          <Text style={styles.title}>{slide.title}</Text>
          <Text style={styles.body}>{slide.body}</Text>
          <View style={styles.dots}>
            {SLIDES.map((_, i) => (
              <View key={i} style={[styles.dot, i === idx && styles.dotActive]} />
            ))}
          </View>
        </Card>
        <View style={styles.actions}>
          {idx < SLIDES.length - 1 ? (
            <Button label="Next" onPress={() => setIdx(idx + 1)} />
          ) : (
            <Button label="Get Started" onPress={() => router.push('/(auth)/register')} />
          )}
          <Button label="I already have an account" variant="secondary" onPress={() => router.push('/(auth)/login')} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: tokens.color.bg },
  container: { flex: 1, justifyContent: 'space-between', padding: tokens.space.xl },
  pill: { alignSelf: 'center', marginTop: 40, backgroundColor: tokens.color.accent, paddingHorizontal: 18, paddingVertical: 10, borderRadius: tokens.radius.chip },
  pillText: { ...tokens.type.label, color: tokens.color.onAccent, fontWeight: '700' },
  card: { marginVertical: tokens.space.xl },
  title: { ...tokens.type.h1, color: tokens.color.ink, marginBottom: tokens.space.sm },
  body: { ...tokens.type.body, color: tokens.color.inkMuted },
  dots: { flexDirection: 'row', gap: 8, marginTop: tokens.space.lg },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: tokens.color.surfaceMuted },
  dotActive: { width: 24, backgroundColor: tokens.color.ink },
  actions: { gap: tokens.space.sm },
});
