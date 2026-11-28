import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { tokens } from '@/theme/tokens';
import { useScrollBottomPad } from '@/components/ui';
import { useAppStore } from '@/store/useAppStore';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { StatusChip } from '@/components/Chip';
import { RedFlagBanner } from '@/components/RedFlagBanner';
import { RangeBar } from '@/components/RangeBar';
import { DisclaimerFooter } from '@/components/DisclaimerFooter';
import { compareReports } from '@/engine/biomarkerEngine';

export default function HealthScreen() {
  const bottomPad = useScrollBottomPad();
  const { reports, loadSampleReport, importFollowUpSampleReport, buildPlanForReport } = useAppStore();
  const [showOk, setShowOk] = useState(false);
  const [whyText, setWhyText] = useState<string | null>(null);

  const latest = reports[0];
  const previous = reports[1];
  const comparison = latest && previous ? compareReports(previous.values, latest.values) : null;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: bottomPad }]}>
        <Text style={styles.title}>Health & Reports</Text>

        {!latest ? (
          <Card>
            <Text style={styles.h2}>No lab report yet</Text>
            <Text style={styles.body}>
              Import a PDF or photo of your lab report to get a clear summary and personal plan.
            </Text>
            <Button label="Try with a sample report" onPress={() => loadSampleReport()} style={{ marginTop: 16 }} />
          </Card>
        ) : (
          <>
            <Card style={styles.mb}>
              <Text style={styles.caption}>{latest.lab_name}</Text>
              <Text style={styles.h2}>Report Summary</Text>
              <Text style={styles.body}>{latest.summary?.snapshot_sentence}</Text>

              {latest.summary && (
                <View style={styles.counterRow}>
                  <View style={[styles.counterBox, { backgroundColor: tokens.color.riskBg }]}>
                    <Text style={[styles.counterNum, { color: tokens.color.risk }]}>
                      {latest.summary.counts.risk}
                    </Text>
                    <Text style={[styles.counterLabel, { color: tokens.color.risk }]}>Needs attention</Text>
                  </View>
                  <View style={[styles.counterBox, { backgroundColor: tokens.color.watchBg }]}>
                    <Text style={[styles.counterNum, { color: tokens.color.watch }]}>
                      {latest.summary.counts.watch}
                    </Text>
                    <Text style={[styles.counterLabel, { color: tokens.color.watch }]}>Watch</Text>
                  </View>
                  <View style={[styles.counterBox, { backgroundColor: tokens.color.okBg }]}>
                    <Text style={[styles.counterNum, { color: tokens.color.ok }]}>
                      {latest.summary.counts.ok}
                    </Text>
                    <Text style={[styles.counterLabel, { color: tokens.color.ok }]}>Normal</Text>
                  </View>
                </View>
              )}
            </Card>

            {latest.summary && <RedFlagBanner alerts={latest.summary.red_flags} />}

            {/* Report-to-report comparison */}
            {comparison && (
              <Card style={styles.mb}>
                <Text style={styles.h2}>Comparison vs Previous Report</Text>
                <Text style={[styles.body, { color: tokens.color.ok, fontWeight: '700' }]}>
                  {comparison.headline}
                </Text>
                {comparison.items
                  .filter((i) => i.delta !== 0)
                  .map((item) => (
                    <View key={item.biomarker_code} style={styles.rowBetween}>
                      <Text style={styles.body}>{item.display_name}</Text>
                      <Text style={styles.caption}>
                        {item.previous_value} → {item.current_value} {item.unit} ({item.direction})
                      </Text>
                    </View>
                  ))}
              </Card>
            )}

            {/* Risk Groups */}
            {latest.summary?.risk_groups.map((group) => (
              <Card key={group.system} style={styles.mb}>
                <View style={styles.rowBetween}>
                  <Text style={styles.h2}>{group.system}</Text>
                  <Pressable
                    onPress={() => setWhyText(group.why_rule)}
                    accessibilityRole="button"
                    accessibilityLabel={`Why for ${group.system}`}
                  >
                    <Text style={styles.whyLink}>Why?</Text>
                  </Pressable>
                </View>
                <Text style={styles.body}>{group.explanation}</Text>

                {group.markers.map((m) => (
                  <View key={m.biomarker_code} style={styles.markerBlock}>
                    <View style={styles.rowBetween}>
                      <Text style={styles.markerName}>{m.display_name}</Text>
                      <StatusChip status={m.status} />
                    </View>
                    <Text style={styles.markerVal}>
                      {m.value} {m.unit}  (Ref: {m.ref_raw})
                    </Text>
                    <RangeBar item={m} />
                  </View>
                ))}
              </Card>
            ))}

            {/* Cross-marker patterns */}
            {latest.summary?.patterns.map((p) => (
              <Card key={p.rule_id} style={styles.mb}>
                <Text style={styles.caption}>CROSS-MARKER PATTERN</Text>
                <Text style={styles.h2}>{p.title}</Text>
                <Text style={styles.body}>{p.insight}</Text>
              </Card>
            ))}

            {/* Ask Your Doctor */}
            {latest.summary && (
              <Card style={styles.mb}>
                <Text style={styles.h2}>Ask Your Doctor</Text>
                {latest.summary.doctor_points.map((pt, idx) => (
                  <Text key={idx} style={styles.bullet}>
                    • {pt}
                  </Text>
                ))}
                <Text style={[styles.caption, { marginTop: 8 }]}>
                  Follow-up tests noted by lab (for your doctor to decide):{' '}
                  {latest.summary.followup_tests_from_lab_notes.join(', ')}
                </Text>
              </Card>
            )}

            {/* Collapsible In-Range Markers */}
            <Card style={styles.mb}>
              <Pressable
                onPress={() => setShowOk((v) => !v)}
                accessibilityRole="button"
                accessibilityLabel="Toggle normal in-range values"
                style={styles.rowBetween}
              >
                <Text style={styles.h2}>
                  What’s okay ({latest.summary?.ok_markers.length ?? 0})
                </Text>
                <Text style={styles.whyLink}>{showOk ? 'Hide' : 'Show'}</Text>
              </Pressable>
              {showOk &&
                latest.summary?.ok_markers.map((m) => (
                  <View key={m.biomarker_code} style={styles.okRow}>
                    <Text style={styles.body}>{m.display_name}</Text>
                    <Text style={styles.caption}>
                      {m.value} {m.unit}
                    </Text>
                  </View>
                ))}
            </Card>

            {whyText && (
              <Card muted style={styles.mb}>
                <Text style={styles.caption}>DETERMINISTIC RULE PROVENANCE</Text>
                <Text style={styles.body}>{whyText}</Text>
                <Pressable onPress={() => setWhyText(null)}>
                  <Text style={styles.whyLink}>Dismiss</Text>
                </Pressable>
              </Card>
            )}

            <View style={styles.actionStack}>
              <Button
                label="Build / Refresh My Plan"
                onPress={() => {
                  buildPlanForReport(latest.id);
                  router.push('/(tabs)/plan');
                }}
              />
              <Button
                label="Ask About This Report"
                variant="secondary"
                onPress={() => router.push('/report/chat')}
              />
              <Button
                label="Simulate 12-Week Retest Comparison"
                variant="accent"
                onPress={() => importFollowUpSampleReport()}
              />
            </View>

            <DisclaimerFooter />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: tokens.color.bg },
  scroll: { padding: tokens.space.lg, paddingBottom: 110 },
  title: { ...tokens.type.h1, color: tokens.color.ink, marginBottom: tokens.space.md },
  h2: { ...tokens.type.h2, color: tokens.color.ink, marginBottom: tokens.space.xs },
  body: { ...tokens.type.body, color: tokens.color.ink, marginBottom: tokens.space.xs },
  caption: { ...tokens.type.caption, color: tokens.color.inkMuted },
  mb: { marginBottom: tokens.space.md },
  counterRow: { flexDirection: 'row', gap: tokens.space.sm, marginTop: tokens.space.md },
  counterBox: { flex: 1, borderRadius: 18, padding: tokens.space.md, alignItems: 'center' },
  counterNum: { ...tokens.type.h1, fontVariant: ['tabular-nums'] },
  counterLabel: { ...tokens.type.caption, fontWeight: '600', textAlign: 'center' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  whyLink: { ...tokens.type.label, color: tokens.color.accentText, fontWeight: '700' },
  markerBlock: { marginTop: tokens.space.md, paddingTop: tokens.space.sm, borderTopWidth: 1, borderTopColor: tokens.color.border },
  markerName: { ...tokens.type.body, fontWeight: '600', color: tokens.color.ink },
  markerVal: { ...tokens.type.label, color: tokens.color.inkMuted, marginTop: 2 },
  bullet: { ...tokens.type.body, color: tokens.color.ink, marginTop: 6 },
  okRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  actionStack: { gap: tokens.space.sm, marginTop: tokens.space.sm },
});
