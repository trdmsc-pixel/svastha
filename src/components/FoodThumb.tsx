import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { MealSlot } from '@/types/domain';
import { tokens } from '@/theme/tokens';
import { getLocalImage } from '@/lib/cdn';
import { Icon, IconName } from './Icon';

const SLOT_STYLE: Record<MealSlot, { from: string; to: string; icon: IconName }> = {
  breakfast: { from: '#FCE2B8', to: '#F5BE6B', icon: 'sun' },
  lunch: { from: '#FBD3BD', to: '#F09A6A', icon: 'utensils' },
  snack: { from: '#E6F0D8', to: '#A9CC8E', icon: 'leaf' },
  dinner: { from: '#E4DDF4', to: '#B4A6E0', icon: 'moon' },
};

/** Round food thumbnail: bundled photo when we have one, otherwise a soft gradient medallion. */
export function FoodThumb({ imageKey, slot = 'lunch', size = 56 }: { imageKey?: string; slot?: MealSlot; size?: number }) {
  const local = getLocalImage(imageKey);
  if (local) {
    return <Image source={local} style={[styles.img, { width: size, height: size, borderRadius: size / 2 }]} resizeMode="cover" accessibilityIgnoresInvertColors />;
  }
  const s = SLOT_STYLE[slot];
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id={`thumb-${slot}`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={s.from} />
            <Stop offset="1" stopColor={s.to} />
          </LinearGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={size / 2} fill={`url(#thumb-${slot})`} />
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.center]}>
        <Icon name={s.icon} size={size * 0.42} color={tokens.color.ink} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  img: { backgroundColor: tokens.color.surfaceMuted, borderWidth: 2, borderColor: tokens.color.white },
  center: { alignItems: 'center', justifyContent: 'center' },
});
