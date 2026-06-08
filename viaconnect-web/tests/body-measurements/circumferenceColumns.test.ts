import { describe, it, expect } from 'vitest';
import { MEASUREMENT_DB_COLUMN } from '@/lib/body-tracker/circumference';

// Live body_tracker_circumference columns, verified via information_schema on
// 2026-06-08. This guards against reintroducing the right_bicep / right_quadriceps
// drift that silently nulled those reads and made a manual entry filling them fail.
const LIVE_CIRCUMFERENCE_COLUMNS = new Set([
  'neck',
  'shoulder_width',
  'right_upper_arm',
  'left_upper_arm',
  'right_forearm',
  'left_forearm',
  'chest',
  'waist',
  'hip',
  'right_upper_thigh',
  'left_upper_thigh',
  'right_calf',
  'left_calf',
]);

describe('MEASUREMENT_DB_COLUMN matches the live circumference schema', () => {
  it('maps bicep + quadriceps to the real columns, not the drifted names', () => {
    expect(MEASUREMENT_DB_COLUMN.rightBicep).toBe('right_upper_arm');
    expect(MEASUREMENT_DB_COLUMN.leftBicep).toBe('left_upper_arm');
    expect(MEASUREMENT_DB_COLUMN.rightQuadriceps).toBe('right_upper_thigh');
    expect(MEASUREMENT_DB_COLUMN.leftQuadriceps).toBe('left_upper_thigh');
  });

  it('every non-external circumference column exists in the live schema', () => {
    for (const [key, col] of Object.entries(MEASUREMENT_DB_COLUMN)) {
      // hip is sourced externally from body_tracker_weight.hips_in by design.
      if (key === 'hip') continue;
      expect(LIVE_CIRCUMFERENCE_COLUMNS.has(col)).toBe(true);
    }
  });
});
