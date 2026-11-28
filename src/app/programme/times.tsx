import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { tokens } from '@/theme/tokens';
import { Card } from '@/components/Card';
import { Banner, Screen, ScreenHeader, Stepper, ui, useScrollBottomPad } from '@/components/ui';
import { useProgrammeStore } from '@/store/useProgrammeStore';
import { getProgramme, useProgrammeFlags } from '@/hooks/useProgramme';
import { applyTimeOverrides } from '@/engine/programmeEngine';
import { formatTime12, hhmmToMinutes, minutesToHHmm } from '@/lib/dates';
import { haptic } from '@/lib/haptics';

/** "Edit my times" — shift any routine item by 15-minute steps. Reminders follow automatically. */
export default function ProgrammeTimesScreen() {
  const bottomPad = useScrollBottomPad();
  const programmeId = useProgrammeStore((s) => s.programmeId);
  const overrides = useProgrammeStore((s) => s.timeOverrides);
  const setTimeOverride = useProgrammeStore((s) => s.setTimeOverride);
  const resetTimeOverrides = useProgrammeStore((s) => s.resetTimeOverrides);
  const flags = useProgrammeFlags();
  const p = getProgramme(programmeId);

  const rows = useMemo(() => {
    if (!p) return [];
    const original = new Map(p.routine.map((r) => [r.id, r.time]));
    return applyTimeOverrides(p.routine, overrides)
      .filter((it) => (it.requires ? !!flags[it.requires] : true))
      .sort((a, b) => hhmmToMinutes(a.time) - hhmmToMinutes(b.time))
      .map((it) => ({ item: it, planTime: original.get(it.id) ?? it.time }));
  }, [p, overrides, flags]);

  const changed = Object.keys(overrides).length;

  return (
    <Screen>
      <ScreenHeader title="Edit my times" subtitle={changed ? `${changed} time${changed > 1 ? 's' : ''} changed` : 'Same as the printed plan'} />
      <ScrollView contentContainerStyle={[ui.scroll, { paddingBottom: bottomPad }]} showsVerticalScrollIndicator={false}>
        {!p ? (
          <Banner text="Start the 8-Week Reset first, then you can adjust its times here." />
        ) : (
          <>
            <Text style={styles.intro}>Day shifted? Move any step earlier or later. Your list and phone reminders update on their own.</Text>
            {rows.map(({ item, planTime }) => {
              const moved = item.time !== planTime;
              return (
                <Card key={item.id} style={styles.row}>
                  <View style={styles.top}>
                    <Text style={styles.emoji} allowFontScaling={false}>{item.emoji}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.title}>{item.title}</Text>
                      {moved ? <Text style={styles.plan}>Plan time: {formatTime12(planTime)}</Text> : null}
                    </View>
                  </View>
                  <View style={styles.bottom}>
                    <Stepper
                      label={`${item.title} time`}
                      value={hhmmToMinutes(item.time)}
                      step={15}
                      min={0}
                      max={23 * 60 + 45}
                      format={(v) => formatTime12(minutesToHHmm(v))}
                      onChange={(v) => {
                        const hhmm = minutesToHHmm(v);
                        setTimeOverride(item.id, hhmm === planTime ? null : hhmm);
                      }}
                    />
                    {moved ? (
                      <Pressable onPress={() => { haptic.tap(); setTimeOverride(item.id, null); }} accessibilityRole="button" accessibilityLabel={`Reset ${item.title} to plan time`} hitSlop={8} style={styles.reset}>
                        <Text style={styles.resetText}>Reset</Text>
                      </Pressable>
                    ) : null}
                  </View>
                </Card>
              );
            })}
            {changed > 0 ? (
              <Pressable onPress={() => { haptic.warn(); resetTimeOverrides(); }} accessibilityRole="button" style={styles.resetAll}>
                <Text style={styles.resetAllText}>Reset all times to the printed plan</Text>
              </Pressable>
            ) : null}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { fontSize: 17, lineHeight: 24, color: tokens.color.inkSoft, marginBottom: 14 },
  row: { marginBottom: 12, padding: 16 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  emoji: { fontSize: 28, lineHeight: 36, width: 36, textAlign: 'center', includeFontPadding: false },
  title: { fontSize: 18, lineHeight: 24, fontWeight: '700', color: tokens.color.ink },
  plan: { fontSize: 14, color: tokens.color.accentText, fontWeight: '600', marginTop: 2 },
  bottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, gap: 10 },
  reset: { minHeight: 44, paddingHorizontal: 14, justifyContent: 'center', borderRadius: 999, backgroundColor: tokens.color.surfaceMuted },
  resetText: { fontSize: 15, fontWeight: '700', color: tokens.color.ink },
  resetAll: { marginTop: 8, minHeight: 52, borderRadius: 24, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: tokens.color.border },
  resetAllText: { fontSize: 16, fontWeight: '700', color: tokens.color.accentText },
});
