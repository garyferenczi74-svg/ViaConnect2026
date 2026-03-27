// ViaConnect GeneX360 — Master Design Tokens V2.2
// Primary accent: TEAL #2DA5A0 | Heading accent: ORANGE #B75E18

export const colors = {
  // Navy foundation
  navy900: '#0D1520',
  navy800: '#131D2E',
  navy700: '#1A2744',
  navy600: '#243352',
  navy500: '#2E4060',

  // Teal accent
  teal500: '#2DA5A0',
  teal400: '#3BBFB9',
  teal300: '#5ED4CF',
  teal600: '#1F8A85',
  teal100: '#E0F5F4',

  // Orange accent
  orange500: '#B75E18',
  orange400: '#D4721F',
  orange300: '#E8944A',
  orange600: '#994E14',
  orange100: '#FDF0E4',

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: '#A0AEC0',
  textTertiary: '#718096',
  textHeading: '#B75E18',

  // Status
  green: '#27AE60',
  red: '#E74C3C',
  amber: '#F39C12',

  // Surfaces
  glassBg: 'rgba(26, 39, 68, 0.65)',
  glassBorder: 'rgba(255, 255, 255, 0.08)',

  // Portal accents
  portalConsumer: '#2DA5A0',
  portalPractitioner: '#4A90D9',
  portalNaturopath: '#7BAE7F',
  portalGold: '#C4944A',
} as const;

export const spacing = {
  1: '4px',
  2: '8px',
  3: '12px',
  4: '16px',
  5: '20px',
  6: '24px',
  8: '32px',
  10: '40px',
  12: '48px',
  16: '64px',
  20: '80px',
  24: '96px',
} as const;

export const typography = {
  displayXl: { fontSize: '72px', fontWeight: 800, lineHeight: 1.0 },
  displayLg: { fontSize: '56px', fontWeight: 800, lineHeight: 1.1 },
  displayMd: { fontSize: '44px', fontWeight: 700, lineHeight: 1.15 },
  heading1: { fontSize: '36px', fontWeight: 700, lineHeight: 1.2 },
  heading2: { fontSize: '28px', fontWeight: 700, lineHeight: 1.3 },
  heading3: { fontSize: '22px', fontWeight: 600, lineHeight: 1.35 },
  bodyLg: { fontSize: '18px', fontWeight: 400, lineHeight: 1.6 },
  bodyMd: { fontSize: '16px', fontWeight: 400, lineHeight: 1.5 },
  bodySm: { fontSize: '14px', fontWeight: 400, lineHeight: 1.5 },
  caption: { fontSize: '12px', fontWeight: 500, lineHeight: 1.4 },
  overline: { fontSize: '11px', fontWeight: 700, lineHeight: 1.3, textTransform: 'uppercase' as const, letterSpacing: '1.5px' },
  monoMd: { fontSize: '14px', fontWeight: 500, lineHeight: 1.4 },
} as const;

export type ColorKey = keyof typeof colors;
