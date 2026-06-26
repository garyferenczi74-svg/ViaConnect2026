/**
 * src/hooks/journey/__tests__/useActiveBodyGoal.test.ts
 *
 * Prompt 208j Task J-T2. TDD for the pure deriveGoalLabel helper and the
 * tier->stateWord mapping (tierToStateWord). No DOM, no Supabase calls.
 *
 * No em-dashes. No emojis. No any.
 */

import { describe, it, expect } from 'vitest';
import { deriveGoalLabel } from '../useActiveBodyGoal';
import { tierToStateWord } from '../useActiveBodyGoal';
import type { BodyGoalRow } from '@/lib/body-goals/types';

// ---------------------------------------------------------------------------
// Minimal BodyGoalRow fixture factory
// ---------------------------------------------------------------------------

function makeRow(overrides: Partial<BodyGoalRow> = {}): BodyGoalRow {
  return {
    id: 'test-id',
    user_id: 'user-123',
    status: 'active',
    driver: 'rate',
    start_weight_lb: 180,
    goal_weight_lb: 160,
    goal_bodyfat_pct: null,
    start_date: '2026-01-01',
    target_date: null,
    target_rate_lb_per_week: null,
    sex: null,
    age_years: null,
    height_in: null,
    activity_level: null,
    origin: null,
    target_pace_preset: null,
    needs_resync: false,
    legacy_synced_at: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// deriveGoalLabel
// ---------------------------------------------------------------------------

describe('deriveGoalLabel', () => {
  it('returns "Reach a lighter weight" when goal < start by more than 0.5 lb', () => {
    const row = makeRow({ start_weight_lb: 180, goal_weight_lb: 160 });
    expect(deriveGoalLabel(row)).toBe('Reach a lighter weight');
  });

  it('returns "Build toward a heavier weight" when goal > start by more than 0.5 lb', () => {
    const row = makeRow({ start_weight_lb: 150, goal_weight_lb: 175 });
    expect(deriveGoalLabel(row)).toBe('Build toward a heavier weight');
  });

  it('returns "Maintain current weight" when goal equals start', () => {
    const row = makeRow({ start_weight_lb: 160, goal_weight_lb: 160 });
    expect(deriveGoalLabel(row)).toBe('Maintain current weight');
  });

  it('returns "Maintain current weight" when diff is within 0.5 lb tolerance', () => {
    const row = makeRow({ start_weight_lb: 160, goal_weight_lb: 160.3 });
    expect(deriveGoalLabel(row)).toBe('Maintain current weight');
  });

  it('appends (gently) when target_pace_preset is gentle', () => {
    const row = makeRow({ start_weight_lb: 180, goal_weight_lb: 160, target_pace_preset: 'gentle' });
    expect(deriveGoalLabel(row)).toBe('Reach a lighter weight (gently)');
  });

  it('appends (steadily) when target_pace_preset is steady', () => {
    const row = makeRow({ start_weight_lb: 180, goal_weight_lb: 160, target_pace_preset: 'steady' });
    expect(deriveGoalLabel(row)).toBe('Reach a lighter weight (steadily)');
  });

  it('appends (ambitiously) when target_pace_preset is ambitious', () => {
    const row = makeRow({ start_weight_lb: 180, goal_weight_lb: 160, target_pace_preset: 'ambitious' });
    expect(deriveGoalLabel(row)).toBe('Reach a lighter weight (ambitiously)');
  });

  it('appends (by a target date) when target_pace_preset is custom_date', () => {
    const row = makeRow({ start_weight_lb: 180, goal_weight_lb: 160, target_pace_preset: 'custom_date' });
    expect(deriveGoalLabel(row)).toBe('Reach a lighter weight (by a target date)');
  });

  it('does not append pace suffix when target_pace_preset is null', () => {
    const row = makeRow({ start_weight_lb: 180, goal_weight_lb: 160, target_pace_preset: null });
    const label = deriveGoalLabel(row);
    expect(label).not.toContain('(');
  });

  it('never returns an empty string', () => {
    const row = makeRow();
    expect(deriveGoalLabel(row).length).toBeGreaterThan(0);
  });

  it('never throws', () => {
    expect(() => deriveGoalLabel(makeRow())).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// tierToStateWord
// ---------------------------------------------------------------------------

describe('tierToStateWord', () => {
  it('returns "getting started" for null tier', () => {
    expect(tierToStateWord(null, null)).toBe('getting started');
  });

  it('returns "getting started" for null score with any tier', () => {
    expect(tierToStateWord('Optimal', null)).toBe('getting started');
  });

  it('returns "getting started" for "computing" tier', () => {
    expect(tierToStateWord('computing', 60)).toBe('getting started');
  });

  it('returns "getting started" for "baseline" tier', () => {
    expect(tierToStateWord('baseline', 30)).toBe('getting started');
  });

  it('returns "recovering" for score below 55 (no tier match)', () => {
    expect(tierToStateWord(null, 40)).toBe('getting started');
  });

  it('returns "recovering" for "Developing" tier with score below 55', () => {
    expect(tierToStateWord('Developing', 45)).toBe('recovering');
  });

  it('returns "steady" for "Moderate" tier', () => {
    expect(tierToStateWord('Moderate', 62)).toBe('steady');
  });

  it('returns "building" for "Strong" tier', () => {
    expect(tierToStateWord('Strong', 72)).toBe('building');
  });

  it('returns "optimizing" for "Optimal" tier', () => {
    expect(tierToStateWord('Optimal', 88)).toBe('optimizing');
  });

  it('returns "optimizing" for "Elite" tier', () => {
    expect(tierToStateWord('Elite', 95)).toBe('optimizing');
  });

  it('falls back to score-based mapping when tier is unrecognised', () => {
    // Unknown tier -> fall back to score; score 72 -> building
    expect(tierToStateWord('unknown-tier', 72)).toBe('building');
  });

  it('never throws on null/null', () => {
    expect(() => tierToStateWord(null, null)).not.toThrow();
  });
});
