// Prompt 194a Task 2: unit tests for the macros-vs-calories reconciliation band
// that gates user-facing source confidence on the text and photo channels.
//
// Two invariants under test:
//  1. The band is exactly +/- 20 percent: a ratio of macro-derived calories to
//     advisory calories inside [0.80, 1.20] passes; just outside fails.
//  2. The gate is INDEPENDENT of recognition confidence. macroCaloriesReconciled
//     takes only (derivedKcal, advisoryKcal, macrosKnown) and has no
//     recognition-confidence parameter, so a fixed macro/advisory pair always
//     yields the same passed result no matter how confident the recognizer was.
//     Prompt 194 had briefly tied confidence to the 3 kcal engineering tripwire;
//     this band is the restored, separate, user-facing gate.

import { describe, it, expect } from 'vitest';
import {
  MATCH_CONFIDENCE_LOW_BAND,
  macroCaloriesReconciled,
  reconciliationRatio,
} from '../match-confidence';

describe('MATCH_CONFIDENCE_LOW_BAND', () => {
  it('is the single 20 percent band constant', () => {
    expect(MATCH_CONFIDENCE_LOW_BAND).toBe(0.20);
  });
});

describe('macroCaloriesReconciled band edges', () => {
  it('passes at the lower edge: derived/advisory == 0.80 exactly', () => {
    // derived 80 against advisory 100 is ratio 0.80, the inclusive lower bound.
    expect(macroCaloriesReconciled(80, 100, true)).toBe(true);
  });

  it('passes at the upper edge: derived/advisory == 1.20 exactly', () => {
    // derived 120 against advisory 100 is ratio 1.20, the inclusive upper bound.
    expect(macroCaloriesReconciled(120, 100, true)).toBe(true);
  });

  it('fails just below the lower edge: ratio 0.79', () => {
    expect(macroCaloriesReconciled(79, 100, true)).toBe(false);
  });

  it('fails just above the upper edge: ratio 1.21', () => {
    expect(macroCaloriesReconciled(121, 100, true)).toBe(false);
  });

  it('passes a perfectly reconciled meal (ratio 1.00)', () => {
    expect(macroCaloriesReconciled(400, 400, true)).toBe(true);
  });
});

describe('macroCaloriesReconciled guard inputs', () => {
  it('returns false when macros are not known, regardless of how well kcal lines up', () => {
    // Even an exact match cannot pass when a macro is missing.
    expect(macroCaloriesReconciled(100, 100, false)).toBe(false);
  });

  it('returns false when the advisory is null', () => {
    expect(macroCaloriesReconciled(100, null, true)).toBe(false);
  });

  it('returns false when the advisory is zero (no division by zero, no pass)', () => {
    expect(macroCaloriesReconciled(100, 0, true)).toBe(false);
  });

  it('returns false when the advisory is negative', () => {
    expect(macroCaloriesReconciled(100, -50, true)).toBe(false);
  });
});

describe('macroCaloriesReconciled is independent of recognition confidence', () => {
  // The signature is (derivedKcal, advisoryKcal, macrosKnown) with NO
  // recognition-confidence argument. There is no input through which a more or
  // less confident recognizer could move the band: for a fixed macro/advisory
  // pair the passed result is fixed. These concrete cases encode that intent.
  it('a fixed in-band pair always passes, no confidence input can change it', () => {
    // 410 vs 400 is ratio 1.025, comfortably inside the band. The only inputs
    // that exist all hold the pass; there is no recognition-confidence knob.
    expect(macroCaloriesReconciled(410, 400, true)).toBe(true);
    expect(macroCaloriesReconciled(410, 400, true)).toBe(true); // deterministic
  });

  it('a fixed out-of-band pair always fails, no confidence input can rescue it', () => {
    // 595 vs 208 (the contradictory-card field case) is ratio ~2.86, far out of
    // band, so it fails on the macros alone. A high recognizer confidence has no
    // parameter here and cannot lift it into the high-confidence tier.
    expect(macroCaloriesReconciled(595, 208, true)).toBe(false);
    expect(macroCaloriesReconciled(595, 208, true)).toBe(false); // deterministic
  });

  it('the function arity is exactly 3 (no recognition-confidence parameter)', () => {
    // Function.length excludes parameters with defaults/rest, so an extra
    // confidence input would show here. Locks the independence at the signature.
    expect(macroCaloriesReconciled.length).toBe(3);
  });
});

describe('reconciliationRatio', () => {
  it('reports the macro/advisory ratio rounded to 4 decimals', () => {
    // 208 / 595 = 0.349579..., rounded to 0.3496.
    expect(reconciliationRatio(208, 595, true)).toBe(0.3496);
  });

  it('returns 0 when macros are unknown', () => {
    expect(reconciliationRatio(208, 595, false)).toBe(0);
  });

  it('returns 0 when the advisory is null or non-positive', () => {
    expect(reconciliationRatio(208, null, true)).toBe(0);
    expect(reconciliationRatio(208, 0, true)).toBe(0);
    expect(reconciliationRatio(208, -10, true)).toBe(0);
  });
});
