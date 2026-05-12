// Tests for src/lib/scoring/sources/nutrition-source.ts.
//
// Reads meal_logs for last_engaged_at + 7/30-day counts + light aggregates.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getNutritionSource } from '../../sources/nutrition-source';

interface MockSetup {
  latestRow: Record<string, unknown> | null;
  recentRows: Record<string, unknown>[];
  latestError?: unknown;
  recentError?: unknown;
}

function makeClient(setup: MockSetup) {
  // Path 1: SELECT logged_at FROM meal_logs ... ORDER BY logged_at DESC LIMIT 1
  const latestMaybeSingle = vi.fn().mockResolvedValue({
    data: setup.latestRow,
    error: setup.latestError ?? null,
  });
  const latestLimit = vi.fn().mockReturnValue({ maybeSingle: latestMaybeSingle });
  const latestOrder = vi.fn().mockReturnValue({ limit: latestLimit });
  const latestEq = vi.fn().mockReturnValue({ order: latestOrder });

  // Path 2: SELECT meal_date, log_method, calories, photo_url FROM meal_logs
  //         WHERE user_id = $1 AND meal_date >= today - 30
  const recentReturn = vi.fn().mockResolvedValue({
    data: setup.recentRows,
    error: setup.recentError ?? null,
  });
  const recentGte = vi.fn().mockReturnValue(recentReturn());
  const recentGteWrapped = vi.fn().mockResolvedValue({
    data: setup.recentRows,
    error: setup.recentError ?? null,
  });
  const recentEq = vi.fn().mockReturnValue({ gte: recentGteWrapped });

  let callCount = 0;
  const select = vi.fn().mockImplementation(() => {
    callCount += 1;
    return callCount === 1 ? { eq: latestEq } : { eq: recentEq };
  });
  const from = vi.fn().mockReturnValue({ select });
  return {
    from,
    select,
    latestEq,
    recentEq,
    recentGte,
    recentGteWrapped,
    latestMaybeSingle,
    recentReturn,
  };
}

describe('nutrition-source', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns zeros / null when no meal_logs rows', async () => {
    const client = makeClient({ latestRow: null, recentRows: [] });
    const result = await getNutritionSource('u-1', client as never);
    expect(result.last_engaged_at).toBeNull();
    expect(result.recent_events_7d).toBe(0);
    expect(result.recent_events_30d).toBe(0);
  });

  it('returns populated shape when rows exist', async () => {
    const today = new Date();
    const within7 = new Date(today.getTime() - 3 * 86400000).toISOString().slice(0, 10);
    const within30 = new Date(today.getTime() - 20 * 86400000).toISOString().slice(0, 10);
    const client = makeClient({
      latestRow: { logged_at: '2026-05-11T08:30:00Z' },
      recentRows: [
        { meal_date: within7, log_method: 'photo', calories: 500, photo_url: 'p1.jpg' },
        { meal_date: within7, log_method: 'description', calories: 600, photo_url: null },
        { meal_date: within30, log_method: 'quick', calories: 400, photo_url: null },
      ],
    });
    const result = await getNutritionSource('u-1', client as never);
    expect(result.last_engaged_at).toBe('2026-05-11T08:30:00Z');
    expect(result.recent_events_7d).toBe(2);
    expect(result.recent_events_30d).toBe(3);
    expect(result.source_specific?.has_photo_uploads).toBe(true);
    expect(result.source_specific?.calorie_avg_7d).toBe(550);
  });

  it('returns empty defaults on error', async () => {
    const client = makeClient({
      latestRow: null,
      recentRows: [],
      latestError: { message: 'boom' },
    });
    const result = await getNutritionSource('u-1', client as never);
    expect(result.last_engaged_at).toBeNull();
    expect(result.recent_events_7d).toBe(0);
  });
});
