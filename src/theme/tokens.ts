export const tokens = {
  appName: 'Svastha',
  color: {
    bg: '#F6F2ED', // cream app background
    surface: '#FFFFFF', // cards
    surfaceMuted: '#EFEAE3', // "+" add bar, chips
    ink: '#2B2B2B', // primary text, tab bar, primary button
    inkMuted: '#6B6B6B', // labels (Protein/Carbs/Fat) — 4.78:1 on cream, 5.33:1 on white
    accent: '#F09A6A', // peach — FILLS ONLY (arc segments, scan button, progress)
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
    border: '#E4DDD4',
    white: '#FFFFFF',
  },
  radius: {
    card: 28,
    button: 24,
    chip: 999,
    sheet: 32,
    input: 16,
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
    family: 'Inter',
    display: { fontSize: 40, lineHeight: 44, fontWeight: '600' as const },
    h1: { fontSize: 28, lineHeight: 34, fontWeight: '600' as const },
    h2: { fontSize: 22, lineHeight: 28, fontWeight: '600' as const },
    body: { fontSize: 16, lineHeight: 22, fontWeight: '400' as const },
    label: { fontSize: 14, lineHeight: 20, fontWeight: '500' as const },
    caption: { fontSize: 13, lineHeight: 18, fontWeight: '400' as const },
  },
  shadow: {
    card: {
      shadowColor: '#2B2B2B',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.06,
      shadowRadius: 24,
      elevation: 3,
    },
  },
  a11y: {
    minTouchTarget: 44,
  },
} as const;

export type Tokens = typeof tokens;
