import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { tokens } from '@/theme/tokens';

interface SegmentArcProps {
  eatenKcal: number;
  goalKcal: number;
  dateLabel: string;
  onPress?: () => void;
}

const SEGMENTS = 12;

function polar(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

/**
 * Generates a chunky rounded wedge/block SVG path matching the reference design.
 */
function wedgePath(
  cx: number,
  cy: number,
  rInner: number,
  rOuter: number,
  startDeg: number,
  endDeg: number
): string {
  const p1 = polar(cx, cy, rOuter, startDeg);
  const p2 = polar(cx, cy, rOuter, endDeg);
  const p3 = polar(cx, cy, rInner, endDeg);
  const p4 = polar(cx, cy, rInner, startDeg);

  return [
    `M ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`,
    `A ${rOuter} ${rOuter} 0 0 1 ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`,
    `L ${p3.x.toFixed(2)} ${p3.y.toFixed(2)}`,
    `A ${rInner} ${rInner} 0 0 0 ${p4.x.toFixed(2)} ${p4.y.toFixed(2)}`,
    'Z',
  ].join(' ');
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * 12-segment animated daily calorie arc:
 * - Chunky rounded radial blocks (peach filled, cream-muted with >=3:1 stroke when empty)
 * - Sequential fill animation on mount/update (respects Reduce Motion)
 * - Full progressbar accessibility metadata for VoiceOver & TalkBack
 */
export function SegmentArc({ eatenKcal, goalKcal, dateLabel, onPress }: SegmentArcProps) {
  const reducedMotion = useReducedMotion();
  const ratio = goalKcal > 0 ? Math.min(1, eatenKcal / goalKcal) : 0;
  const targetFilled = Math.round(ratio * SEGMENTS);

  const [visibleFilled, setVisibleFilled] = useState(reducedMotion ? targetFilled : 0);
  const scale = useSharedValue(1);

  useEffect(() => {
    if (reducedMotion) {
      setVisibleFilled(targetFilled);
      return;
    }
    setVisibleFilled(0);
    let current = 0;
    const timer = setInterval(() => {
      current += 1;
      setVisibleFilled(current);
      if (current >= targetFilled) clearInterval(timer);
    }, 45);
    if (targetFilled === 0) clearInterval(timer);
    return () => clearInterval(timer);
  }, [targetFilled, reducedMotion]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const startDeg = -112;
  const totalSweep = 224;
  const gapDeg = 4.2;
  const segSweep = (totalSweep - gapDeg * (SEGMENTS - 1)) / SEGMENTS;

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={() => {
        if (!reducedMotion) scale.value = withSpring(0.98, { damping: 16, stiffness: 300 });
      }}
      onPressOut={() => {
        if (!reducedMotion) scale.value = withSpring(1, { damping: 16, stiffness: 300 });
      }}
      accessibilityRole="progressbar"
      accessibilityLabel={`${eatenKcal.toLocaleString()} of ${goalKcal.toLocaleString()} kcal eaten`}
      accessibilityValue={{ min: 0, max: goalKcal, now: eatenKcal }}
      style={[styles.container, animStyle]}
    >
      <Svg width={296} height={192} viewBox="0 0 296 192">
        {Array.from({ length: SEGMENTS }).map((_, i) => {
          const s = startDeg + i * (segSweep + gapDeg);
          const e = s + segSweep;
          const isFilled = i < visibleFilled;
          const d = wedgePath(148, 152, 96, 134, s, e);
          return (
            <Path
              key={i}
              d={d}
              fill={isFilled ? tokens.color.accent : tokens.color.segmentEmpty}
              stroke={isFilled ? tokens.color.accent : tokens.color.segmentEmptyStroke}
              strokeWidth={isFilled ? 4 : 1.5}
              strokeLinejoin="round"
            />
          );
        })}
      </Svg>

      <View style={styles.center}>
        <View style={styles.boltBadge} accessibilityElementsHidden>
          <Ionicons name="flash" size={16} color={tokens.color.accentText} />
        </View>
        <Text style={styles.date}>{dateLabel}</Text>
        <Text style={styles.kcal}>{eatenKcal.toLocaleString()} kcal</Text>
        <Text style={styles.goal}>Goal {goalKcal.toLocaleString()} kcal</Text>
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: tokens.space.xs,
  },
  center: {
    position: 'absolute',
    top: 66,
    alignItems: 'center',
  },
  boltBadge: {
    marginBottom: 4,
  },
  date: {
    ...tokens.type.caption,
    color: tokens.color.inkMuted,
    fontWeight: '500',
  },
  kcal: {
    fontSize: 36,
    lineHeight: 42,
    fontWeight: '700',
    color: tokens.color.ink,
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.5,
  },
  goal: {
    ...tokens.type.label,
    color: tokens.color.accentText,
    fontWeight: '600',
    marginTop: 2,
  },
});