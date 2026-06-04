// Prompt 173 Task 2 (rebuild on main 2026-06-03): weight-goals accessor unit suite.
//
// Covers the two PURE units in src/lib/weight-goals/accessor.ts:
//   (a) previewGoalDirection: client-side preview band logic. Must mirror the
//       DB trigger fn_compute_weight_goal_direction in migration
//       20260603100000_prompt_173_user_weight_goals.sql:
//         goal - current >  1.0  -> 'gain'
//         current - goal >  1.0  -> 'lose'
//         abs diff <= 1.0 (inclusive boundary) -> 'maintain'
//       maintain_threshold_kg is MACRO_CONFIG.maintain_threshold_kg = 1.0.
//   (b) rowToWeightGoal: snake_case row to camelCase WeightGoal mapper.
//
// readWeightGoal / writeWeightGoal are IO paths (require a Supabase client)
// and are not unit-tested here; the trigger owns goal_direction on write.

import { describe, it, expect } from 'vitest';
import {
  previewGoalDirection,
  rowToWeightGoal,
  type UserWeightGoalRow,
} from '@/lib/weight-goals/accessor';
import { MACRO_CONFIG } from '@/lib/gordon/macro-config';

describe('previewGoalDirection', () => {
  it('returns gain when goal weight is greater than current by more than 1 kg', () => {
    expect(previewGoalDirection(70, 75)).toBe('gain');
  });

  it('returns gain just past the +1.0 kg boundary', () => {
    expect(previewGoalDirection(70, 71.01)).toBe('gain');
  });

  it('returns lose when goal weight is less than current by more than 1 kg', () => {
    expect(previewGoalDirection(90, 82)).toBe('lose');
  });

  it('returns lose just past the -1.0 kg boundary', () => {
    expect(previewGoalDirection(70, 68.99)).toBe('lose');
  });

  it('returns maintain inside the band (small gain side)', () => {
    expect(previewGoalDirection(70, 70.4)).toBe('maintain');
  });

  it('returns maintain inside the band (small loss side)', () => {
    expect(previewGoalDirection(70, 69.6)).toBe('maintain');
  });

  it('returns maintain when goal equals current', () => {
    expect(previewGoalDirection(70, 70)).toBe('maintain');
  });

  it('returns maintain at exactly +1.0 kg (boundary is inclusive, not gain)', () => {
    expect(previewGoalDirection(70, 71)).toBe('maintain');
  });

  it('returns maintain at exactly -1.0 kg (boundary is inclusive, not lose)', () => {
    expect(previewGoalDirection(70, 69)).toBe('maintain');
  });

  it('uses MACRO_CONFIG.maintain_threshold_kg as the band (default 1.0)', () => {
    expect(MACRO_CONFIG.maintain_threshold_kg).toBe(1.0);
    const t = MACRO_CONFIG.maintain_threshold_kg;
    expect(previewGoalDirection(70, 70 + t)).toBe('maintain');
    expect(previewGoalDirection(70, 70 + t + 0.001)).toBe('gain');
  });
});

describe('rowToWeightGoal', () => {
  it('maps every snake_case column to its camelCase field', () => {
    const row: UserWeightGoalRow = {
      id: 'a1b2c3',
      user_id: 'user-123',
      current_weight_kg: 82.5,
      goal_weight_kg: 75,
      goal_direction: 'lose',
      source: 'caq',
      created_at: '2026-06-03T12:00:00.000Z',
      updated_at: '2026-06-03T12:00:00.000Z',
    };

    expect(rowToWeightGoal(row)).toEqual({
      id: 'a1b2c3',
      userId: 'user-123',
      currentWeightKg: 82.5,
      goalWeightKg: 75,
      goalDirection: 'lose',
      source: 'caq',
      createdAt: '2026-06-03T12:00:00.000Z',
      updatedAt: '2026-06-03T12:00:00.000Z',
    });
  });

  it('preserves the trigger-computed goal_direction verbatim on readback', () => {
    const row: UserWeightGoalRow = {
      id: 'id-2',
      user_id: 'user-9',
      current_weight_kg: 60,
      goal_weight_kg: 68,
      goal_direction: 'gain',
      source: 'body_tracker',
      created_at: '2026-06-03T08:30:00.000Z',
      updated_at: '2026-06-03T09:00:00.000Z',
    };

    const mapped = rowToWeightGoal(row);
    expect(mapped.goalDirection).toBe('gain');
    expect(mapped.source).toBe('body_tracker');
  });
});
