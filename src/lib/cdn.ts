const CDN_BASE =
  process.env.EXPO_PUBLIC_ASSETS_CDN_BASE ??
  'https://cdn.jsdelivr.net/gh/trdmsc-pixel/svastha-assets@v1';

export function getAssetUrl(imageKey: string): string {
  const clean = imageKey.replace(/^\/+/, '');
  return `${CDN_BASE}/${clean}`;
}
