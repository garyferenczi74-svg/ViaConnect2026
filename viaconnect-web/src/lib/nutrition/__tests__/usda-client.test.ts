import { describe, it, expect, vi, beforeEach } from 'vitest';

const cacheSelect = vi.fn();
const cacheInsert = vi.fn().mockResolvedValue({ error: null });
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: cacheSelect }) }),
      insert: cacheInsert,
    }),
  }),
}));

const fetchMock = vi.fn();
globalThis.fetch = fetchMock as unknown as typeof fetch;

beforeEach(() => {
  fetchMock.mockReset();
  cacheSelect.mockReset();
  cacheInsert.mockReset();
  cacheInsert.mockResolvedValue({ error: null });
  process.env.USDA_FDC_API_KEY = 'TESTKEY';
});

import { lookupFood } from '../usda-client';

describe('lookupFood', () => {
  it('returns cached row without hitting USDA when not expired', async () => {
    cacheSelect.mockResolvedValueOnce({
      data: {
        food_name: 'egg', fdc_id: 1, serving_size_g: 50,
        calories_per_100g: 155, protein_per_100g: 13, carbs_per_100g: 1.1,
        total_fat_per_100g: 11, saturated_fat_per_100g: 3.3, trans_fat_per_100g: 0,
        omega3_per_100g: 0.1, sugar_per_100g: 1.1, fiber_per_100g: 0,
        expires_at: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
      },
      error: null,
    });
    const result = await lookupFood('Eggs', 2, 'whole');
    expect(fetchMock).not.toHaveBeenCalled();
    expect(result).not.toBeNull();
    expect(result!.calories).toBeGreaterThan(0);
  });

  it('searches+fetches USDA on cache miss and writes to cache', async () => {
    cacheSelect.mockResolvedValueOnce({ data: null, error: null });
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({
      foods: [{ fdcId: 9999, description: 'Egg, whole, raw, fresh' }],
    }), { status: 200 }));
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({
      foodNutrients: [
        { nutrient: { id: 1008 }, amount: 155 },
        { nutrient: { id: 1003 }, amount: 13 },
        { nutrient: { id: 1004 }, amount: 11 },
        { nutrient: { id: 1258 }, amount: 3.3 },
      ],
    }), { status: 200 }));
    const result = await lookupFood('egg', 1, 'whole');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(cacheInsert).toHaveBeenCalledTimes(1);
    expect(result).not.toBeNull();
  });

  it('returns null when USDA search has no results', async () => {
    cacheSelect.mockResolvedValueOnce({ data: null, error: null });
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ foods: [] }), { status: 200 }));
    const result = await lookupFood('unicornmeat', 1, 'oz');
    expect(result).toBeNull();
  });

  it('throws AIRouteError on USDA 429', async () => {
    cacheSelect.mockResolvedValueOnce({ data: null, error: null });
    fetchMock.mockResolvedValueOnce(new Response('rate limited', { status: 429 }));
    await expect(lookupFood('egg', 1, 'whole')).rejects.toThrow(/AIRouteError|RATE_LIMITED|rate/i);
  });
});
