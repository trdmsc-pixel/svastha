import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { tokens } from '@/theme/tokens';
import { useAppStore } from '@/store/useAppStore';
import { useScanLauncher } from '@/store/useScanLauncher';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { StatusChip } from '@/components/Chip';
import { RedFlagBanner } from '@/components/RedFlagBanner';
import { RangeBar } from '@/components/RangeBar';
import { DisclaimerFooter } from '@/components/DisclaimerFooter';
import { Icon } from '@/components/Icon';
import { Sheet } from '@/components/Sheet';
import { EmptyState, Pill, Screen, SectionTitle, ui } from '@/components/ui';
import { compareReports } from '@/engine/biomarkerEngine';

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

export default function HealthScreen() {
  const { reports, activePlan, loadSampleReport, importFollowUpSampleReport, buildPlanForReport, deleteReport } = useAppStore();
  const [idx, setIdx] = useState(0);
  const [showOk, setShowOk] = useState(false);
  const [whyFor, setWhyFor] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const i = Math.min(idx, Math.max(0, reports.length - 1));
  const report = reports[i];
  const previous = reports[i + 1];
  const comparison = report && previous ? compareReports(previous.values, report.values) : null;
  const sum = report?.summary;
  const importReport = () => {
    useScanLauncher.getState().request('report');
    router.navigate('/(tabs)/scan');
  };

  if (!report) {
    return (
      <Screen>
        <ScrollView contentContainerStyle={ui.scroll}>
          <Text style={[ui.h1, { marginTop: 12 }]}>Health</Text>
          <Card style={{ marginTop: 16 }}>
            <EmptyState icon="report" title="No lab report yet" body="Import a PDF or photos of your report. You’ll get a clear summary, red-flag checks and a personal plan with a retest date.">
              <Button label="Import lab report" icon="upload" onPress={importReport} style={{ marginTop: 16, alignSelf: 'stretch' }} />
              <Button label="Try a sample report" variant="ghost" icon="sparkles" onPress={() => buildPlanForReport(loadSampleReport().id)} />
            </EmptyState>
          </Card>
        </ScrollView>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={ui.scroll} showsVerticalScrollIndicator={false}>
        <View style={[ui.between, { marginTop: 12 }]}>
          <Text style={ui.h1}>Health</Text>
          <Button label="Import" icon="upload" compact variant="secondary" onPress={importReport} />
        </View>

        {reports.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }} contentContainerStyle={{ gap: 8 }}>
            {reports.map((r, k) => (
              <Pressable key={r.id} onPress={() => setIdx(k)} style={[styles.repChip, k === i && styles.repChipOn]} accessibilityRole="tab" accessibilityState={{ selected: k === i }}>
                <Text style={[ui.label, { fontWeight: '700' }, k === i && { color: tokens.color.white }]}>{fmtDate(r.collected_at)}</Text>
                <Text style={[ui.muted, k === i && { color: '#DDD' }]} numberOfLines={1}>{r.lab_name}</Text>
              </Pressable>
            ))}
          </ScrollView>
        )}

        <Card style={{ marginTop: 14 }}>
          <View style={ui.between}>
            <View style={{ flex: 1 }}>
              <Text style={ui.micro}>{report.lab_name}</Text>
              <Text style={ui.muted}>Collected {fmtDate(report.collected_at)} · {report.values.length} values · {report.source_type.toUpperCase()}</Text>
            </View>
            <Pressable onPress={() => setConfirmDelete(true)} accessibilityRole="button" accessibilityLabel="Delete this report" hitSlop={10}>
              <Icon name="trash" size={18} color={tokens.color.inkMuted} />
            </Pressable>
          </View>
          <Text style={[ui.body, { marginTop: 10 }]}>{sum?.snapshot_sentence}</Text>
          {sum && (
            <View style={styles.counters}>
              {([['risk', 'Needs attention', 'alert'], ['watch', 'Watch', 'eye'], ['ok', 'Normal', 'check']] as const).map(([k, label, icon]) => (
                <View key={k} style={[styles.counter, { backgroundColor: tokens.color[`${k}Bg`] }]}>
                  <Icon name={icon} size={16} color={tokens.color[k]} />
                  <Text style={[styles.counterNum, { color: tokens.color[k] }]}>{sum.counts[k]}</Text>
                  <Text style={[styles.counterLabel, { color: tokens.color[k] }]}>{label}</Text>
                </View>
              ))}
            </View>
          )}
        </Card>

        {sum && sum.red_flags.length > 0 && <View style={{ marginTop: 14 }}><RedFlagBanner alerts={sum.red_flags} /></View>}

        {comparison && (
          <Card style={{ marginTop: 14 }}>
            <View style={[ui.row, { gap: 8 }]}><Icon name="trendingUp" color={tokens.color.ok} /><Text style={ui.h3}>Since {fmtDate(previous!.collected_at)}</Text></View>
            <Text style={[ui.body, { color: tokens.color.ok, fontWeight: '700', marginTop: 4 }]}>{comparison.headline}</Text>
            {comparison.items.filter((c) => c.direction !== 'unchanged').map((c) => (
              <View key={c.biomarker_code} style={[ui.between, { marginTop: 8 }]}>
                <Text style={[ui.label, { flex: 1 }]}>{c.display_name}</Text>
                <Pill icon={c.direction === 'improved' ? 'trendingUp' : 'trendingDown'} tone={c.direction === 'improved' ? 'ok' : 'risk'} label={`${c.previous_value} → ${c.current_value} ${c.unit}`} />
              </View>
            ))}
          </Card>
        )}

        {sum?.risk_groups.map((g) => (
          <Card key={g.system} style={{ marginTop: 14 }}>
            <View style={ui.between}>
              <Text style={ui.h2}>{g.system}</Text>
              <Pressable onPress={() => setWhyFor(whyFor === g.system ? null : g.system)} accessibilityRole="button" hitSlop={10}>
                <Text style={ui.accent}>{whyFor === g.system ? 'Hide' : 'Why?'}</Text>
              </Pressable>
            </View>
            {whyFor === g.system && <Text style={[ui.muted, styles.why]}>{g.why_rule}</Text>}
            {g.markers.map((m) => (
              <View key={m.biomarker_code} style={styles.marker}>
                <View style={ui.between}>
                  <Text style={[ui.body, { fontWeight: '700', flex: 1 }]}>{m.display_name}</Text>
                  <StatusChip status={m.status} />
                </View>
                <Text style={ui.muted}>{m.value} {m.unit} · lab range {m.ref_raw}{m.severity > 1 ? ` · ${m.severity.toFixed(2)}× upper limit` : ''}</Text>
                <RangeBar item={m} />
              </View>
            ))}
            <Text style={[ui.label, { marginTop: 10, fontWeight: '700' }]}>What may help</Text>
            {g.what_helps.map((w) => <Text key={w} style={[ui.label, { marginTop: 4 }]}>• {w}</Text>)}
          </Card>
        ))}

        {sum?.patterns.map((p) => (
          <Card key={p.rule_id} variant="muted" style={{ marginTop: 14 }}>
            <Text style={ui.micro}>Cross-marker pattern</Text>
            <Text style={ui.h3}>{p.title}</Text>
            <Text style={ui.label}>{p.insight}</Text>
          </Card>
        ))}

        {sum && sum.doctor_points.length > 0 && (
          <>
            <SectionTitle>Ask your doctor</SectionTitle>
            <Card>
              {sum.doctor_points.map((pt) => <Text key={pt} style={[ui.label, { marginBottom: 8 }]}>• {pt}</Text>)}
              {sum.followup_tests_from_lab_notes.length > 0 && <Text style={ui.muted}>Follow-up tests noted by the lab (your doctor decides): {sum.followup_tests_from_lab_notes.join(', ')}</Text>}
            </Card>
          </>
        )}

        <Card style={{ marginTop: 14 }}>
          <Pressable onPress={() => setShowOk(!showOk)} style={ui.between} accessibilityRole="button" accessibilityState={{ expanded: showOk }}>
            <Text style={ui.h3}>In range ({sum?.ok_markers.length ?? 0})</Text>
            <Icon name={showOk ? 'chevronUp' : 'chevronDown'} />
          </Pressable>
          {showOk && sum?.ok_markers.map((m) => (
            <View key={m.biomarker_code} style={[ui.between, { marginTop: 8 }]}>
              <Text style={[ui.label, { flex: 1 }]}>{m.display_name}</Text>
              <Text style={ui.muted}>{m.value} {m.unit}</Text>
            </View>
          ))}
        </Card>

        <View style={{ gap: 10, marginTop: 16 }}>
          <Button label={activePlan?.report_id === report.id ? 'Refresh my plan from this report' : 'Build my plan from this report'} icon="star" onPress={() => { buildPlanForReport(report.id); router.navigate('/(tabs)/plan'); }} />
          <Button label="Ask about this report" icon="message" variant="secondary" onPress={() => router.push('/report/chat')} />
          {report.is_sample && !reports.some((r) => r.id === 'sample-followup-002') && (
            <Button label="Preview a 12-week retest (sample)" icon="refresh" variant="ghost" onPress={() => { importFollowUpSampleReport(); setIdx(0); }} />
          )}
        </View>
        <DisclaimerFooter />
      </ScrollView>

      <Sheet visible={confirmDelete} onClose={() => setConfirmDelete(false)} title="Delete this report?" subtitle="Its values and any plan built from it will be removed from this device.">
        <Button label="Delete report" variant="danger" icon="trash" onPress={() => { deleteReport(report.id); setIdx(0); setConfirmDelete(false); }} />
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  repChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, backgroundColor: tokens.color.glassStrong, borderWidth: 1, borderColor: tokens.color.border, maxWidth: 180 },
  repChipOn: { backgroundColor: tokens.color.ink, borderColor: tokens.color.ink },
  counters: { flexDirection: 'row', gap: 8, marginTop: 14 },
  counter: { flex: 1, borderRadius: 18, padding: 10, alignItems: 'center' },
  counterNum: { fontSize: 26, fontWeight: '800', fontVariant: ['tabular-nums'] },
  counterLabel: { fontSize: 12, fontWeight: '700', textAlign: 'center' },
  marker: { marginTop: 12, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: tokens.color.border },
  why: { backgroundColor: tokens.color.surfaceMuted, padding: 10, borderRadius: 12, marginTop: 8 },
});
