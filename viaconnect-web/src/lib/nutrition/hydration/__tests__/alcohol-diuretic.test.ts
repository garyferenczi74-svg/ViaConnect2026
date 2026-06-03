/**
 * Prompt 172e Phase C Workstream 2: alcohol diuretic threshold + reduction
 * pure math tests.
 *
 * Per spec section 5.3: a single standard drink retains fluid comparably
 * to water, so the base coefficient is 1.00. Above a daily cumulative
 * threshold (ALCOHOL_DIURETIC_THRESHOLD_DRINKS, default 3), apply a
 * conservative linear reduction toward an effective floor (0.80), reached
 * after 3 more drinks (so 6 drinks total). The ramp never compounds
 * beyond the floor. No steep penalty curve beyond the Maughan evidence.
 *
 * Kelsey reviews the threshold and the surfaced copy. The math layer
 * runs in every mode; the copy is suppressed in safety mode (spec section
 * 8 and shouldShowDiureticCopy in picker-state.ts).
 */

import { describe, it, expect, afterEach } from 'vitest';
import {
  applyAlcoholDiureticReduction,
  getAlcoholDiureticThresholdDrinks,
  ALCOHOL_DIURETIC_THRESHOLD_DEFAULT,
  ALCOHOL_DIURETIC_FLOOR,
  ALCOHOL_DIURETIC_RAMP_DRINKS,
} from '../alcohol-config';

describe('Prompt 172e Phase C alcohol diuretic config defaults', () => {
  afterEach(() => {
    delete process.env.ALCOHOL_DIURETIC_THRESHOLD_DRINKS;
    delete process.env.NEXT_PUBLIC_ALCOHOL_DIURETIC_THRESHOLD_DRINKS;
  });

  it('default threshold is 3 standard drinks per day', () => {
    expect(ALCOHOL_DIURETIC_THRESHOLD_DEFAULT).toBe(3);
    expect(getAlcoholDiureticThresholdDrinks()).toBe(3);
  });

  it('floor coefficient is 0.80 (never reduce below this even at high dose)', () => {
    expect(ALCOHOL_DIURETIC_FLOOR).toBe(0.8);
  });

  it('ramp width is 3 drinks (linear from 1.00 toward 0.80 over 3 drinks past threshold)', () => {
    expect(ALCOHOL_DIURETIC_RAMP_DRINKS).toBe(3);
  });

  it('env override accepts integer values', () => {
    process.env.ALCOHOL_DIURETIC_THRESHOLD_DRINKS = '5';
    expect(getAlcoholDiureticThresholdDrinks()).toBe(5);
  });

  it('env override clamps non finite to default', () => {
    process.env.ALCOHOL_DIURETIC_THRESHOLD_DRINKS = 'not a number';
    expect(getAlcoholDiureticThresholdDrinks()).toBe(3);
  });

  it('env override clamps negative to default', () => {
    process.env.ALCOHOL_DIURETIC_THRESHOLD_DRINKS = '-2';
    expect(getAlcoholDiureticThresholdDrinks()).toBe(3);
  });

  it('env override clamps unreasonably high values to default', () => {
    process.env.ALCOHOL_DIURETIC_THRESHOLD_DRINKS = '100';
    expect(getAlcoholDiureticThresholdDrinks()).toBe(3);
  });
});

describe('Prompt 172e Phase C applyAlcoholDiureticReduction at and below threshold', () => {
  it('returns hydration unchanged when drinks count is 0', () => {
    expect(
      applyAlcoholDiureticReduction(355, 0, 3, 0.8),
    ).toBe(355);
  });

  it('returns hydration unchanged when drinks count is at the threshold (3 of 3)', () => {
    expect(
      applyAlcoholDiureticReduction(355, 3, 3, 0.8),
    ).toBe(355);
  });

  it('returns hydration unchanged at 1 drink (well below threshold)', () => {
    expect(
      applyAlcoholDiureticReduction(355, 1, 3, 0.8),
    ).toBe(355);
  });

  it('returns hydration unchanged at 2 drinks (still below threshold)', () => {
    expect(
      applyAlcoholDiureticReduction(355, 2, 3, 0.8),
    ).toBe(355);
  });
});

describe('Prompt 172e Phase C applyAlcoholDiureticReduction linear ramp above threshold', () => {
  it('drinks = 4 reduces hydration by approx 1/3 of the (1.00 to 0.80) span', () => {
    // ramp: 1 drink past threshold of 3, ramp width 3 -> reduction = 1/3 * 0.20 = 0.0667
    // coefficient = 1.00 - 0.0667 = 0.9333
    // 355 * 0.9333 = 331.33
    const result = applyAlcoholDiureticReduction(355, 4, 3, 0.8);
    expect(result).toBeCloseTo(331.33, 2);
  });

  it('drinks = 5 reduces by 2/3 of the span (coefficient 0.8667)', () => {
    // ramp: 2 drinks past threshold, 2/3 * 0.20 = 0.1333
    // coefficient = 0.8667; 355 * 0.8667 = 307.67
    const result = applyAlcoholDiureticReduction(355, 5, 3, 0.8);
    expect(result).toBeCloseTo(307.67, 2);
  });

  it('drinks = 6 reaches the floor 0.80 exactly (coefficient = 0.80)', () => {
    // ramp width 3 reached at 6 drinks (3 + 3) -> coefficient = floor = 0.80
    // 355 * 0.80 = 284
    expect(applyAlcoholDiureticReduction(355, 6, 3, 0.8)).toBeCloseTo(284, 2);
  });

  it('drinks beyond ramp width stay clamped at floor (does not go below 0.80)', () => {
    // 10 drinks well past ramp; coefficient stays 0.80
    expect(applyAlcoholDiureticReduction(355, 10, 3, 0.8)).toBeCloseTo(284, 2);
  });

  it('drinks = 100 (extreme) still clamps to floor; never zero', () => {
    expect(applyAlcoholDiureticReduction(355, 100, 3, 0.8)).toBeCloseTo(284, 2);
  });
});

describe('Prompt 172e Phase C applyAlcoholDiureticReduction edge cases', () => {
  it('zero hydration in returns zero out (no negative)', () => {
    expect(applyAlcoholDiureticReduction(0, 5, 3, 0.8)).toBe(0);
  });

  it('negative hydration in returns zero (defensive)', () => {
    expect(applyAlcoholDiureticReduction(-10, 5, 3, 0.8)).toBe(0);
  });

  it('non finite hydration in returns zero (defensive)', () => {
    expect(applyAlcoholDiureticReduction(Number.NaN, 5, 3, 0.8)).toBe(0);
  });

  it('non finite drink count treated as zero (defensive)', () => {
    expect(applyAlcoholDiureticReduction(355, Number.NaN, 3, 0.8)).toBe(355);
  });

  it('custom env threshold of 5 means 5 drinks pass through unchanged', () => {
    expect(applyAlcoholDiureticReduction(500, 5, 5, 0.8)).toBe(500);
  });

  it('custom env threshold of 5: 6 drinks hits the ramp', () => {
    // 1 drink past threshold of 5, ramp width 3 -> 1/3 * 0.20 = 0.0667 reduction
    // coefficient 0.9333, 500 * 0.9333 = 466.67
    expect(applyAlcoholDiureticReduction(500, 6, 5, 0.8)).toBeCloseTo(466.67, 2);
  });

  it('floor parameter is honored when explicitly set differently', () => {
    // Custom floor 0.70 instead of 0.80 -> at 6 drinks (3 past threshold of 3),
    // coefficient = 0.70, 500 * 0.70 = 350
    expect(applyAlcoholDiureticReduction(500, 6, 3, 0.7)).toBeCloseTo(350, 2);
  });
});

describe('Prompt 172e Phase C math layer always runs', () => {
  it('reduction is deterministic and pure (same inputs produce identical output)', () => {
    const a = applyAlcoholDiureticReduction(355, 5, 3, 0.8);
    const b = applyAlcoholDiureticReduction(355, 5, 3, 0.8);
    expect(a).toBe(b);
  });

  it('reduction is monotonic (more drinks never increases coefficient)', () => {
    const at3 = applyAlcoholDiureticReduction(355, 3, 3, 0.8);
    const at4 = applyAlcoholDiureticReduction(355, 4, 3, 0.8);
    const at5 = applyAlcoholDiureticReduction(355, 5, 3, 0.8);
    const at6 = applyAlcoholDiureticReduction(355, 6, 3, 0.8);
    expect(at3).toBeGreaterThanOrEqual(at4);
    expect(at4).toBeGreaterThanOrEqual(at5);
    expect(at5).toBeGreaterThanOrEqual(at6);
  });
});
