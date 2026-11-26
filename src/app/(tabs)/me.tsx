import React, { useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { tokens } from '@/theme/tokens';
import { useAuthStore } from '@/store/useAuthStore';
import { useAppStore } from '@/store/useAppStore';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { syncPlanTasksToDeviceCalendar } from '@/lib/calendarSync';

export default function MeScreen() {
  const { profile, biometricEnabled, toggleBiometric, logout } = useAuthStore();
  const { tasksToday, activePlan } = useAppStore();
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const handleSyncCalendar = async () => {
    const res = await syncPlanTasksToDeviceCalendar(tasksToday, activePlan?.retest_date);
    setSyncMessage(`Synced ${res.syncedCount} events to the Svastha device calendar.`);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Me & Settings</Text>

        <Card style={styles.mb}>
          <Text style={styles.h2}>{profile.full_name}</Text>
          <Text style={styles.caption}>
            {profile.city} · {profile.diet_type} · {profile.height_cm} cm · {profile.weight_kg} kg
          </Text>
          <Button
            label="Edit Profile & Health Background"
            variant="secondary"
            onPress={() => router.push('/(auth)/profile-setup')}
            style={{ marginTop: 12 }}
          />
        </Card>

        <Card style={styles.mb}>
          <Text style={styles.h2}>Calendar & Reminders</Text>
          <Button label="Sync Plan to Device Calendar" onPress={handleSyncCalendar} />
          {syncMessage && <Text style={styles.caption}>{syncMessage}</Text>}
          <Button
            label="Notification Preferences"
            variant="secondary"
            onPress={() => router.push('/notifications')}
            style={{ marginTop: 10 }}
          />
        </Card>

        <Card style={styles.mb}>
          <Text style={styles.h2}>Security & Privacy (DPDP Act 2023)</Text>
          <View style={styles.rowBetween}>
            <Text style={styles.body}>Biometric App Lock (Face ID / Fingerprint)</Text>
            <Switch value={biometricEnabled} onValueChange={toggleBiometric} />
          </View>
          <Text style={styles.caption}>
            Region: Mumbai (ap-south-1) · Zero-storage media policy active · 18+ verified
          </Text>
        </Card>

        <View style={{ gap: 10 }}>
          <Button
            label="Log Out"
            variant="secondary"
            onPress={async () => {
              await logout();
              router.replace('/(auth)/welcome');
            }}
          />
          <Button
            label="Delete My Account & Data"
            variant="danger"
            onPress={() => setSyncMessage('Account deletion requires typing DELETE in confirmation modal.')}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: tokens.color.bg },
  scroll: { padding: tokens.space.lg, paddingBottom: 110 },
  title: { ...tokens.type.h1, color: tokens.color.ink, marginBottom: tokens.space.md },
  h2: { ...tokens.type.h2, color: tokens.color.ink, marginBottom: tokens.space.xs },
  body: { ...tokens.type.body, color: tokens.color.ink },
  caption: { ...tokens.type.caption, color: tokens.color.inkMuted, marginTop: 6 },
  mb: { marginBottom: tokens.space.md },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 8 },
});
