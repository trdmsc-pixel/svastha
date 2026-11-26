import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { tokens } from '@/theme/tokens';
import { Button } from '@/components/Button';
import { useAuthStore } from '@/store/useAuthStore';

export default function LoginScreen() {
  const [email, setEmail] = useState('demo@svastha.app');
  const [password, setPassword] = useState('');
  const { signInDemo } = useAuthStore();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>Welcome Back</Text>
        <Text style={styles.label}>Email</Text>
        <TextInput value={email} onChangeText={setEmail} style={styles.input} accessibilityLabel="Email" />
        <Text style={styles.label}>Password</Text>
        <TextInput value={password} onChangeText={setPassword} secureTextEntry style={styles.input} accessibilityLabel="Password" />
        <Button
          label="Log In"
          onPress={() => {
            signInDemo(email);
            router.replace('/(tabs)');
          }}
          style={{ marginTop: 20 }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: tokens.color.bg },
  container: { padding: tokens.space.xl },
  title: { ...tokens.type.h1, color: tokens.color.ink, marginBottom: tokens.space.lg },
  label: { ...tokens.type.label, color: tokens.color.ink, marginTop: tokens.space.md, marginBottom: 4 },
  input: { backgroundColor: tokens.color.surface, borderRadius: tokens.radius.input, minHeight: 48, paddingHorizontal: 14, borderWidth: 1, borderColor: tokens.color.border, color: tokens.color.ink },
});
