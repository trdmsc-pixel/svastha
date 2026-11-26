import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { tokens } from '@/theme/tokens';

interface SegmentArcProps {
  eatenKcal: number;
  goalKcal: number;
  dateLabel: string;
  onPress?: () => void;
}

const SEGMENTS = 12;

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
}

/**
 * 12-segment daily calorie arc (Section 5.3 & 7.1):
 * - Empty segments outlined with segmentEmptyStroke (#948B80, >= 3:1 non-text contrast)
 * - "Goal X kcal" uses accentText (#A3471F, 5.42:1) instead of low-contrast peach text
 * - Full progressbar accessibility metadata for VoiceOver & TalkBack
 */
export function SegmentArc({ eatenKcal, goalKcal, dateLabel, onPress }: SegmentArcProps) {
  const ratio = goalKcal > 0 ? Math.min(1, eatenKcal / goalKcal) : 0;
  const filledSegments = Math.round(ratio * SEGMENTS);
  const startDeg = -115;
  const totalSweep = 230;
  const gapDeg = 5;
  const segSweep = (totalSweep - gapDeg * (SEGMENTS - 1)) / SEGMENTS;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="progressbar"
      accessibilityLabel={`${eatenKcal.toLocaleString()} of ${goalKcal.toLocaleString()} kcal eaten`}
      accessibilityValue={{ min: 0, max: goalKcal, now: eatenKcal }}
      style={styles.container}
    >
      <Svg width={260} height={175} viewBox="0 0 260 175">
        {Array.from({ length: SEGMENTS }).map((_, i) => {
          const s = startDeg + i * (segSweep + gapDeg);
          const e = s + segSweep;
          const isFilled = i < filledSegments;
          const d = describeArc(130, 140, 108, s, e);
          return (
            <React.Fragment key={i}>
              {!isFilled && (
                <Path
                  d={d}
                  stroke={tokens.color.segmentEmptyStroke}
                  strokeWidth={16}
                  strokeLinecap="round"
                  fill="none"
                />
              )}
              <Path
                d={d}
                stroke={isFilled ? tokens.color.accent : tokens.color.segmentEmpty}
                strokeWidth={isFilled ? 16 : 13}
                strokeLinecap="round"
                fill="none"
              />
            </React.Fragment>
          );
        })}
      </Svg>

      <View style={styles.center}>
        <Text style={styles.bolt} accessibilityElementsHidden>
          ⚡
        </Text>
        <Text style={styles.date}>{dateLabel}</Text>
        <Text style={styles.kcal}>{eatenKcal.toLocaleString()} kcal</Text>
        <Text style={styles.goal}>Goal {goalKcal.toLocaleString()} kcal</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: tokens.space.sm,
  },
  center: {
    position: 'absolute',
    top: 56,
    alignItems: 'center',
  },
  bolt: {
    fontSize: 18,
    marginBottom: 2,
  },
  date: {
    ...tokens.type.caption,
    color: tokens.color.inkMuted,
  },
  kcal: {
    ...tokens.type.display,
    color: tokens.color.ink,
    fontVariant: ['tabular-nums'],
  },
  goal: {
    ...tokens.type.label,
    color: tokens.color.accentText,
    fontWeight: '600',
    marginTop: 2,
  },
});
