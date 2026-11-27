import React, { useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { tokens } from '@/theme/tokens';
import { useAuthStore } from '@/store/useAuthStore';
import { exportUserData, useAppStore } from '@/store/useAppStore';
import { syncPlanToDeviceCalendar } from '@/lib/calendarSync';
import { authenticate, getBiometricCapability } from '@/lib/biometric';
import { aiTransportLabel } from '@/lib/ai';
import { Screen, SectionTitle, SettingRow, Toggle } from '@/components/ui';
import { useProgrammeStore } from '@/store/useProgrammeStore';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Sheet } from '@/components/Sheet';
import { Icon } from '@/components/Icon';
import { ageFromDob } from '@/lib/dates';

export default function MeScreen() {
  const programmeId = useProgrammeStore((st) => st.programmeId);
  const programmeRemindersOn = useProgrammeStore((st) => st.remindersOn);
  const setProgrammeRemindersOn = useProgrammeStore((st) => st.setRemindersOn);
  const stopProgramme = useProgrammeStore((st) => st.stopProgramme);
  const { session, biometricEnabled, setBiometricEnabled, logout, deleteAccount } = useAuthStore();
  const {
    profile,
    healthBackground,
    settings,
    tasks,
    activePlan,
    deviceEventIds,
    updateSettings,
    setDeviceEventIds,
  } = useAppStore();

  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteText, setDeleteText] = useState('');
  const [busy, setBusy] = useState(false);

  const initials = (profile.full_name || session?.email || 'S')
    .split(/\s+/)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const age = profile.dob ? ageFromDob(profile.dob) : null;
  const bmi =
    profile.height_cm && profile.weight_kg
      ? (profile.weight_kg / Math.pow(profile.height_cm / 100, 2)).toFixed(1)
      : null;

  const handleSyncCalendar = async () => {
    const res = await syncPlanToDeviceCalendar(tasks, activePlan?.retest_date, deviceEventIds);
    if (res.ok) setDeviceEventIds(res.eventIds);
    setStatusMsg(res.message);
  };

  const handleToggleBiometric = async (next: boolean) => {
    if (next) {
      const cap = await getBiometricCapability();
      if (!cap.available || !cap.enrolled) {
        setStatusMsg(cap.reason ?? 'Biometric lock requires Face ID or Fingerprint on a mobile device.');
        return;
      }
      const res = await authenticate('Enable Svastha biometric lock');
      if (!res.success) return;
    }
    setBiometricEnabled(next);
  };

  const handleExport = async () => {
    if (!session) return;
    const json = JSON.stringify(exportUserData(), null, 2);
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `svastha-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setStatusMsg('Exported your Svastha data as JSON.');
      return;
    }
    await Share.share({ message: json, title: 'Svastha Data Export' });
  };

  const handleDelete = async () => {
    if (deleteText.trim().toUpperCase() !== 'DELETE') {
      Alert.alert('Confirmation required', 'Please type DELETE to confirm permanent account deletion.');
      return;
    }
    setBusy(true);
    const res = await deleteAccount();
    setBusy(false);
    if (!res.ok) {
      setStatusMsg(res.error);
      return;
    }
    setDeleteOpen(false);
    router.replace('/(auth)/welcome');
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.title} accessibilityRole="header">
          Me & Settings
        </Text>

        {/* Profile Card */}
        <Card style={styles.profileCard}>
          <View style={styles.profileRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{profile.full_name || 'Complete your profile'}</Text>
              <Text style={styles.sub}>{session?.email ?? 'Demo session'}</Text>
              <Text style={styles.meta}>
                {[
                  age ? `${age} y` : null,
                  profile.city || null,
                  profile.diet_type,
                  bmi ? `BMI ${bmi}` : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
            </View>
          </View>
          {healthBackground.pregnant && (
            <View style={styles.noticeBox}>
              <Text style={styles.noticeText}>
                Pregnancy mode active: calorie deficits and supplements are paused.
              </Text>
            </View>
          )}
          <Button
            label="Edit Profile & Health Background"
            variant="secondary"
            onPress={() => router.push('/(auth)/profile-setup')}
            style={{ marginTop: tokens.space.md }}
          />
        </Card>

        {statusMsg && (
          <Card muted style={styles.statusBanner}>
            <Text style={styles.statusText}>{statusMsg}</Text>
          </Card>
        )}

        {/* Guided programme */}
        <SectionTitle style={styles.secHead}>8-Week Reset</SectionTitle>
        <Card style={styles.groupCard}>
          {programmeId ? (
            <>
              <SettingRow icon="star" title="Programme reminders" subtitle="Water, meals, sun, exercise, sleep nudges" right={<Toggle label="Programme reminders" value={programmeRemindersOn} onValueChange={setProgrammeRemindersOn} />} />
              <SettingRow icon="pill" title="Medicines & doctor checklist" subtitle="Add what your doctor prescribed" onPress={() => router.push('/programme/doctor')} />
              <SettingRow icon="refresh" title="Restart the programme" subtitle="Pick a new start date; ticks and weigh-ins are kept" onPress={() => router.push('/programme/setup')} />
              <SettingRow icon="logOut" title="Pause the programme" subtitle="Hides it from Today and stops its reminders" onPress={stopProgramme} danger last />
            </>
          ) : (
            <SettingRow icon="sparkles" title="Start the 8-Week Reset" subtitle="Daily routine, menu, home workouts, reminders" onPress={() => router.push('/programme/setup')} last />
          )}
        </Card>

        {/* Calendar & Reminders */}
        <SectionTitle style={styles.secHead}>Calendar & Reminders</SectionTitle>
        <Card style={styles.groupCard}>
          <SettingRow
            icon="calendar"
            title="Sync Plan to Device Calendar"
            subtitle={
              Platform.OS === 'web'
                ? 'Available on iOS & Android builds'
                : 'Writes routine & retest to your “Svastha” calendar'
            }
            onPress={handleSyncCalendar}
          />
          <SettingRow
            icon="bell"
            title="Notification Preferences"
            subtitle="Water, meals, medicines, quiet hours"
            onPress={() => router.push('/notifications')}
          />
          <SettingRow
            icon="clock"
            title="Daily Routine Builder"
            subtitle="Edit morning, workday & wind-down blocks"
            onPress={() => router.push('/routine')}
            last
          />
        </Card>

        {/* AI & App Preferences */}
        <SectionTitle style={styles.secHead}>AI & Preferences</SectionTitle>
        <Card style={styles.groupCard}>
          <SettingRow
            icon="sparkles"
            title="AI Meal Photo Analysis"
            subtitle={aiTransportLabel()}
            right={
              <Toggle
                label="AI Meal Photo Analysis"
                value={settings.aiMealPhotoAnalysis}
                onValueChange={(v) => updateSettings({ aiMealPhotoAnalysis: v })}
              />
            }
          />
          <SettingRow
            icon="utensils"
            title="AI Personalised Recipes"
            subtitle="Suggest Indian recipes tailored to your labs"
            right={
              <Toggle
                label="AI Personalised Recipes"
                value={settings.aiRecipeSuggestions}
                onValueChange={(v) => updateSettings({ aiRecipeSuggestions: v })}
              />
            }
          />
          <SettingRow
            icon="zap"
            title="Haptic Feedback"
            subtitle="Gentle tactile response on taps"
            right={
              <Toggle
                label="Haptic Feedback"
                value={settings.haptics}
                onValueChange={(v) => updateSettings({ haptics: v })}
              />
            }
            last
          />
        </Card>

        {/* Security & Privacy */}
        <SectionTitle style={styles.secHead}>Security & Privacy (DPDP Act 2023)</SectionTitle>
        <Card style={styles.groupCard}>
          <SettingRow
            icon="lock"
            title="Biometric App Lock"
            subtitle="Face ID / Fingerprint unlock"
            right={
              <Toggle
                label="Biometric App Lock"
                value={biometricEnabled}
                onValueChange={handleToggleBiometric}
              />
            }
          />
          <SettingRow
            icon="download"
            title="Export My Data"
            subtitle="Download all logs, reports & plans as JSON"
            onPress={handleExport}
          />
          <SettingRow
            icon="shield"
            title="Zero-Storage Media & Region"
            subtitle="ap-south-1 (Mumbai) · Photos & PDFs discarded after AI inference · 18+ verified"
            last
          />
        </Card>

        {/* Account Actions */}
        <View style={styles.actions}>
          <Button label="Log Out" variant="secondary" onPress={() => setLogoutOpen(true)} />
          <Button
            label="Delete My Account & Data"
            variant="danger"
            onPress={() => {
              setDeleteText('');
              setDeleteOpen(true);
            }}
          />
        </View>
      </ScrollView>

      {/* Logout Confirm Sheet */}
      <Sheet visible={logoutOpen} onClose={() => setLogoutOpen(false)} title="Log out of Svastha?">
        <Text style={styles.sheetBody}>
          Your local cache and scheduled notifications for this account will be cleared on this device.
        </Text>
        <View style={{ gap: tokens.space.sm, marginTop: tokens.space.md }}>
          <Button
            label="Log Out"
            onPress={async () => {
              setLogoutOpen(false);
              await logout();
              router.replace('/(auth)/welcome');
            }}
          />
          <Button label="Cancel" variant="secondary" onPress={() => setLogoutOpen(false)} />
        </View>
      </Sheet>

      {/* Delete Account Confirm Sheet */}
      <Sheet visible={deleteOpen} onClose={() => setDeleteOpen(false)} title="Delete account permanently?">
        <Text style={styles.sheetBody}>
          This permanently removes your profile, lab reports, plans, and meal logs. Type DELETE to confirm.
        </Text>
        <TextInput
          value={deleteText}
          onChangeText={setDeleteText}
          placeholder="Type DELETE"
          placeholderTextColor={tokens.color.inkMuted}
          autoCapitalize="characters"
          style={styles.deleteInput}
          accessibilityLabel="Type DELETE to confirm account deletion"
        />
        <View style={{ gap: tokens.space.sm, marginTop: tokens.space.md }}>
          <Button
            label={busy ? 'Deleting…' : 'Permanently Delete'}
            variant="danger"
            disabled={busy}
            onPress={handleDelete}
          />
          <Pressable onPress={() => setDeleteOpen(false)} style={styles.cancelLink}>
            <Text style={styles.cancelText}>Keep my account</Text>
          </Pressable>
        </View>
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: tokens.space.lg, paddingBottom: 120 },
  title: { ...tokens.type.h1, color: tokens.color.ink, marginBottom: tokens.space.md },
  profileCard: { marginBottom: tokens.space.md, padding: tokens.space.lg },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: tokens.space.md },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: tokens.color.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 20, fontWeight: '700', color: tokens.color.onAccent },
  name: { fontSize: 18, fontWeight: '700', color: tokens.color.ink },
  sub: { ...tokens.type.caption, color: tokens.color.inkMuted, marginTop: 2 },
  meta: { ...tokens.type.caption, color: tokens.color.accentText, fontWeight: '600', marginTop: 4 },
  noticeBox: {
    marginTop: tokens.space.sm,
    backgroundColor: tokens.color.watchBg,
    borderRadius: 12,
    padding: tokens.space.sm,
  },
  noticeText: { ...tokens.type.caption, color: tokens.color.watch, fontWeight: '600' },
  statusBanner: { marginBottom: tokens.space.md, padding: tokens.space.md },
  statusText: { ...tokens.type.caption, color: tokens.color.ink, fontWeight: '600' },
  secHead: { marginTop: tokens.space.sm, marginBottom: tokens.space.xs },
  groupCard: { marginBottom: tokens.space.md, paddingVertical: tokens.space.xs, paddingHorizontal: tokens.space.md },
  actions: { gap: tokens.space.sm, marginTop: tokens.space.sm },
  sheetBody: { ...tokens.type.body, color: tokens.color.inkMuted },
  deleteInput: {
    marginTop: tokens.space.md,
    borderWidth: 1,
    borderColor: tokens.color.border,
    borderRadius: tokens.radius.input,
    paddingHorizontal: tokens.space.md,
    height: 48,
    ...tokens.type.body,
    color: tokens.color.ink,
    backgroundColor: tokens.color.bg,
  },
  cancelLink: { alignItems: 'center', paddingVertical: 10 },
  cancelText: { ...tokens.type.label, color: tokens.color.inkMuted, fontWeight: '600' },
});