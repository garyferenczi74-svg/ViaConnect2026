/**
 * Prompt 172e Phase A Deliverable 5: GET /api/nutrition/hydration/catalog tests.
 *
 * Contract per spec 12 and Phase A brief:
 *   - Authenticated users get the active catalog ordered by category then sort_order.
 *   - Unauthenticated request returns 401 (catalog is read only consumer data,
 *     same posture as /api/nutrition/hydration/today).
 *   - Cache-Control public max age 3600 (catalog is global, not per user).
 *   - Each row carries hydration_source_kind mapping to one of the 9 live enum values.
 *   - Database error returns 500 with a generic error body.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => {
  return {
    supabaseAuth: vi.fn(),
    adminFrom: vi.fn(),
  };
});

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => ({
    auth: { getUser: mocks.supabaseAuth },
  }),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: mocks.adminFrom,
  }),
}));

vi.mock('@/lib/utils/safe-log', () => ({
  safeLog: {
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { GET } from '@/app/api/nutrition/hydration/catalog/route';

beforeEach(() => {
  mocks.supabaseAuth.mockReset();
  mocks.adminFrom.mockReset();
});

function mockCatalogQuery(rows: unknown[], error: { message: string } | null = null) {
  const order2 = vi.fn().mockResolvedValue({ data: rows, error });
  const order1 = vi.fn().mockReturnValue({ order: order2 });
  const eq = vi.fn().mockReturnValue({ order: order1 });
  const select = vi.fn().mockReturnValue({ eq });
  mocks.adminFrom.mockReturnValue({ select });
  return { select, eq, order1, order2 };
}

describe('GET /api/nutrition/hydration/catalog: auth', () => {
  it('returns 401 when unauthenticated', async () => {
    mocks.supabaseAuth.mockResolvedValueOnce({ data: { user: null } });
    const res = await GET();
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toEqual({ error: 'Unauthorized' });
  });
});

describe('GET /api/nutrition/hydration/catalog: success', () => {
  it('returns active rows sorted by category then sort_order with Cache-Control', async () => {
    mocks.supabaseAuth.mockResolvedValueOnce({ data: { user: { id: 'u-1' } } });
    const rows = [
      {
        id: 'a',
        slug: 'water_still',
        category: 'water',
        hydration_source_kind: 'pure_water',
        display_name: 'Still Water',
        default_volume_ml: 240,
        hydration_coefficient: 1.0,
        caffeine_mg_per_serving: 0,
        kcal_per_serving: 0,
        sugar_g: 0,
        sodium_mg: 5,
        potassium_mg: 0,
        magnesium_mg: 0,
        is_alcoholic: false,
        abv: null,
        evidence_source: 'Maughan 2016 reference; USDA FDC #174180',
        requires_claim_review: false,
        is_active: true,
        sort_order: 10,
      },
    ];
    const queryMocks = mockCatalogQuery(rows);

    const res = await GET();
    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe('public, max-age=3600');
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body).toEqual(rows);
    expect(queryMocks.eq).toHaveBeenCalledWith('is_active', true);
    expect(queryMocks.order1).toHaveBeenCalledWith('category', { ascending: true });
    expect(queryMocks.order2).toHaveBeenCalledWith('sort_order', { ascending: true });
  });

  it('returns an empty array when no rows match', async () => {
    mocks.supabaseAuth.mockResolvedValueOnce({ data: { user: { id: 'u-2' } } });
    mockCatalogQuery([]);
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual([]);
  });
});

describe('GET /api/nutrition/hydration/catalog: failure', () => {
  it('returns 500 with a generic error body on a database error', async () => {
    mocks.supabaseAuth.mockResolvedValueOnce({ data: { user: { id: 'u-3' } } });
    mockCatalogQuery([], { message: 'rls denied' });
    const res = await GET();
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toEqual({ error: 'Could not load beverage catalog' });
  });
});
