/**
 * Tests for noiseDeltaClassifier.ts (Prompt 211b W2).
 *
 * TDD: key contracts:
 *   1. classifyBodyFatMetricDelta returns null for null delta.
 *   2. classifyBodyFatMetricDelta classifies correctly against PER_MEASUREMENT_PCT.
 *   3. classifyCircumferenceDelta uses RegionToleranceCm for known keys.
 *   4. classifyCircumferenceDelta returns null for shoulderWidth (no GirthRegion).
 *   5. classifyCircumferenceDelta converts inches to cm before classifying.
 *   6. classifyCompositionDeltas tallies within-noise / meaningful counts correctly.
 *   7. WITHIN_NOISE is never a failure state (copy contract).
 *   8. detectPlateau needs MIN_RUN consecutive WITHIN_NOISE.
 *   9. getSpikeContext: MEANINGFUL + outlier = spike; WITHIN_NOISE + outlier != spike.
 */

import { describe, it, expect } from 'vitest';
import {
  classifyBodyFatMetricDelta,
  classifyCircumferenceDelta,
  classifyCompositionDeltas,
  detectPlateau,
  getSpikeContext,
  PLATEAU_MIN_RUN,
} from '../noiseDeltaClassifier';
import { PER_MEASUREMENT_PCT, RegionToleranceCm } from '@/lib/arnold/scanning/accuracy/accuracyTargets';
import { computeMDC95 } from '../mdcEngine';
import type { MetricDelta } from '@/lib/formavision/deltas/compositionDeltas';
import type { CircumferenceDelta } from '@/lib/formavision/deltas/compositionDeltas';
import { emptyMeasurements } from '@/lib/body-tracker/circumference';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fatDelta(from: number, to: number): MetricDelta {
  const delta = to - from;
  return {
    from,
    to,
    delta,
    direction: delta < 0 ? 'improved' : delta > 0 ? 'worsened' : 'unchanged',
  };
}

function circDelta(
  key: CircumferenceDelta['key'],
  from: number,
  to: number,
  unit: 'in' | 'cm' = 'cm',
): CircumferenceDelta {
  const delta = to - from;
  return {
    key,
    label: key,
    from,
    to,
    delta,
    unit,
    direction: delta < 0 ? 'improved' : delta > 0 ? 'worsened' : 'unchanged',
  };
}

// ---------------------------------------------------------------------------
// classifyBodyFatMetricDelta
// ---------------------------------------------------------------------------

describe('classifyBodyFatMetricDelta', () => {
  it('returns null for a null delta (single-scan / UNKNOWN)', () => {
    expect(classifyBodyFatMetricDelta(null)).toBeNull();
  });

  it('returns null classification when from is 0 (cannot compute percentage band)', () => {
    const result = classifyBodyFatMetricDelta(fatDelta(0, 2));
    expect(result).not.toBeNull();
    expect(result!.classification).toBeNull();
    expect(result!.mdc95).toBeNull();
  });

  it('returns null classification when to is 0, the UNKNOWN sentinel, not a fabricated delta (review I2)', () => {
    const result = classifyBodyFatMetricDelta(fatDelta(25, 0));
    expect(result).not.toBeNull();
    expect(result!.classification).toBeNull();
    expect(result!.mdc95).toBeNull();
  });

  it('classifies a WITHIN_NOISE body fat delta correctly', () => {
    // At 25% body fat, MDC95 = 1.96 * sqrt(2) * (0.10 * 25 / 2) = ~3.46
    // A delta of 1 percentage point should be WITHIN_NOISE
    const result = classifyBodyFatMetricDelta(fatDelta(25, 26));
    expect(result).not.toBeNull();
    expect(result!.classification).toBe('WITHIN_NOISE');
  });

  it('classifies a MEANINGFUL body fat delta correctly', () => {
    // At 25% body fat, MDC95 ~3.46
    // A delta of 4 percentage points is MEANINGFUL
    const result = classifyBodyFatMetricDelta(fatDelta(25, 21));
    expect(result).not.toBeNull();
    expect(result!.classification).toBe('MEANINGFUL');
  });

  it('returns the original delta unchanged (numbers never modified)', () => {
    const d = fatDelta(28, 24);
    const result = classifyBodyFatMetricDelta(d);
    expect(result).not.toBeNull();
    expect(result!.delta.from).toBe(28);
    expect(result!.delta.to).toBe(24);
    expect(result!.delta.delta).toBe(-4);
  });

  it('mdc95 is positive when the band is computable', () => {
    const result = classifyBodyFatMetricDelta(fatDelta(25, 22));
    expect(result!.mdc95).not.toBeNull();
    expect(result!.mdc95 as number).toBeGreaterThan(0);
  });

  it('mdc95 matches the MDC engine formula independently', () => {
    const from = 30;
    const expected = computeMDC95({ tolerancePct: PER_MEASUREMENT_PCT, referenceValue: from });
    const result = classifyBodyFatMetricDelta(fatDelta(from, 26));
    expect(result!.mdc95).toBeCloseTo(expected as number, 8);
  });
});

// ---------------------------------------------------------------------------
// classifyCircumferenceDelta
// ---------------------------------------------------------------------------

describe('classifyCircumferenceDelta', () => {
  it('returns null classification for shoulderWidth (no GirthRegion)', () => {
    const result = classifyCircumferenceDelta(circDelta('shoulderWidth', 50, 47));
    expect(result.classification).toBeNull();
    expect(result.mdc95).toBeNull();
  });

  it('classifies a waist delta in cm as WITHIN_NOISE when below MDC95', () => {
    // waist is 'waist' -> torso tolerance 3 cm -> MDC95 ~4.16 cm
    // A 2 cm change is WITHIN_NOISE
    const result = classifyCircumferenceDelta(circDelta('waist', 90, 88, 'cm'));
    expect(result.classification).toBe('WITHIN_NOISE');
  });

  it('classifies a waist delta in cm as MEANINGFUL when above MDC95', () => {
    // A 5 cm change is MEANINGFUL (MDC95 ~4.16 cm)
    const result = classifyCircumferenceDelta(circDelta('waist', 90, 85, 'cm'));
    expect(result.classification).toBe('MEANINGFUL');
  });

  it('converts inches to cm before classifying (unit-correct)', () => {
    // waist torso tolerance 3 cm -> MDC95 ~4.16 cm = ~1.64 in
    // 1 inch change = 2.54 cm -> WITHIN_NOISE
    const result = classifyCircumferenceDelta(circDelta('waist', 35, 34, 'in'));
    expect(result.classification).toBe('WITHIN_NOISE');
  });

  it('converts inches to cm: a large-enough inch change is MEANINGFUL', () => {
    // 2.5 in = 6.35 cm > 4.16 cm MDC95 -> MEANINGFUL
    const result = classifyCircumferenceDelta(circDelta('waist', 38, 35.5, 'in'));
    expect(result.classification).toBe('MEANINGFUL');
  });

  it('mdc95 is in the display unit (inches when unit=in)', () => {
    const cmResult = classifyCircumferenceDelta(circDelta('waist', 90, 85, 'cm'));
    const inResult = classifyCircumferenceDelta(circDelta('waist', 35, 33, 'in'));
    // Both should be non-null and the inch version should be about 1/2.54 of cm version
    expect(cmResult.mdc95).not.toBeNull();
    expect(inResult.mdc95).not.toBeNull();
    expect((inResult.mdc95 as number) * 2.54).toBeCloseTo(cmResult.mdc95 as number, 5);
  });

  it('uses limb tolerance (2 cm) for neck', () => {
    const neckMdc = computeMDC95({ toleranceCm: RegionToleranceCm.neck }) as number;
    const result = classifyCircumferenceDelta(circDelta('neck', 38, 39, 'cm'));
    expect(result.mdc95).toBeCloseTo(neckMdc, 8);
  });

  it('uses limb tolerance for right and left bicep alike', () => {
    const limbMdc = computeMDC95({ toleranceCm: RegionToleranceCm.upperArm }) as number;
    const right = classifyCircumferenceDelta(circDelta('rightBicep', 35, 36, 'cm'));
    const left = classifyCircumferenceDelta(circDelta('leftBicep', 35, 36, 'cm'));
    expect(right.mdc95).toBeCloseTo(limbMdc, 8);
    expect(left.mdc95).toBeCloseTo(limbMdc, 8);
  });

  it('delta object is returned unchanged (numbers never modified)', () => {
    const d = circDelta('waist', 90, 85, 'cm');
    const result = classifyCircumferenceDelta(d);
    expect(result.delta.from).toBe(90);
    expect(result.delta.to).toBe(85);
    expect(result.delta.delta).toBe(-5);
  });
});

// ---------------------------------------------------------------------------
// classifyCompositionDeltas
// ---------------------------------------------------------------------------

describe('classifyCompositionDeltas', () => {
  it('counts within-noise and meaningful correctly', () => {
    // 1 WITHIN_NOISE body fat, 1 MEANINGFUL waist
    const deltas = {
      bodyFat: fatDelta(25, 24),       // delta = 1, WITHIN_NOISE (MDC95 ~3.46)
      circumferences: [
        circDelta('waist', 90, 85, 'cm'), // delta = -5, MEANINGFUL (MDC95 ~4.16)
      ],
      muscle: [],
      biggest: null,
    };
    const result = classifyCompositionDeltas(deltas);
    expect(result.withinNoiseCount).toBe(1);
    expect(result.meaningfulCount).toBe(1);
    expect(result.totalClassified).toBe(2);
  });

  it('returns no bodyFat when deltas.bodyFat is null', () => {
    const deltas = { bodyFat: null, circumferences: [], muscle: [], biggest: null };
    const result = classifyCompositionDeltas(deltas);
    expect(result.bodyFat).toBeNull();
    expect(result.withinNoiseCount).toBe(0);
    expect(result.meaningfulCount).toBe(0);
    expect(result.totalClassified).toBe(0);
  });

  it('shoulderWidth contributes null classification (not counted)', () => {
    const deltas = {
      bodyFat: null,
      circumferences: [circDelta('shoulderWidth', 50, 47, 'cm')],
      muscle: [],
      biggest: null,
    };
    const result = classifyCompositionDeltas(deltas);
    expect(result.circumferences[0].classification).toBeNull();
    expect(result.totalClassified).toBe(0);
  });

  it('circumferences array is ordered same as input deltas', () => {
    const deltas = {
      bodyFat: null,
      circumferences: [
        circDelta('waist', 90, 85, 'cm'),
        circDelta('chest', 100, 96, 'cm'),
      ],
      muscle: [],
      biggest: null,
    };
    const result = classifyCompositionDeltas(deltas);
    expect(result.circumferences[0].delta.key).toBe('waist');
    expect(result.circumferences[1].delta.key).toBe('chest');
  });
});

// ---------------------------------------------------------------------------
// WITHIN_NOISE is never a failure state (copy contract)
// ---------------------------------------------------------------------------

describe('WITHIN_NOISE is never failure language', () => {
  // Use whole-word regex to avoid substring false positives (e.g. "badge" containing "bad").
const FAILURE_WORDS_PATTERN = /\b(fail|wrong|regress|decline|stuck|overweight|shame)\b/;

  it('WITHIN_NOISE body fat copy from withinNoiseCopy contains no failure words', async () => {
    const { withinNoiseCopy } = await import('../mdcEngine');
    const copy = withinNoiseCopy({ metricLabel: 'body fat' }).toLowerCase();
    expect(copy, 'within-noise copy must not contain failure language').not.toMatch(FAILURE_WORDS_PATTERN);
  });

  it('plateau copy for a stable metric is not failure language', () => {
    const result = detectPlateau(['WITHIN_NOISE', 'WITHIN_NOISE', 'WITHIN_NOISE'], 'waist');
    expect(result).not.toBeNull();
    const copy = result!.plateauCopy.toLowerCase();
    expect(copy, 'plateau copy must not contain failure language').not.toMatch(FAILURE_WORDS_PATTERN);
  });
});

// ---------------------------------------------------------------------------
// detectPlateau
// ---------------------------------------------------------------------------

describe('detectPlateau', () => {
  it('returns null when fewer than PLATEAU_MIN_RUN known classifications', () => {
    const single: Array<'WITHIN_NOISE' | 'MEANINGFUL' | null> = ['WITHIN_NOISE'];
    expect(detectPlateau(single, 'waist')).toBeNull();
  });

  it('detects a plateau when all recent classifications are WITHIN_NOISE', () => {
    const classifications: Array<'WITHIN_NOISE' | 'MEANINGFUL' | null> = [
      'WITHIN_NOISE', 'WITHIN_NOISE', 'WITHIN_NOISE',
    ];
    const result = detectPlateau(classifications, 'waist');
    expect(result).not.toBeNull();
    expect(result!.isOnPlateau).toBe(true);
    expect(result!.runLength).toBe(3);
  });

  it('does NOT declare a plateau when the most recent is MEANINGFUL', () => {
    const classifications: Array<'WITHIN_NOISE' | 'MEANINGFUL' | null> = [
      'MEANINGFUL', 'WITHIN_NOISE', 'WITHIN_NOISE',
    ];
    const result = detectPlateau(classifications, 'waist');
    expect(result).not.toBeNull();
    expect(result!.isOnPlateau).toBe(false);
  });

  it('skips null (UNKNOWN) entries when counting the run', () => {
    // null is skipped; the next two are WITHIN_NOISE -> plateau
    const classifications: Array<'WITHIN_NOISE' | 'MEANINGFUL' | null> = [
      'WITHIN_NOISE', null, 'WITHIN_NOISE',
    ];
    const result = detectPlateau(classifications, 'waist');
    expect(result).not.toBeNull();
    expect(result!.isOnPlateau).toBe(true);
    expect(result!.runLength).toBe(PLATEAU_MIN_RUN);
  });

  it('plateau copy includes the metric label', () => {
    const result = detectPlateau(['WITHIN_NOISE', 'WITHIN_NOISE'], 'hip');
    expect(result!.plateauCopy).toContain('hip');
  });

  it('plateau copy has no em or en dashes', () => {
    const result = detectPlateau(['WITHIN_NOISE', 'WITHIN_NOISE'], 'waist');
    const copy = result!.plateauCopy;
    expect(copy).not.toContain(String.fromCharCode(0x2014));
    expect(copy).not.toContain(String.fromCharCode(0x2013));
  });
});

// ---------------------------------------------------------------------------
// getSpikeContext
// ---------------------------------------------------------------------------

describe('getSpikeContext', () => {
  it('marks MEANINGFUL + outlier fingerprint as a suspected spike', () => {
    const ctx = getSpikeContext('MEANINGFUL', true, 'waist');
    expect(ctx.isSuspectedSpike).toBe(true);
    expect(ctx.spikeCopy.length).toBeGreaterThan(0);
  });

  it('does NOT mark WITHIN_NOISE + outlier as a spike', () => {
    const ctx = getSpikeContext('WITHIN_NOISE', true, 'waist');
    expect(ctx.isSuspectedSpike).toBe(false);
  });

  it('does NOT mark MEANINGFUL + non-outlier as a spike', () => {
    const ctx = getSpikeContext('MEANINGFUL', false, 'waist');
    expect(ctx.isSuspectedSpike).toBe(false);
  });

  it('spike copy mentions the metric label', () => {
    const ctx = getSpikeContext('MEANINGFUL', true, 'chest');
    expect(ctx.spikeCopy).toContain('chest');
  });

  it('spike copy has no em or en dashes', () => {
    const ctx = getSpikeContext('MEANINGFUL', true, 'waist');
    expect(ctx.spikeCopy).not.toContain(String.fromCharCode(0x2014));
    expect(ctx.spikeCopy).not.toContain(String.fromCharCode(0x2013));
  });

  it('does NOT hide the data point -- spikeCopy says so', () => {
    const ctx = getSpikeContext('MEANINGFUL', true, 'waist');
    // The spike copy must acknowledge the data point is still shown.
    const lower = ctx.spikeCopy.toLowerCase();
    const acknowledges = lower.includes('still shown') || lower.includes('data point');
    expect(acknowledges).toBe(true);
  });

  it('returns empty spikeCopy when not a spike', () => {
    const ctx = getSpikeContext('WITHIN_NOISE', false, 'waist');
    expect(ctx.spikeCopy).toBe('');
  });
});
