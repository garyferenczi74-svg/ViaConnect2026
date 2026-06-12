// Tests for src/lib/scoring/sources/nutrition-source.ts.
//
// Prompt 168 Apply C rewrote the source to a UNION of canonical `meals` and
// legacy `meal_logs`, deduped via meals.legacy_nutrition_log_id. The mock
// mirrors the real chain: from(table).select(...).eq(...).gte(...) resolving
// {data, error} per table. (Sweep 2026-06-12: rebuilt from the pre-168
// single-table maybeSingle mock.)

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getNutritionSource } from '../../sources/nutrition-source';

interface TableResult {
  data: Record<string, unknown>[] | null;
  error: { message: string } | null;
}

function makeClient(results: { meal_logs: TableResult; meals: TableResult }) {
  const from = vi.fn().mockImplementation((table: string) => ({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        gte: vi.fn().mockResolvedValue(
          table === 'meal_logs' ? results.meal_logs : results.meals,
        ),
      }),
    }),
  }));
  return { from };
}

const ok = (rows: Record<string, unknown>[]): TableResult => ({ data: rows, error: null });
const err = (): TableResult => ({ data: null, error: { message: 'boom' } });

function daysAgoIso(days: number): string {
  return new Date(Date.now() - days * 86400000).toISOString();
}
function daysAgoDate(days: number): string {
  return daysAgoIso(days).slice(0, 10);
}

describe('nutrition-source', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns zeros / null when both tables are empty', async () => {
    const client = makeClient({ meal_logs: ok([]), meals: ok([]) });
    const result = await getNutritionSource('u-1', client as never);
    expect(result.last_engaged_at).toBeNull();
    expect(result.recent_events_7d).toBe(0);
    expect(result.recent_events_30d).toBe(0);
  });

  it('unions both tables and dedupes legacy rows superseded by meals.legacy_nutrition_log_id', async () => {
    const m2LoggedAt = daysAgoIso(1);
    const client = makeClient({
      meal_logs: ok([
        // Superseded by the meals row below: must count once, not twice.
        { id: 'L1', meal_date: daysAgoDate(2), log_method: 'manual', calories: 500, photo_url: null, logged_at: daysAgoIso(2) },
        // Pure legacy row, survives the union.
        { id: 'L2', meal_date: daysAgoDate(20), log_method: 'quick', calories: 400, photo_url: 'p.jpg', logged_at: daysAgoIso(20) },
      ]),
      meals: ok([
        { meal_id: 'M1', logged_at: daysAgoIso(2), calories_kcal: 500, source: 'full_manual', legacy_nutrition_log_id: 'L1' },
        { meal_id: 'M2', logged_at: m2LoggedAt, calories_kcal: 600, source: 'photo_ai', legacy_nutrition_log_id: null },
      ]),
    });
    const result = await getNutritionSource('u-1', client as never);
    // M1 (dedupes L1) + M2 within 7 days; L2 only inside the 30-day window.
    expect(result.recent_events_7d).toBe(2);
    expect(result.recent_events_30d).toBe(3);
    expect(result.source_specific?.calorie_avg_7d).toBe(550);
    expect(result.source_specific?.has_photo_uploads).toBe(true);
    expect(result.source_specific?.log_method_distribution).toEqual({
      full_manual: 1,
      photo_ai: 1,
      quick: 1,
    });
    // Latest logged_at across the union (M2, one day ago).
    expect(result.last_engaged_at).toBe(m2LoggedAt);
  });

  it('keeps producing counts when one table errors (transition resilience)', async () => {
    const client = makeClient({
      meal_logs: err(),
      meals: ok([
        { meal_id: 'M1', logged_at: daysAgoIso(3), calories_kcal: 700, source: 'photo_ai', legacy_nutrition_log_id: null },
      ]),
    });
    const result = await getNutritionSource('u-1', client as never);
    expect(result.recent_events_7d).toBe(1);
    expect(result.source_specific?.has_photo_uploads).toBe(true);
  });

  it('returns empty defaults when both tables error', async () => {
    const client = makeClient({ meal_logs: err(), meals: err() });
    const result = await getNutritionSource('u-1', client as never);
    expect(result.last_engaged_at).toBeNull();
    expect(result.recent_events_7d).toBe(0);
    expect(result.recent_events_30d).toBe(0);
  });
});
