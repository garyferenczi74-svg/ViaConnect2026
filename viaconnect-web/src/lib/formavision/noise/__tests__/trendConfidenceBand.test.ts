/**
 * Prompt 211b W2 review fixes (C2, I2): tests for trendConfidenceBand.ts.
 *
 * TDD contract:
 *   1. confidenceBandAriaLabel never contains a digit (no numeric precision
 *      figure may appear in user-facing copy before a real held-out cohort
 *      passes -- review C2).
 *   2. circumferenceBandHalfWidth returns MDC95 / 2, not the full MDC95
 *      (review I2).
 */

import { describe, it, expect } from 'vitest';
import { computeMDC95 } from '../mdcEngine';
import { RegionToleranceCm } from '@/lib/arnold/scanning/accuracy/accuracyTargets';
import { PER_MEASUREMENT_PCT } from '@/lib/arnold/scanning/accuracy/accuracyTargets';
import {
  confidenceBandAriaLabel,
  circumferenceBandHalfWidth,
  bodyFatBandHalfWidth,
} from '../trendConfidenceBand';

describe('confidenceBandAriaLabel (review C2)', () => {
  it('contains no digit, regardless of the supplied halfWidth', () => {
    const label = confidenceBandAriaLabel('waist', 4.2, 'cm');
    expect(label).not.toMatch(/\d/);
  });

  it('keeps the qualitative precision/noise meaning', () => {
    const label = confidenceBandAriaLabel('waist', 4.2, 'cm');
    const lower = label.toLowerCase();
    expect(lower).toContain('waist');
    expect(lower.includes('precision') || lower.includes('noise')).toBe(true);
  });
});

describe('circumferenceBandHalfWidth (review I2)', () => {
  it('returns MDC95 / 2 for waist (cm), not the full MDC95', () => {
    const mdc95 = computeMDC95({ toleranceCm: RegionToleranceCm.waist });
    expect(mdc95).not.toBeNull();
    const expectedHalfWidth = (mdc95 as number) / 2;

    const result = circumferenceBandHalfWidth('waist', 'cm');
    expect(result.halfWidth).not.toBeNull();
    expect(result.halfWidth as number).toBeCloseTo(expectedHalfWidth, 10);
    // Guard against the I2 regression: the half-width must NOT equal the
    // full MDC95 value.
    expect(result.halfWidth as number).not.toBeCloseTo(mdc95 as number, 10);
  });

  it('converts the halfWidth to inches when displayUnit is in', () => {
    const cmResult = circumferenceBandHalfWidth('waist', 'cm');
    const inResult = circumferenceBandHalfWidth('waist', 'in');
    expect(inResult.halfWidth as number).toBeCloseTo((cmResult.halfWidth as number) / 2.54, 10);
  });

  it('returns null for a measurement key with no GirthRegion mapping', () => {
    const result = circumferenceBandHalfWidth('shoulderWidth', 'cm');
    expect(result.halfWidth).toBeNull();
  });
});

describe('bodyFatBandHalfWidth (review M1: half-width, not the full MDC95)', () => {
  it('returns MDC95 / 2 for a positive reference, not the full MDC95', () => {
    const referencePct = 25;
    const mdc95 = computeMDC95({ tolerancePct: PER_MEASUREMENT_PCT, referenceValue: referencePct });
    expect(mdc95).not.toBeNull();
    const expectedHalfWidth = (mdc95 as number) / 2;

    const result = bodyFatBandHalfWidth(referencePct);
    expect(result.unit).toBe('pct');
    expect(result.halfWidth).not.toBeNull();
    expect(result.halfWidth as number).toBeCloseTo(expectedHalfWidth, 10);
    // Guard against the M1 regression: the half-width must NOT equal the
    // full MDC95 value.
    expect(result.halfWidth as number).not.toBeCloseTo(mdc95 as number, 10);
  });

  it('matches circumferenceBandHalfWidth\'s halving convention', () => {
    const result = bodyFatBandHalfWidth(25);
    const full = computeMDC95({ tolerancePct: PER_MEASUREMENT_PCT, referenceValue: 25 }) as number;
    expect(result.halfWidth as number).toBeCloseTo(full / 2, 10);
  });

  it('returns null halfWidth when referencePct is null', () => {
    const result = bodyFatBandHalfWidth(null);
    expect(result.halfWidth).toBeNull();
    expect(result.unit).toBe('pct');
  });

  it('returns null halfWidth when referencePct is 0 (UNKNOWN sentinel)', () => {
    const result = bodyFatBandHalfWidth(0);
    expect(result.halfWidth).toBeNull();
  });
});
