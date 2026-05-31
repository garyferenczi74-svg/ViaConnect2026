// Prompt 171b Phase 1: tests for the caffeine_timing BOS source slice.
//
// Covers the per-row math (pctRemaining 5-hour half-life + impact category
// mapping + hoursBetween next-occurrence) plus the source slice behavior
// (empty data path, happy path, default sleep window fallback).

import { describe, it, expect, vi } from 'vitest';
import { getCaffeineTimingSource } from '../caffeine-timing-source';
import type { SupabaseClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Supabase mock helpers
// ---------------------------------------------------------------------------

interface MockRow {
  data: unknown;
  error: { message: string } | null;
}

function makeSupabaseMock(opts: {
  profileRow?: MockRow;
  mealItemsRows?: MockRow;
}): SupabaseClient {
  const profileRow = opts.profileRow ?? { data: null, error: null };
  const mealItemsRows = opts.mealItemsRows ?? { data: [], error: null };

  const from = vi.fn((table: string) => {
    if (table === 'profiles') {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue(profileRow),
      };
    }
    if (table === 'meal_items') {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gt: vi.fn().mockReturnThis(),
        gte: vi.fn().mockResolvedValue(mealItemsRows),
      };
    }
    return {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
  });

  return { from } as unknown as SupabaseClient;
}

// ---------------------------------------------------------------------------
// Source slice behavior
// ---------------------------------------------------------------------------

describe('getCaffeineTimingSource', () => {
  it('returns has_data=false + default sleep window when user has no profile + no caffeine data', async () => {
    const supabase = makeSupabaseMock({});
    const result = await getCaffeineTimingSource('user-1', supabase);

    expect(result.has_data).toBe(false);
    expect(result.data_window_hours).toBe(24);
    expect(result.total_caffeine_mg_24h).toBe(0);
    expect(result.per_meal_impact_summaries).toEqual([]);
    expect(result.sleep_window.source).toBe('default');
    expect(result.sleep_window.sleep_start).toBe('23:00');
    expect(result.sleep_window.wake_time).toBe('07:00');
  });

  it('uses caq_phase_7 sleep window when profile has both columns set', async () => {
    const supabase = makeSupabaseMock({
      profileRow: {
        data: { sleep_start: '22:30', sleep_wake: '06:45' },
        error: null,
      },
    });
    const result = await getCaffeineTimingSource('user-1', supabase);

    expect(result.sleep_window.source).toBe('caq_phase_7');
    expect(result.sleep_window.sleep_start).toBe('22:30');
    expect(result.sleep_window.wake_time).toBe('06:45');
  });

  it('falls back to default sleep window when only one column is set', async () => {
    const supabase = makeSupabaseMock({
      profileRow: { data: { sleep_start: '22:00', sleep_wake: null }, error: null },
    });
    const result = await getCaffeineTimingSource('user-1', supabase);

    expect(result.sleep_window.source).toBe('default');
    expect(result.sleep_window.sleep_start).toBe('23:00');
  });

  it('falls back to default on profile read error', async () => {
    const supabase = makeSupabaseMock({
      profileRow: { data: null, error: { message: 'permission denied' } },
    });
    const result = await getCaffeineTimingSource('user-1', supabase);

    expect(result.sleep_window.source).toBe('default');
  });

  it('returns one impact summary per caffeinated meal_items row', async () => {
    // Use a fixed clock-relative timestamp so the test is deterministic. 8
    // hours before the next 23:00 in UTC; pct remaining at sleep onset is
    // 0.5 ^ (8 / 5) approx 0.329, which falls in the 'moderate' bucket.
    const consumedAt = new Date();
    consumedAt.setUTCHours(15, 0, 0, 0);
    const consumedAtIso = consumedAt.toISOString();

    const supabase = makeSupabaseMock({
      mealItemsRows: {
        data: [
          {
            caffeine_mg: 95,
            meals: { logged_at: consumedAtIso, user_id: 'user-1' },
          },
        ],
        error: null,
      },
    });
    const result = await getCaffeineTimingSource('user-1', supabase);

    expect(result.has_data).toBe(true);
    expect(result.total_caffeine_mg_24h).toBe(95);
    expect(result.per_meal_impact_summaries).toHaveLength(1);
    const summary = result.per_meal_impact_summaries[0];
    expect(summary.caffeine_mg).toBe(95);
    expect(summary.consumed_at).toBe(consumedAtIso);
    expect(summary.estimated_pct_remaining_at_sleep_onset).toBeGreaterThan(0.30);
    expect(summary.estimated_pct_remaining_at_sleep_onset).toBeLessThan(0.40);
    expect(summary.impact_category).toBe('moderate');
  });

  it('returns severe impact for late-evening high-caffeine intake', async () => {
    // 2 hours before 23:00: 200 mg cold brew at 21:00.
    // pct remaining = 0.5 ^ (2/5) approx 0.758 -> severe
    const consumedAt = new Date();
    consumedAt.setUTCHours(21, 0, 0, 0);
    const consumedAtIso = consumedAt.toISOString();

    const supabase = makeSupabaseMock({
      mealItemsRows: {
        data: [
          {
            caffeine_mg: 200,
            meals: { logged_at: consumedAtIso, user_id: 'user-1' },
          },
        ],
        error: null,
      },
    });
    const result = await getCaffeineTimingSource('user-1', supabase);

    expect(result.has_data).toBe(true);
    const summary = result.per_meal_impact_summaries[0];
    expect(summary.estimated_pct_remaining_at_sleep_onset).toBeGreaterThan(0.50);
    expect(summary.impact_category).toBe('severe');
  });

  it('returns none impact for morning caffeine fully cleared by sleep', async () => {
    // 16 hours before next 23:00: 150 mg espresso at 07:00 same day.
    // pct remaining = 0.5 ^ (16/5) approx 0.109 -> 'mild'.
    // Use 17 hours instead (06:00) to land 'none': pct approx 0.094.
    const consumedAt = new Date();
    consumedAt.setUTCHours(6, 0, 0, 0);
    const consumedAtIso = consumedAt.toISOString();

    const supabase = makeSupabaseMock({
      mealItemsRows: {
        data: [
          {
            caffeine_mg: 150,
            meals: { logged_at: consumedAtIso, user_id: 'user-1' },
          },
        ],
        error: null,
      },
    });
    const result = await getCaffeineTimingSource('user-1', supabase);

    const summary = result.per_meal_impact_summaries[0];
    expect(summary.estimated_pct_remaining_at_sleep_onset).toBeLessThan(0.10);
    expect(summary.impact_category).toBe('none');
  });

  it('sums total_caffeine_mg_24h across multiple meals', async () => {
    const t1 = new Date();
    t1.setUTCHours(8, 0, 0, 0);
    const t2 = new Date();
    t2.setUTCHours(14, 0, 0, 0);
    const t3 = new Date();
    t3.setUTCHours(20, 0, 0, 0);

    const supabase = makeSupabaseMock({
      mealItemsRows: {
        data: [
          { caffeine_mg: 95, meals: { logged_at: t1.toISOString(), user_id: 'u' } },
          { caffeine_mg: 75, meals: { logged_at: t2.toISOString(), user_id: 'u' } },
          { caffeine_mg: 200, meals: { logged_at: t3.toISOString(), user_id: 'u' } },
        ],
        error: null,
      },
    });
    const result = await getCaffeineTimingSource('user-1', supabase);

    expect(result.has_data).toBe(true);
    expect(result.total_caffeine_mg_24h).toBe(370);
    expect(result.per_meal_impact_summaries).toHaveLength(3);
    // Sorted chronologically ascending.
    expect(result.per_meal_impact_summaries[0].consumed_at).toBe(t1.toISOString());
    expect(result.per_meal_impact_summaries[2].consumed_at).toBe(t3.toISOString());
  });

  it('skips rows with non-positive caffeine_mg or invalid timestamps', async () => {
    const valid = new Date();
    valid.setUTCHours(15, 0, 0, 0);
    const supabase = makeSupabaseMock({
      mealItemsRows: {
        data: [
          { caffeine_mg: 95, meals: { logged_at: valid.toISOString(), user_id: 'u' } },
          { caffeine_mg: 0, meals: { logged_at: valid.toISOString(), user_id: 'u' } },
          { caffeine_mg: null, meals: { logged_at: valid.toISOString(), user_id: 'u' } },
          { caffeine_mg: 50, meals: { logged_at: null, user_id: 'u' } },
        ],
        error: null,
      },
    });
    const result = await getCaffeineTimingSource('user-1', supabase);

    expect(result.per_meal_impact_summaries).toHaveLength(1);
    expect(result.total_caffeine_mg_24h).toBe(95);
  });

  it('returns empty + neutral on meal_items read error', async () => {
    const supabase = makeSupabaseMock({
      mealItemsRows: { data: null, error: { message: 'permission denied' } },
    });
    const result = await getCaffeineTimingSource('user-1', supabase);

    expect(result.has_data).toBe(false);
    expect(result.total_caffeine_mg_24h).toBe(0);
    expect(result.per_meal_impact_summaries).toEqual([]);
  });
});
