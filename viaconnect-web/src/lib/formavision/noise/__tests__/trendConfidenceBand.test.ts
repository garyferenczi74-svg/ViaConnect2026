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
import {
  confidenceBandAriaLabel,
  circumferenceBandHalfWidth,
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
