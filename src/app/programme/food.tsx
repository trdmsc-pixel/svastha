import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, Layout } from 'react-native-reanimated';
import Svg, { Circle, Path, Text as SvgText } from 'react-native-svg';
import { tokens } from '@/theme/tokens';
import { Card } from '@/components/Card';
import { Icon } from '@/components/Icon';
import { Screen, ScreenHeader, SectionTitle, ui } from '@/components/ui';
import { RESET_8 } from '@/programme/reset8';
import { Weekday } from '@/programme/types';
import { getProgramme } from '@/hooks/useProgramme';
import { useProgrammeStore } from '@/store/useProgrammeStore';
import { todayKey, weekdayIndex, WEEKDAYS_SHORT } from '@/lib/dates';
import { haptic } from '@/lib/haptics';

const SLOTS = [
  { key: 'breakfast', label: 'Breakfast', time: '9:00 AM', emoji: '🍳' },
  { key: 'lunch', label: 'Lunch', time: '2:00 PM', emoji: '🥗' },
  { key: 'snack', label: 'Snack', time: '4:30 PM', emoji: '🍵' },
  { key: 'dinner', label: 'Dinner', time: 'by 9:00 PM', emoji: '🌙' },
] as const;

function Plate() {
  return (
    <Svg width={150} height={150} viewBox="0 0 200 200" accessibilityLabel="Plate: half sabzi and salad, a quarter protein, a quarter grain">
      <Circle cx={100} cy={100} r={96} fill="#fff" stroke={tokens.color.ink} strokeWidth={3} />
      <Path d="M100 16 A84 84 0 0 0 100 184 Z" fill="#CFE5D3" />
      <Path d="M100 16 A84 84 0 0 1 184 100 L100 100 Z" fill="#FBD9B8" />
      <Path d="M184 100 A84 84 0 0 1 100 184 L100 100 Z" fill="#F3E6C8" />
      <SvgText x={56} y={98} fontSize={15} fontWeight="800" fill={tokens.color.ink} textAnchor="middle">½ SABZI</SvgText>
      <SvgText x={56} y={116} fontSize={15} fontWeight="800" fill={tokens.color.ink} textAnchor="middle">+ SALAD</SvgText>
      <SvgText x={140} y={70} fontSize={12} fontWeight="800" fill={tokens.color.ink} textAnchor="middle">¼ DAL</SvgText>
      <SvgText x={140} y={84} fontSize={10} fill={tokens.color.inkMuted} textAnchor="middle">paneer · chana</SvgText>
      <SvgText x={140} y={135} fontSize={12} fontWeight="800" fill={tokens.color.ink} textAnchor="middle">¼ ROTI</SvgText>
      <SvgText x={140} y={149} fontSize={10} fill={tokens.color.inkMuted} textAnchor="middle">or rice</SvgText>
    </Svg>
  );
}

export default function FoodScreen() {
  const id = useProgrammeStore((s) => s.programmeId);
  const p = getProgramme(id) ?? RESET_8;
  const [day, setDay] = useState<Weekday>(weekdayIndex(todayKey()) as Weekday);
  const [openRecipe, setOpenRecipe] = useState<string | null>(null);
  const menu = p.menu[day];
  const isToday = day === weekdayIndex(todayKey());

  return (
    <Screen>
      <ScreenHeader title="Food plan" subtitle="Satvic · no onion, no garlic" />
      <ScrollView contentContainerStyle={ui.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.days}>
          {WEEKDAYS_SHORT.map((d, i) => {
            const on = i === day;
            return (
              <Pressable key={d} onPress={() => { haptic.select(); setDay(i as Weekday); }} style={[styles.day, on && styles.dayOn]} accessibilityRole="tab" accessibilityState={{ selected: on }}>
                <Text style={[styles.dayText, on && { color: tokens.color.white }]}>{d}</Text>
                {i === weekdayIndex(todayKey()) ? <View style={[styles.todayDot, on && { backgroundColor: tokens.color.accent }]} /> : null}
              </Pressable>
            );
          })}
        </View>

        <Animated.View key={day} entering={FadeIn.duration(300)}>
          {SLOTS.map((slot, i) => {
            const m = menu[slot.key];
            return (
              <Animated.View key={slot.key} entering={FadeInDown.delay(i * 60).duration(380)}>
                <View style={styles.meal}>
                  <Text style={{ fontSize: 34 }}>{slot.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.slot}>{slot.label} · {slot.time}</Text>
                    <Text style={styles.mealTitle}>{m.title}</Text>
                    <Text style={styles.mealDetail}>{m.detail}</Text>
                  </View>
                </View>
              </Animated.View>
            );
          })}
          {isToday ? <Text style={[ui.muted, { textAlign: 'center', marginTop: 2 }]}>Cooking for the family? Same dish. Just your portion + salad + curd.</Text> : null}
        </Animated.View>

        <SectionTitle>The plate rule</SectionTitle>
        <Card variant="glow">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <Plate />
            <View style={{ flex: 1, gap: 8 }}>
              {p.plateRules.map((r) => (
                <View key={r} style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
                  <Icon name="check" size={16} color={tokens.color.ok} strokeWidth={3} />
                  <Text style={styles.rule}>{r}</Text>
                </View>
              ))}
            </View>
          </View>
          <Text style={[styles.rule, { marginTop: 12 }]}>🥣 + 1 katori curd with lunch and dinner</Text>
        </Card>

        <SectionTitle>Every day</SectionTitle>
        <Card>
          {p.dailyFixed.map((f, i) => (
            <View key={f.title} style={[styles.fixed, i > 0 && styles.sep]}>
              <Text style={styles.fixedTitle}>{f.title}</Text>
              <Text style={ui.muted}>{f.detail}</Text>
            </View>
          ))}
        </Card>

        <SectionTitle>Portions</SectionTitle>
        <Card>
          {p.portions.map((x, i) => (
            <View key={x.item} style={[ui.between, styles.portion, i > 0 && styles.sep]}>
              <Text style={styles.portionItem}>{x.item}</Text>
              <Text style={styles.portionAmt}>{x.amount}</Text>
            </View>
          ))}
        </Card>

        <SectionTitle>Smart swaps</SectionTitle>
        {p.swaps.map((sw, i) => (
          <Animated.View key={sw.from} entering={FadeInDown.delay(i * 40).duration(350)} style={styles.swap}>
            <Text style={styles.swapFrom}>{sw.from}</Text>
            <Icon name="chevronRight" size={16} color={tokens.color.accentText} />
            <Text style={styles.swapTo}>{sw.to}</Text>
          </Animated.View>
        ))}

        <SectionTitle>Star recipes</SectionTitle>
        {p.recipes.map((r) => {
          const open = openRecipe === r.id;
          return (
            <Animated.View key={r.id} layout={Layout.springify().damping(18)}>
              <Card style={{ marginBottom: 10 }} onPress={() => { haptic.tap(); setOpenRecipe(open ? null : r.id); }} accessibilityLabel={`${r.name}, ${open ? 'collapse' : 'show steps'}`}>
                <View style={ui.between}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.recipeName}>{r.name}</Text>
                    <Text style={ui.muted}>{r.tag} · {r.minutes} min</Text>
                  </View>
                  <Icon name={open ? 'chevronUp' : 'chevronDown'} size={20} color={tokens.color.inkMuted} />
                </View>
                {open ? (
                  <Animated.View entering={FadeIn.duration(250)} style={{ marginTop: 10, gap: 6 }}>
                    {r.steps.map((st, i) => (
                      <View key={i} style={{ flexDirection: 'row', gap: 10 }}>
                        <View style={styles.stepNum}><Text style={styles.stepNumText}>{i + 1}</Text></View>
                        <Text style={[styles.rule, { flex: 1 }]}>{st}</Text>
                      </View>
                    ))}
                  </Animated.View>
                ) : null}
              </Card>
            </Animated.View>
          );
        })}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  days: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: tokens.color.glass, borderRadius: 22, padding: 5, borderWidth: 1, borderColor: tokens.color.glassBorder, marginBottom: 12 },
  day: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 17, minHeight: 44 },
  dayOn: { backgroundColor: tokens.color.ink },
  dayText: { fontSize: 13, fontWeight: '800', color: tokens.color.inkSoft },
  todayDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: tokens.color.accentText, marginTop: 3 },
  meal: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.76)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.95)', marginBottom: 10, ...tokens.shadow.soft },
  slot: { fontSize: 12, fontWeight: '800', color: tokens.color.accentText, letterSpacing: 0.8, textTransform: 'uppercase' },
  mealTitle: { fontSize: 19, fontWeight: '800', color: tokens.color.ink, marginTop: 2, letterSpacing: -0.2 },
  mealDetail: { fontSize: 14.5, color: tokens.color.inkMuted, marginTop: 2 },
  rule: { fontSize: 15, lineHeight: 21, color: tokens.color.ink, fontWeight: '600' },
  fixed: { paddingVertical: 8 },
  fixedTitle: { fontSize: 16, fontWeight: '700', color: tokens.color.ink },
  sep: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: tokens.color.border },
  portion: { paddingVertical: 10 },
  portionItem: { fontSize: 15.5, color: tokens.color.ink, flex: 1, fontWeight: '600' },
  portionAmt: { fontSize: 15.5, fontWeight: '800', color: tokens.color.accentText },
  swap: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.7)', marginBottom: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.9)' },
  swapFrom: { flex: 1, fontSize: 14, color: tokens.color.inkMuted, textDecorationLine: 'line-through' },
  swapTo: { flex: 1.2, fontSize: 14.5, fontWeight: '700', color: tokens.color.ink },
  recipeName: { fontSize: 17, fontWeight: '800', color: tokens.color.ink },
  stepNum: { width: 24, height: 24, borderRadius: 12, backgroundColor: tokens.color.accentSoft, alignItems: 'center', justifyContent: 'center' },
  stepNumText: { fontSize: 12, fontWeight: '800', color: tokens.color.accentText },
});
