// Task 211b-W3a - TDD tests for the fusion-mode harness eval.
// Written before fusionHarness.ts exists (RED), then implemented (GREEN).
//
// Covers:
//   1. Fusion mode is IDENTICAL to plain runValidation when no fit is available
//      (insufficient / unreliable) - never fabricates tightening.
//   2. The fitted correction is applied only to its own region; other regions
//      pass through unchanged.
//   3. Fusion-mode tightening is EVIDENCED on the held-out split (not merely
//      asserted): an additive bias that the harness's own multiplicative
//      scale-fit cannot fully cancel is fully corrected by the personal
//      linear (slope + intercept) fit.
//   4. Determinism.

import { describe, it, expect } from 'vitest';
import { runFusionValidation } from '../fusionHarness';
import { runValidation, type LabeledSample } from '../../validationHarness';
import { fitPersonalCorrection, type PersonalPair } from '../personalCorrection';

const CALIBRATION_VERSION_FIXTURE = 'v1-uncalibrated-2026-06';

// ---------------------------------------------------------------------------
// 1. No fit available -> identical to plain runValidation
// ---------------------------------------------------------------------------

describe('fusion mode with no available personal fit', () => {
  it('matches runValidation exactly when personalCorrections is insufficient', () => {
    const labeledSet: LabeledSample[] = [
      { predictedCm: 80, truthCm: 78, region: 'waist' },
      { predictedCm: 82, truthCm: 80, region: 'waist' },
    ];
    const insufficient = fitPersonalCorrection({
      pairsByRegion: {},
      globalBandCm: {},
      calibrationVersion: CALIBRATION_VERSION_FIXTURE,
    });
    expect(insufficient.status).toBe('insufficient');

    const plain = runValidation(labeledSet);
    const fused = runFusionValidation(labeledSet, insufficient);
    expect(fused).toEqual(plain);
  });

  it('matches runValidation exactly when personalCorrections is unreliable', () => {
    const labeledSet: LabeledSample[] = [
      { predictedCm: 80, truthCm: 78, region: 'waist' },
      { predictedCm: 82, truthCm: 80, region: 'waist' },
    ];
    const scattered: PersonalPair[] = [
      { region: 'waist_natural', predictedCm: 0, anchorTruthCm: 0, anchorSource: 'tape', statedReliability: 'medium', takenAt: '2026-07-01T00:00:00.000Z' },
      { region: 'waist_natural', predictedCm: 1, anchorTruthCm: 10, anchorSource: 'tape', statedReliability: 'medium', takenAt: '2026-07-02T00:00:00.000Z' },
      { region: 'waist_natural', predictedCm: 2, anchorTruthCm: -5, anchorSource: 'tape', statedReliability: 'medium', takenAt: '2026-07-03T00:00:00.000Z' },
      { region: 'waist_natural', predictedCm: 3, anchorTruthCm: 15, anchorSource: 'tape', statedReliability: 'medium', takenAt: '2026-07-04T00:00:00.000Z' },
      { region: 'waist_natural', predictedCm: 4, anchorTruthCm: -10, anchorSource: 'tape', statedReliability: 'medium', takenAt: '2026-07-05T00:00:00.000Z' },
      { region: 'waist_natural', predictedCm: 5, anchorTruthCm: 20, anchorSource: 'tape', statedReliability: 'medium', takenAt: '2026-07-06T00:00:00.000Z' },
      { region: 'waist_natural', predictedCm: 6, anchorTruthCm: -15, anchorSource: 'tape', statedReliability: 'medium', takenAt: '2026-07-07T00:00:00.000Z' },
    ];
    const unreliable = fitPersonalCorrection({
      pairsByRegion: { waist_natural: scattered },
      globalBandCm: { waist_natural: 2 },
      calibrationVersion: CALIBRATION_VERSION_FIXTURE,
    });
    expect(unreliable.status).toBe('unreliable');

    const plain = runValidation(labeledSet);
    const fused = runFusionValidation(labeledSet, unreliable);
    expect(fused).toEqual(plain);
  });
});

// ---------------------------------------------------------------------------
// 2. Correction applies only to its own region
// ---------------------------------------------------------------------------

describe('fusion mode applies the fit only to its matching region', () => {
  it('leaves an unrelated region byte-for-byte identical to plain runValidation', () => {
    // Fit a correction for waist_natural only (7 perfect anchor pairs).
    const waistPairs: PersonalPair[] = Array.from({ length: 7 }, (_, i) => ({
      region: 'waist_natural' as const,
      predictedCm: 80 + i,
      anchorTruthCm: 78 + i, // constant -2cm offset, perfectly linear (slope 1, intercept -2)
      anchorSource: 'tape' as const,
      statedReliability: 'medium' as const,
      takenAt: `2026-06-0${i + 1}T00:00:00.000Z`,
    }));
    const fit = fitPersonalCorrection({
      pairsByRegion: { waist_natural: waistPairs },
      globalBandCm: { waist_natural: 3 },
      calibrationVersion: CALIBRATION_VERSION_FIXTURE,
    });
    expect(fit.status).toBe('fitted');

    const labeledSet: LabeledSample[] = [
      // waist maps to waist_natural - should be corrected.
      { predictedCm: 90, truthCm: 88, region: 'waist' },
      { predictedCm: 92, truthCm: 90, region: 'waist' },
      // neck maps to neck - no fit exists for it, must pass through unchanged.
      { predictedCm: 38, truthCm: 37, region: 'neck' },
      { predictedCm: 39, truthCm: 38, region: 'neck' },
    ];

    const plain = runValidation(labeledSet);
    const fused = runFusionValidation(labeledSet, fit);

    expect(fused.perRegion.neck).toEqual(plain.perRegion.neck);
    expect(fused.perRegion.waist).not.toEqual(plain.perRegion.waist);
  });
});

// ---------------------------------------------------------------------------
// 3. Tightening evidenced on held-out pairs
// ---------------------------------------------------------------------------

describe('fusion-mode tightening is evidenced on held-out pairs', () => {
  it('fully corrects an additive bias on held-out samples that the harness own multiplicative scale cannot fully cancel', () => {
    // labeledSet: predictedCm = truthCm + 5 (constant additive offset), 12 samples
    // so the 80/20 split leaves a genuine held-out slice.
    const labeledSet: LabeledSample[] = Array.from({ length: 12 }, (_, i) => {
      const truthCm = 80 + i;
      return { predictedCm: truthCm + 5, truthCm, region: 'waist' as const };
    });

    // Anchor pairs share the SAME additive-bias relationship (predicted = truth + 5),
    // fit exactly (zero noise) so the personal correction recovers slope=1, intercept=-5.
    const anchorPairs: PersonalPair[] = Array.from({ length: 7 }, (_, i) => {
      const predictedCm = 50 + i * 5;
      return {
        region: 'waist_natural' as const,
        predictedCm,
        anchorTruthCm: predictedCm - 5,
        anchorSource: 'dexa' as const,
        statedReliability: 'high' as const,
        takenAt: `2026-06-0${i + 1}T00:00:00.000Z`,
      };
    });
    const fit = fitPersonalCorrection({
      pairsByRegion: { waist_natural: anchorPairs },
      globalBandCm: { waist_natural: 3 },
      calibrationVersion: CALIBRATION_VERSION_FIXTURE,
    });
    expect(fit.status).toBe('fitted');

    const uncalibrated = runValidation(labeledSet);
    const fused = runFusionValidation(labeledSet, fit);

    const uncalMape = uncalibrated.heldOutPerRegion.waist!.mape;
    const fusedMape = fused.heldOutPerRegion.waist!.mape;

    // The harness's own train-fitted multiplicative scale cannot fully cancel a
    // constant additive offset (the ratio truth/(truth+5) is not constant across
    // truth values), so some held-out error remains uncalibrated.
    expect(uncalMape).toBeGreaterThan(0);
    // The personal linear correction recovers the exact relationship, so fusion
    // mode's held-out prediction equals truth exactly.
    expect(fusedMape).toBeCloseTo(0, 8);
    expect(fusedMape).toBeLessThan(uncalMape);
  });
});

// ---------------------------------------------------------------------------
// 4. Determinism
// ---------------------------------------------------------------------------

describe('determinism', () => {
  it('produces an identical report across repeated calls with the same inputs', () => {
    const labeledSet: LabeledSample[] = [
      { predictedCm: 90, truthCm: 88, region: 'waist' },
      { predictedCm: 92, truthCm: 90, region: 'waist' },
    ];
    const pairs: PersonalPair[] = Array.from({ length: 7 }, (_, i) => ({
      region: 'waist_natural' as const,
      predictedCm: 80 + i,
      anchorTruthCm: 78 + i,
      anchorSource: 'tape' as const,
      statedReliability: 'medium' as const,
      takenAt: `2026-06-0${i + 1}T00:00:00.000Z`,
    }));
    const fit = fitPersonalCorrection({
      pairsByRegion: { waist_natural: pairs },
      globalBandCm: { waist_natural: 3 },
      calibrationVersion: CALIBRATION_VERSION_FIXTURE,
    });

    const first = runFusionValidation(labeledSet, fit);
    const second = runFusionValidation(labeledSet, fit);
    expect(second).toEqual(first);
  });
});
