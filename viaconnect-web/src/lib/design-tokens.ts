// ViaConnect GeneX360 — Production Design Tokens
// Primary accent: BURNT COPPER #b75e18 — NO cyan anywhere

export const colors = {
  primary: '#b75e18',
  primaryLight: '#d4792e',
  primaryGlow: 'rgba(183, 94, 24, 0.3)',
  primaryTint: 'rgba(183, 94, 24, 0.08)',
  primarySurface: 'rgba(183, 94, 24, 0.12)',
  backgroundDark: '#0d1225',
  backgroundEnd: '#141c35',
  glassBg: 'rgba(18, 27, 55, 0.7)',
  glassBorder: 'rgba(255, 255, 255, 0.08)',
  glassHover: 'rgba(22, 33, 65, 0.85)',
  cardSurface: '#1a2444',
  cardSurfaceLight: '#1f2b50',
  textPrimary: '#ffffff',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',
  tagBase: '#22c55e',
  tagAdvanced: '#b75e18',
  tagGene: '#a78bfa',
  accentSleep: '#60a5fa',
  accentHeart: '#f87171',
  accentActivity: '#4ade80',
} as const;

export const spacing = {
  pagePaddingX: '24px',
  cardGap: '12px',
  sectionGap: '32px',
} as const;

export type ColorKey = keyof typeof colors;
