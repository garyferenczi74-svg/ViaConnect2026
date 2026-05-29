// Prompt #170 Phase 1e: tests for the Farmceutica curated foods client.
//
// Tests cover: happy path with mocked supabase, exact-name match preferred
// over tsvector when both could match, zero rows -> null, numeric coercion
// (NUMERIC columns sometimes deserialize as strings via PostgREST).

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { lookupCurated } from '../farmceutica-curated';

interface FakeRow {
  id: string;
  name: string;
  cuisine_tag?: string | null;
  density_g_per_ml?: number | null;
  per_100g_kcal: number | string;
  per_100g_protein_g: number | string;
  per_100g_carbs_g: number | string;
  per_100g_fat_g: number | string;
  per_100g_fiber_g?: number | string | null;
  per_100g_sugar_g?: number | string | null;
  per_100g_sodium_mg?: number | string | null;
  per_100g_cholesterol_mg?: number | string | null;
  micronutrients_per_100g_json?: Record<string, number> | null;
  notes?: string | null;
}

function makeSupabaseStub(
  exactRows: FakeRow[],
  fallbackRows: FakeRow[],
) {
  // Track call sequence: first .select chain is the exact ILIKE lookup, second
  // chain is the tsvector textSearch fallback. The builder supports the full
  // .select().ilike().eq?().limit() and .select().textSearch().limit() chains.
  let chainIndex = 0;
  const fromMock = vi.fn().mockImplementation(() => {
    chainIndex++;
    const isExact = chainIndex === 1;
    const data = isExact ? exactRows : fallbackRows;
    const builder = {
      select: vi.fn().mockImplementation(() => builder),
      ilike: vi.fn().mockImplementation(() => builder),
      eq: vi.fn().mockImplementation(() => builder),
      textSearch: vi.fn().mockImplementation(() => builder),
      limit: vi.fn().mockResolvedValue({ data, error: null }),
    };
    return builder;
  });
  return { from: fromMock };
}

describe('lookupCurated', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns mapped CuratedNutrients on a single-row exact match', async () => {
    const row: FakeRow = {
      id: 'cur-1',
      name: 'olive oil',
      cuisine_tag: 'mediterranean',
      density_g_per_ml: 0.915,
      per_100g_kcal: 884,
      per_100g_protein_g: 0,
      per_100g_carbs_g: 0,
      per_100g_fat_g: 100,
      per_100g_fiber_g: 0,
      per_100g_sugar_g: 0,
      per_100g_sodium_mg: 2,
      per_100g_cholesterol_mg: null,
      micronutrients_per_100g_json: { vitamin_e_mg: 14 },
    };
    const stub = makeSupabaseStub([row], []);
    const result = await lookupCurated('Olive Oil', {
      supabaseAdmin: stub as unknown as Parameters<typeof lookupCurated>[1]['supabaseAdmin'],
      requestId: 'req-1',
    });
    expect(result).not.toBeNull();
    expect(result!.source).toBe('farmceutica_curated');
    expect(result!.curatedFoodId).toBe('cur-1');
    expect(result!.foodName).toBe('olive oil');
    expect(result!.cuisineTag).toBe('mediterranean');
    expect(result!.densityGPerMl).toBeCloseTo(0.915, 3);
    expect(result!.per100g.calories_kcal).toBe(884);
    expect(result!.per100g.fat_g).toBe(100);
    expect(result!.per100g.sodium_mg).toBe(2);
    expect(result!.per100g.cholesterol_mg).toBeUndefined();
    expect(result!.micronutrientsPer100g).toEqual({ vitamin_e_mg: 14 });
  });

  it('prefers exact match over tsvector when both could match (does not call second select)', async () => {
    const exactRow: FakeRow = {
      id: 'cur-exact',
      name: 'tomato',
      per_100g_kcal: 18,
      per_100g_protein_g: 0.9,
      per_100g_carbs_g: 3.9,
      per_100g_fat_g: 0.2,
    };
    const fallbackRow: FakeRow = {
      id: 'cur-fallback',
      name: 'cherry tomato',
      per_100g_kcal: 20,
      per_100g_protein_g: 1.0,
      per_100g_carbs_g: 4.0,
      per_100g_fat_g: 0.3,
    };
    const stub = makeSupabaseStub([exactRow], [fallbackRow]);
    const result = await lookupCurated('Tomatoes', {
      supabaseAdmin: stub as unknown as Parameters<typeof lookupCurated>[1]['supabaseAdmin'],
      requestId: 'req-pref',
    });
    expect(result).not.toBeNull();
    expect(result!.curatedFoodId).toBe('cur-exact');
    expect(result!.foodName).toBe('tomato');
    // Only the first .from() chain (exact match) should be consumed.
    expect(stub.from).toHaveBeenCalledTimes(1);
  });

  it('falls through to tsvector match when exact returns zero rows', async () => {
    const fallbackRow: FakeRow = {
      id: 'cur-vector',
      name: 'fancy salad bowl',
      per_100g_kcal: 90,
      per_100g_protein_g: 4,
      per_100g_carbs_g: 6,
      per_100g_fat_g: 5,
    };
    const stub = makeSupabaseStub([], [fallbackRow]);
    const result = await lookupCurated('salad', {
      supabaseAdmin: stub as unknown as Parameters<typeof lookupCurated>[1]['supabaseAdmin'],
      requestId: 'req-vector',
    });
    expect(result).not.toBeNull();
    expect(result!.foodName).toBe('fancy salad bowl');
    expect(stub.from).toHaveBeenCalledTimes(2);
  });

  it('returns null when both exact and tsvector return zero rows', async () => {
    const stub = makeSupabaseStub([], []);
    const result = await lookupCurated('unicornmeat', {
      supabaseAdmin: stub as unknown as Parameters<typeof lookupCurated>[1]['supabaseAdmin'],
      requestId: 'req-zero',
    });
    expect(result).toBeNull();
    expect(stub.from).toHaveBeenCalledTimes(2);
  });

  it('coerces NUMERIC string columns to numbers (Supabase PostgREST drift)', async () => {
    const row: FakeRow = {
      id: 'cur-str',
      name: 'spinach',
      per_100g_kcal: '165.5',
      per_100g_protein_g: '5.2',
      per_100g_carbs_g: '3.6',
      per_100g_fat_g: '1.8',
      per_100g_fiber_g: '2.4',
    };
    const stub = makeSupabaseStub([row], []);
    const result = await lookupCurated('spinach', {
      supabaseAdmin: stub as unknown as Parameters<typeof lookupCurated>[1]['supabaseAdmin'],
      requestId: 'req-coerce',
    });
    expect(result).not.toBeNull();
    expect(typeof result!.per100g.calories_kcal).toBe('number');
    expect(result!.per100g.calories_kcal).toBeCloseTo(165.5, 5);
    expect(result!.per100g.protein_g).toBeCloseTo(5.2, 5);
    expect(result!.per100g.fiber_g).toBeCloseTo(2.4, 5);
  });

  it('respects cuisineTagHint in the exact query (filter is applied)', async () => {
    const row: FakeRow = {
      id: 'cur-asian',
      name: 'kimchi',
      cuisine_tag: 'east_asian',
      per_100g_kcal: 15,
      per_100g_protein_g: 1.1,
      per_100g_carbs_g: 2.4,
      per_100g_fat_g: 0.5,
    };
    const stub = makeSupabaseStub([row], []);
    const result = await lookupCurated('kimchi', {
      supabaseAdmin: stub as unknown as Parameters<typeof lookupCurated>[1]['supabaseAdmin'],
      requestId: 'req-cuisine',
      cuisineTagHint: 'east_asian',
    });
    expect(result).not.toBeNull();
    expect(result!.cuisineTag).toBe('east_asian');
  });

  it('skips null micronutrients_per_100g_json gracefully', async () => {
    const row: FakeRow = {
      id: 'cur-null-micro',
      name: 'broth',
      per_100g_kcal: 10,
      per_100g_protein_g: 0.5,
      per_100g_carbs_g: 1.2,
      per_100g_fat_g: 0.1,
      micronutrients_per_100g_json: null,
    };
    const stub = makeSupabaseStub([row], []);
    const result = await lookupCurated('broth', {
      supabaseAdmin: stub as unknown as Parameters<typeof lookupCurated>[1]['supabaseAdmin'],
      requestId: 'req-null-micro',
    });
    expect(result).not.toBeNull();
    expect(result!.micronutrientsPer100g).toBeUndefined();
  });

  it('returns null when the row is missing required calories', async () => {
    // Defensive: if the schema ever lets a NULL per_100g_kcal through, the row
    // is unusable and should be treated as a miss.
    const row = {
      id: 'cur-missing-cal',
      name: 'mystery',
      per_100g_protein_g: 5,
      per_100g_carbs_g: 10,
      per_100g_fat_g: 3,
    } as unknown as FakeRow;
    const stub = makeSupabaseStub([row], []);
    const result = await lookupCurated('mystery', {
      supabaseAdmin: stub as unknown as Parameters<typeof lookupCurated>[1]['supabaseAdmin'],
      requestId: 'req-missing-cal',
    });
    expect(result).toBeNull();
  });
});

describe('farmceutica-curated source provenance', () => {
  it('does not import any Supabase auth getter (lint-grep, code only)', () => {
    const raw = readFileSync(
      __dirname.replace(/__tests__$/, '') + '/farmceutica-curated.ts',
      'utf8',
    );
    const src = raw
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');
    expect(src).not.toMatch(/auth\.uid/);
    expect(src).not.toMatch(/getUser\b/);
    expect(src).not.toMatch(/createServerClient/);
    expect(src).not.toMatch(/createAdminClient/);
    expect(src).not.toMatch(/\buser_id\b/);
    expect(src).not.toMatch(/\bemail\b/);
  });
});
