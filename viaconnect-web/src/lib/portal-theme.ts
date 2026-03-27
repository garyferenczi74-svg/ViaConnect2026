export const PORTAL_THEMES = {
  consumer: {
    accent: '#2DA5A0',
    accentHover: '#3BBFB9',
    heading: '#B75E18',
    cardBg: 'rgba(26, 39, 68, 0.65)',
    selectionBg: 'rgba(45, 165, 160, 0.3)',
    focusRing: 'rgba(45, 165, 160, 0.5)',
  },
  practitioner: {
    accent: '#4A90D9',
    accentHover: '#5BA0E9',
    heading: '#B75E18',
    cardBg: 'rgba(15, 25, 35, 0.75)',
    selectionBg: 'rgba(74, 144, 217, 0.3)',
    focusRing: 'rgba(74, 144, 217, 0.5)',
  },
  naturopath: {
    accent: '#7BAE7F',
    accentHover: '#8FC293',
    heading: '#C4944A',
    cardBg: 'rgba(18, 30, 26, 0.65)',
    selectionBg: 'rgba(123, 174, 127, 0.3)',
    focusRing: 'rgba(123, 174, 127, 0.5)',
  },
};

export const PORTAL_DENSITY = {
  consumer: { cardPadding: '24px', cardRadius: '16px', bodyText: '18px', metricSize: '56px', cardGap: '16px' },
  practitioner: { cardPadding: '12px', cardRadius: '8px', bodyText: '14px', metricSize: '44px', cardGap: '8px' },
  naturopath: { cardPadding: '16px', cardRadius: '12px', bodyText: '16px', metricSize: '44px', cardGap: '12px' },
};

export type PortalType = keyof typeof PORTAL_THEMES;
export type PortalTheme = typeof PORTAL_THEMES[PortalType];
export type PortalDensity = typeof PORTAL_DENSITY[PortalType];
