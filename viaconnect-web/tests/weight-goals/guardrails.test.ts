// Prompt 173 Task 3 (rebuild on main 2026-06-03): Weight Goals guardrail
// math unit suite.
//
// Covers the PURE helpers in src/lib/weight-goals/guardrails.ts:
//   * bmiFromKgCm           BMI from weight-kg + height-cm (+ fail-safe nulls).
//   * kgToLbs / lbsToKg     unit conversions + round-trip identity.
//   * evaluateGoalWeight    plausible vs implausible targets, the no-height
//                           soft pass, and the exactly-18.5 healthy-range
//                           boundary.
//
// Direction (lose/gain/maintain) is intentionally NOT tested here: it is
// owned by the DB trigger and previewed by previewGoalDirection
// (accessor.test.ts).

import { describe, it, expect } from 'vitest';
import {
  LBS_PER_KG,
  kgToLbs,
  lbsToKg,
  bmiFromKgCm,
  evaluateGoalWeight,
  GOAL_BMI_MIN,
  GOAL_BMI_MAX,
  HEALTHY_BMI_MIN,
} from '@/lib/weight-goals/guardrails';

describe('bmiFromKgCm', () => {
  it('computes a known BMI (70 kg, 175 cm ~= 22.86)', () => {
    const bmi = bmiFromKgCm(70, 175);
    expect(bmi).not.toBeNull();
    expect(bmi as number).toBeCloseTo(22.857, 2);
  });

  it('computes BMI at the healthy lower bound (exactly 18.5)', () => {
    const bmi = bmiFromKgCm(56.65625, 175);
    expect(bmi as number).toBeCloseTo(18.5, 5);
  });

  it('returns null for missing / non-positive / non-finite inputs', () => {
    expect(bmiFromKgCm(null, 175)).toBeNull();
    expect(bmiFromKgCm(70, null)).toBeNull();
    expect(bmiFromKgCm(undefined, undefined)).toBeNull();
    expect(bmiFromKgCm(0, 175)).toBeNull();
    expect(bmiFromKgCm(70, 0)).toBeNull();
    expect(bmiFromKgCm(-70, 175)).toBeNull();
    expect(bmiFromKgCm(Number.NaN, 175)).toBeNull();
    expect(bmiFromKgCm(70, Number.POSITIVE_INFINITY)).toBeNull();
  });
});

describe('kg <-> lbs conversion', () => {
  it('uses the canonical 2.20462 factor', () => {
    expect(LBS_PER_KG).toBe(2.20462);
    expect(kgToLbs(1)).toBeCloseTo(2.20462, 5);
    expect(lbsToKg(2.20462)).toBeCloseTo(1, 5);
  });

  it('converts a typical bodyweight both ways', () => {
    expect(kgToLbs(70)).toBeCloseTo(154.32, 1);
    expect(lbsToKg(154)).toBeCloseTo(69.85, 1);
  });

  it('round-trips kg -> lbs -> kg to the same value', () => {
    for (const kg of [45, 68.5, 90, 130.25]) {
      expect(lbsToKg(kgToLbs(kg))).toBeCloseTo(kg, 6);
    }
  });
});

describe('evaluateGoalWeight: plausible vs implausible targets', () => {
  const HEIGHT_CM = 175;

  it('accepts a plausible mid-range target (75 kg at 175 cm)', () => {
    const r = evaluateGoalWeight(75, HEIGHT_CM);
    expect(r.isValid).toBe(true);
    expect(r.plausibility).toBe('ok');
    expect(r.belowHealthyRange).toBe(false);
    expect(r.targetBmi as number).toBeCloseTo(24.49, 1);
  });

  it('rejects a non-numeric goal weight', () => {
    const r = evaluateGoalWeight(Number.NaN, HEIGHT_CM);
    expect(r.isValid).toBe(false);
    expect(r.plausibility).toBe('not_a_number');
  });

  it('rejects a non-positive goal weight (mirrors DB > 0 CHECK)', () => {
    expect(evaluateGoalWeight(0, HEIGHT_CM).plausibility).toBe('not_positive');
    expect(evaluateGoalWeight(-5, HEIGHT_CM).plausibility).toBe('not_positive');
    expect(evaluateGoalWeight(0, HEIGHT_CM).isValid).toBe(false);
  });

  it('rejects an implausibly low target (below GOAL_BMI_MIN)', () => {
    const r = evaluateGoalWeight(35, HEIGHT_CM);
    expect(r.isValid).toBe(false);
    expect(r.plausibility).toBe('below_band');
    expect(r.targetBmi as number).toBeLessThan(GOAL_BMI_MIN);
  });

  it('rejects an implausibly high target (above GOAL_BMI_MAX, e.g. lbs typed as kg)', () => {
    const r = evaluateGoalWeight(200, HEIGHT_CM);
    expect(r.isValid).toBe(false);
    expect(r.plausibility).toBe('above_band');
    expect(r.targetBmi as number).toBeGreaterThan(GOAL_BMI_MAX);
  });

  it('treats the band as inclusive at both edges', () => {
    const kgAtMin = GOAL_BMI_MIN * (HEIGHT_CM / 100) ** 2;
    const kgAtMax = GOAL_BMI_MAX * (HEIGHT_CM / 100) ** 2;
    expect(evaluateGoalWeight(kgAtMin, HEIGHT_CM).isValid).toBe(true);
    expect(evaluateGoalWeight(kgAtMax, HEIGHT_CM).isValid).toBe(true);
  });
});

describe('evaluateGoalWeight: sub-18.5 healthy-range note', () => {
  const HEIGHT_CM = 175;

  it('flags belowHealthyRange for a valid-but-low target (BMI < 18.5)', () => {
    const r = evaluateGoalWeight(50, HEIGHT_CM);
    expect(r.isValid).toBe(true);
    expect(r.plausibility).toBe('ok');
    expect(r.belowHealthyRange).toBe(true);
    expect(r.targetBmi as number).toBeLessThan(HEALTHY_BMI_MIN);
  });

  it('does NOT flag the note at exactly BMI 18.5 (boundary is healthy, inclusive)', () => {
    const r = evaluateGoalWeight(56.65625, HEIGHT_CM);
    expect(r.isValid).toBe(true);
    expect(r.targetBmi as number).toBeCloseTo(18.5, 5);
    expect(r.belowHealthyRange).toBe(false);
  });

  it('does NOT flag the note just above 18.5', () => {
    const r = evaluateGoalWeight(57.5, HEIGHT_CM);
    expect(r.belowHealthyRange).toBe(false);
  });
});

describe('evaluateGoalWeight: no-height soft pass', () => {
  it('soft-passes a positive goal weight when height is missing (cannot band-check)', () => {
    const r = evaluateGoalWeight(72, null);
    expect(r.isValid).toBe(true);
    expect(r.plausibility).toBe('no_height');
    expect(r.targetBmi).toBeNull();
    expect(r.belowHealthyRange).toBe(false);
  });

  it('still rejects a non-positive goal weight even without a height', () => {
    expect(evaluateGoalWeight(0, null).isValid).toBe(false);
    expect(evaluateGoalWeight(0, null).plausibility).toBe('not_positive');
  });
});
