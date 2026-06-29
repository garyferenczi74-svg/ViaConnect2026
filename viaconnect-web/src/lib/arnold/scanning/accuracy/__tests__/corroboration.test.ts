// Task 6 (Prompt 210c) - TDD for back-view corroboration + L/R depth averaging + asymmetry.
// Pure helpers in accuracy/corroboration.ts.
//
// RED phase: tests written BEFORE the implementation file exists.
// GREEN phase: implementation added, all tests pass.

import { describe, it, expect } from 'vitest';
import {
  averageDepths,
  lrAsymmetryScore,
  lrCorroborationScore,
  fbCorroborationScore,
  aggregateLrCorroboration,
  aggregateFbCorroboration,
  aggregateLrAsymmetry,
  LR_DISAGREEMENT_SCALE_CM,
  FB_DISAGREEMENT_SCALE_CM,
  SINGLE_SOURCE_CREDIT,
} from '../corroboration';

// ----------------------------------------------------------------------------
// averageDepths
// Test 4: both null -> UNKNOWN (null), never fabricated
// Test 3: one null -> uses the other (no fabrication)
// Test 1: identical -> average equals that value (zero asymmetry case)
// Test 2: divergent -> arithmetic mean
// ----------------------------------------------------------------------------

describe('averageDepths', () => {
  it('returns null when both inputs are null (RULE 9 - no fabrication)', () => {
    expect(averageDepths(null, null)).toBeNull();
  });

  it('returns the non-null value when left is null (single-source, no fabrication)', () => {
    expect(averageDepths(null, 24)).toBe(24);
  });

  it('returns the non-null value when right is null (single-source, no fabrication)', () => {
    expect(averageDepths(22, null)).toBe(22);
  });

  it('returns the value unchanged for identical L/R depths (zero asymmetry case)', () => {
    expect(averageDepths(25, 25)).toBe(25);
  });

  it('returns the arithmetic mean of two different depths (divergent case)', () => {
    expect(averageDepths(20, 30)).toBe(25);
    expect(averageDepths(18, 24)).toBe(21);
  });

  it('averages fractional values correctly', () => {
    expect(averageDepths(22.4, 23.6)).toBeCloseTo(23.0, 10);
  });
});

// ----------------------------------------------------------------------------
// lrAsymmetryScore
// Test 1: identical L/R -> zero asymmetry
// Test 2: divergent L/R -> positive asymmetry
// Test 3: one null -> null (cannot measure asymmetry from single source)
// ----------------------------------------------------------------------------

describe('lrAsymmetryScore', () => {
  it('returns 0 (symmetric) for identical L/R depths (Test 1)', () => {
    expect(lrAsymmetryScore(25, 25)).toBe(0);
  });

  it('returns null when left depth is null (cannot assess asymmetry)', () => {
    expect(lrAsymmetryScore(null, 25)).toBeNull();
  });

  it('returns null when right depth is null', () => {
    expect(lrAsymmetryScore(25, null)).toBeNull();
  });

  it('returns null when both depths are null', () => {
    expect(lrAsymmetryScore(null, null)).toBeNull();
  });

  it('returns a positive asymmetry for divergent L/R depths (Test 2)', () => {
    // |20 - 30| / avg(20, 30) = 10 / 25 = 0.4
    const score = lrAsymmetryScore(20, 30);
    expect(score).toBeCloseTo(0.4, 5);
    expect(score).toBeGreaterThan(0);
  });

  it('clamps asymmetry to [0, 1] for extreme divergence', () => {
    // One side 100x the other: clamped to 1
    const score = lrAsymmetryScore(1, 200);
    expect(score).toBeLessThanOrEqual(1);
    expect(score).toBeGreaterThanOrEqual(0);
  });

  it('asymmetry is symmetric: same result regardless of L/R order', () => {
    expect(lrAsymmetryScore(20, 30)).toBeCloseTo(lrAsymmetryScore(30, 20) ?? 0, 10);
  });
});

// ----------------------------------------------------------------------------
// lrCorroborationScore
// Test 1: identical L/R -> 1.0 (high corroboration)
// Test 2: divergent L/R -> reduced score (lowered corroboration)
// Test 3: one null -> SINGLE_SOURCE_CREDIT (partial corroboration, no fabrication)
// Test 4: both null -> 0 (no data, no corroboration)
// ----------------------------------------------------------------------------

describe('lrCorroborationScore', () => {
  it('returns 1.0 for identical L/R depths (Test 1 - high corroboration)', () => {
    expect(lrCorroborationScore(25, 25)).toBe(1.0);
    expect(lrCorroborationScore(18.5, 18.5)).toBe(1.0);
  });

  it('returns a reduced score for moderate L/R disagreement (Test 2)', () => {
    // diff = 2.5, scale = LR_DISAGREEMENT_SCALE_CM -> 1 - 2.5/scale
    const score = lrCorroborationScore(25, 27.5);
    const expected = 1 - 2.5 / LR_DISAGREEMENT_SCALE_CM;
    expect(score).toBeCloseTo(expected, 5);
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(1);
  });

  it('returns 0 when L/R disagreement >= LR_DISAGREEMENT_SCALE_CM', () => {
    // diff >= scale -> clamped to 0
    expect(lrCorroborationScore(20, 25)).toBe(0); // diff exactly at scale
    expect(lrCorroborationScore(20, 30)).toBe(0); // diff beyond scale
  });

  it('returns SINGLE_SOURCE_CREDIT when left is null (Test 3 - no fabrication)', () => {
    expect(lrCorroborationScore(null, 25)).toBe(SINGLE_SOURCE_CREDIT);
  });

  it('returns SINGLE_SOURCE_CREDIT when right is null (Test 3 - single source)', () => {
    expect(lrCorroborationScore(25, null)).toBe(SINGLE_SOURCE_CREDIT);
  });

  it('returns 0 when both L/R depths are null (Test 4 - no data)', () => {
    expect(lrCorroborationScore(null, null)).toBe(0);
  });

  it('score is always in [0, 1]', () => {
    const cases: [number | null, number | null][] = [
      [0, 0], [10, 20], [null, 5], [null, null], [30, 30],
    ];
    for (const [a, b] of cases) {
      const s = lrCorroborationScore(a, b);
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThanOrEqual(1);
    }
  });
});

// ----------------------------------------------------------------------------
// fbCorroborationScore
// Test 5: back-vs-front width mismatch -> lowered score
// Front and back at the same body level should agree closely when pose is good.
// ----------------------------------------------------------------------------

describe('fbCorroborationScore', () => {
  it('returns 1.0 for identical front and back widths', () => {
    expect(fbCorroborationScore(40, 40)).toBe(1.0);
  });

  it('returns 0 for disagreement >= FB_DISAGREEMENT_SCALE_CM (Test 5)', () => {
    // diff = FB_DISAGREEMENT_SCALE_CM -> 0
    expect(fbCorroborationScore(40, 40 + FB_DISAGREEMENT_SCALE_CM)).toBe(0);
    expect(fbCorroborationScore(40, 40 + FB_DISAGREEMENT_SCALE_CM + 2)).toBe(0);
  });

  it('returns a partial score for moderate front-back disagreement', () => {
    // diff = FB_DISAGREEMENT_SCALE_CM / 2 -> score = 0.5
    const diff = FB_DISAGREEMENT_SCALE_CM / 2;
    const score = fbCorroborationScore(40, 40 + diff);
    expect(score).toBeCloseTo(0.5, 5);
  });

  it('returns SINGLE_SOURCE_CREDIT when back width is null (no back view)', () => {
    expect(fbCorroborationScore(40, null)).toBe(SINGLE_SOURCE_CREDIT);
  });

  it('returns SINGLE_SOURCE_CREDIT when front width is null', () => {
    expect(fbCorroborationScore(null, 40)).toBe(SINGLE_SOURCE_CREDIT);
  });

  it('returns 0 when both front and back widths are null', () => {
    expect(fbCorroborationScore(null, null)).toBe(0);
  });

  it('score is always in [0, 1]', () => {
    const cases: [number | null, number | null][] = [
      [40, 40], [40, 50], [null, 40], [null, null], [20, 20],
    ];
    for (const [f, b] of cases) {
      const s = fbCorroborationScore(f, b);
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThanOrEqual(1);
    }
  });
});

// ----------------------------------------------------------------------------
// Aggregate helpers
// ----------------------------------------------------------------------------

describe('aggregateLrCorroboration', () => {
  it('returns 0 for empty input (no levels measured)', () => {
    expect(aggregateLrCorroboration([])).toBe(0);
  });

  it('returns the single value when only one level', () => {
    expect(aggregateLrCorroboration([0.8])).toBeCloseTo(0.8, 10);
  });

  it('returns the arithmetic mean of provided scores', () => {
    expect(aggregateLrCorroboration([1, 0.5, 0])).toBeCloseTo(0.5, 5);
    expect(aggregateLrCorroboration([0.8, 0.6])).toBeCloseTo(0.7, 5);
  });
});

describe('aggregateFbCorroboration', () => {
  it('returns 0 for empty input', () => {
    expect(aggregateFbCorroboration([])).toBe(0);
  });

  it('returns the arithmetic mean of provided scores', () => {
    expect(aggregateFbCorroboration([1, 0])).toBeCloseTo(0.5, 5);
  });
});

describe('aggregateLrAsymmetry', () => {
  it('returns null when all inputs are null (single-source or no data)', () => {
    expect(aggregateLrAsymmetry([null, null, null])).toBeNull();
  });

  it('returns null for empty input', () => {
    expect(aggregateLrAsymmetry([])).toBeNull();
  });

  it('returns the mean of non-null scores, ignoring nulls', () => {
    // [0.4, null, 0.6] -> mean(0.4, 0.6) = 0.5
    expect(aggregateLrAsymmetry([0.4, null, 0.6])).toBeCloseTo(0.5, 5);
  });

  it('returns the value unchanged for a single non-null entry', () => {
    expect(aggregateLrAsymmetry([null, 0.3, null])).toBeCloseTo(0.3, 10);
  });
});

// ----------------------------------------------------------------------------
// Constants: LR_DISAGREEMENT_SCALE_CM, FB_DISAGREEMENT_SCALE_CM, SINGLE_SOURCE_CREDIT
// These are exported named consts (Section 17.5 - no magic numbers).
// ----------------------------------------------------------------------------

describe('exported named constants', () => {
  it('LR_DISAGREEMENT_SCALE_CM is a positive finite number', () => {
    expect(LR_DISAGREEMENT_SCALE_CM).toBeGreaterThan(0);
    expect(Number.isFinite(LR_DISAGREEMENT_SCALE_CM)).toBe(true);
  });

  it('FB_DISAGREEMENT_SCALE_CM is a positive finite number', () => {
    expect(FB_DISAGREEMENT_SCALE_CM).toBeGreaterThan(0);
    expect(Number.isFinite(FB_DISAGREEMENT_SCALE_CM)).toBe(true);
  });

  it('SINGLE_SOURCE_CREDIT is in (0, 1) exclusive', () => {
    expect(SINGLE_SOURCE_CREDIT).toBeGreaterThan(0);
    expect(SINGLE_SOURCE_CREDIT).toBeLessThan(1);
  });
});
