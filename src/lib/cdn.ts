import { ImageSourcePropType } from 'react-native';

const CDN_BASE =
  process.env.EXPO_PUBLIC_ASSETS_CDN_BASE ??
  'https://cdn.jsdelivr.net/gh/trdmsc-pixel/svastha-assets@v1';

const LOCAL_ASSETS: Record<string, ImageSourcePropType> = {
  'onboarding/hero.webp': require('../../assets/images/onboarding-hero.jpg'),
  'recipes/quinoa-veggie-bowl.webp': require('../../assets/images/quinoa-bowl.jpg'),
  'foods/dal-tadka.webp': require('../../assets/images/dal-tadka.jpg'),
  'foods/poha.webp': require('../../assets/images/poha.jpg'),
};

export function getAssetUrl(imageKey: string): string {
  const clean = imageKey.replace(/^\/+/, '');
  return `${CDN_BASE}/${clean}`;
}

export function getLocalOrCdnImage(imageKey?: string): ImageSourcePropType {
  if (!imageKey) return LOCAL_ASSETS['foods/dal-tadka.webp'];
  const clean = imageKey.replace(/^\/+/, '');
  return LOCAL_ASSETS[clean] ?? { uri: getAssetUrl(clean) };
}