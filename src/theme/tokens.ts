/**
 * Svastha design tokens.
 *
 * WCAG 2.1 AA rules (CLAUDE.md §4) are preserved:
 * - `accent` (peach) is a FILL colour only. Peach-coloured text uses `accentText`.
 * - Anything placed ON a peach fill uses `onAccent` (charcoal), never white.
 * - Secondary labels use `inkMuted`; empty arc segments use `segmentEmptyStroke`.
 * - Status colour is always paired with an icon + word (see StatusChip).
 */
export const tokens = {
  appName: 'Svastha',
  color: {
    bg: '#F6F2ED', // cream app background
    bgDeep: '#EFE6DC', // lower edge of the ambient gradient
    surface: '#FFFFFF', // cards
    surfaceMuted: '#EFEAE3', // "+" add bar, chips
    ink: '#2B2B2B', // primary text, tab bar, primary button
    inkSoft: '#3D3A37',
    inkMuted: '#6B6B6B', // labels — 4.78:1 on cream, 5.33:1 on white
    accent: '#F09A6A', // peach — FILLS ONLY (arc, scan button, progress)
    accentDeep: '#E8774A', // gradient partner for peach fills
    accentGlow: 'rgba(240,154,106,0.55)',
    accentSoft: '#FDE8DC',
    gold: '#F5BE6B', // gradient end for the calorie ring (fill only)
    accentText: '#A3471F', // terracotta — any peach-coloured TEXT (5.42:1)
    onAccent: '#2B2B2B', // icons/text placed on peach (6.43:1). Never white on peach
    segmentEmpty: '#EFEAE3',
    segmentEmptyStroke: '#948B80', // >=3:1 outline so empty segments are visible
    risk: '#B3261E',
    watch: '#8A5A00',
    ok: '#2E6B3A',
    riskBg: '#FBE9E7',
    watchBg: '#FFF4DC',
    okBg: '#E7F3EA',
    protein: '#7A9CF0', // macro fills (paired with labels)
    carbs: '#F5BE6B',
    fat: '#E58FB1',
    water: '#6FB7E8',
    border: '#E4DDD4',
    hairline: 'rgba(43,43,43,0.08)',
    glass: 'rgba(255,255,255,0.66)',
    glassStrong: 'rgba(255,255,255,0.82)',
    glassBorder: 'rgba(255,255,255,0.9)',
    glassDark: 'rgba(32,30,28,0.88)',
    scrim: 'rgba(28,26,24,0.48)',
    white: '#FFFFFF',
  },
  gradient: {
    ambient: ['#FBF6F0', '#F6F2ED', '#F1E7DC'] as const,
    peach: ['#F7B48A', '#F09A6A', '#E8774A'] as const,
    ring: ['#F5BE6B', '#F09A6A', '#E8774A'] as const,
    ink: ['#3A3734', '#232120'] as const,
  },
  radius: {
    card: 28,
    button: 24,
    chip: 999,
    sheet: 32,
    input: 16,
    tile: 20,
  },
  space: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 32,
    huge: 40,
  },
  type: {
    family: undefined as string | undefined, // system font (SF Pro / Roboto / system-ui)
    display: { fontSize: 40, lineHeight: 44, fontWeight: '700' as const, letterSpacing: -0.8 },
    h1: { fontSize: 28, lineHeight: 34, fontWeight: '700' as const, letterSpacing: -0.4 },
    h2: { fontSize: 20, lineHeight: 26, fontWeight: '700' as const, letterSpacing: -0.2 },
    h3: { fontSize: 17, lineHeight: 22, fontWeight: '600' as const },
    body: { fontSize: 16, lineHeight: 22, fontWeight: '400' as const },
    label: { fontSize: 14, lineHeight: 20, fontWeight: '500' as const },
    caption: { fontSize: 13, lineHeight: 18, fontWeight: '400' as const },
    micro: { fontSize: 11, lineHeight: 14, fontWeight: '600' as const, letterSpacing: 0.6 },
  },
  shadow: {
    card: {
      shadowColor: '#5A3A22',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.07,
      shadowRadius: 24,
      elevation: 3,
    },
    soft: {
      shadowColor: '#5A3A22',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.06,
      shadowRadius: 12,
      elevation: 2,
    },
    glow: {
      shadowColor: '#F09A6A',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.45,
      shadowRadius: 18,
      elevation: 8,
    },
  },
  a11y: {
    minTouchTarget: 44,
  },
} as const;

export type Tokens = typeof tokens;
