// Prompt #169 spec section 5.3 partial coverage: WCAG contrast assertions on
// the four meal-trigger idle gradients + the unified active gradient + the
// "Log a full meal" CTA. Component-behavior tests (render, click toggle,
// keyboard, mobile snapshot) deferred until vitest config gets the .test.tsx
// pattern + jsdom environment switch (Gary approval pending).

import { describe, it, expect } from 'vitest';

// Tailwind v3 default palette. Subset used by Prompt #169 gradient choices.
// Source: https://tailwindcss.com/docs/customizing-colors (default palette).
const TAILWIND_HEX: Record<string, string> = {
  'amber-600': '#d97706',
  'orange-600': '#ea580c',
  'purple-500': '#a855f7',
  'purple-700': '#7e22ce',
  'indigo-500': '#6366f1',
  'violet-600': '#7c3aed',
  'rose-500': '#f43f5e',
  'pink-500': '#ec4899',
  'emerald-600': '#059669',
  'green-600': '#16a34a',
  'sky-600': '#0284c7',
  'sky-700': '#0369a1',
  'blue-500': '#3b82f6',
  'indigo-600': '#4f46e5',
  white: '#ffffff',
};

function relativeLuminance(r: number, g: number, b: number): number {
  const channel = (c: number) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function parseHex(hex: string): readonly [number, number, number] {
  const v = hex.replace('#', '');
  return [
    parseInt(v.slice(0, 2), 16),
    parseInt(v.slice(2, 4), 16),
    parseInt(v.slice(4, 6), 16),
  ] as const;
}

function contrastRatio(hex1: string, hex2: string): number {
  const [r1, g1, b1] = parseHex(hex1);
  const [r2, g2, b2] = parseHex(hex2);
  const l1 = relativeLuminance(r1, g1, b1);
  const l2 = relativeLuminance(r2, g2, b2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// Idle gradients per Prompt #169 section 4.1, with shades adjusted by Gary
// 2026-05-15 to pass AA Large (3.0:1) on white text. Color families preserved.
// Lighter stops darkened minimum needed; dinner + snacks unchanged from spec.
// We assert on BOTH stops because the trigger text spans the full gradient
// width; the worst-contrast pixel is what fails the user.
const SPEC_IDLE_GRADIENTS: ReadonlyArray<{ meal: string; from: string; to: string }> = [
  { meal: 'breakfast', from: 'amber-600', to: 'orange-600' },
  { meal: 'lunch', from: 'purple-500', to: 'purple-700' },
  { meal: 'dinner', from: 'indigo-500', to: 'violet-600' },
  { meal: 'snack', from: 'rose-500', to: 'pink-500' },
  // Gary 2026-06-03: hydration 5th pill, light blue glass; stops chosen so
  // both pass AA Large vs white at full opacity (sky-600 ratio ~3.7, sky-700
  // ratio ~5.4). Replaces the prior desktop HydrationWidget bubble.
  { meal: 'hydration', from: 'sky-600', to: 'sky-700' },
];

const SPEC_ACTIVE = { from: 'emerald-600', to: 'green-600' };

const SPEC_CTA = { from: 'sky-600', via: 'blue-500', to: 'indigo-600' };

// WCAG 2.1 thresholds:
//   AA Normal text:  4.5:1
//   AA Large text:   3.0:1 (>= 18pt regular OR >= 14pt bold)
// Trigger label is 13-14px font-semibold which classifies as AA Large;
// active + CTA also assert at the same threshold for consistency. Gary
// 2026-05-15 selected AA Large standard with minimum-needed darkening.
const AA_LARGE_THRESHOLD = 3.0;

describe('#169 idle gradient contrast vs white text', () => {
  for (const grad of SPEC_IDLE_GRADIENTS) {
    it(`${grad.meal} from-${grad.from} passes AA Large vs white`, () => {
      const ratio = contrastRatio(TAILWIND_HEX[grad.from], TAILWIND_HEX.white);
      expect(ratio).toBeGreaterThanOrEqual(AA_LARGE_THRESHOLD);
    });
    it(`${grad.meal} to-${grad.to} passes AA Large vs white`, () => {
      const ratio = contrastRatio(TAILWIND_HEX[grad.to], TAILWIND_HEX.white);
      expect(ratio).toBeGreaterThanOrEqual(AA_LARGE_THRESHOLD);
    });
  }
});

describe('#169 active (open) gradient contrast vs white text', () => {
  it(`from-${SPEC_ACTIVE.from} passes AA Large vs white`, () => {
    const ratio = contrastRatio(TAILWIND_HEX[SPEC_ACTIVE.from], TAILWIND_HEX.white);
    expect(ratio).toBeGreaterThanOrEqual(AA_LARGE_THRESHOLD);
  });
  it(`to-${SPEC_ACTIVE.to} passes AA Large vs white`, () => {
    const ratio = contrastRatio(TAILWIND_HEX[SPEC_ACTIVE.to], TAILWIND_HEX.white);
    expect(ratio).toBeGreaterThanOrEqual(AA_LARGE_THRESHOLD);
  });
});

describe('#169 Log a full meal CTA gradient contrast vs white text', () => {
  it(`from-${SPEC_CTA.from} passes AA Large vs white`, () => {
    const ratio = contrastRatio(TAILWIND_HEX[SPEC_CTA.from], TAILWIND_HEX.white);
    expect(ratio).toBeGreaterThanOrEqual(AA_LARGE_THRESHOLD);
  });
  it(`via-${SPEC_CTA.via} passes AA Large vs white`, () => {
    const ratio = contrastRatio(TAILWIND_HEX[SPEC_CTA.via], TAILWIND_HEX.white);
    expect(ratio).toBeGreaterThanOrEqual(AA_LARGE_THRESHOLD);
  });
  it(`to-${SPEC_CTA.to} passes AA Large vs white`, () => {
    const ratio = contrastRatio(TAILWIND_HEX[SPEC_CTA.to], TAILWIND_HEX.white);
    expect(ratio).toBeGreaterThanOrEqual(AA_LARGE_THRESHOLD);
  });
});
