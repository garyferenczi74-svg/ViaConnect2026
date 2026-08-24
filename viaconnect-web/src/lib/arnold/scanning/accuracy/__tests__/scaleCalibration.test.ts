// Task 4 (Prompt 210c) - Scale cross-check tests.
//
// TDD: these tests are written BEFORE the implementation. Run them first to
// confirm RED, then implement scaleCalibration.ts to make them GREEN.

import { describe, it, expect } from 'vitest';
import { reconcileScale } from '../scaleCalibration';

// Convenience: 0.05 cm/px is a realistic value for a full-body capture at
// typical smartphone distance (170 cm person, ~3400 px height -> 0.05 cm/px).
const NOMINAL = 0.05;

describe('reconcileScale', () => {
  // --- Case 1: front + side that agree closely ---
  it('returns high agreement and no flag when front/side scales match closely', () => {
    // 1% relative spread - well inside any reasonable tolerance.
    const front = NOMINAL;
    const side = NOMINAL * 1.01;
    const result = reconcileScale({ frontScaleCmPerPx: front, sideScaleCmPerPx: side });

    expect(result.scaleCmPerPx).not.toBeNull();
    // Agreement should be near 1 for a 1% spread.
    expect(result.agreement).toBeGreaterThan(0.9);
    expect(result.disagreementFlag).toBe(false);
    // Reconciled scale should lie between the two inputs.
    const min = Math.min(front, side);
    const max = Math.max(front, side);
    expect(result.scaleCmPerPx!).toBeGreaterThanOrEqual(min);
    expect(result.scaleCmPerPx!).toBeLessThanOrEqual(max);
  });

  // --- Case 2: front + side that diverge widely ---
  it('returns low agreement and flag when front/side scales diverge widely', () => {
    // 30% relative spread - far beyond any reasonable tolerance.
    const front = NOMINAL;
    const side = NOMINAL * 1.30;
    const result = reconcileScale({ frontScaleCmPerPx: front, sideScaleCmPerPx: side });

    expect(result.scaleCmPerPx).not.toBeNull();
    expect(result.agreement).toBeLessThan(0.5);
    expect(result.disagreementFlag).toBe(true);
  });

  // --- Case 3: only one anchor present (front only) ---
  it('returns the single anchor, single-source agreement, and flag false when only front is present', () => {
    const result = reconcileScale({ frontScaleCmPerPx: NOMINAL, sideScaleCmPerPx: null });

    expect(result.scaleCmPerPx).toBeCloseTo(NOMINAL);
    // Single-source agreement is documented as a neutral value (< 1 because we
    // cannot cross-check, but not 0 because there is a value).
    expect(result.agreement).toBeGreaterThan(0);
    expect(result.agreement).toBeLessThan(1);
    expect(result.disagreementFlag).toBe(false);
  });

  it('returns the single anchor when only side is present', () => {
    const result = reconcileScale({ frontScaleCmPerPx: null, sideScaleCmPerPx: NOMINAL });

    expect(result.scaleCmPerPx).toBeCloseTo(NOMINAL);
    expect(result.agreement).toBeGreaterThan(0);
    expect(result.agreement).toBeLessThan(1);
    expect(result.disagreementFlag).toBe(false);
  });

  // --- Case 4: no anchors at all ---
  it('returns { null, 0, false } when no anchors are present (RULE 9: no fabrication)', () => {
    const result = reconcileScale({ frontScaleCmPerPx: null, sideScaleCmPerPx: null });

    expect(result.scaleCmPerPx).toBeNull();
    expect(result.agreement).toBe(0);
    expect(result.disagreementFlag).toBe(false);
  });

  // --- Case 5: reference-object anchor included (opt-in) ---
  it('includes ref-object anchor in reconciliation and raises agreement on three-way match', () => {
    // All three anchors agree tightly (0.5% spread).
    const front = NOMINAL;
    const side = NOMINAL * 1.005;
    const ref = NOMINAL * 0.995;
    const resultWithRef = reconcileScale({
      frontScaleCmPerPx: front,
      sideScaleCmPerPx: side,
      refObjectScaleCmPerPx: ref,
    });
    const resultWithout = reconcileScale({
      frontScaleCmPerPx: front,
      sideScaleCmPerPx: side,
    });

    // More anchors agreeing should not lower agreement vs two-anchor result.
    expect(resultWithRef.agreement).toBeGreaterThanOrEqual(resultWithout.agreement - 0.05);
    expect(resultWithRef.disagreementFlag).toBe(false);
    // Reconciled scale within the tight band.
    expect(resultWithRef.scaleCmPerPx!).toBeGreaterThan(ref * 0.99);
    expect(resultWithRef.scaleCmPerPx!).toBeLessThan(front * 1.01);
  });

  it('lowers agreement when ref-object anchor disagrees with pose-derived anchors', () => {
    // Ref object reads 25% higher - an outlier.
    const front = NOMINAL;
    const side = NOMINAL * 1.01;
    const refOutlier = NOMINAL * 1.25;
    const resultWithOutlier = reconcileScale({
      frontScaleCmPerPx: front,
      sideScaleCmPerPx: side,
      refObjectScaleCmPerPx: refOutlier,
    });
    const resultWithout = reconcileScale({
      frontScaleCmPerPx: front,
      sideScaleCmPerPx: side,
    });

    // An outlier ref object should lower or at least not raise agreement.
    expect(resultWithOutlier.agreement).toBeLessThanOrEqual(resultWithout.agreement + 0.05);
  });

  // --- Edge: agreement is always in [0, 1] ---
  it('agreement is always in [0, 1] for any input combination', () => {
    const cases = [
      reconcileScale({ frontScaleCmPerPx: null, sideScaleCmPerPx: null }),
      reconcileScale({ frontScaleCmPerPx: NOMINAL, sideScaleCmPerPx: null }),
      reconcileScale({ frontScaleCmPerPx: null, sideScaleCmPerPx: NOMINAL }),
      reconcileScale({ frontScaleCmPerPx: NOMINAL, sideScaleCmPerPx: NOMINAL }),
      reconcileScale({ frontScaleCmPerPx: NOMINAL, sideScaleCmPerPx: NOMINAL * 2 }),
    ];
    for (const r of cases) {
      expect(r.agreement).toBeGreaterThanOrEqual(0);
      expect(r.agreement).toBeLessThanOrEqual(1);
    }
  });
});
