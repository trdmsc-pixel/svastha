import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { tokens } from '@/theme/tokens';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { DisclaimerFooter } from '@/components/DisclaimerFooter';

interface ChatMsg {
  role: 'user' | 'assistant';
  text: string;
}

export default function ReportChatScreen() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      role: 'assistant',
      text: 'Ask me anything about your lab values, reference ranges, or wellness plan. I cannot diagnose or advise on medication doses — please confirm medical decisions with your doctor.',
    },
  ]);

  const send = () => {
    const q = input.trim();
    if (!q) return;
    const lower = q.toLowerCase();
    const reply =
      lower.includes('dose') || lower.includes('statin') || lower.includes('medicine')
        ? 'I cannot recommend starting, stopping, or changing any medication or dose. Based on your report (LDL 106.9 mg/dL, ref <100), this is a great question to ask your doctor — your lab note mentions discussing a >= 3-month lifestyle approach first for low-risk profiles.'
        : 'Based on your latest report, ALT (99.8 U/L vs <50), AST (57.6 U/L vs <50), HDL (29.1 mg/dL vs >40), LDL (106.9 mg/dL vs <100), and Non-HDL (132 mg/dL vs <130) are the focus markers for your 12-week lifestyle plan.';

    setMessages((m) => [...m, { role: 'user', text: q }, { role: 'assistant', text: reply }]);
    setInput('');
  };

  return (
    <ScrollView style={styles.safe} contentContainerStyle={styles.scroll}>
      {messages.map((m, i) => (
        <Card key={i} muted={m.role === 'user'} style={styles.mb}>
          <Text style={styles.role}>{m.role === 'user' ? 'You' : 'Svastha'}</Text>
          <Text style={styles.body}>{m.text}</Text>
        </Card>
      ))}
      <View style={styles.inputRow}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Ask about ALT, HDL, or your 12-week targets..."
          style={styles.input}
        />
        <Button label="Ask" onPress={send} />
      </View>
      <DisclaimerFooter />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: tokens.color.bg },
  scroll: { padding: tokens.space.lg },
  mb: { marginBottom: tokens.space.sm },
  role: { ...tokens.type.caption, color: tokens.color.accentText, fontWeight: '700', marginBottom: 2 },
  body: { ...tokens.type.body, color: tokens.color.ink },
  inputRow: { flexDirection: 'row', gap: 8, marginTop: tokens.space.md },
  input: { flex: 1, backgroundColor: tokens.color.surface, borderRadius: tokens.radius.input, paddingHorizontal: 14, minHeight: 48, borderWidth: 1, borderColor: tokens.color.border },
});
