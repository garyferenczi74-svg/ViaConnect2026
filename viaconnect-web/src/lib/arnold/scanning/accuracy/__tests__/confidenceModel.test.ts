// Task 2 (Prompt 210c) - TDD tests for the per-field confidence model.
// Write tests first (RED), then implement, then GREEN.
//
// RULE 9: this model returns score + level; the CALLER renders UNKNOWN.
// It never fabricates a value.

import { describe, it, expect } from 'vitest';
import {
  scoreMeasurementConfidence,
  CONFIDENCE_THRESHOLD,
  WEIGHTS,
  type ConfidenceInputs,
} from '../confidenceModel';

// ---- Shared fixtures ----

/** All inputs at ideal quality - the best-possible capture scenario. */
const ALL_HIGH: ConfidenceInputs = {
  captureQualityScore: 1,
  maskEdgeCertainty: 1,
  landmarkVisibility: 1,
  scaleAgreement: 1,
  lrCorroboration: 1,
  fbCorroboration: 1,
  populationPriorScore: 1,
};

/** All inputs at 0.5 - a middling but plausible scan. */
const ALL_MID: ConfidenceInputs = {
  captureQualityScore: 0.5,
  maskEdgeCertainty: 0.5,
  landmarkVisibility: 0.5,
  scaleAgreement: 0.5,
  lrCorroboration: 0.5,
  fbCorroboration: 0.5,
  populationPriorScore: 0.5,
};

/** All inputs at zero - completely unusable capture. */
const ALL_ZERO: ConfidenceInputs = {
  captureQualityScore: 0,
  maskEdgeCertainty: 0,
  landmarkVisibility: 0,
  scaleAgreement: 0,
  lrCorroboration: 0,
  fbCorroboration: 0,
  populationPriorScore: 0,
};

// ---- Test 1: All-high inputs -> high level, score near 1 ----

describe('scoreMeasurementConfidence - all-high inputs', () => {
  it('returns high level', () => {
    expect(scoreMeasurementConfidence(ALL_HIGH).level).toBe('high');
  });

  it('returns score of exactly 1.0', () => {
    expect(scoreMeasurementConfidence(ALL_HIGH).score).toBeCloseTo(1, 10);
  });
});

// ---- Test 2: Large L/R disagreement -> low level ----
// A scan where the left and right views contradict each other substantially
// (lrCorroboration = 0) with other inputs at moderate quality produces low level.
// The landmark visibility weight is 0.30 and the lrCorroboration weight is 0.12;
// with all-mid other inputs and lrCorroboration = 0:
//   score = sum_of_others * 0.5 = (1.0 - 0.12) * 0.5 = 0.44 < 0.45 -> low.

describe('scoreMeasurementConfidence - large L/R disagreement', () => {
  const lowLR: ConfidenceInputs = { ...ALL_MID, lrCorroboration: 0 };

  it('returns low level when L/R corroboration is zero with moderate other inputs', () => {
    expect(scoreMeasurementConfidence(lowLR).level).toBe('low');
  });

  it('score is materially lower than the all-mid baseline', () => {
    const { score: baseMid } = scoreMeasurementConfidence(ALL_MID);
    const { score: lowLRScore } = scoreMeasurementConfidence(lowLR);
    expect(lowLRScore).toBeLessThan(baseMid);
  });
});

// ---- Test 2b: Low landmark visibility -> low level ----
// The landmark visibility weight is the single highest weight (0.30).
// With visibility near zero and other inputs at moderate quality:
//   score = 0.30 * 0.05 + (1.0 - 0.30) * 0.5 = 0.015 + 0.35 = 0.365 < 0.45 -> low.

describe('scoreMeasurementConfidence - low landmark visibility', () => {
  const lowLandmark: ConfidenceInputs = { ...ALL_MID, landmarkVisibility: 0.05 };

  it('returns low level when landmark visibility is near zero with moderate other inputs', () => {
    expect(scoreMeasurementConfidence(lowLandmark).level).toBe('low');
  });

  it('score is materially lower than the all-mid baseline', () => {
    const { score: baseMid } = scoreMeasurementConfidence(ALL_MID);
    const { score: lowVizScore } = scoreMeasurementConfidence(lowLandmark);
    expect(lowVizScore).toBeLessThan(baseMid);
  });
});

// ---- Test 3: Score below CONFIDENCE_THRESHOLD -> level is low ----
// RULE 9: the model returns the score and level - it does NOT render UNKNOWN.
// The CALLER is responsible for checking score < CONFIDENCE_THRESHOLD and
// displaying the measurement as UNKNOWN / estimated instead of a precise value.

describe('scoreMeasurementConfidence - below CONFIDENCE_THRESHOLD', () => {
  // All inputs at 0.2 -> score = 0.2 * sum(weights) = 0.2 < CONFIDENCE_THRESHOLD (0.35).
  const veryBad: ConfidenceInputs = {
    captureQualityScore: 0.2,
    maskEdgeCertainty: 0.2,
    landmarkVisibility: 0.2,
    scaleAgreement: 0.2,
    lrCorroboration: 0.2,
    fbCorroboration: 0.2,
    populationPriorScore: 0.2,
  };

  it('score is below CONFIDENCE_THRESHOLD', () => {
    const { score } = scoreMeasurementConfidence(veryBad);
    expect(score).toBeLessThan(CONFIDENCE_THRESHOLD);
  });

  it('level is low when score is below CONFIDENCE_THRESHOLD', () => {
    expect(scoreMeasurementConfidence(veryBad).level).toBe('low');
  });

  it('CONFIDENCE_THRESHOLD is strictly less than the moderate level lower bound', () => {
    // This guarantees that any score < CONFIDENCE_THRESHOLD yields level='low'.
    // The moderate lower bound is 0.45 per the model definition.
    expect(CONFIDENCE_THRESHOLD).toBeLessThan(0.45);
    expect(CONFIDENCE_THRESHOLD).toBeGreaterThan(0);
  });
});

// ---- Test 4: Monotonicity ----
// Worsening any single input (holding all others constant) must never increase
// the overall score.

describe('scoreMeasurementConfidence - monotonicity', () => {
  it('worsening each input individually never increases the score', () => {
    const base = ALL_MID;
    const { score: baseScore } = scoreMeasurementConfidence(base);
    const fields: (keyof ConfidenceInputs)[] = [
      'captureQualityScore',
      'maskEdgeCertainty',
      'landmarkVisibility',
      'scaleAgreement',
      'lrCorroboration',
      'fbCorroboration',
      'populationPriorScore',
    ];
    for (const field of fields) {
      const worse: ConfidenceInputs = { ...base, [field]: 0 };
      const { score: worseScore } = scoreMeasurementConfidence(worse);
      // Allow a tiny floating-point tolerance.
      expect(worseScore).toBeLessThanOrEqual(baseScore + 1e-10);
    }
  });

  it('improving each input individually never decreases the score', () => {
    const base = ALL_MID;
    const { score: baseScore } = scoreMeasurementConfidence(base);
    const fields: (keyof ConfidenceInputs)[] = [
      'captureQualityScore',
      'maskEdgeCertainty',
      'landmarkVisibility',
      'scaleAgreement',
      'lrCorroboration',
      'fbCorroboration',
      'populationPriorScore',
    ];
    for (const field of fields) {
      const better: ConfidenceInputs = { ...base, [field]: 1 };
      const { score: betterScore } = scoreMeasurementConfidence(better);
      expect(betterScore).toBeGreaterThanOrEqual(baseScore - 1e-10);
    }
  });
});

// ---- Test 5: Score is always within [0, 1] ----

describe('scoreMeasurementConfidence - score bounds', () => {
  it('score is within [0, 1] for all-high inputs', () => {
    const { score } = scoreMeasurementConfidence(ALL_HIGH);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
  });

  it('score is within [0, 1] for all-zero inputs', () => {
    const { score } = scoreMeasurementConfidence(ALL_ZERO);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
  });

  it('score is within [0, 1] for mid inputs', () => {
    const { score } = scoreMeasurementConfidence(ALL_MID);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
  });

  it('clamps out-of-range inputs to [0, 1] without error', () => {
    const clampTest: ConfidenceInputs = {
      captureQualityScore: 1.5, // over 1
      maskEdgeCertainty: -0.2, // below 0
      landmarkVisibility: 1,
      scaleAgreement: 1,
      lrCorroboration: 1,
      fbCorroboration: 1,
      populationPriorScore: 1,
    };
    const { score } = scoreMeasurementConfidence(clampTest);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
  });
});

// ---- Supplementary: WEIGHTS structure ----

describe('WEIGHTS', () => {
  it('is frozen (immutable)', () => {
    expect(Object.isFrozen(WEIGHTS)).toBe(true);
  });

  it('all individual weights are positive', () => {
    for (const [key, w] of Object.entries(WEIGHTS)) {
      expect(w).toBeGreaterThan(0);
      // Confirm each key is a recognized input field.
      const allKeys: (keyof ConfidenceInputs)[] = [
        'captureQualityScore',
        'maskEdgeCertainty',
        'landmarkVisibility',
        'scaleAgreement',
        'lrCorroboration',
        'fbCorroboration',
        'populationPriorScore',
      ];
      expect(allKeys).toContain(key as keyof ConfidenceInputs);
    }
  });

  it('weights sum to 1.0 (no black hole, no leakage)', () => {
    const total = Object.values(WEIGHTS).reduce((a, b) => a + b, 0);
    expect(total).toBeCloseTo(1.0, 10);
  });
});
