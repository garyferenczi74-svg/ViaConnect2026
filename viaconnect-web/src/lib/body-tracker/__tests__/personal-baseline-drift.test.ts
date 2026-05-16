// Tests for personal-baseline-drift.ts (Prompt #169 T4).
//
// Covers:
//   computePersonalBaseline: fewer than 3 values => null; 3 values => correct std-dev (Bessel).
//   isOutlier: value at +3 sigma => true; +1 sigma => false; std-dev=0 + different value => false.
//   smoothTrendForDisplay: null baseline => raw unchanged; non-null => first=raw[0], rest blended.
//   confidenceIntervalFromBaseline: value=100 std=5 => low~90.2 high~109.8; null baseline => null.

import { describe, it, expect } from 'vitest';
import {
  computePersonalBaseline,
  isOutlier,
  smoothTrendForDisplay,
  confidenceIntervalFromBaseline,
} from '../personal-baseline-drift';
import type { PersonalBaseline } from '../scan-types';
import { PERSONAL_BASELINE_BOOTSTRAP_SCANS } from '../scan-constants';

// ============================================================
// computePersonalBaseline
// ============================================================

describe('computePersonalBaseline', () => {
  it('returns null when fewer than 3 values provided', () => {
    expect(computePersonalBaseline('u1', 'waist_cm', [])).toBeNull();
    expect(computePersonalBaseline('u1', 'waist_cm', [10])).toBeNull();
    expect(computePersonalBaseline('u1', 'waist_cm', [10, 12])).toBeNull();
  });

  it('returns null at exactly one fewer than bootstrap minimum', () => {
    const values = Array(PERSONAL_BASELINE_BOOTSTRAP_SCANS - 1).fill(10);
    expect(computePersonalBaseline('u1', 'waist_cm', values)).toBeNull();
  });

  it('returns baseline at exactly the bootstrap minimum (3 values)', () => {
    // Values [10, 12, 14]:
    //   mean  = 12
    //   var   = ((10-12)^2 + (12-12)^2 + (14-12)^2) / (3-1) = (4 + 0 + 4) / 2 = 4
    //   std   = sqrt(4) = 2.0
    const result = computePersonalBaseline('u1', 'waist_cm', [10, 12, 14]);
    expect(result).not.toBeNull();
    expect(result!.stdDev).toBeCloseTo(2.0, 5);
    expect(result!.sampleSize).toBe(3);
    expect(result!.userId).toBe('u1');
    expect(result!.measurementType).toBe('waist_cm');
    expect(result!.computedAt).toBeTruthy();
  });

  it('returns non-null for more than 3 values', () => {
    const result = computePersonalBaseline('u2', 'hip_cm', [80, 82, 84, 86]);
    expect(result).not.toBeNull();
    expect(result!.sampleSize).toBe(4);
    // std-dev of [80,82,84,86]: mean=83, var=((9+1+1+9)/3)=20/3, std=sqrt(20/3)~2.582
    expect(result!.stdDev).toBeCloseTo(Math.sqrt(20 / 3), 3);
  });

  it('computedAt is a valid ISO-8601 string', () => {
    const result = computePersonalBaseline('u1', 'waist_cm', [10, 12, 14]);
    const d = new Date(result!.computedAt);
    expect(isNaN(d.getTime())).toBe(false);
  });
});

// ============================================================
// isOutlier
// ============================================================

describe('isOutlier', () => {
  it('returns true for a value more than 2 sigma above mean', () => {
    // Values [10, 10, 10]: mean=10, std=0 (all identical). Use [10, 12, 14] so std=2.
    // 3 sigma above mean 12 = 12 + 3*2 = 18.
    const recentValues = [10, 12, 14]; // mean=12, std=2
    expect(isOutlier(18, recentValues)).toBe(true);
  });

  it('returns false for a value 1 sigma above mean', () => {
    // 1 sigma above mean 12 = 14. (14-12)/2 = 1 <= 2 => not outlier
    const recentValues = [10, 12, 14];
    expect(isOutlier(14, recentValues)).toBe(false);
  });

  it('returns false when std-dev is 0 even if new value differs', () => {
    const recentValues = [10, 10, 10]; // std = 0
    expect(isOutlier(99, recentValues)).toBe(false);
  });

  it('returns false for empty recentValues', () => {
    expect(isOutlier(100, [])).toBe(false);
  });

  it('uses default threshold of 2 sigma', () => {
    // (value - mean) / std = 2.001 => outlier
    const recentValues = [10, 12, 14]; // mean=12, std=2
    expect(isOutlier(16.002, recentValues)).toBe(true);  // z ~ 2.001
    expect(isOutlier(15.999, recentValues)).toBe(false); // z ~ 1.9995
  });

  it('respects custom thresholdSigma', () => {
    const recentValues = [10, 12, 14];
    // z = (15 - 12) / 2 = 1.5 => not outlier at threshold=2, but is at threshold=1
    expect(isOutlier(15, recentValues, 1)).toBe(true);
    expect(isOutlier(15, recentValues, 2)).toBe(false);
  });

  it('returns true for a value more than 2 sigma below mean', () => {
    const recentValues = [10, 12, 14];
    // 3 sigma below mean 12 = 12 - 3*2 = 6.
    expect(isOutlier(6, recentValues)).toBe(true);
  });
});

// ============================================================
// smoothTrendForDisplay
// ============================================================

describe('smoothTrendForDisplay', () => {
  it('returns input unchanged when baseline is null', () => {
    const raw = [10, 15, 12, 18];
    const result = smoothTrendForDisplay(raw, null);
    expect(result).toEqual(raw);
  });

  it('first element equals raw[0] regardless of baseline', () => {
    const baseline: PersonalBaseline = {
      userId: 'u1',
      measurementType: 'waist_cm',
      stdDev: 2,
      sampleSize: 3,
      computedAt: new Date().toISOString(),
    };
    const raw = [50, 55, 48, 52];
    const result = smoothTrendForDisplay(raw, baseline);
    expect(result[0]).toBe(50);
  });

  it('subsequent values are blended (not equal to raw) when baseline non-null and K < 1', () => {
    // With std=5, mean~50, K = 1/(1+5/50) = 1/1.1 ~ 0.909. K < 1 means smoothed != raw.
    const baseline: PersonalBaseline = {
      userId: 'u1',
      measurementType: 'waist_cm',
      stdDev: 5,
      sampleSize: 3,
      computedAt: new Date().toISOString(),
    };
    const raw = [50, 60, 40, 55];
    const result = smoothTrendForDisplay(raw, baseline);
    expect(result).toHaveLength(4);
    expect(result[0]).toBe(50);
    // result[1] = 50 + K*(60-50) = 50 + K*10 < 60 since K < 1
    expect(result[1]).toBeGreaterThan(50);
    expect(result[1]).toBeLessThan(60);
  });

  it('returns a copy, not the original array reference', () => {
    const raw = [10, 20, 30];
    const result = smoothTrendForDisplay(raw, null);
    expect(result).not.toBe(raw);
  });

  it('returns empty array for empty input', () => {
    const baseline: PersonalBaseline = {
      userId: 'u1',
      measurementType: 'waist_cm',
      stdDev: 2,
      sampleSize: 3,
      computedAt: new Date().toISOString(),
    };
    expect(smoothTrendForDisplay([], baseline)).toHaveLength(0);
  });

  it('K is clamped to 0.1 when std-dev is very large relative to mean', () => {
    // std=1000, mean=1 => K = 1/(1+1000/1) = ~0.001 => clamped to 0.1
    const baseline: PersonalBaseline = {
      userId: 'u1',
      measurementType: 'waist_cm',
      stdDev: 1000,
      sampleSize: 10,
      computedAt: new Date().toISOString(),
    };
    const raw = [1, 100];
    const result = smoothTrendForDisplay(raw, baseline);
    // result[1] = 1 + 0.1*(100-1) = 1 + 9.9 = 10.9
    expect(result[1]).toBeCloseTo(10.9, 1);
  });
});

// ============================================================
// confidenceIntervalFromBaseline
// ============================================================

describe('confidenceIntervalFromBaseline', () => {
  it('returns null when baseline is null', () => {
    expect(confidenceIntervalFromBaseline(100, null)).toBeNull();
  });

  it('value=100 std-dev=5 => low~90.2 high~109.8', () => {
    const baseline: PersonalBaseline = {
      userId: 'u1',
      measurementType: 'waist_cm',
      stdDev: 5,
      sampleSize: 3,
      computedAt: new Date().toISOString(),
    };
    const result = confidenceIntervalFromBaseline(100, baseline);
    expect(result).not.toBeNull();
    // 1.96 * 5 = 9.8
    expect(result!.low).toBeCloseTo(90.2, 1);
    expect(result!.high).toBeCloseTo(109.8, 1);
  });

  it('uses exactly 1.96 * std-dev as half-width', () => {
    const baseline: PersonalBaseline = {
      userId: 'u1',
      measurementType: 'waist_cm',
      stdDev: 10,
      sampleSize: 5,
      computedAt: new Date().toISOString(),
    };
    const result = confidenceIntervalFromBaseline(50, baseline);
    const halfWidth = 1.96 * 10;
    expect(result!.low).toBeCloseTo(50 - halfWidth, 5);
    expect(result!.high).toBeCloseTo(50 + halfWidth, 5);
  });

  it('zero std-dev => CI of zero width', () => {
    const baseline: PersonalBaseline = {
      userId: 'u1',
      measurementType: 'waist_cm',
      stdDev: 0,
      sampleSize: 3,
      computedAt: new Date().toISOString(),
    };
    const result = confidenceIntervalFromBaseline(75, baseline);
    expect(result!.low).toBeCloseTo(75, 5);
    expect(result!.high).toBeCloseTo(75, 5);
  });
});
