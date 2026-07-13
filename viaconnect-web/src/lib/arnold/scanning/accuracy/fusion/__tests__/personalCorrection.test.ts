// Task 211b-W3a - TDD tests for the per-user calibration fusion fit.
// Written before personalCorrection.ts exists (RED), then implemented (GREEN).
//
// Covers:
//   1. OLS fit correctness on hand-computed synthetic data.
//   2. Insufficient-data gating (too-few-anchors vs too-few-scans).
//   3. Unreliable / flagged-anchor path: mutual disagreement, never manufactures agreement.
//   4. Unreliable path: residual SE no better than the global band.
//   5. A single unreliable region discards the whole result (documented conservative design).
//   6. Small-n band widening: tightenedBandCm never claims unearned precision.
//   7. Determinism.

import { describe, it, expect } from 'vitest';
import {
  fitPersonalCorrection,
  MIN_TOTAL_ANCHOR_PAIRS,
  MIN_ANCHOR_PAIRS_PER_REGION,
  PERSONAL_BAND_FLOOR_CM,
  FUSION_VERSION,
  type PersonalPair,
  type PersonalCorrectionInput,
} from '../personalCorrection';

const CALIBRATION_VERSION_FIXTURE = 'v1-uncalibrated-2026-06';

function pair(
  region: PersonalPair['region'],
  predictedCm: number,
  anchorTruthCm: number,
  takenAt: string,
  anchorSource: PersonalPair['anchorSource'] = 'tape',
): PersonalPair {
  return {
    region,
    predictedCm,
    anchorTruthCm,
    anchorSource,
    statedReliability: 'medium',
    takenAt,
  };
}

// ---------------------------------------------------------------------------
// 1. OLS fit correctness (hand-computed)
// ---------------------------------------------------------------------------

describe('OLS fit correctness on synthetic data', () => {
  // predictedCm = [0..6] (n=7), anchorTruthCm = predictedCm + e where
  // e = [1,-1,1,-1,1,-1,1]. e is uncorrelated with x (verified by hand:
  // sum(x_i * e_i) = 3 = n * xbar * ebar = 7 * 3 * (1/7) = 3), so OLS recovers
  // slope = 1 exactly and intercept = ebar = 1/7 exactly.
  // Residuals (e_i - ebar): four occurrences of 6/7, three of -8/7.
  // sse = 4*(6/7)^2 + 3*(8/7)^2 = 336/49 = 6.857142857...
  // df = n - 2 = 5, residualSE = sqrt(336/49/5) = sqrt(336/245) = 1.171080...
  const e = [1, -1, 1, -1, 1, -1, 1];
  const pairs: PersonalPair[] = e.map((ei, i) =>
    pair('waist_natural', i, i + ei, `2026-07-0${i + 1}T00:00:00.000Z`),
  );

  const input: PersonalCorrectionInput = {
    pairsByRegion: { waist_natural: pairs },
    globalBandCm: { waist_natural: 3 },
    calibrationVersion: CALIBRATION_VERSION_FIXTURE,
  };

  const result = fitPersonalCorrection(input);

  it('fits status is fitted', () => {
    expect(result.status).toBe('fitted');
  });

  it('recovers slope = 1 exactly', () => {
    if (result.status !== 'fitted') throw new Error('expected fitted');
    expect(result.perRegion.waist_natural!.slope).toBeCloseTo(1, 10);
  });

  it('recovers intercept = 1/7 exactly', () => {
    if (result.status !== 'fitted') throw new Error('expected fitted');
    expect(result.perRegion.waist_natural!.intercept).toBeCloseTo(1 / 7, 10);
  });

  it('computes residualSE = sqrt(336/245)', () => {
    if (result.status !== 'fitted') throw new Error('expected fitted');
    expect(result.perRegion.waist_natural!.residualSE).toBeCloseTo(Math.sqrt(336 / 245), 8);
  });

  it('reports nPairs = 7', () => {
    if (result.status !== 'fitted') throw new Error('expected fitted');
    expect(result.perRegion.waist_natural!.nPairs).toBe(7);
  });

  it('carries the fusion version and passes through calibrationVersion', () => {
    if (result.status !== 'fitted') throw new Error('expected fitted');
    expect(result.version).toBe(FUSION_VERSION);
    expect(result.calibrationVersion).toBe(CALIBRATION_VERSION_FIXTURE);
  });
});

// ---------------------------------------------------------------------------
// 2. Insufficient-data gating
// ---------------------------------------------------------------------------

describe('insufficient-data gating', () => {
  it('returns too-few-anchors when total pairs are below MIN_TOTAL_ANCHOR_PAIRS', () => {
    expect(MIN_TOTAL_ANCHOR_PAIRS).toBeGreaterThan(0);
    const pairs: PersonalPair[] = [
      pair('hip', 90, 91, '2026-07-01T00:00:00.000Z'),
      pair('hip', 91, 92, '2026-07-02T00:00:00.000Z'),
    ];
    expect(pairs.length).toBeLessThan(MIN_TOTAL_ANCHOR_PAIRS);

    const result = fitPersonalCorrection({
      pairsByRegion: { hip: pairs },
      globalBandCm: { hip: 3 },
      calibrationVersion: CALIBRATION_VERSION_FIXTURE,
    });

    expect(result).toEqual({ status: 'insufficient', reason: 'too-few-anchors' });
  });

  it('returns too-few-scans when total pairs clear the floor but no region reaches MIN_ANCHOR_PAIRS_PER_REGION', () => {
    const pairs: PersonalPair[] = [
      pair('hip', 90, 91, '2026-07-01T00:00:00.000Z'),
      pair('hip', 91, 92, '2026-07-02T00:00:00.000Z'),
      pair('hip', 92, 93, '2026-07-03T00:00:00.000Z'),
      pair('hip', 93, 94, '2026-07-04T00:00:00.000Z'),
    ];
    expect(pairs.length).toBeGreaterThanOrEqual(MIN_TOTAL_ANCHOR_PAIRS);
    expect(pairs.length).toBeLessThan(MIN_ANCHOR_PAIRS_PER_REGION);

    const result = fitPersonalCorrection({
      pairsByRegion: { hip: pairs },
      globalBandCm: { hip: 3 },
      calibrationVersion: CALIBRATION_VERSION_FIXTURE,
    });

    expect(result).toEqual({ status: 'insufficient', reason: 'too-few-scans' });
  });

  it('returns too-few-scans when an eligible region has no supplied global band to judge against', () => {
    const pairs: PersonalPair[] = Array.from({ length: MIN_ANCHOR_PAIRS_PER_REGION }, (_, i) =>
      pair('hip', 90 + i, 91 + i, `2026-07-0${i + 1}T00:00:00.000Z`),
    );

    const result = fitPersonalCorrection({
      pairsByRegion: { hip: pairs },
      globalBandCm: {}, // no band supplied for hip - cannot judge improvement, never fabricate one
      calibrationVersion: CALIBRATION_VERSION_FIXTURE,
    });

    expect(result).toEqual({ status: 'insufficient', reason: 'too-few-scans' });
  });
});

// ---------------------------------------------------------------------------
// 3. Unreliable / flagged-anchor path: mutual disagreement
// ---------------------------------------------------------------------------

describe('unreliable path: anchors mutually disagree', () => {
  it('flags same-timestamp readings from different sources that disagree beyond the global band', () => {
    const conflicting: PersonalPair[] = [
      pair('hip', 90, 90, '2026-07-01T00:00:00.000Z', 'tape'),
      pair('hip', 90, 100, '2026-07-01T00:00:00.000Z', 'dexa'), // same session, 10cm apart
      pair('hip', 91, 91, '2026-07-02T00:00:00.000Z', 'tape'), // makes totalPairs >= MIN_TOTAL_ANCHOR_PAIRS
    ];

    const result = fitPersonalCorrection({
      pairsByRegion: { hip: conflicting },
      globalBandCm: { hip: 3 }, // 10cm spread far exceeds the 3cm band
      calibrationVersion: CALIBRATION_VERSION_FIXTURE,
    });

    expect(result.status).toBe('unreliable');
    if (result.status !== 'unreliable') throw new Error('expected unreliable');
    expect(result.flaggedAnchors).toHaveLength(2);
    expect(result.flaggedAnchors.every(a => a.reason === 'conflicts-with-other-source')).toBe(true);
    expect(result.flaggedAnchors.map(a => a.source).sort()).toEqual(['dexa', 'tape']);
  });

  it('does not flag same-timestamp readings that agree within the global band', () => {
    const agreeing: PersonalPair[] = [
      pair('hip', 90, 90.5, '2026-07-01T00:00:00.000Z', 'tape'),
      pair('hip', 90, 91, '2026-07-01T00:00:00.000Z', 'dexa'), // 0.5cm apart, well within 3cm
      pair('hip', 91, 91.5, '2026-07-02T00:00:00.000Z', 'tape'),
    ];

    const result = fitPersonalCorrection({
      pairsByRegion: { hip: agreeing },
      globalBandCm: { hip: 3 },
      calibrationVersion: CALIBRATION_VERSION_FIXTURE,
    });

    expect(result.status).not.toBe('unreliable');
  });
});

// ---------------------------------------------------------------------------
// 4. Unreliable path: residual SE no better than the global band
// ---------------------------------------------------------------------------

describe('unreliable path: residual SE worse than the global band', () => {
  it('flags a region whose fit residual SE is no tighter than the global band, never manufacturing agreement', () => {
    // Wildly scattered anchors: OLS cannot explain the noise, residual SE will be large.
    const scattered: PersonalPair[] = [
      pair('chest', 0, 0, '2026-07-01T00:00:00.000Z'),
      pair('chest', 1, 10, '2026-07-02T00:00:00.000Z'),
      pair('chest', 2, -5, '2026-07-03T00:00:00.000Z'),
      pair('chest', 3, 15, '2026-07-04T00:00:00.000Z'),
      pair('chest', 4, -10, '2026-07-05T00:00:00.000Z'),
      pair('chest', 5, 20, '2026-07-06T00:00:00.000Z'),
      pair('chest', 6, -15, '2026-07-07T00:00:00.000Z'),
    ];

    const result = fitPersonalCorrection({
      pairsByRegion: { chest: scattered },
      globalBandCm: { chest: 2 }, // small band; the scatter's residual SE will exceed it
      calibrationVersion: CALIBRATION_VERSION_FIXTURE,
    });

    expect(result.status).toBe('unreliable');
    if (result.status !== 'unreliable') throw new Error('expected unreliable');
    expect(result.flaggedAnchors).toHaveLength(7);
    expect(result.flaggedAnchors.every(a => a.reason === 'residual-worse-than-global-band')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 5. A single unreliable region discards the whole result
// ---------------------------------------------------------------------------

describe('unreliable path discards good regions too (conservative, documented design)', () => {
  it('one bad region makes the whole result unreliable even when another region fits cleanly', () => {
    const goodRegion: PersonalPair[] = Array.from({ length: MIN_ANCHOR_PAIRS_PER_REGION }, (_, i) =>
      pair('calf', 30 + i, 30 + i, `2026-06-0${i + 1}T00:00:00.000Z`), // perfect agreement
    );
    const badRegion: PersonalPair[] = [
      pair('chest', 0, 0, '2026-07-01T00:00:00.000Z'),
      pair('chest', 1, 10, '2026-07-02T00:00:00.000Z'),
      pair('chest', 2, -5, '2026-07-03T00:00:00.000Z'),
      pair('chest', 3, 15, '2026-07-04T00:00:00.000Z'),
      pair('chest', 4, -10, '2026-07-05T00:00:00.000Z'),
      pair('chest', 5, 20, '2026-07-06T00:00:00.000Z'),
      pair('chest', 6, -15, '2026-07-07T00:00:00.000Z'),
    ];

    const result = fitPersonalCorrection({
      pairsByRegion: { calf: goodRegion, chest: badRegion },
      globalBandCm: { calf: 2, chest: 2 },
      calibrationVersion: CALIBRATION_VERSION_FIXTURE,
    });

    expect(result.status).toBe('unreliable');
    if (result.status !== 'unreliable') throw new Error('expected unreliable');
    // Only the bad region's anchors are flagged - the good region is simply not
    // surfaced as a tightened result (never silently promoted either).
    expect(result.flaggedAnchors.every(a => a.region === 'chest')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 6. Small-n band widening: never displays unearned precision
// ---------------------------------------------------------------------------

describe('small-n band widening', () => {
  it('floors tightenedBandCm at PERSONAL_BAND_FLOOR_CM for a perfect (zero-noise) fit', () => {
    const perfect: PersonalPair[] = Array.from({ length: MIN_ANCHOR_PAIRS_PER_REGION }, (_, i) =>
      pair('forearm', 25 + i, 25 + i, `2026-06-0${i + 1}T00:00:00.000Z`),
    );

    const result = fitPersonalCorrection({
      pairsByRegion: { forearm: perfect },
      globalBandCm: { forearm: 2 },
      calibrationVersion: CALIBRATION_VERSION_FIXTURE,
    });

    expect(result.status).toBe('fitted');
    if (result.status !== 'fitted') throw new Error('expected fitted');
    expect(result.perRegion.forearm!.residualSE).toBeCloseTo(0, 10);
    expect(result.perRegion.forearm!.tightenedBandCm).toBe(PERSONAL_BAND_FLOOR_CM);
  });

  it('applies the documented df=5 (n=7) t-quantile multiplier of 2.571 to a nonzero residual', () => {
    // Reuse the hand-computed n=7 fixture from the OLS correctness suite above:
    // residualSE = sqrt(336/245).
    const e = [1, -1, 1, -1, 1, -1, 1];
    const pairs: PersonalPair[] = e.map((ei, i) =>
      pair('waist_natural', i, i + ei, `2026-07-0${i + 1}T00:00:00.000Z`),
    );

    const result = fitPersonalCorrection({
      pairsByRegion: { waist_natural: pairs },
      globalBandCm: { waist_natural: 5 },
      calibrationVersion: CALIBRATION_VERSION_FIXTURE,
    });

    expect(result.status).toBe('fitted');
    if (result.status !== 'fitted') throw new Error('expected fitted');
    const fit = result.perRegion.waist_natural!;
    const expectedResidualSE = Math.sqrt(336 / 245);
    expect(fit.residualSE).toBeCloseTo(expectedResidualSE, 8);
    // Per the baseline's documented 5-row t-quantile lookup (df 5/10/20/30/inf),
    // df = nPairs - 2 = 5 uses t = 2.571 (standard 95 percent two-tailed table value).
    expect(fit.tightenedBandCm).toBeCloseTo(2.571 * expectedResidualSE, 6);
  });

  it('never floors tightenedBandCm below the t-widened residual band for the same fit', () => {
    const e = [1, -1, 1, -1, 1, -1, 1];
    const pairs: PersonalPair[] = e.map((ei, i) =>
      pair('waist_natural', i, i + ei, `2026-07-0${i + 1}T00:00:00.000Z`),
    );

    const result = fitPersonalCorrection({
      pairsByRegion: { waist_natural: pairs },
      globalBandCm: { waist_natural: 5 },
      calibrationVersion: CALIBRATION_VERSION_FIXTURE,
    });

    expect(result.status).toBe('fitted');
    if (result.status !== 'fitted') throw new Error('expected fitted');
    const fit = result.perRegion.waist_natural!;
    expect(fit.tightenedBandCm).toBeGreaterThanOrEqual(fit.residualSE);
    expect(fit.tightenedBandCm).toBeGreaterThanOrEqual(PERSONAL_BAND_FLOOR_CM);
  });
});

// ---------------------------------------------------------------------------
// 7. Determinism
// ---------------------------------------------------------------------------

describe('determinism', () => {
  it('produces an identical result across repeated calls with the same input', () => {
    const pairs: PersonalPair[] = Array.from({ length: MIN_ANCHOR_PAIRS_PER_REGION }, (_, i) =>
      pair('thigh', 50 + i, 51 + i * 0.5, `2026-06-0${i + 1}T00:00:00.000Z`),
    );
    const input: PersonalCorrectionInput = {
      pairsByRegion: { thigh: pairs },
      globalBandCm: { thigh: 5 },
      calibrationVersion: CALIBRATION_VERSION_FIXTURE,
    };

    const first = fitPersonalCorrection(input);
    const second = fitPersonalCorrection(input);
    expect(second).toEqual(first);
  });
});
