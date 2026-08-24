// Task 1 (Prompt 210c) - TDD tests for accuracy targets and tolerance config.
// Write tests first (RED), then implement, then GREEN.

import { describe, it, expect } from 'vitest';
import {
  PER_MEASUREMENT_PCT,
  AGGREGATE_PASS_RATE,
  MIN_ICC,
  RegionToleranceCm,
  withinTolerance,
} from '../accuracyTargets';

// ---- Section 1 aggregate + agreement constants ----

describe('accuracy constants', () => {
  it('PER_MEASUREMENT_PCT is 0.10', () => {
    expect(PER_MEASUREMENT_PCT).toBe(0.10);
  });

  it('AGGREGATE_PASS_RATE is 0.90', () => {
    expect(AGGREGATE_PASS_RATE).toBe(0.90);
  });

  it('MIN_ICC is 0.90', () => {
    expect(MIN_ICC).toBe(0.90);
  });
});

// ---- Section 1.1 region tolerance bands ----

describe('RegionToleranceCm bands', () => {
  it('limb girths (neck, upperArm, forearm, upperLeg, lowerLeg) have 2cm tolerance', () => {
    expect(RegionToleranceCm.neck).toBe(2);
    expect(RegionToleranceCm.upperArm).toBe(2);
    expect(RegionToleranceCm.forearm).toBe(2);
    expect(RegionToleranceCm.upperLeg).toBe(2);
    expect(RegionToleranceCm.lowerLeg).toBe(2);
  });

  it('torso girths (chest, waist, hip) have 3cm tolerance', () => {
    expect(RegionToleranceCm.chest).toBe(3);
    expect(RegionToleranceCm.waist).toBe(3);
    expect(RegionToleranceCm.hip).toBe(3);
  });

  it('is frozen (immutable)', () => {
    expect(Object.isFrozen(RegionToleranceCm)).toBe(true);
  });
});

// ---- withinTolerance: region band wins (small truth) ----
// Waist: truth = 25cm, 10% = 2.5cm, region band = 3cm -> GREATER is 3cm.

describe('withinTolerance - waist small truth (region 3cm band wins over 2.5cm pct)', () => {
  const truth = 25;

  it('3.0cm off PASSES (on the tolerance boundary)', () => {
    expect(withinTolerance(truth + 3.0, truth, 'waist')).toBe(true);
    expect(withinTolerance(truth - 3.0, truth, 'waist')).toBe(true);
  });

  it('3.1cm off FAILS (just outside the boundary)', () => {
    expect(withinTolerance(truth + 3.1, truth, 'waist')).toBe(false);
    expect(withinTolerance(truth - 3.1, truth, 'waist')).toBe(false);
  });
});

// ---- withinTolerance: 10 percent band wins (large truth) ----
// Large waist: truth = 100cm, 10% = 10cm > 3cm -> GREATER is 10cm.

describe('withinTolerance - large waist (10 percent band 10cm wins over 3cm region)', () => {
  const truth = 100;

  it('9.0cm off PASSES', () => {
    expect(withinTolerance(truth + 9.0, truth, 'waist')).toBe(true);
  });

  it('11cm off FAILS', () => {
    expect(withinTolerance(truth + 11, truth, 'waist')).toBe(false);
  });

  it('5cm off PASSES confirming the greater-of wins (5 > region 3cm but < pct 10cm)', () => {
    expect(withinTolerance(truth + 5, truth, 'waist')).toBe(true);
  });
});

// ---- withinTolerance: limb region band wins (small truth) ----
// Forearm: truth = 15cm, 10% = 1.5cm, region band = 2cm -> GREATER is 2cm.

describe('withinTolerance - forearm small truth (region 2cm band wins over 1.5cm pct)', () => {
  const truth = 15;

  it('2.0cm off PASSES (on the tolerance boundary)', () => {
    expect(withinTolerance(truth + 2.0, truth, 'forearm')).toBe(true);
    expect(withinTolerance(truth - 2.0, truth, 'forearm')).toBe(true);
  });

  it('2.1cm off FAILS (just outside the boundary)', () => {
    expect(withinTolerance(truth + 2.1, truth, 'forearm')).toBe(false);
  });

  it('1.4cm off PASSES (1.4 < 2cm region band, even though 1.4 > 1.5cm pct band)', () => {
    // Confirms the 2cm region band is the active tolerance here
    expect(withinTolerance(truth + 1.4, truth, 'forearm')).toBe(true);
  });
});

// ---- withinTolerance: 10 percent band wins over limb band (large limb truth) ----
// Forearm: truth = 30cm, 10% = 3.0cm > 2cm -> GREATER is 3.0cm.

describe('withinTolerance - forearm large truth (10 percent band 3cm wins over 2cm region)', () => {
  const truth = 30;

  it('2.9cm off PASSES', () => {
    expect(withinTolerance(truth + 2.9, truth, 'forearm')).toBe(true);
  });

  it('3.1cm off FAILS', () => {
    expect(withinTolerance(truth + 3.1, truth, 'forearm')).toBe(false);
  });

  it('2.1cm off PASSES confirming the greater-of wins (2.1 > region 2cm but < pct 3cm)', () => {
    expect(withinTolerance(truth + 2.1, truth, 'forearm')).toBe(true);
  });
});
