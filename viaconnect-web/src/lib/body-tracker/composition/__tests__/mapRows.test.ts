import { describe, it, expect } from 'vitest';
import { mapRows } from '../mapRows';

describe('mapRows', () => {
  it('maps fat row fields to snapshot including null UNKNOWN fields', () => {
    const snapshot = mapRows({
      entry: { id: 'e1', source: 'scan', created_at: '2026-06-22T00:00:00Z' },
      fat: {
        total_body_fat_pct: 20.5,
        right_arm_pct: null,
        left_arm_pct: 18.0,
        trunk_pct: null,
        right_leg_pct: 22.0,
        left_leg_pct: null,
        visceral_fat_rating: null,
        body_water_pct: null,
      },
      muscle: null,
    });
    expect(snapshot).not.toBeNull();
    expect(snapshot!.deviceName).toBeNull();
    expect(snapshot!.totalBodyFatPct).toBe(20.5);
    expect(snapshot!.regionFatPct.right_arm).toBeNull();
    expect(snapshot!.regionFatPct.left_arm).toBe(18.0);
    expect(snapshot!.regionFatPct.trunk).toBeNull();
    expect(snapshot!.visceralFatRating).toBeNull();
    expect(snapshot!.bodyWaterPct).toBeNull();
  });

  it('preserves a real numeric 0 as 0 (distinct from null UNKNOWN)', () => {
    const snapshot = mapRows({
      entry: { id: 'e2', source: 'manual', created_at: '2026-06-22T00:00:00Z' },
      fat: {
        total_body_fat_pct: 0,
        right_arm_pct: 0,
        left_arm_pct: null,
        trunk_pct: null,
        right_leg_pct: null,
        left_leg_pct: null,
        visceral_fat_rating: 0,
        body_water_pct: 0,
      },
      muscle: null,
    });
    expect(snapshot!.totalBodyFatPct).toBe(0);
    expect(snapshot!.regionFatPct.right_arm).toBe(0);
    expect(snapshot!.visceralFatRating).toBe(0);
    expect(snapshot!.bodyWaterPct).toBe(0);
  });

  it('coerces undefined/missing fields to null', () => {
    const snapshot = mapRows({
      entry: { id: 'e3', source: 'manual', created_at: '2026-06-22T00:00:00Z' },
      fat: {
        total_body_fat_pct: null,
      },
      muscle: null,
    });
    expect(snapshot!.regionFatPct.right_arm).toBeNull();
    expect(snapshot!.regionFatPct.left_arm).toBeNull();
    expect(snapshot!.regionFatPct.trunk).toBeNull();
    expect(snapshot!.regionFatPct.right_leg).toBeNull();
    expect(snapshot!.regionFatPct.left_leg).toBeNull();
  });

  it('returns null when entry is null', () => {
    const snapshot = mapRows({ entry: null, fat: null, muscle: null });
    expect(snapshot).toBeNull();
  });

  it('parses FormaVision estimate notes into a range and marks the row estimated', () => {
    const snapshot = mapRows({
      entry: {
        id: 'e-scan',
        source: 'scan',
        created_at: '2026-08-24T00:00:00Z',
        scan_id: 'scan-1',
        device_name: 'FormaVision',
        notes: 'FormaVision estimate: 18.0–22.0% body fat',
      },
      fat: { total_body_fat_pct: 20 },
      muscle: null,
    });
    expect(snapshot!.deviceName).toBe('FormaVision');
    expect(snapshot!.scanId).toBe('scan-1');
    expect(snapshot!.protocol).toBe('formavision_photo');
    expect(snapshot!.isEstimated).toBe(true);
    expect(snapshot!.estimatedBodyFatMin).toBe(18);
    expect(snapshot!.estimatedBodyFatMax).toBe(22);
    expect(snapshot!.totalBodyFatPct).toBe(20);
  });

  it('maps muscle row fields to snapshot', () => {
    const snapshot = mapRows({
      entry: { id: 'e4', source: 'manual', created_at: '2026-06-22T00:00:00Z' },
      fat: null,
      muscle: {
        right_arm_lbs: 8.5,
        left_arm_lbs: 8.0,
        trunk_lbs: null,
        right_leg_lbs: null,
        left_leg_lbs: null,
        total_muscle_mass_lbs: 140.0,
        skeletal_muscle_mass_lbs: null,
      },
    });
    expect(snapshot!.regionMuscleLbs.right_arm).toBe(8.5);
    expect(snapshot!.regionMuscleLbs.trunk).toBeNull();
    expect(snapshot!.totalMuscleMassLbs).toBe(140.0);
    expect(snapshot!.skeletalMuscleMassLbs).toBeNull();
  });
});
