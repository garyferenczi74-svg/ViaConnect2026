/**
 * Tests for the MDC engine (Prompt 211b W2).
 *
 * TDD: these tests were written BEFORE the implementation and define the
 * contract. Key cases:
 *   1. MDC95 math: 1.96 * sqrt(2) * SE with known inputs.
 *   2. Classification at the boundary (exactly == MDC95 -> MEANINGFUL).
 *   3. Classification of a known delta against a known band.
 *   4. Null / missing band returns null, never a classification.
 *   5. Within-noise copy renders and is not failure language.
 */

import { describe, it, expect } from 'vitest';
import {
  computeMDC95,
  classifyDelta,
  classifyGirthDelta,
  classifyBodyFatDelta,
  withinNoiseCopy,
  WITHIN_NOISE_INLINE_LABEL,
  withinNoiseAriaLabel,
  type ErrorBand,
  type NoiseClassification,
} from '../mdcEngine';

// ---------------------------------------------------------------------------
// Constants used in assertions
// ---------------------------------------------------------------------------

// MDC95 for a 2 cm limb tolerance: SE = 2/2 = 1, MDC95 = 1.96 * sqrt(2) * 1
const LIMB_SE = 1.0;
const LIMB_MDC95 = 1.96 * Math.SQRT2 * LIMB_SE; // ~2.771

// MDC95 for a 3 cm torso tolerance: SE = 3/2 = 1.5, MDC95 = 1.96 * sqrt(2) * 1.5
const TORSO_SE = 1.5;
const TORSO_MDC95 = 1.96 * Math.SQRT2 * TORSO_SE; // ~4.157

// MDC95 for 10% of a 25% body fat reference: SE = (0.10 * 25) / 2 = 1.25
const BF_SE = 1.25;
const BF_MDC95 = 1.96 * Math.SQRT2 * BF_SE; // ~3.464

// ---------------------------------------------------------------------------
// computeMDC95 math
// ---------------------------------------------------------------------------

describe('computeMDC95: formula', () => {
  it('computes MDC95 = 1.96 * sqrt(2) * SE correctly for a 2 cm limb band', () => {
    const mdc = computeMDC95({ toleranceCm: 2 });
    expect(mdc).not.toBeNull();
    expect(mdc as number).toBeCloseTo(LIMB_MDC95, 8);
  });

  it('computes MDC95 correctly for a 3 cm torso band', () => {
    const mdc = computeMDC95({ toleranceCm: 3 });
    expect(mdc as number).toBeCloseTo(TORSO_MDC95, 8);
  });

  it('computes MDC95 correctly from a percentage band (body fat at 25%)', () => {
    const mdc = computeMDC95({ tolerancePct: 0.10, referenceValue: 25 });
    expect(mdc).not.toBeNull();
    // SE = (0.10 * 25) / 2 = 1.25; MDC95 = 1.96 * sqrt(2) * 1.25
    expect(mdc as number).toBeCloseTo(BF_MDC95, 8);
  });

  it('returns null when toleranceCm is zero', () => {
    expect(computeMDC95({ toleranceCm: 0 })).toBeNull();
  });

  it('returns null when toleranceCm is negative', () => {
    expect(computeMDC95({ toleranceCm: -2 })).toBeNull();
  });

  it('returns null when no band fields are provided', () => {
    expect(computeMDC95({})).toBeNull();
  });

  it('returns null when tolerancePct is provided but referenceValue is missing', () => {
    expect(computeMDC95({ tolerancePct: 0.10 })).toBeNull();
  });

  it('returns null when tolerancePct is provided but referenceValue is zero', () => {
    expect(computeMDC95({ tolerancePct: 0.10, referenceValue: 0 })).toBeNull();
  });

  it('returns null when tolerancePct is zero', () => {
    expect(computeMDC95({ tolerancePct: 0, referenceValue: 25 })).toBeNull();
  });

  it('computes different MDC95 values for different tolerance bands (injected band)', () => {
    const narrow = computeMDC95({ toleranceCm: 1 }) as number;
    const wide = computeMDC95({ toleranceCm: 4 }) as number;
    expect(wide).toBeGreaterThan(narrow);
    // Scale linearly: wide / narrow should equal 4 / 1 = 4
    expect(wide / narrow).toBeCloseTo(4.0, 8);
  });
});

// ---------------------------------------------------------------------------
// classifyDelta: at and around the boundary
// ---------------------------------------------------------------------------

describe('classifyDelta: boundary classification', () => {
  const limbBand: ErrorBand = { toleranceCm: 2 };

  it('exactly at MDC95 is MEANINGFUL', () => {
    const mdc = computeMDC95(limbBand) as number;
    expect(classifyDelta(mdc, limbBand)).toBe<NoiseClassification>('MEANINGFUL');
  });

  it('one epsilon above MDC95 is MEANINGFUL', () => {
    const mdc = computeMDC95(limbBand) as number;
    expect(classifyDelta(mdc + 0.0001, limbBand)).toBe<NoiseClassification>('MEANINGFUL');
  });

  it('one epsilon below MDC95 is WITHIN_NOISE', () => {
    const mdc = computeMDC95(limbBand) as number;
    expect(classifyDelta(mdc - 0.0001, limbBand)).toBe<NoiseClassification>('WITHIN_NOISE');
  });

  it('negative delta equal to -MDC95 is MEANINGFUL (absolute value used)', () => {
    const mdc = computeMDC95(limbBand) as number;
    expect(classifyDelta(-mdc, limbBand)).toBe<NoiseClassification>('MEANINGFUL');
  });

  it('zero delta is WITHIN_NOISE for any positive band', () => {
    expect(classifyDelta(0, limbBand)).toBe<NoiseClassification>('WITHIN_NOISE');
  });

  it('returns null when the band is empty (no toleranceCm, no tolerancePct)', () => {
    expect(classifyDelta(5, {})).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// classifyDelta: known delta against known band (explicit regression fixtures)
// ---------------------------------------------------------------------------

describe('classifyDelta: known delta vs known band fixtures', () => {
  it('1 cm change for a limb (tol=2 cm, MDC95~2.77): WITHIN_NOISE', () => {
    expect(classifyDelta(1, { toleranceCm: 2 })).toBe<NoiseClassification>('WITHIN_NOISE');
  });

  it('3 cm change for a limb (tol=2 cm, MDC95~2.77): MEANINGFUL', () => {
    expect(classifyDelta(3, { toleranceCm: 2 })).toBe<NoiseClassification>('MEANINGFUL');
  });

  it('2 cm change for a torso (tol=3 cm, MDC95~4.16): WITHIN_NOISE', () => {
    expect(classifyDelta(2, { toleranceCm: 3 })).toBe<NoiseClassification>('WITHIN_NOISE');
  });

  it('5 cm change for a torso (tol=3 cm, MDC95~4.16): MEANINGFUL', () => {
    expect(classifyDelta(5, { toleranceCm: 3 })).toBe<NoiseClassification>('MEANINGFUL');
  });

  it('2% body fat change at 25% reference (10% tol, MDC95~3.46): WITHIN_NOISE', () => {
    expect(
      classifyDelta(2, { tolerancePct: 0.10, referenceValue: 25 }),
    ).toBe<NoiseClassification>('WITHIN_NOISE');
  });

  it('4% body fat change at 25% reference (10% tol, MDC95~3.46): MEANINGFUL', () => {
    expect(
      classifyDelta(4, { tolerancePct: 0.10, referenceValue: 25 }),
    ).toBe<NoiseClassification>('MEANINGFUL');
  });
});

// ---------------------------------------------------------------------------
// classifyGirthDelta convenience wrapper
// ---------------------------------------------------------------------------

describe('classifyGirthDelta', () => {
  it('delegates correctly to classifyDelta with a cm band', () => {
    // 3 cm change for limb (tol=2): MEANINGFUL
    expect(classifyGirthDelta(3, 2)).toBe<NoiseClassification>('MEANINGFUL');
    // 1 cm change for limb (tol=2): WITHIN_NOISE
    expect(classifyGirthDelta(1, 2)).toBe<NoiseClassification>('WITHIN_NOISE');
  });

  it('returns null for toleranceCm <= 0', () => {
    expect(classifyGirthDelta(5, 0)).toBeNull();
    expect(classifyGirthDelta(5, -1)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// classifyBodyFatDelta convenience wrapper
// ---------------------------------------------------------------------------

describe('classifyBodyFatDelta', () => {
  it('classifies a 4 pp change at 25% reference (10% tol) as MEANINGFUL', () => {
    expect(classifyBodyFatDelta(4, 25, 0.10)).toBe<NoiseClassification>('MEANINGFUL');
  });

  it('classifies a 2 pp change at 25% reference (10% tol) as WITHIN_NOISE', () => {
    expect(classifyBodyFatDelta(2, 25, 0.10)).toBe<NoiseClassification>('WITHIN_NOISE');
  });

  it('returns null for zero tolerance fraction', () => {
    expect(classifyBodyFatDelta(2, 25, 0)).toBeNull();
  });

  it('returns null for zero reference value', () => {
    expect(classifyBodyFatDelta(2, 0, 0.10)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Within-noise copy: must render and must not be failure language
// ---------------------------------------------------------------------------

describe('withinNoiseCopy: honest, kind copy', () => {
  const FAILURE_WORDS = ['fail', 'bad', 'wrong', 'worse', 'regress', 'lost', 'decline'];

  it('renders non-empty copy for a named metric', () => {
    const copy = withinNoiseCopy({ metricLabel: 'waist' });
    expect(copy.length).toBeGreaterThan(0);
  });

  it('includes the metric label in the copy', () => {
    const copy = withinNoiseCopy({ metricLabel: 'body fat' });
    expect(copy).toContain('body fat');
  });

  it('mentions precision or measurement noise', () => {
    const copy = withinNoiseCopy({ metricLabel: 'waist' });
    const lower = copy.toLowerCase();
    const mentionsPrecision =
      lower.includes('precision') || lower.includes('noise') || lower.includes('measurement');
    expect(mentionsPrecision).toBe(true);
  });

  it('does not contain failure language', () => {
    const copy = withinNoiseCopy({ metricLabel: 'waist' }).toLowerCase();
    for (const word of FAILURE_WORDS) {
      expect(copy).not.toContain(word);
    }
  });

  it('does not contain em or en dashes', () => {
    const copy = withinNoiseCopy({ metricLabel: 'waist' });
    expect(copy).not.toContain(String.fromCharCode(0x2014)); // em dash
    expect(copy).not.toContain(String.fromCharCode(0x2013)); // en dash
  });

  it('WITHIN_NOISE_INLINE_LABEL is non-empty and dash-clean', () => {
    expect(WITHIN_NOISE_INLINE_LABEL.length).toBeGreaterThan(0);
    expect(WITHIN_NOISE_INLINE_LABEL).not.toContain(String.fromCharCode(0x2014));
    expect(WITHIN_NOISE_INLINE_LABEL).not.toContain(String.fromCharCode(0x2013));
  });

  it('withinNoiseAriaLabel includes the metric name', () => {
    const label = withinNoiseAriaLabel('upper arm');
    expect(label).toContain('upper arm');
  });
});

// ---------------------------------------------------------------------------
// Injected-band contract: caller controls the band entirely
// ---------------------------------------------------------------------------

describe('injected-band contract', () => {
  it('a tighter injected band (1 cm) raises the WITHIN_NOISE range', () => {
    // Same 1 cm delta: WITHIN_NOISE under 2 cm band but MEANINGFUL under 0.5 cm band
    expect(classifyGirthDelta(1, 2)).toBe<NoiseClassification>('WITHIN_NOISE');
    expect(classifyGirthDelta(1, 0.5)).toBe<NoiseClassification>('MEANINGFUL');
  });

  it('a wider injected band (5 cm) makes a 3 cm change WITHIN_NOISE', () => {
    expect(classifyGirthDelta(3, 2)).toBe<NoiseClassification>('MEANINGFUL');
    expect(classifyGirthDelta(3, 5)).toBe<NoiseClassification>('WITHIN_NOISE');
  });

  it('any classification can change if the band changes (no hardcoded thresholds)', () => {
    // Demonstrates that the engine truly takes the band as input and does not
    // cache or hardcode a threshold.
    const delta = 2.5;
    // With 2 cm band: MDC95 ~ 2.77 -> WITHIN_NOISE
    expect(classifyGirthDelta(delta, 2)).toBe<NoiseClassification>('WITHIN_NOISE');
    // With 1.5 cm band: MDC95 ~ 2.08 -> MEANINGFUL
    expect(classifyGirthDelta(delta, 1.5)).toBe<NoiseClassification>('MEANINGFUL');
  });
});
