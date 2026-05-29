// Prompt #170 Phase 1j: tests for GET /api/nutrition/foods/search.
//
// Curated text-match + USDA cache walk + name dedupe.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  supabaseAuth: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }),
  curatedRows: [] as ReadonlyArray<unknown>,
  usdaRows: [] as ReadonlyArray<unknown>,
}));

function tableBuilder(rows: ReadonlyArray<unknown>) {
  // The route chains .select(...).ilike(...).limit(n) and optionally .eq(...).
  // We return a chainable object whose terminal awaited form yields {data, error}.
  const result = { data: rows, error: null };
  const chain: Record<string, unknown> = {};
  const make = () => {
    const obj: {
      select: (...args: unknown[]) => typeof obj;
      ilike: (...args: unknown[]) => typeof obj;
      eq: (...args: unknown[]) => typeof obj;
      limit: (...args: unknown[]) => Promise<{ data: ReadonlyArray<unknown>; error: null }>;
    } = {
      select: () => obj,
      ilike: () => obj,
      eq: () => obj,
      limit: () => Promise.resolve(result),
    };
    return obj;
  };
  Object.assign(chain, make());
  return make();
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => ({ auth: { getUser: mocks.supabaseAuth } }),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      if (table === 'farmceutica_curated_foods') return tableBuilder(mocks.curatedRows);
      if (table === 'usda_food_cache') return tableBuilder(mocks.usdaRows);
      return tableBuilder([]);
    },
  }),
}));

vi.mock('@/lib/observability/audit-recorder', () => ({
  recordAudit: vi.fn().mockResolvedValue(undefined),
  newRequestId: () => 'req-test',
}));

import { GET } from '../route';

function makeReq(qs: string): NextRequest {
  return new Request(`http://localhost/api/nutrition/foods/search${qs}`, {
    method: 'GET',
  }) as unknown as NextRequest;
}

beforeEach(() => {
  mocks.supabaseAuth.mockReset();
  mocks.supabaseAuth.mockResolvedValue({ data: { user: { id: 'u1' } } });
  mocks.curatedRows = [];
  mocks.usdaRows = [];
});

describe('GET /api/nutrition/foods/search', () => {
  it('returns 401 when no session', async () => {
    mocks.supabaseAuth.mockResolvedValueOnce({ data: { user: null } });
    const res = await GET(makeReq('?q=chicken'));
    expect(res.status).toBe(401);
  });

  it('returns 400 when q is too short', async () => {
    const res = await GET(makeReq('?q=a'));
    expect(res.status).toBe(400);
  });

  it('hits curated + USDA and dedupes by lowercased name', async () => {
    mocks.curatedRows = [
      {
        id: '00000000-0000-0000-0000-00000000abcd',
        name: 'Chicken Breast',
        cuisine_tag: 'north_american',
        per_100g_kcal: 165,
        per_100g_protein_g: 31,
        per_100g_carbs_g: 0,
        per_100g_fat_g: 3.6,
        per_100g_fiber_g: null,
        per_100g_sugar_g: null,
        per_100g_sodium_mg: null,
      },
    ];
    // Same name appears in USDA, lowercased; should be deduped out.
    mocks.usdaRows = [
      {
        fdc_id: 171477,
        food_name: 'chicken breast',
        calories_per_100g: 170,
        protein_per_100g: 30,
        carbs_per_100g: 0,
        total_fat_per_100g: 4,
        fiber_per_100g: 0,
        sugar_per_100g: 0,
      },
      {
        fdc_id: 999999,
        food_name: 'chicken thigh',
        calories_per_100g: 209,
        protein_per_100g: 26,
        carbs_per_100g: 0,
        total_fat_per_100g: 10.9,
        fiber_per_100g: 0,
        sugar_per_100g: 0,
      },
    ];
    const res = await GET(makeReq('?q=chicken&limit=10'));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(Array.isArray(json.results)).toBe(true);
    // 1 curated (Chicken Breast) + 1 USDA (chicken thigh); duplicate chicken breast dropped.
    expect(json.results).toHaveLength(2);
    expect(json.results[0].id).toBe('curated:00000000-0000-0000-0000-00000000abcd');
    expect(json.results[0].source).toBe('farmceutica_curated');
    expect(json.results[0].cuisine_tag).toBe('north_american');
    expect(json.results[1].id).toBe('usda_fdc:999999');
    expect(json.results[1].source).toBe('usda_fdc');
  });
});
