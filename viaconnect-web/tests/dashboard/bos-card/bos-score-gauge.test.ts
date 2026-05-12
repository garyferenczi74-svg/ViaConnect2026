// Prompt #161e: tests for BOSScoreGauge data-seam helpers.
//
// Vitest runs under environment: 'node' (see vitest.config.ts). The
// project does not currently ship jsdom or happy-dom, so JSX rendering
// tests via @testing-library/react are deferred. Per the corrective
// rewrite dispatch, this file asserts the pure helpers exported from
// bos-gauge-helpers.ts. The visual rendering is verified during
// Vercel preview screenshot sign-off.

import { describe, it, expect } from 'vitest';
import {
  colorForScore,
  labelForScore,
  sentenceCase,
  geometryFor,
  SWEEP_DEGREES,
  START_ANGLE_DEGREES,
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

describe('BOSScoreGauge / geometryFor', () => {
  it('produces a 270 degree arc proportional to size', () => {
    const g120 = geometryFor(120, 9);
    expect(g120.center).toBe(60);
    expect(g120.radius).toBe(55.5);
    const expected120 = 0.75 * 2 * Math.PI * 55.5;
    expect(g120.arcLength).toBeCloseTo(expected120, 6);
  });

  it('scales linearly for the desktop size', () => {
    const g160 = geometryFor(160, 12);
    expect(g160.center).toBe(80);
    expect(g160.radius).toBe(74);
    const expected160 = 0.75 * 2 * Math.PI * 74;
    expect(g160.arcLength).toBeCloseTo(expected160, 6);
  });

  it('arc length is exactly 75 percent of the full circumference', () => {
    const g = geometryFor(120, 9);
    expect(g.arcLength / g.circumference).toBeCloseTo(0.75, 10);
  });
});

describe('BOSScoreGauge / fill length proportionality', () => {
  it('a score of N renders a fill of N/100 of the arc length', () => {
    const g = geometryFor(160, 12);
    const fillAt50 = (50 / 100) * g.arcLength;
    const fillAt100 = (100 / 100) * g.arcLength;
    expect(fillAt50).toBeCloseTo(g.arcLength / 2, 10);
    expect(fillAt100).toBeCloseTo(g.arcLength, 10);
  });
});

describe('BOSScoreGauge / geometry constants', () => {
  it('SWEEP_DEGREES is 270 (open at bottom, matching legacy + DailyScoreGauge)', () => {
    expect(SWEEP_DEGREES).toBe(270);
  });

  it('START_ANGLE_DEGREES is 135 (bottom-left start, matching legacy)', () => {
    expect(START_ANGLE_DEGREES).toBe(135);
  });
});
