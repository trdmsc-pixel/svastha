import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import Animated, { FadeIn, FadeOutLeft, SlideInRight, useReducedMotion } from 'react-native-reanimated';
import { tokens } from '@/theme/tokens';
import { Button } from '@/components/Button';
import { getLocalOrCdnImage } from '@/lib/cdn';

const SLIDES = [
  {
    title: 'Your Food,\nDecoded By AI',
    body: 'From scanning to tracking — everything happens automatically.',
    pills: [
      { label: '170 kcal', top: '16%', left: '10%', lineH: 64 },
      { label: '90 kcal', top: '34%', left: '40%', lineH: 52 },
      { label: '110 kcal', top: '18%', right: '10%', lineH: 68 },
    ],
  },
  {
    title: 'Your Lab Report,\nDecoded By AI',
    body: 'Upload a report. Get a clear summary and a personal wellness plan in minutes.',
    pills: [
      { label: 'ALT 99.8', top: '18%', left: '12%', lineH: 56 },
      { label: 'HDL 29.1', top: '32%', left: '42%', lineH: 48 },
      { label: 'Target 12w', top: '16%', right: '10%', lineH: 62 },
    ],
  },
  {
    title: 'Retest. Compare.\nImprove.',
    body: 'Every plan has a target retest date. Import your next report and watch your numbers move.',
    pills: [
      { label: '4 / 6 Better', top: '18%', left: '12%', lineH: 58 },
      { label: '82% Water', top: '33%', left: '42%', lineH: 50 },
      { label: 'On Track', top: '16%', right: '12%', lineH: 62 },
    ],
  },
];

export default function WelcomeScreen() {
  const [idx, setIdx] = useState(0);
  const reducedMotion = useReducedMotion();
  const slide = SLIDES[idx];

  return (
    <View style={styles.root}>
      {/* Full-bleed editorial produce hero */}
      <View style={styles.heroWrap}>
        <Image
          source={getLocalOrCdnImage('onboarding/hero.webp')}
          style={styles.heroImage}
          resizeMode="cover"
        />

        {/* Smooth fade into cream #F6F2ED */}
        <Svg style={styles.fadeOverlay} width="100%" height="55%" preserveAspectRatio="none">
          <Defs>
            <LinearGradient id="creamFade" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={tokens.color.bg} stopOpacity="0" />
              <Stop offset="0.65" stopColor={tokens.color.bg} stopOpacity="0.88" />
              <Stop offset="1" stopColor={tokens.color.bg} stopOpacity="1" />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#creamFade)" />
        </Svg>

        {/* Floating kcal pills with leader lines */}
        {slide.pills.map((p, i) => (
          <Animated.View
            key={`${idx}-${p.label}`}
            entering={reducedMotion ? undefined : FadeIn.duration(350).delay(i * 90)}
            style={[
              styles.calloutWrap,
              {
                top: p.top as `${number}%`,
                left: 'left' in p ? (p.left as `${number}%`) : undefined,
                right: 'right' in p ? (p.right as `${number}%`) : undefined,
              },
            ]}
          >
            <View style={styles.calloutPill}>
              <Text style={styles.calloutText}>{p.label}</Text>
            </View>
            <View style={[styles.leaderLine, { height: p.lineH }]} />
            <View style={styles.leaderDot} />
          </Animated.View>
        ))}
      </View>

      {/* Bottom editorial copy & CTA */}
      <SafeAreaView edges={['bottom']} style={styles.bottomArea}>
        <Animated.View
          key={idx}
          entering={reducedMotion ? undefined : SlideInRight.duration(320).springify().damping(22)}
          exiting={reducedMotion ? undefined : FadeOutLeft.duration(180)}
          style={styles.textBlock}
        >
          <Text style={styles.title}>{slide.title}</Text>
          <Text style={styles.body}>{slide.body}</Text>
        </Animated.View>

        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <Pressable
              key={i}
              onPress={() => setIdx(i)}
              accessibilityRole="button"
              accessibilityLabel={`Slide ${i + 1} of ${SLIDES.length}`}
              hitSlop={8}
            >
              <View style={[styles.dot, i === idx && styles.dotActive]} />
            </Pressable>
          ))}
        </View>

        <View style={styles.actions}>
          {idx < SLIDES.length - 1 ? (
            <Button label="Get Started" onPress={() => setIdx(idx + 1)} />
          ) : (
            <Button label="Get Started" onPress={() => router.push('/(auth)/register')} />
          )}
          <Pressable
            onPress={() => router.push('/(auth)/login')}
            accessibilityRole="button"
            style={styles.loginLink}
          >
            <Text style={styles.loginText}>I already have an account</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: tokens.color.bg },
  heroWrap: {
    flex: 1.35,
    position: 'relative',
    overflow: 'hidden',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  fadeOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  calloutWrap: {
    position: 'absolute',
    alignItems: 'center',
  },
  calloutPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    shadowColor: '#2B2B2B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 12,
    elevation: 4,
  },
  calloutText: {
    fontSize: 13,
    fontWeight: '700',
    color: tokens.color.ink,
    fontVariant: ['tabular-nums'],
  },
  leaderLine: {
    width: 1.5,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  leaderDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: tokens.color.white,
    borderWidth: 1.5,
    borderColor: tokens.color.accent,
  },
  bottomArea: {
    flex: 0.95,
    paddingHorizontal: tokens.space.xl,
    paddingBottom: tokens.space.lg,
    justifyContent: 'space-between',
  },
  textBlock: {
    alignItems: 'center',
  },
  title: {
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '700',
    color: tokens.color.ink,
    textAlign: 'center',
    letterSpacing: -0.6,
    marginBottom: tokens.space.sm,
  },
  body: {
    ...tokens.type.body,
    color: tokens.color.inkMuted,
    textAlign: 'center',
    maxWidth: 310,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginVertical: tokens.space.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D8D0C6',
  },
  dotActive: {
    width: 22,
    backgroundColor: tokens.color.ink,
  },
  actions: {
    gap: tokens.space.sm,
  },
  loginLink: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  loginText: {
    ...tokens.type.label,
    color: tokens.color.inkMuted,
    fontWeight: '600',
  },
});