// Task 11 (Prompt 210c) - TDD tests for the validation harness.
// Write tests first (RED against non-existent validationHarness.ts), then implement (GREEN).
//
// Covers:
//   1. Hand-computed MAPE, ICC, bias, within-tolerance on tiny known fixtures.
//   2. Train/held-out split: held-out n is reported separately from full-set n.
//   3. Calibration fit produces a NEW versioned config (no in-place mutation).
//   4. "Unproven when no real cohort": cohortStatus is 'unproven' and
//      heldOutPass is false when the labeled set is too small.
//   5. heldOutPass is false when metrics do not meet the thresholds.
//
// Section 17.2: the 90 percent claim is shown ONLY after heldOutPass on a real
// labeled cohort. Synthetic fixtures must NOT accidentally produce a proven pass.

import { describe, it, expect } from 'vitest';
import {
  runValidation,
  MINIMUM_SAMPLES_PER_REGION,
  TRAIN_SPLIT_RATIO,
  FACTOR_CLAMP_MIN,
  FACTOR_CLAMP_MAX,
  type LabeledSample,
  type RegionMetrics,
} from '../validationHarness';
import {
  CALIBRATION_VERSION,
  CORRECTION_FACTORS,
  getCorrectionFactor,
} from '../calibrationConfig';
import type { GirthRegion } from '../accuracyTargets';

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

/** Build n identical labeled samples for one region. */
function makeSamples(
  n: number,
  predictedCm: number,
  truthCm: number,
  region: GirthRegion,
): LabeledSample[] {
  return Array.from({ length: n }, () => ({ predictedCm, truthCm, region }));
}

/** One region with exactly matched predictions (zero error). */
function perfectSamples(n: number, region: GirthRegion, valueCm: number): LabeledSample[] {
  return Array.from({ length: n }, (_, i) => ({
    predictedCm: valueCm + i,
    truthCm: valueCm + i,
    region,
  }));
}

// ---------------------------------------------------------------------------
// 1. MAPE computation (hand-computed)
// ---------------------------------------------------------------------------

describe('MAPE computation', () => {
  it('MAPE is 0 for perfect predictions', () => {
    const samples = makeSamples(4, 100, 100, 'waist');
    const report = runValidation(samples);
    expect(report.perRegion.waist).toBeDefined();
    expect(report.perRegion.waist!.mape).toBeCloseTo(0, 10);
  });

  it('MAPE is exactly 10 when all predictions are 10 percent above truth', () => {
    // truth=100, predicted=110 -> APE=10% each -> MAPE=10
    const samples = makeSamples(4, 110, 100, 'waist');
    const report = runValidation(samples);
    expect(report.perRegion.waist!.mape).toBeCloseTo(10, 5);
  });

  it('MAPE is exactly 50 for a 50 percent overestimate', () => {
    const samples = makeSamples(3, 150, 100, 'hip');
    const report = runValidation(samples);
    expect(report.perRegion.hip!.mape).toBeCloseTo(50, 5);
  });

  it('MAPE averages absolute errors (symmetric over/underestimates)', () => {
    // truth=100, predicted alternates 110 and 90 -> APE=10 each -> MAPE=10
    const samples: LabeledSample[] = [
      { predictedCm: 110, truthCm: 100, region: 'waist' },
      { predictedCm: 90,  truthCm: 100, region: 'waist' },
    ];
    const report = runValidation(samples);
    expect(report.perRegion.waist!.mape).toBeCloseTo(10, 5);
  });
});

// ---------------------------------------------------------------------------
// 2. ICC computation (hand-computed, known inputs -> known ICC)
// ---------------------------------------------------------------------------

describe('ICC computation', () => {
  it('ICC is 1.0 for perfect predictions (zero within-subject variance)', () => {
    // perfect: M_i = x_i = y_i, SSW = 0, ICC = MSB/MSB = 1
    const samples = Array.from({ length: 5 }, (_, i) => ({
      predictedCm: 30 + i * 2,
      truthCm: 30 + i * 2,
      region: 'neck' as GirthRegion,
    }));
    const report = runValidation(samples);
    expect(report.perRegion.neck!.icc).toBeCloseTo(1.0, 5);
  });

  it('ICC is 0 when n < 2 (cannot compute correlation)', () => {
    const samples = [{ predictedCm: 100, truthCm: 100, region: 'chest' as GirthRegion }];
    const report = runValidation(samples);
    expect(report.perRegion.chest!.icc).toBe(0);
  });

  it('ICC is reduced by systematic bias (absolute agreement model)', () => {
    // truth=[30,32,28], predicted=[33,35,31] (+3 constant bias)
    // Hand-computed: M=[31.5,33.5,29.5], G=31.5
    // SSB=2*(0+4+4)=16, MSB=8
    // SSW=6*2.25=13.5, MSW=4.5
    // ICC=(8-4.5)/(8+4.5)=3.5/12.5=0.28
    const samples: LabeledSample[] = [
      { predictedCm: 33, truthCm: 30, region: 'neck' },
      { predictedCm: 35, truthCm: 32, region: 'neck' },
      { predictedCm: 31, truthCm: 28, region: 'neck' },
    ];
    const report = runValidation(samples);
    expect(report.perRegion.neck!.icc).toBeCloseTo(0.28, 5);
    // ICC < MIN_ICC (0.90) confirms systematic bias fails the accuracy gate
    expect(report.perRegion.neck!.icc).toBeLessThan(0.90);
  });

  it('ICC is in [0, 1] for all realistic inputs', () => {
    const samples: LabeledSample[] = [
      { predictedCm: 115, truthCm: 100, region: 'waist' },
      { predictedCm: 85,  truthCm: 100, region: 'waist' },
      { predictedCm: 115, truthCm: 100, region: 'waist' },
      { predictedCm: 85,  truthCm: 100, region: 'waist' },
    ];
    const report = runValidation(samples);
    expect(report.perRegion.waist!.icc).toBeGreaterThanOrEqual(0);
    expect(report.perRegion.waist!.icc).toBeLessThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// 3. Within-tolerance computation (hand-computed)
// ---------------------------------------------------------------------------

describe('within-tolerance pass rate', () => {
  it('100 percent pass rate when all predictions are on the boundary (waist 3cm band)', () => {
    // waist truth=25cm: max(10%*25=2.5, 3cm)=3cm tolerance.
    // predicted=28: |28-25|=3 <= 3 -> passes.
    const samples = makeSamples(4, 28, 25, 'waist');
    const report = runValidation(samples);
    expect(report.perRegion.waist!.withinTolerancePct).toBeCloseTo(1.0, 5);
  });

  it('0 percent pass rate when all predictions exceed the tolerance', () => {
    // waist truth=25cm: tolerance=3cm. predicted=29: |29-25|=4 > 3 -> fails.
    const samples = makeSamples(4, 29, 25, 'waist');
    const report = runValidation(samples);
    expect(report.perRegion.waist!.withinTolerancePct).toBeCloseTo(0, 5);
  });

  it('50 percent pass rate when half predictions are within tolerance', () => {
    const samples: LabeledSample[] = [
      { predictedCm: 28, truthCm: 25, region: 'waist' }, // |3| <= 3 passes
      { predictedCm: 29, truthCm: 25, region: 'waist' }, // |4| > 3 fails
    ];
    const report = runValidation(samples);
    expect(report.perRegion.waist!.withinTolerancePct).toBeCloseTo(0.5, 5);
  });

  it('uses 10 percent band for large truth values (waist 100cm: pct 10cm > region 3cm)', () => {
    // waist truth=100: max(10%*100=10, 3)=10cm tolerance.
    // predicted=110: |110-100|=10 <= 10 -> passes.
    // predicted=111: |111-100|=11 > 10 -> fails.
    const passing: LabeledSample[] = [{ predictedCm: 110, truthCm: 100, region: 'waist' }];
    const failing: LabeledSample[] = [{ predictedCm: 111, truthCm: 100, region: 'waist' }];
    expect(runValidation(passing).perRegion.waist!.withinTolerancePct).toBeCloseTo(1.0, 5);
    expect(runValidation(failing).perRegion.waist!.withinTolerancePct).toBeCloseTo(0, 5);
  });
});

// ---------------------------------------------------------------------------
// 4. Bias computation (hand-computed)
// ---------------------------------------------------------------------------

describe('bias computation', () => {
  it('bias is 0 for perfect predictions', () => {
    const samples = makeSamples(4, 100, 100, 'hip');
    const report = runValidation(samples);
    expect(report.perRegion.hip!.bias).toBeCloseTo(0, 10);
  });

  it('bias is +10 when predictions are 10 units above truth', () => {
    const samples = makeSamples(4, 110, 100, 'waist');
    const report = runValidation(samples);
    expect(report.perRegion.waist!.bias).toBeCloseTo(10, 5);
  });

  it('bias is negative when predictions are below truth', () => {
    const samples = makeSamples(4, 90, 100, 'hip');
    const report = runValidation(samples);
    expect(report.perRegion.hip!.bias).toBeCloseTo(-10, 5);
  });

  it('bias is 0 for symmetric over/underestimates', () => {
    const samples: LabeledSample[] = [
      { predictedCm: 110, truthCm: 100, region: 'chest' },
      { predictedCm: 90,  truthCm: 100, region: 'chest' },
    ];
    const report = runValidation(samples);
    expect(report.perRegion.chest!.bias).toBeCloseTo(0, 5);
  });
});

// ---------------------------------------------------------------------------
// 5. Train/held-out split: held-out metrics are reported separately
// ---------------------------------------------------------------------------

describe('train/held-out split', () => {
  it('perRegion.n equals total samples; heldOutPerRegion.n equals held-out count', () => {
    // 10 waist samples -> trainCount=round(10*0.8)=8, heldOut=2
    const n = 10;
    const samples = perfectSamples(n, 'waist', 80);
    const report = runValidation(samples);

    expect(report.perRegion.waist!.n).toBe(n);
    const expectedHeldOut = n - Math.min(n - 1, Math.max(1, Math.round(n * TRAIN_SPLIT_RATIO)));
    // heldOutPerRegion.n must be the complement
    expect(report.heldOutPerRegion.waist).toBeDefined();
    expect(report.heldOutPerRegion.waist!.n).toBe(expectedHeldOut);
    expect(report.heldOutPerRegion.waist!.n).toBeLessThan(n);
  });

  it('heldOutPerRegion.n is strictly less than perRegion.n for any n >= 2', () => {
    const samples = perfectSamples(5, 'neck', 36);
    const report = runValidation(samples);
    expect(report.heldOutPerRegion.neck).toBeDefined();
    expect(report.heldOutPerRegion.neck!.n).toBeLessThan(report.perRegion.neck!.n);
  });

  it('held-out metrics with perfect predictions show MAPE near 0 (fit scale stays ~1)', () => {
    // Perfect predictions: scale = mean(truth/pred) = 1. Adjusted held-out unchanged.
    const samples = perfectSamples(10, 'hip', 95);
    const report = runValidation(samples);
    expect(report.heldOutPerRegion.hip!.mape).toBeCloseTo(0, 5);
  });

  it('held-out MAPE is separate from full-set MAPE - a biased sample shrinks after fit', () => {
    // 10 waist samples with 50% overestimate: pred=150, truth=100.
    // Training scale = mean(100/150) = 0.667 -> clamped to FACTOR_CLAMP_MIN (0.85).
    // Adjusted held-out: 150 * 0.85 = 127.5 -> MAPE = 27.5%.
    // Full set MAPE = 50%; held-out MAPE after fit = 27.5% (different).
    const samples = makeSamples(10, 150, 100, 'waist');
    const report = runValidation(samples);
    expect(report.perRegion.waist!.mape).toBeCloseTo(50, 5);
    // After clamp-limited fit, held-out MAPE is lower but not zero
    expect(report.heldOutPerRegion.waist!.mape).toBeLessThan(50);
    expect(report.heldOutPerRegion.waist!.mape).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// 6. Calibration fit: produces NEW version, does NOT mutate CORRECTION_FACTORS
// ---------------------------------------------------------------------------

describe('calibration fit produces a new versioned config (no in-place mutation)', () => {
  it('fittedConfig.version is different from CALIBRATION_VERSION', () => {
    const samples = makeSamples(6, 110, 100, 'waist');
    const report = runValidation(samples);
    expect(report.fittedConfig.version).not.toBe(CALIBRATION_VERSION);
  });

  it('fittedConfig.version starts with v2-fitted (bumped from pre-fit baseline)', () => {
    const samples = makeSamples(6, 110, 100, 'waist');
    const report = runValidation(samples);
    expect(report.fittedConfig.version).toMatch(/^v2-fitted/);
  });

  it('fittedConfig.factors contains an entry for the labeled region', () => {
    const samples = makeSamples(6, 110, 100, 'waist');
    const report = runValidation(samples);
    expect(report.fittedConfig.factors.waist).toBeDefined();
  });

  it('fitted factors are within the clamped sane range [FACTOR_CLAMP_MIN, FACTOR_CLAMP_MAX]', () => {
    // Extreme overestimate (predicted=200, truth=100): scale=0.5 -> clamped to 0.85
    const samples = makeSamples(6, 200, 100, 'hip');
    const report = runValidation(samples);
    const entry = report.fittedConfig.factors.hip!;
    expect(entry.male).toBeGreaterThanOrEqual(FACTOR_CLAMP_MIN);
    expect(entry.male).toBeLessThanOrEqual(FACTOR_CLAMP_MAX);
    expect(entry.female).toBeGreaterThanOrEqual(FACTOR_CLAMP_MIN);
    expect(entry.female).toBeLessThanOrEqual(FACTOR_CLAMP_MAX);
  });

  it('fittedConfig.factors.waist.fittedMape is a number (training MAPE after fit)', () => {
    const samples = makeSamples(6, 110, 100, 'waist');
    const report = runValidation(samples);
    expect(typeof report.fittedConfig.factors.waist!.fittedMape).toBe('number');
  });

  it('CORRECTION_FACTORS in calibrationConfig are unchanged after runValidation', () => {
    // The live config must NOT be mutated by the harness.
    const beforeWaist = CORRECTION_FACTORS.waist_natural.male;
    runValidation(makeSamples(6, 150, 100, 'waist'));
    const afterWaist = CORRECTION_FACTORS.waist_natural.male;
    expect(afterWaist).toBe(beforeWaist);
  });

  it('fitted factors differ from live factors when systematic bias is present', () => {
    // 50% overestimate: scale < 1, so fitted factors < current factors
    const currentMale = getCorrectionFactor('waist_natural', 'male').factor;
    const samples = makeSamples(6, 150, 100, 'waist');
    const report = runValidation(samples);
    const fittedMale = report.fittedConfig.factors.waist!.male;
    // Clamped scale (0.85) * current factor should differ from current factor
    expect(fittedMale).not.toBe(currentMale);
    expect(fittedMale).toBeLessThan(currentMale);
  });
});

// ---------------------------------------------------------------------------
// 7. "Unproven when no real cohort" - Section 17.2 / Section 10.1
// ---------------------------------------------------------------------------

describe('cohortStatus is unproven when samples are below the minimum per region', () => {
  it('cohortStatus is unproven when every region has fewer than MINIMUM_SAMPLES_PER_REGION', () => {
    // Use perfect predictions but only 5 per region (< 30 minimum)
    const samples: LabeledSample[] = [
      ...makeSamples(5, 100, 100, 'waist'),
      ...makeSamples(5, 100, 100, 'hip'),
    ];
    const report = runValidation(samples);
    expect(report.cohortStatus).toBe('unproven');
  });

  it('cohortStatus is unproven for an empty labeled set', () => {
    const report = runValidation([]);
    expect(report.cohortStatus).toBe('unproven');
  });

  it('minimumCohortNote mentions the per-region minimum and total minimum', () => {
    const report = runValidation([]);
    expect(report.minimumCohortNote).toContain(String(MINIMUM_SAMPLES_PER_REGION));
    // Should mention the number of regions x minimum = total pairs
    expect(report.minimumCohortNote.length).toBeGreaterThan(20);
  });

  it('calibrationVersion field echoes CALIBRATION_VERSION', () => {
    const report = runValidation([]);
    expect(report.calibrationVersion).toBe(CALIBRATION_VERSION);
  });

  it('overallPass is false for empty labeled set', () => {
    expect(runValidation([]).overallPass).toBe(false);
  });

  it('heldOutPass is false for empty labeled set', () => {
    expect(runValidation([]).heldOutPass).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 8. heldOutPass is false when metrics do not meet all three thresholds
// ---------------------------------------------------------------------------

describe('heldOutPass is false when accuracy thresholds are not met', () => {
  it('heldOutPass is false when MAPE exceeds 10 percent after calibration', () => {
    // Alternating overestimate/underestimate: calibration scale ~1, MAPE stays high.
    // truth=100, predicted alternates 150/50: MAPE=50%, scale~=mean(100/150,100/50)=~1.
    // After fit, adjusted MAPE remains ~50% > 10%. heldOutPass must be false.
    const samples: LabeledSample[] = [
      ...Array.from({ length: 5 }, () => ({ predictedCm: 150, truthCm: 100, region: 'waist' as GirthRegion })),
      ...Array.from({ length: 5 }, () => ({ predictedCm: 50,  truthCm: 100, region: 'waist' as GirthRegion })),
    ];
    const report = runValidation(samples);
    expect(report.heldOutPass).toBe(false);
  });

  it('heldOutPass is false when ICC is below MIN_ICC', () => {
    // Flat predictions (all same value) against variable truth -> ICC near 0.
    // truth=[90,100,110,90,100,110,...], predicted=[100,100,100,...] -> ICC~0.
    const truths = [90, 100, 110, 90, 100, 110, 90, 100, 110, 90];
    const samples: LabeledSample[] = truths.map(t => ({
      predictedCm: 100,
      truthCm: t,
      region: 'neck' as GirthRegion,
    }));
    const report = runValidation(samples);
    expect(report.heldOutPass).toBe(false);
  });

  it('overallPass is false when predictions are 50 percent off', () => {
    const samples = makeSamples(6, 150, 100, 'hip');
    const report = runValidation(samples);
    expect(report.overallPass).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 9. n field is correct in per-region and held-out metrics
// ---------------------------------------------------------------------------

describe('sample count n is correctly reported', () => {
  it('perRegion.waist.n equals the number of waist samples', () => {
    const samples = makeSamples(7, 85, 80, 'waist');
    const report = runValidation(samples);
    expect(report.perRegion.waist!.n).toBe(7);
  });

  it('perRegion contains only regions present in the labeled set', () => {
    const samples = makeSamples(4, 90, 90, 'chest');
    const report = runValidation(samples);
    expect(report.perRegion.chest).toBeDefined();
    expect(report.perRegion.waist).toBeUndefined();
    expect(report.perRegion.hip).toBeUndefined();
  });
});
