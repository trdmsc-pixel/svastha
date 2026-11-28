import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { tokens } from '@/theme/tokens';
import { Card } from '@/components/Card';
import { Icon } from '@/components/Icon';
import { Banner, Screen, ScreenHeader, SectionTitle, Toggle, ui, useScrollBottomPad } from '@/components/ui';
import { RESET_8 } from '@/programme/reset8';
import { ConditionFlag } from '@/programme/types';
import { retestPlan } from '@/engine/programmeEngine';
import { getProgramme } from '@/hooks/useProgramme';
import { useProgrammeStore } from '@/store/useProgrammeStore';
import { friendlyDayLabel, longDate, todayKey } from '@/lib/dates';
import { haptic } from '@/lib/haptics';

const MEDS: Array<{ flag: ConditionFlag; label: string; when: string }> = [
  { flag: 'thyroid', label: 'Thyroid tablet', when: '8:00 AM, empty stomach, plain water. Tea and food after 9.' },
  { flag: 'b12', label: 'Vitamin B12', when: 'With lunch (or injections as the doctor says)' },
  { flag: 'vitaminD', label: 'Vitamin D (weekly)', when: 'Every Sunday with lunch, in milk or with a little ghee' },
  { flag: 'calcium', label: 'Calcium / iron', when: '3:00 PM, at least 4 hours after the thyroid tablet' },
  { flag: 'folic', label: 'Folic acid', when: '7:00 PM, or as the gynaecologist says' },
];

function CheckRow({ checked, title, detail, tag, onPress }: { checked: boolean; title: string; detail?: string; tag?: string; onPress: () => void }) {
  return (
    <Pressable onPress={() => { haptic[checked ? 'tap' : 'success'](); onPress(); }} accessibilityRole="checkbox" accessibilityState={{ checked }} accessibilityLabel={title} style={styles.checkRow}>
      <View style={[styles.box, checked && styles.boxOn]}>{checked ? <Icon name="check" size={16} color="#fff" strokeWidth={3} /> : null}</View>
      <View style={{ flex: 1 }}>
        {tag ? <Text style={styles.tag}>{tag}</Text> : null}
        <Text style={[styles.title, checked && styles.done]}>{title}</Text>
        {detail ? <Text style={styles.detail}>{detail}</Text> : null}
      </View>
    </Pressable>
  );
}

export default function DoctorScreen() {
  const bottomPad = useScrollBottomPad();
  const st = useProgrammeStore();
  const p = getProgramme(st.programmeId) ?? RESET_8;
  const retests = retestPlan(st.startDate ?? todayKey(), st.medicines.thyroid.startedOn ?? null, st.medicines.vitaminD.startedOn ?? null);
  const done = st.doctorDone.filter((d) => p.doctor.some((x) => x.id === d)).length;

  return (
    <Screen>
      <ScreenHeader title="Doctor" subtitle={`${done} of ${p.doctor.length} steps done`} />
      <ScrollView contentContainerStyle={[ui.scroll, { paddingBottom: bottomPad }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Banner text="Do these first. Fixing the thyroid, B12 and Vitamin D before pregnancy gives the best start." />

        <SectionTitle>Steps</SectionTitle>
        <Card>
          {p.doctor.map((d, i) => (
            <Animated.View key={d.id} entering={FadeInDown.delay(i * 50).duration(350)}>
              <CheckRow checked={st.doctorDone.includes(d.id)} title={d.title} detail={d.detail} tag={d.when} onPress={() => st.toggleDoctor(d.id)} />
            </Animated.View>
          ))}
        </Card>

        <SectionTitle>My medicines</SectionTitle>
        <Text style={[ui.muted, { marginBottom: 8, fontSize: 14 }]}>Switch one on only after a doctor prescribes it. It then appears in your day with a reminder at the right time.</Text>
        {MEDS.map((m) => {
          const e = st.medicines[m.flag];
          return (
            <Card key={m.flag} variant={e.on ? 'glow' : 'glass'} style={{ marginBottom: 10 }}>
              <View style={ui.between}>
                <View style={{ flex: 1, marginRight: 10 }}>
                  <Text style={styles.medName}>💊 {m.label}</Text>
                  <Text style={styles.detail}>{m.when}</Text>
                </View>
                <Toggle label={`${m.label} prescribed`} value={e.on} onValueChange={(v) => st.setMedicine(m.flag, { on: v })} />
              </View>
              {e.on ? (
                <Animated.View entering={FadeIn.duration(250)}>
                  <TextInput
                    value={e.name}
                    onChangeText={(t) => st.setMedicine(m.flag, { name: t })}
                    placeholder="Name & dose from the prescription"
                    placeholderTextColor={tokens.color.inkMuted}
                    style={styles.input}
                    accessibilityLabel={`${m.label} name and dose`}
                  />
                  {e.startedOn ? <Text style={[ui.muted, { marginTop: 6 }]}>Started {friendlyDayLabel(e.startedOn)}</Text> : null}
                </Animated.View>
              ) : null}
            </Card>
          );
        })}

        <SectionTitle>Re-test calendar</SectionTitle>
        <Card>
          {retests.map((r, i) => (
            <View key={r.id} style={[styles.retest, i > 0 && styles.sep]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{r.label}</Text>
                <Text style={styles.detail}>{r.note}</Text>
              </View>
              <Text style={styles.date}>{r.date ? longDate(r.date).replace(/^\w+, /, '') : 'Not set'}</Text>
            </View>
          ))}
          <Text style={[ui.muted, { marginTop: 8 }]}>Green light for a baby: TSH 0.5–2.5, B12 and Vitamin D corrected, and the gynaecologist says yes.</Text>
        </Card>

        <SectionTitle>Ask the doctor</SectionTitle>
        <Card>
          {p.doctorQuestions.map((q) => (
            <CheckRow key={q} checked={st.questionsDone.includes(q)} title={q} onPress={() => st.toggleQuestion(q)} />
          ))}
        </Card>

        <SectionTitle>See a doctor the same day if</SectionTitle>
        <Card style={{ backgroundColor: tokens.color.riskBg }}>
          {p.redFlags.map((f) => (
            <View key={f} style={{ flexDirection: 'row', gap: 10, alignItems: 'center', paddingVertical: 6 }}>
              <Icon name="alert" size={18} color={tokens.color.risk} />
              <Text style={[styles.title, { color: tokens.color.risk, fontSize: 15.5 }]}>{f}</Text>
            </View>
          ))}
        </Card>
        <Text style={[ui.muted, { marginTop: 12, textAlign: 'center' }]}>Svastha supports your doctor’s treatment. It does not replace it.</Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  checkRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', paddingVertical: 10, minHeight: 52 },
  box: { width: 30, height: 30, borderRadius: 10, borderWidth: 2.5, borderColor: tokens.color.segmentEmptyStroke, alignItems: 'center', justifyContent: 'center', marginTop: 2, backgroundColor: '#fff' },
  boxOn: { backgroundColor: tokens.color.ok, borderColor: tokens.color.ok },
  tag: { fontSize: 11.5, fontWeight: '800', color: tokens.color.accentText, letterSpacing: 0.8, textTransform: 'uppercase' },
  title: { fontSize: 16, fontWeight: '700', color: tokens.color.ink, lineHeight: 21 },
  done: { color: tokens.color.inkMuted, textDecorationLine: 'line-through' },
  detail: { fontSize: 13.5, color: tokens.color.inkMuted, lineHeight: 19, marginTop: 2 },
  medName: { fontSize: 17, fontWeight: '800', color: tokens.color.ink },
  input: { marginTop: 12, minHeight: 48, borderRadius: 16, borderWidth: 1, borderColor: tokens.color.border, backgroundColor: 'rgba(255,255,255,0.9)', paddingHorizontal: 14, fontSize: 15.5, color: tokens.color.ink },
  retest: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 10 },
  sep: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: tokens.color.border },
  date: { fontSize: 14.5, fontWeight: '800', color: tokens.color.accentText, textAlign: 'right', maxWidth: 130 },
});
