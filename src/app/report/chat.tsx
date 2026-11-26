import React, { useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { tokens } from '@/theme/tokens';
import { useAppStore } from '@/store/useAppStore';
import { Icon } from '@/components/Icon';
import { DisclaimerFooter } from '@/components/DisclaimerFooter';
import { Screen, ScreenHeader, ui } from '@/components/ui';
import { callAi } from '@/lib/ai';
import { answerLocally, buildChatContext, guardQuestion, suggestedQuestions } from '@/engine/reportChat';
import { useDailyTargets, useDayTotals } from '@/hooks/useHealthData';

interface Msg {
  role: 'user' | 'assistant';
  text: string;
  source?: 'ai' | 'local' | 'safety';
}

/** "Ask about this report" — grounded in the user's own latest report and plan. */
export default function ReportChatScreen() {
  const reports = useAppStore((s) => s.reports);
  const plan = useAppStore((s) => s.activePlan);
  const totals = useDayTotals();
  const targets = useDailyTargets();
  const report = reports[0];
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  // Greeting is derived (not initial state) so it is correct once stored data finishes loading.
  const greeting: Msg = {
    role: 'assistant',
    text: report
      ? `Hi! I’ve read your ${report.lab_name} report (${report.values.length} values). Ask me what any value means, what may help, or what to ask your doctor. I can’t diagnose or advise on medicine doses.`
      : 'Import a lab report first (Scan → Lab report) and I’ll explain each value in plain language.',
    source: 'local',
  };
  const [thread, setMessages] = useState<Msg[]>([]);
  const messages = [greeting, ...thread];

  const send = async (raw?: string) => {
    const q = (raw ?? input).trim();
    if (!q || busy) return;
    setInput('');
    const history = messages.slice(-6).map((m) => ({ role: m.role, text: m.text }));
    setMessages((m) => [...m, { role: 'user', text: q }]);
    const guard = guardQuestion(q);
    if (guard.blocked) {
      setMessages((m) => [...m, { role: 'assistant', text: guard.reply, source: 'safety' }]);
      return;
    }
    setBusy(true);
    const res = await callAi<{ reply: string }>('report-chat', {
      question: q,
      history,
      context: buildChatContext(report, plan, { today: { eaten: totals, targets } }),
    });
    setBusy(false);
    const reply = res.ok && res.data.reply ? { text: res.data.reply, source: 'ai' as const } : { text: answerLocally(q, report, plan), source: 'local' as const };
    setMessages((m) => [...m, { role: 'assistant', ...reply }]);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
  };

  return (
    <Screen>
      <ScreenHeader title="Ask about your report" subtitle={report ? report.lab_name : undefined} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView ref={scrollRef} contentContainerStyle={[ui.scroll, { paddingBottom: 24 }]} onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}>
          {messages.map((m, i) => (
            <View key={i} style={[styles.bubble, m.role === 'user' ? styles.user : styles.bot]}>
              <Text style={[ui.body, m.role === 'user' && { color: tokens.color.white }]}>{m.text}</Text>
              {m.role === 'assistant' && i > 0 && (
                <Text style={styles.source}>{m.source === 'ai' ? 'AI answer from your report' : m.source === 'safety' ? 'Safety rule' : 'From your report (offline)'}</Text>
              )}
            </View>
          ))}
          {busy && <ActivityIndicator color={tokens.color.accentText} style={{ alignSelf: 'flex-start', margin: 12 }} />}
          {messages.length === 1 && report && (
            <View style={{ gap: 8, marginTop: 8 }}>
              {suggestedQuestions(report).map((q) => (
                <Pressable key={q} onPress={() => send(q)} style={styles.suggest} accessibilityRole="button">
                  <Icon name="sparkles" size={14} color={tokens.color.accentText} />
                  <Text style={[ui.label, { flex: 1 }]}>{q}</Text>
                </Pressable>
              ))}
            </View>
          )}
          <DisclaimerFooter />
        </ScrollView>
        <View style={styles.inputRow}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Ask about ALT, HDL, sugar…"
            placeholderTextColor={tokens.color.inkMuted}
            style={styles.input}
            onSubmitEditing={() => send()}
            returnKeyType="send"
            accessibilityLabel="Your question"
          />
          <Pressable onPress={() => send()} style={styles.send} accessibilityRole="button" accessibilityLabel="Send question" disabled={busy}>
            <Icon name="send" size={18} color={tokens.color.white} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  bubble: { maxWidth: '86%', padding: 14, borderRadius: 22, marginBottom: 10 },
  bot: { alignSelf: 'flex-start', backgroundColor: tokens.color.glassStrong, borderWidth: 1, borderColor: tokens.color.glassBorder, borderBottomLeftRadius: 6 },
  user: { alignSelf: 'flex-end', backgroundColor: tokens.color.ink, borderBottomRightRadius: 6 },
  source: { ...tokens.type.micro, color: tokens.color.inkMuted, marginTop: 6 },
  suggest: { flexDirection: 'row', gap: 8, alignItems: 'center', padding: 12, borderRadius: 16, backgroundColor: tokens.color.accentSoft, minHeight: 44 },
  inputRow: { flexDirection: 'row', gap: 8, padding: 12, paddingBottom: 24, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: tokens.color.border, backgroundColor: tokens.color.glassStrong },
  input: { flex: 1, minHeight: 48, borderRadius: 24, paddingHorizontal: 16, backgroundColor: tokens.color.white, borderWidth: 1, borderColor: tokens.color.border, color: tokens.color.ink, fontSize: 16 },
  send: { width: 48, height: 48, borderRadius: 24, backgroundColor: tokens.color.ink, alignItems: 'center', justifyContent: 'center' },
});
