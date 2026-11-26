import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { tokens } from '@/theme/tokens';

/**
 * Vector icon set rendered with react-native-svg (stroke icons in the Lucide style, ISC licence).
 *
 * Why not @expo/vector-icons: icon *fonts* are exported to `dist/assets/node_modules/...`
 * and Vercel does not serve `node_modules` paths from build output, so every font icon
 * (including the notification bell) rendered blank on the web preview. SVG paths ship
 * inside the JS bundle and render identically on iOS, Android and web.
 *
 * Shape mini-format: a plain string is a path `d`; `c:cx,cy,r` is a circle;
 * `r:x,y,w,h,rx` is a rounded rect.
 */
const ICONS = {
  home: [
    'M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8',
    'M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
  ],
  report: [
    'M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z',
    'M14 2v4a2 2 0 0 0 2 2h4',
    'M10 9H8',
    'M16 13H8',
    'M16 17H8',
  ],
  scan: [
    'M3 7V5a2 2 0 0 1 2-2h2',
    'M17 3h2a2 2 0 0 1 2 2v2',
    'M21 17v2a2 2 0 0 1-2 2h-2',
    'M7 21H5a2 2 0 0 1-2-2v-2',
    'M7 12h10',
  ],
  star: ['M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z'],
  user: ['M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2', 'c:12,7,4'],
  settings: [
    'M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z',
    'c:12,12,3',
  ],
  calendar: ['r:3,4,18,18,2', 'M16 2v4', 'M8 2v4', 'M3 10h18'],
  bell: ['M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9', 'M10.3 21a1.94 1.94 0 0 0 3.4 0'],
  plus: ['M5 12h14', 'M12 5v14'],
  minus: ['M5 12h14'],
  pencil: [
    'M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z',
    'm15 5 4 4',
  ],
  search: ['c:11,11,8', 'm21 21-4.3-4.3'],
  zap: ['M13 2 3 14h9l-1 8 10-12h-9l1-8z'],
  chevronLeft: ['m15 18-6-6 6-6'],
  chevronRight: ['m9 18 6-6-6-6'],
  chevronDown: ['m6 9 6 6 6-6'],
  chevronUp: ['m18 15-6-6-6 6'],
  check: ['M20 6 9 17l-5-5'],
  close: ['M18 6 6 18', 'M6 6l12 12'],
  camera: ['M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z', 'c:12,13,3'],
  image: ['r:3,3,18,18,2', 'c:9,9,2', 'm21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21'],
  upload: ['M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4', 'm17 8-5-5-5 5', 'M12 3v12'],
  download: ['M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4', 'm7 10 5 5 5-5', 'M12 15V3'],
  droplet: ['M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z'],
  utensils: ['M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2', 'M7 2v20', 'M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7'],
  moon: ['M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z'],
  sun: ['c:12,12,4', 'M12 2v2', 'M12 20v2', 'm4.93 4.93 1.41 1.41', 'm17.66 17.66 1.41 1.41', 'M2 12h2', 'M20 12h2', 'm6.34 17.66-1.41 1.41', 'm19.07 4.93-1.41 1.41'],
  activity: ['M22 12h-4l-3 9L9 3l-3 9H2'],
  pill: ['m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z', 'm8.5 8.5 7 7'],
  leaf: ['M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z', 'M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12'],
  coffee: ['M17 8h1a4 4 0 1 1 0 8h-1', 'M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z', 'M6 2v2', 'M10 2v2', 'M14 2v2'],
  grid: ['r:3,3,7,7,1.5', 'r:14,3,7,7,1.5', 'r:14,14,7,7,1.5', 'r:3,14,7,7,1.5'],
  clock: ['c:12,12,10', 'M12 6v6l4 2'],
  lock: ['r:3,11,18,11,2', 'M7 11V7a5 5 0 0 1 10 0v4'],
  shield: [
    'M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z',
    'm9 12 2 2 4-4',
  ],
  fingerprint: [
    'M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4',
    'M14 13.12c0 2.38 0 6.38-1 8.88',
    'M17.29 21.02c.12-.6.43-2.3.5-3.02',
    'M2 12a10 10 0 0 1 18-6',
    'M2 16h.01',
    'M21.8 16c.2-2 .131-5.354 0-6',
    'M5 19.5C5.5 18 6 15 6 12a6 6 0 0 1 .34-2',
    'M8.65 22c.21-.66.45-1.32.57-2',
    'M9 6.8a6 6 0 0 1 9 5.2v2',
  ],
  faceId: [
    'M3 7V5a2 2 0 0 1 2-2h2',
    'M17 3h2a2 2 0 0 1 2 2v2',
    'M21 17v2a2 2 0 0 1-2 2h-2',
    'M7 21H5a2 2 0 0 1-2-2v-2',
    'M8 14s1.5 2 4 2 4-2 4-2',
    'M9 9h.01',
    'M15 9h.01',
  ],
  trash: ['M3 6h18', 'M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6', 'M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2'],
  logOut: ['M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4', 'm16 17 5-5-5-5', 'M21 12H9'],
  sparkles: [
    'M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z',
    'M20 3v4',
    'M22 5h-4',
  ],
  heart: ['M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z'],
  refresh: ['M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8', 'M21 3v5h-5', 'M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16', 'M8 16H3v5'],
  info: ['c:12,12,10', 'M12 16v-4', 'M12 8h.01'],
  alert: ['m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3', 'M12 9v4', 'M12 17h.01'],
  flame: ['M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z'],
  target: ['c:12,12,10', 'c:12,12,6', 'c:12,12,2'],
  trendingUp: ['M22 7 13.5 15.5 8.5 10.5 2 17', 'M16 7h6v6'],
  trendingDown: ['M22 17 13.5 8.5 8.5 13.5 2 7', 'M16 17h6v-6'],
  message: ['M7.9 20A9 9 0 1 0 4 16.1L2 22Z'],
  send: ['M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z', 'm21.854 2.147-10.94 10.939'],
  mail: ['r:2,4,20,16,2', 'm22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7'],
  bookmark: ['m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z'],
  phone: ['r:5,2,14,20,2', 'M12 18h.01'],
  chart: ['M3 3v18h18', 'M18 17V9', 'M13 17V5', 'M8 17v-3'],
  sliders: ['M21 4h-7', 'M10 4H3', 'M21 12h-9', 'M8 12H3', 'M21 20h-5', 'M12 20H3', 'M14 2v4', 'M8 10v4', 'M16 18v4'],
  globe: ['c:12,12,10', 'M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20', 'M2 12h20'],
  scale: ['M12 3v18', 'M3 7h18', 'm6 7-3 7a3 3 0 0 0 6 0Z', 'm18 7-3 7a3 3 0 0 0 6 0Z'],
  key: ['c:7.5,15.5,5.5', 'm21 2-9.6 9.6', 'm15.5 7.5 3 3L22 7l-3-3'],
  wifiOff: ['M12 20h.01', 'M8.5 16.43a5 5 0 0 1 7 0', 'M5 12.86a10 10 0 0 1 5.17-2.69', 'M19 12.86a10 10 0 0 0-2-1.39', 'M2 8.82a15 15 0 0 1 4.18-2.64', 'M22 8.82a15 15 0 0 0-11.29-3.76', 'm2 2 20 20'],
  file: ['M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z', 'M14 2v4a2 2 0 0 0 2 2h4'],
  footprints: [
    'M4 16v-2.38C4 11.5 2.97 10.5 3 8c.03-2.72 1.49-6 4.5-6C9.37 2 10 3.8 10 5.5c0 3.11-2 5.66-2 8.68V16a2 2 0 1 1-4 0Z',
    'M20 20v-2.38c0-2.12 1.03-3.12 1-5.62-.03-2.72-1.49-6-4.5-6C14.63 6 14 7.8 14 9.5c0 3.11 2 5.66 2 8.68V20a2 2 0 1 0 4 0Z',
  ],
  eye: ['M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0', 'c:12,12,3'],
  eyeOff: [
    'M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49',
    'M14.084 14.158a3 3 0 0 1-4.242-4.242',
    'M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143',
    'm2 2 20 20',
  ],
} as const;

export type IconName = keyof typeof ICONS;

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
  /** Fill colour for solid variants (e.g. a filled star). Defaults to none. */
  fill?: string;
  accessibilityLabel?: string;
}

export function Icon({
  name,
  size = 22,
  color = tokens.color.ink,
  strokeWidth = 2,
  fill = 'none',
  accessibilityLabel,
}: IconProps) {
  const shapes = ICONS[name] as readonly string[];
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      accessibilityLabel={accessibilityLabel}
      accessibilityElementsHidden={!accessibilityLabel}
      importantForAccessibility={accessibilityLabel ? 'yes' : 'no-hide-descendants'}
    >
      {shapes.map((s, i) => {
        const common = {
          stroke: color,
          strokeWidth,
          strokeLinecap: 'round' as const,
          strokeLinejoin: 'round' as const,
          fill,
        };
        if (s.startsWith('c:')) {
          const [cx, cy, r] = s.slice(2).split(',').map(Number);
          return <Circle key={i} cx={cx} cy={cy} r={r} {...common} />;
        }
        if (s.startsWith('r:')) {
          const [x, y, w, h, rx] = s.slice(2).split(',').map(Number);
          return <Rect key={i} x={x} y={y} width={w} height={h} rx={rx} {...common} />;
        }
        return <Path key={i} d={s} {...common} />;
      })}
    </Svg>
  );
}
