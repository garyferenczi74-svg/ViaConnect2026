import { describe, it, expect, vi, beforeEach } from 'vitest';

// Prompt 186: the cache read chains .eq(query).eq(extraction_version) and the
// write is an upsert keyed on query_normalized.
const cacheSelect = vi.fn();
const cacheUpsert = vi.fn().mockResolvedValue({ error: null });
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: cacheSelect }) }) }),
      upsert: cacheUpsert,
    }),
  }),
}));

const fetchMock = vi.fn();
globalThis.fetch = fetchMock as unknown as typeof fetch;

beforeEach(() => {
  fetchMock.mockReset();
  cacheSelect.mockReset();
  cacheUpsert.mockReset();
  cacheUpsert.mockResolvedValue({ error: null });
  process.env.USDA_FDC_API_KEY = 'TESTKEY';
});

import { lookupFood } from '../usda-client';

const eggSearch = {
  foods: [
    { fdcId: 747997, description: 'Eggs, Grade A, Large, egg white', dataType: 'Foundation' },
    { fdcId: 748967, description: 'Eggs, Grade A, Large, egg whole', dataType: 'Foundation' },
    { fdcId: 748236, description: 'Eggs, Grade A, Large, egg yolk', dataType: 'Foundation' },
  ],
};

const eggDetail = {
  fdcId: 748967,
  description: 'Eggs, Grade A, Large, egg whole',
  dataType: 'Foundation',
  foodNutrients: [
    { nutrient: { id: 2047, name: 'Energy (Atwater General Factors)', unitName: 'kcal' }, amount: 148 },
    { nutrient: { id: 1003, name: 'Protein', unitName: 'g' }, amount: 12.4 },
    { nutrient: { id: 1004, name: 'Total lipid (fat)', unitName: 'g' }, amount: 9.96 },
    { nutrient: { id: 1005, name: 'Carbohydrate, by difference', unitName: 'g' }, amount: 0.96 },
    { nutrient: { id: 1063, name: 'Sugars, Total', unitName: 'g' }, amount: 0.2 },
    { nutrient: { id: 1258, name: 'Fatty acids, total saturated', unitName: 'g' }, amount: 3.3 },
    { nutrient: { id: 1093, name: 'Sodium, Na', unitName: 'mg' }, amount: 129 },
  ],
  foodPortions: [
    { amount: 1, gramWeight: 50.3, modifier: 'egg', measureUnit: { name: 'egg' } },
  ],
};

describe('lookupFood', () => {
  it('returns cached v2 row without hitting USDA when not expired', async () => {
    cacheSelect.mockResolvedValueOnce({
      data: {
        food_name: 'Eggs, Grade A, Large, egg whole', fdc_id: 748967, serving_size_g: null,
        calories_per_100g: 148, protein_per_100g: 12.4, carbs_per_100g: 0.96,
        total_fat_per_100g: 9.96, saturated_fat_per_100g: 3.3, trans_fat_per_100g: null,
        omega3_per_100g: null, sugar_per_100g: 0.2, fiber_per_100g: null,
        sodium_per_100g: 129, cholesterol_per_100g: null,
        data_type: 'Foundation',
        food_portions: [{ amount: 1, gramWeight: 50.3, modifier: 'egg', measureUnit: { name: 'egg' } }],
        expires_at: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
        extraction_version: 2,
      },
      error: null,
    });
    const result = await lookupFood('Eggs', 2, 'whole');
    expect(fetchMock).not.toHaveBeenCalled();
    expect(result).not.toBeNull();
    // 2 whole eggs resolve via the FDC portion (50.3 g each): ~149 kcal.
    expect(result!.meta.grams).toBeCloseTo(100.6);
    expect(result!.meta.gramsMethod).toBe('fdc_portion');
    expect(result!.calories).toBe(149);
    expect(result!.sodium_mg).toBeCloseTo(129.8, 0);
    // Unknown stays unknown after scaling: never 0.
    expect(result!.fiber_g).toBeNull();
    expect(result!.meta.missingNutrients).toContain('fiber_g');
  });

  it('ranks candidates instead of taking the first hit (egg white trap)', async () => {
    cacheSelect.mockResolvedValueOnce({ data: null, error: null });
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(eggSearch), { status: 200 }));
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(eggDetail), { status: 200 }));
    const result = await lookupFood('egg', 2, 'whole');
    expect(result).not.toBeNull();
    // The first hit was egg white; ranking must select the whole egg.
    expect(result!.meta.matchedName).toBe('Eggs, Grade A, Large, egg whole');
    expect(result!.meta.fdcId).toBe(748967);
    // Foundation energy comes from the Atwater id, never zero-coerced.
    expect(result!.calories).toBeGreaterThan(100);
    expect(cacheUpsert).toHaveBeenCalledTimes(1);
    const upserted = cacheUpsert.mock.calls[0][0];
    expect(upserted.extraction_version).toBe(2);
    expect(upserted.data_type).toBe('Foundation');
  });

  it('rejects transformed-food references and returns null (oil and croissant trap)', async () => {
    cacheSelect.mockResolvedValueOnce({ data: null, error: null });
    const searchPayload = {
      foods: [
        { fdcId: 173573, description: 'Oil, avocado', dataType: 'SR Legacy' },
        { fdcId: 174988, description: 'Croissants, apple', dataType: 'SR Legacy' },
      ],
    };
    // requireAllWords pass and the fail-open retry both return the same list.
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ foods: [] }), { status: 200 }));
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(searchPayload), { status: 200 }));
    const result = await lookupFood('banana', 1, 'whole');
    // Neither candidate contains the query token: miss, caller falls back to
    // the AI estimator instead of logging a garbage reference.
    expect(result).toBeNull();
  });

  it('prefers the plain food over a transformed first hit', async () => {
    cacheSelect.mockResolvedValueOnce({ data: null, error: null });
    const avocadoSearch = {
      foods: [
        { fdcId: 173573, description: 'Oil, avocado', dataType: 'SR Legacy' },
        { fdcId: 2709223, description: 'Avocado, raw', dataType: 'Survey (FNDDS)' },
      ],
    };
    const avocadoDetail = {
      fdcId: 2709223,
      description: 'Avocado, raw',
      dataType: 'Survey (FNDDS)',
      foodNutrients: [
        { nutrient: { id: 1008, name: 'Energy', unitName: 'kcal' }, amount: 160 },
        { nutrient: { id: 1003, name: 'Protein', unitName: 'g' }, amount: 2 },
        { nutrient: { id: 1004, name: 'Total lipid (fat)', unitName: 'g' }, amount: 14.7 },
        { nutrient: { id: 1005, name: 'Carbohydrate, by difference', unitName: 'g' }, amount: 8.5 },
        { nutrient: { id: 2000, name: 'Total Sugars', unitName: 'g' }, amount: 0.7 },
      ],
      foodPortions: [{ amount: 1, gramWeight: 136, modifier: 'fruit, without skin and seed' }],
    };
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(avocadoSearch), { status: 200 }));
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(avocadoDetail), { status: 200 }));
    const result = await lookupFood('avocado', 0.5, 'whole');
    expect(result).not.toBeNull();
    expect(result!.meta.matchedName).toBe('Avocado, raw');
    // Half a whole avocado through the FDC portion: 68 g, ~109 kcal, ~10 g fat.
    expect(result!.meta.grams).toBeCloseTo(68);
    expect(result!.calories).toBe(109);
    expect(result!.total_fat_g).toBeCloseTo(10);
    expect(result!.meta.plausibilityFlagged).toBe(false);
  });

  it('flags an implausible single item (900 kcal / 60 g fat bounds)', async () => {
    cacheSelect.mockResolvedValueOnce({
      data: {
        food_name: 'Oil, avocado', fdc_id: 173573, serving_size_g: null,
        calories_per_100g: 884, protein_per_100g: 0, carbs_per_100g: 0,
        total_fat_per_100g: 100, saturated_fat_per_100g: 11.6, trans_fat_per_100g: null,
        omega3_per_100g: null, sugar_per_100g: null, fiber_per_100g: null,
        sodium_per_100g: 0, cholesterol_per_100g: 0,
        data_type: 'SR Legacy', food_portions: [],
        expires_at: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
        extraction_version: 2,
      },
      error: null,
    });
    const result = await lookupFood('avocado', 0.5, 'whole');
    expect(result).not.toBeNull();
    // 0.5 whole via curated table (200 g whole) = 100 g of pure oil: flagged.
    expect(result!.total_fat_g).toBeCloseTo(100);
    expect(result!.meta.plausibilityFlagged).toBe(true);
  });

  it('returns null when USDA search has no results', async () => {
    cacheSelect.mockResolvedValueOnce({ data: null, error: null });
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ foods: [] }), { status: 200 }));
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ foods: [] }), { status: 200 }));
    const result = await lookupFood('unicornmeat', 1, 'oz');
    expect(result).toBeNull();
  });

  it('throws AIRouteError on USDA 429', async () => {
    cacheSelect.mockResolvedValueOnce({ data: null, error: null });
    fetchMock.mockResolvedValue(new Response('rate limited', { status: 429 }));
    await expect(lookupFood('egg', 1, 'whole')).rejects.toThrow(/AIRouteError|RATE_LIMITED|rate/i);
  });
});
