// Prompt #161e patch pass: tests for BOSScoreGauge data-seam helpers,
// aligned to the canonical legacy geometry (240px outer diameter,
// 14px stroke, 270 degree sweep open at the bottom, 135 degree start
// rotation). The legacy treatment is a single size used responsively
// via CSS; no dual mobile/desktop branch in the helper layer.
//
// Vitest runs under environment: 'node' (see vitest.config.ts). The
// project does not currently ship jsdom or happy-dom, so JSX rendering
// tests via @testing-library/react are deferred. This file asserts
// the pure helpers exported from bos-gauge-helpers.ts (band classifier,
// label classifier, sentence case, geometry helper, and the
// useCountUp animator's per-frame easing math). The visual rendering
// is verified during Vercel preview screenshot sign-off.

import { describe, it, expect } from 'vitest';
import {
  colorForScore,
  labelForScore,
  sentenceCase,
  geometryFor,
  countUpValueAtProgress,
  SWEEP_DEGREES,
  START_ANGLE_DEGREES,
  GAUGE_SIZE,
  GAUGE_STROKE,
} from '@/components/dashboard/bos-gauge-helpers';

describe('BOSScoreGauge / colorForScore', () => {
  it('returns purple for OPTIMAL band (score >= 91)', () => {
    expect(colorForScore(91)).toBe('#A855F7');
    expect(colorForScore(100)).toBe('#A855F7');
  });

  it('returns green for EXCELLENT band (76 to 90)', () => {
    expect(colorForScore(76)).toBe('#22C55E');
    expect(colorForScore(90)).toBe('#22C55E');
  });

  it('returns teal for GOOD band (51 to 75)', () => {
    expect(colorForScore(51)).toBe('#2DA5A0');
    expect(colorForScore(75)).toBe('#2DA5A0');
  });

  it('returns amber for BUILDING band (26 to 50)', () => {
    expect(colorForScore(26)).toBe('#F59E0B');
    expect(colorForScore(50)).toBe('#F59E0B');
  });

  it('returns red for NEEDS ATTENTION band (0 to 25)', () => {
    expect(colorForScore(0)).toBe('#EF4444');
    expect(colorForScore(25)).toBe('#EF4444');
  });
});

describe('BOSScoreGauge / labelForScore', () => {
  it('emits all-caps tier labels matching legacy', () => {
    expect(labelForScore(100)).toBe('OPTIMAL');
    expect(labelForScore(85)).toBe('EXCELLENT');
    expect(labelForScore(60)).toBe('GOOD');
    expect(labelForScore(40)).toBe('BUILDING');
    expect(labelForScore(10)).toBe('NEEDS ATTENTION');
  });
});

describe('BOSScoreGauge / sentenceCase', () => {
  it('lowercases all but the first character', () => {
    expect(sentenceCase('OPTIMAL')).toBe('Optimal');
    expect(sentenceCase('GOOD')).toBe('Good');
    expect(sentenceCase('NEEDS ATTENTION')).toBe('Needs attention');
  });
});

describe('BOSScoreGauge / canonical legacy geometry', () => {
  it('GAUGE_SIZE is 240 (legacy outer diameter)', () => {
    expect(GAUGE_SIZE).toBe(240);
  });

  it('GAUGE_STROKE is 14 (legacy stroke width)', () => {
    expect(GAUGE_STROKE).toBe(14);
  });

  it('SWEEP_DEGREES is 270 (open at bottom)', () => {
    expect(SWEEP_DEGREES).toBe(270);
  });

  it('START_ANGLE_DEGREES is 135 (bottom-left start)', () => {
    expect(START_ANGLE_DEGREES).toBe(135);
  });
});

describe('BOSScoreGauge / geometryFor', () => {
  it('produces the legacy 240/14 geometry by default', () => {
    const g = geometryFor(GAUGE_SIZE, GAUGE_STROKE);
    expect(g.center).toBe(120);
    expect(g.radius).toBe(113);
    const expected = 0.75 * 2 * Math.PI * 113;
    expect(g.arcLength).toBeCloseTo(expected, 6);
  });

  it('arc length is exactly 75 percent of the full circumference', () => {
    const g = geometryFor(GAUGE_SIZE, GAUGE_STROKE);
    expect(g.arcLength / g.circumference).toBeCloseTo(0.75, 10);
  });

  it('scales correctly for arbitrary smaller sizes (helper is general)', () => {
    const g120 = geometryFor(120, 9);
    expect(g120.center).toBe(60);
    expect(g120.radius).toBe(55.5);
    const expected120 = 0.75 * 2 * Math.PI * 55.5;
    expect(g120.arcLength).toBeCloseTo(expected120, 6);
  });
});

describe('BOSScoreGauge / fill length proportionality', () => {
  it('a score of N renders a fill of N/100 of the arc length', () => {
    const g = geometryFor(GAUGE_SIZE, GAUGE_STROKE);
    const fillAt50 = (50 / 100) * g.arcLength;
    const fillAt100 = (100 / 100) * g.arcLength;
    expect(fillAt50).toBeCloseTo(g.arcLength / 2, 10);
    expect(fillAt100).toBeCloseTo(g.arcLength, 10);
  });
});

describe('BOSScoreGauge / useCountUp easing math', () => {
  // countUpValueAtProgress is the pure math kernel extracted from
  // useCountUp so we can assert the ease-out-cubic curve without
  // rendering. progress is 0..1, target is the integer score.

  it('returns 0 at progress 0', () => {
    expect(countUpValueAtProgress(100, 0)).toBe(0);
    expect(countUpValueAtProgress(50, 0)).toBe(0);
  });

  it('returns the rounded target at progress 1', () => {
    expect(countUpValueAtProgress(100, 1)).toBe(100);
    expect(countUpValueAtProgress(75, 1)).toBe(75);
    expect(countUpValueAtProgress(0, 1)).toBe(0);
  });

  it('produces ease-out-cubic intermediate values (faster early, slower late)', () => {
    // ease-out-cubic at progress 0.5 = 1 - (1 - 0.5)^3 = 1 - 0.125 = 0.875
    expect(countUpValueAtProgress(100, 0.5)).toBe(88); // round(87.5)
    // ease-out-cubic at progress 0.25 = 1 - (0.75)^3 = 1 - 0.421875 = 0.578125
    expect(countUpValueAtProgress(100, 0.25)).toBe(58); // round(57.8125)
    // ease-out-cubic at progress 0.75 = 1 - (0.25)^3 = 1 - 0.015625 = 0.984375
    expect(countUpValueAtProgress(100, 0.75)).toBe(98); // round(98.4375)
  });

  it('clamps progress to the 0..1 range', () => {
    expect(countUpValueAtProgress(100, -1)).toBe(0);
    expect(countUpValueAtProgress(100, 2)).toBe(100);
  });
});
