import React from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tokens } from '@/theme/tokens';
import { Icon } from './Icon';

/** Frosted bottom sheet used for quick-add, scan options, edit dialogs and confirmations. */
export function Sheet({ visible, onClose, title, subtitle, children, scroll = false }: { visible: boolean; onClose: () => void; title: string; subtitle?: string; children: React.ReactNode; scroll?: boolean }) {
  const insets = useSafeAreaInsets();
  const Body = scroll ? ScrollView : View;
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.wrap} pointerEvents="box-none">
          <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) + 12 }]} accessibilityViewIsModal>
            {Platform.OS !== 'android' ? <BlurView intensity={40} tint="light" style={[StyleSheet.absoluteFill, styles.clip]} /> : null}
            <View style={styles.grabber} />
            <View style={styles.headRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.title} accessibilityRole="header">
                  {title}
                </Text>
                {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
              </View>
              <Pressable onPress={onClose} style={styles.close} accessibilityRole="button" accessibilityLabel="Close sheet" hitSlop={8}>
                <Icon name="close" size={18} />
              </Pressable>
            </View>
            <Body style={scroll ? { maxHeight: 560 } : undefined} contentContainerStyle={scroll ? { paddingBottom: 8 } : undefined} keyboardShouldPersistTaps="handled">
              {children}
            </Body>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

export function SheetOption({ icon, title, subtitle, onPress, tone = 'muted' }: { icon: React.ComponentProps<typeof Icon>['name']; title: string; subtitle?: string; onPress: () => void; tone?: 'muted' | 'accent' }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={subtitle ? `${title}. ${subtitle}` : title} style={({ pressed }) => [styles.option, pressed && { opacity: 0.8 }]}>
      <View style={[styles.optionIcon, tone === 'accent' && { backgroundColor: tokens.color.accent }]}>
        <Icon name={icon} size={20} color={tokens.color.ink} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.optionTitle}>{title}</Text>
        {subtitle ? <Text style={styles.optionSub}>{subtitle}</Text> : null}
      </View>
      <Icon name="chevronRight" size={18} color={tokens.color.inkMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: tokens.color.scrim, justifyContent: 'flex-end' },
  wrap: { width: '100%', maxWidth: 520, alignSelf: 'center' },
  sheet: {
    backgroundColor: Platform.OS === 'android' ? tokens.color.surface : 'rgba(255,255,255,0.86)',
    borderTopLeftRadius: tokens.radius.sheet,
    borderTopRightRadius: tokens.radius.sheet,
    paddingHorizontal: tokens.space.xl,
    paddingTop: tokens.space.sm,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: tokens.color.glassBorder,
  },
  clip: { borderTopLeftRadius: tokens.radius.sheet, borderTopRightRadius: tokens.radius.sheet },
  grabber: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: 'rgba(43,43,43,0.18)', marginBottom: tokens.space.md },
  headRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: tokens.space.md },
  title: { ...tokens.type.h2, color: tokens.color.ink },
  subtitle: { ...tokens.type.caption, color: tokens.color.inkMuted, marginTop: 2 },
  close: { width: 36, height: 36, borderRadius: 18, backgroundColor: tokens.color.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  option: { flexDirection: 'row', alignItems: 'center', gap: tokens.space.md, padding: tokens.space.md, borderRadius: 20, backgroundColor: 'rgba(239,234,227,0.85)', marginBottom: tokens.space.sm, minHeight: 64 },
  optionIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: tokens.color.white, alignItems: 'center', justifyContent: 'center' },
  optionTitle: { ...tokens.type.body, fontWeight: '700', color: tokens.color.ink },
  optionSub: { ...tokens.type.caption, color: tokens.color.inkMuted, marginTop: 1 },
});
