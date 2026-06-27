// Tests for projectFutureSelfVector (Prompt 210b, Phase 5, P5-T1a).
// Written first (TDD). Five test groups per the task brief:
// 1. Disabled states (no-goal, no-current-scan)
// 2. Cut direction (waist reduces more than bicep; values never grow during cut)
// 3. Unit correctness (cm vs inch inputs produce the same circumferenceM)
// 4. UNKNOWN preservation (null circumference stays null in vector)
// 5. Determinism (same inputs -> identical output)

import { describe, it, expect } from 'vitest';
import { projectFutureSelfVector } from '../projectFutureSelfVector';
import type { CompositionSnapshot } from '@/lib/body-tracker/composition/types';
import {
  emptyMeasurements,
  type CircumferenceMeasurements,
} from '@/lib/body-tracker/circumference';

// ---------- test factories ----------

function snapshot(overrides: Partial<CompositionSnapshot> = {}): CompositionSnapshot {
  return {
    entryId: 'test-entry',
    source: 'scan',
    recordedAt: '2026-01-01T00:00:00Z',
    totalBodyFatPct: 25,
    regionFatPct: {
      right_arm: null,
      left_arm: null,
      trunk: null,
      right_leg: null,
      left_leg: null,
    },
    visceralFatRating: null,
    bodyWaterPct: null,
    regionMuscleLbs: {
      right_arm: null,
      left_arm: null,
      trunk: null,
      right_leg: null,
      left_leg: null,
    },
    totalMuscleMassLbs: null,
    skeletalMuscleMassLbs: null,
    ...overrides,
  };
}

function circ(overrides: Partial<CircumferenceMeasurements> = {}): CircumferenceMeasurements {
  return { ...emptyMeasurements(), ...overrides };
}

// Base current input in cm. BF = 25%, realistic adult male measurements.
const BASE_CURRENT_CM = {
  snapshot: snapshot({ totalBodyFatPct: 25 }),
  circumferences: circ({
    waist: 90,         // cm
    chest: 100,        // cm
    hip: 100,          // cm
    rightBicep: 36,    // cm
    leftBicep: 36,     // cm
    neck: 38,          // cm
    rightQuadriceps: 58, // cm
    leftQuadriceps: 58,  // cm
    rightCalf: 37,     // cm
    leftCalf: 37,      // cm
  }),
  sex: 'male' as const,
  unit: 'cm' as const,
};

// ---------- Group 1: Disabled states ----------

describe('projectFutureSelfVector: disabled states', () => {
  it('returns disabled/no-goal when goalBodyFatPct is null', () => {
    const result = projectFutureSelfVector(BASE_CURRENT_CM, null);
    expect(result).toEqual({ kind: 'disabled', reason: 'no-goal' });
  });

  it('returns disabled/no-current-scan when snapshot.totalBodyFatPct is null', () => {
    const current = {
      ...BASE_CURRENT_CM,
      snapshot: snapshot({ totalBodyFatPct: null }),
    };
    const result = projectFutureSelfVector(current, 20);
    expect(result).toEqual({ kind: 'disabled', reason: 'no-current-scan' });
  });
});

// ---------- Group 2: Cut direction ----------

describe('projectFutureSelfVector: cut direction', () => {
  it('a cut (5% BF) reduces waist circumference more than bicep', () => {
    // BF 25% -> 20% is a 5% cut.
    // waist delta = 5 * 0.90 = 4.5 cm -> waist ring drops 0.045 m
    // bicep delta = 5 * 0.15 = 0.75 cm -> bicep drops 0.0075 m
    const result = projectFutureSelfVector(BASE_CURRENT_CM, 20);
    expect(result.kind).toBe('projected');
    if (result.kind !== 'projected') return;

    expect(result.bfDelta).toBeCloseTo(-5, 10);
    expect(result.projectedBodyFatPct).toBe(20);

    const waistRing = result.vector.rings.find((r) => r.id === 'waist')!;
    const rArm = result.vector.arms.find((a) => a.side === 'r')!;

    // Original values in meters: 90 cm = 0.9 m; 36 cm = 0.36 m
    const waistReduction = 0.9 - waistRing.circumferenceM!;
    const bicepReduction = 0.36 - rArm.bicepM!;

    expect(waistReduction).toBeGreaterThan(0);
    expect(bicepReduction).toBeGreaterThan(0);
    expect(waistReduction).toBeGreaterThan(bicepReduction);
  });

  it('circumferences do not grow during a cut', () => {
    // For a negative bfDelta, every mapped key should be <= original value.
    const result = projectFutureSelfVector(BASE_CURRENT_CM, 20);
    expect(result.kind).toBe('projected');
    if (result.kind !== 'projected') return;

    const waistRing = result.vector.rings.find((r) => r.id === 'waist')!;
    const hipRing = result.vector.rings.find((r) => r.id === 'hip')!;
    const chestRing = result.vector.rings.find((r) => r.id === 'chest')!;

    // Original in meters: waist 0.9, hip 1.0, chest 1.0
    expect(waistRing.circumferenceM!).toBeLessThan(0.9);
    expect(hipRing.circumferenceM!).toBeLessThan(1.0);
    expect(chestRing.circumferenceM!).toBeLessThan(1.0);
  });

  it('bfDelta zero when goal equals current: circumferences unchanged', () => {
    // Goal BF = current BF = 25% -> delta = 0 -> no change
    const result = projectFutureSelfVector(BASE_CURRENT_CM, 25);
    expect(result.kind).toBe('projected');
    if (result.kind !== 'projected') return;

    expect(result.bfDelta).toBe(0);

    const waistRing = result.vector.rings.find((r) => r.id === 'waist')!;
    // 90 cm = 0.9 m; with zero delta the ring should stay at 0.9 m
    expect(waistRing.circumferenceM!).toBeCloseTo(0.9, 6);
  });
});

// ---------- Group 3: Unit correctness ----------

describe('projectFutureSelfVector: unit correctness (cm vs inch)', () => {
  it('equivalent cm and inch inputs produce the same body shape (circumferenceM)', () => {
    // Waist = 90 cm exactly. Goal: 5% cut (BF 25% -> 20%).
    // In cm:  projected = 90 - (5 * 0.90) = 85.5 cm -> 0.855 m
    // In in:  waist_in = 90/2.54; projected = (90-4.5)/2.54 = 85.5/2.54 in
    //         -> (85.5/2.54) * 0.0254 = 0.855 m
    // A wrong-unit delta (applying cm delta to inch value) would give
    //   (90/2.54) - (5*0.90) = 35.43 - 4.5 = 30.93 in -> 0.786 m (wrong, 2.54x error).

    const cmInput = {
      snapshot: snapshot({ totalBodyFatPct: 25 }),
      circumferences: circ({ waist: 90 }),
      sex: 'male' as const,
      unit: 'cm' as const,
    };

    // Express the identical waist measurement in inches.
    const waistInches = 90 / 2.54;
    const inchInput = {
      snapshot: snapshot({ totalBodyFatPct: 25 }),
      circumferences: circ({ waist: waistInches }),
      sex: 'male' as const,
      unit: 'in' as const,
    };

    const cmResult = projectFutureSelfVector(cmInput, 20);
    const inResult = projectFutureSelfVector(inchInput, 20);

    expect(cmResult.kind).toBe('projected');
    expect(inResult.kind).toBe('projected');
    if (cmResult.kind !== 'projected' || inResult.kind !== 'projected') return;

    const cmWaist = cmResult.vector.rings.find((r) => r.id === 'waist')!;
    const inWaist = inResult.vector.rings.find((r) => r.id === 'waist')!;

    // Both should land at 0.855 m (within floating-point tolerance).
    expect(cmWaist.circumferenceM!).toBeCloseTo(0.855, 4);
    expect(inWaist.circumferenceM!).toBeCloseTo(0.855, 4);
    // And they should agree with each other.
    expect(cmWaist.circumferenceM!).toBeCloseTo(inWaist.circumferenceM!, 4);
  });
});

// ---------- Group 4: UNKNOWN preservation ----------

describe('projectFutureSelfVector: UNKNOWN preservation', () => {
  it('a null circumference stays null in the projected vector (estimated ring)', () => {
    // Waist is null (UNKNOWN); everything else is known.
    const current = {
      snapshot: snapshot({ totalBodyFatPct: 25 }),
      circumferences: circ({ chest: 100, hip: 100 }), // waist not set -> null
      sex: 'male' as const,
      unit: 'cm' as const,
    };

    const result = projectFutureSelfVector(current, 20);
    expect(result.kind).toBe('projected');
    if (result.kind !== 'projected') return;

    const waistRing = result.vector.rings.find((r) => r.id === 'waist')!;
    expect(waistRing.circumferenceM).toBeNull();
    expect(waistRing.estimated).toBe(true);

    // A known chest ring should NOT be null.
    const chestRing = result.vector.rings.find((r) => r.id === 'chest')!;
    expect(chestRing.circumferenceM).not.toBeNull();
    expect(chestRing.estimated).toBe(false);
  });

  it('all rings are estimated when circumferences input is null', () => {
    const current = {
      snapshot: snapshot({ totalBodyFatPct: 25 }),
      circumferences: null, // no measurements at all
      sex: 'male' as const,
      unit: 'cm' as const,
    };

    const result = projectFutureSelfVector(current, 20);
    expect(result.kind).toBe('projected');
    if (result.kind !== 'projected') return;

    for (const ring of result.vector.rings) {
      expect(ring.circumferenceM).toBeNull();
      expect(ring.estimated).toBe(true);
    }
    for (const arm of result.vector.arms) {
      expect(arm.bicepM).toBeNull();
      expect(arm.forearmM).toBeNull();
      expect(arm.estimated).toBe(true);
    }
  });
});

// ---------- Group 5: Determinism ----------

describe('projectFutureSelfVector: determinism', () => {
  it('same inputs produce identical vectors on repeated calls', () => {
    const current = {
      snapshot: snapshot({ totalBodyFatPct: 25 }),
      circumferences: circ({ waist: 90, chest: 100, hip: 100, rightBicep: 36, rightCalf: 37 }),
      sex: 'male' as const,
      unit: 'cm' as const,
    };

    const a = projectFutureSelfVector(current, 20);
    const b = projectFutureSelfVector(current, 20);
    expect(a).toEqual(b);
  });
});
