import { describe, it, expect } from 'vitest';
import { fatValuesFromSnapshot, muscleValuesFromSnapshot } from '../regionValues';
import type { CompositionSnapshot } from '../types';

const baseRegion = { right_arm: null, left_arm: null, trunk: null, right_leg: null, left_leg: null };

const fullSnap: CompositionSnapshot = {
  entryId: 'e1',
  source: 'manual',
  recordedAt: '2026-06-22T00:00:00Z',
  totalBodyFatPct: 22.0,
  regionFatPct: { right_arm: 18.0, left_arm: 18.5, trunk: 25.0, right_leg: 28.0, left_leg: 27.5 },
  visceralFatRating: 5,
  bodyWaterPct: 55.0,
  regionMuscleLbs: { right_arm: 8.5, left_arm: 8.0, trunk: 45.0, right_leg: 22.0, left_leg: 21.5 },
  totalMuscleMassLbs: 140.0,
  skeletalMuscleMassLbs: 120.0,
};

const nullRegionSnap: CompositionSnapshot = {
  ...fullSnap,
  regionFatPct: { ...baseRegion, trunk: null },
  regionMuscleLbs: { ...baseRegion },
};

describe('fatValuesFromSnapshot', () => {
  it('maps snapshot fat regions to pct keys', () => {
    const vals = fatValuesFromSnapshot(fullSnap);
    expect(vals['right_arm_pct']).toBe(18.0);
    expect(vals['left_arm_pct']).toBe(18.5);
    expect(vals['trunk_pct']).toBe(25.0);
    expect(vals['right_leg_pct']).toBe(28.0);
    expect(vals['left_leg_pct']).toBe(27.5);
    expect(vals['total_body_fat_pct']).toBe(22.0);
  });

  it('passes null for UNKNOWN region (trunk_pct: null - not 0)', () => {
    const vals = fatValuesFromSnapshot(nullRegionSnap);
    expect(vals['trunk_pct']).toBeNull();
    expect(vals['trunk_pct']).not.toBe(0);
  });

  it('returns all null when snapshot is null', () => {
    const vals = fatValuesFromSnapshot(null);
    expect(vals['right_arm_pct']).toBeNull();
    expect(vals['trunk_pct']).toBeNull();
    expect(vals['total_body_fat_pct']).toBeNull();
  });
});

describe('muscleValuesFromSnapshot', () => {
  it('maps snapshot muscle regions to lbs keys', () => {
    const vals = muscleValuesFromSnapshot(fullSnap);
    expect(vals['right_arm_lbs']).toBe(8.5);
    expect(vals['left_arm_lbs']).toBe(8.0);
    expect(vals['trunk_lbs']).toBe(45.0);
    expect(vals['right_leg_lbs']).toBe(22.0);
    expect(vals['left_leg_lbs']).toBe(21.5);
    expect(vals['total_muscle_mass_lbs']).toBe(140.0);
  });

  it('passes null for UNKNOWN muscle region (not 0)', () => {
    const vals = muscleValuesFromSnapshot(nullRegionSnap);
    expect(vals['right_arm_lbs']).toBeNull();
    expect(vals['right_arm_lbs']).not.toBe(0);
  });

  it('returns all null when snapshot is null', () => {
    const vals = muscleValuesFromSnapshot(null);
    expect(vals['right_arm_lbs']).toBeNull();
    expect(vals['total_muscle_mass_lbs']).toBeNull();
  });
});
