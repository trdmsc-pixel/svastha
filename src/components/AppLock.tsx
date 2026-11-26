import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { tokens } from '@/theme/tokens';
import { useAuthStore } from '@/store/useAuthStore';
import { authenticate, getBiometricCapability } from '@/lib/biometric';
import { Button } from './Button';
import { Icon } from './Icon';
import { ScreenBackground } from './ui';

/**
 * Biometric app lock. Locks on cold start and whenever the app returns from the background
 * after `lockAfterSeconds`. Uses the phone's own Face ID / Touch ID / fingerprint / face unlock,
 * with the device passcode as fallback so the user can never be locked out.
 */
export function AppLock() {
  const enabled = useAuthStore((s) => s.biometricEnabled && !!s.session);
  const lockAfter = useAuthStore((s) => s.lockAfterSeconds);
  const [locked, setLocked] = useState(Platform.OS !== 'web' && enabled);
  const [label, setLabel] = useState('Face ID / Fingerprint');
  const [error, setError] = useState<string | null>(null);
  const backgroundedAt = useRef<number | null>(null);
  const prompting = useRef(false);

  const unlock = useCallback(async () => {
    if (prompting.current) return;
    prompting.current = true;
    setError(null);
    const res = await authenticate('Unlock Svastha');
    prompting.current = false;
    if (res.success) setLocked(false);
    else if (res.error && res.error !== 'user_cancel' && res.error !== 'system_cancel' && res.error !== 'app_cancel') setError('Couldn’t verify. Try again or use your device passcode.');
  }, []);

  useEffect(() => {
    getBiometricCapability().then((c) => setLabel(c.label));
  }, []);

  // Cold start: auth storage hydrates asynchronously, so lock once it reports enabled.
  const coldStartHandled = useRef(false);
  const hydrated = useAuthStore((s) => s.hasHydrated);
  useEffect(() => {
    if (!hydrated || coldStartHandled.current) return;
    coldStartHandled.current = true;
    if (enabled && Platform.OS !== 'web') setLocked(true);
  }, [hydrated, enabled]);

  useEffect(() => {
    if (!enabled || Platform.OS === 'web') {
      setLocked(false);
      return;
    }
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background' || state === 'inactive') {
        if (backgroundedAt.current === null) backgroundedAt.current = Date.now();
      } else if (state === 'active') {
        const since = backgroundedAt.current;
        backgroundedAt.current = null;
        if (since !== null && (Date.now() - since) / 1000 >= lockAfter) setLocked(true);
      }
    });
    return () => sub.remove();
  }, [enabled, lockAfter]);

  useEffect(() => {
    if (locked) {
      const t = setTimeout(unlock, 350);
      return () => clearTimeout(t);
    }
  }, [locked, unlock]);

  if (!locked || !enabled) return null;
  return (
    <Animated.View entering={FadeIn.duration(150)} exiting={FadeOut.duration(250)} style={[StyleSheet.absoluteFill, styles.overlay]} accessibilityViewIsModal>
      <ScreenBackground />
      <View style={styles.center}>
        <View style={styles.lockBadge}>
          <Icon name={label.toLowerCase().includes('face') ? 'faceId' : 'fingerprint'} size={42} color={tokens.color.accentText} />
        </View>
        <Text style={styles.title}>Svastha is locked</Text>
        <Text style={styles.body}>Your health data is protected. Unlock with {label} or your device passcode.</Text>
        {error ? (
          <Text style={styles.error} accessibilityRole="alert">
            {error}
          </Text>
        ) : null}
        <Button label={`Unlock with ${label}`} icon="lock" onPress={unlock} style={{ marginTop: 24, alignSelf: 'stretch' }} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: { zIndex: 1000, elevation: 1000, backgroundColor: tokens.color.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: tokens.space.xxxl },
  lockBadge: { width: 96, height: 96, borderRadius: 32, backgroundColor: tokens.color.glassStrong, borderWidth: 1, borderColor: tokens.color.glassBorder, alignItems: 'center', justifyContent: 'center', marginBottom: tokens.space.xl, ...tokens.shadow.glow, shadowOpacity: 0.25 },
  title: { ...tokens.type.h1, color: tokens.color.ink, textAlign: 'center' },
  body: { ...tokens.type.body, color: tokens.color.inkMuted, textAlign: 'center', marginTop: 8 },
  error: { ...tokens.type.label, color: tokens.color.risk, marginTop: 12, textAlign: 'center' },
});
