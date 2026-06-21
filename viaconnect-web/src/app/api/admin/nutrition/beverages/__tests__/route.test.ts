/**
 * Prompt 207a Task 7: GET /api/admin/nutrition/beverages contract tests.
 *
 * Contract:
 *   - Non-admin (requireAdmin returns error): the error response is returned unchanged.
 *   - Admin (requireAdmin returns ok): full catalog returned (active + inactive),
 *     ordered by sort_order then display_name. Shape: { beverages: BeverageCatalogRow[] }.
 *
 * Mock strategy mirrors catalog/__tests__/route.test.ts and
 * admin/health/ai-stack/__tests__/route.test.ts.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextResponse } from 'next/server';

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  adminFrom: vi.fn(),
  safeLogError: vi.fn(),
}));

vi.mock('@/lib/flags/admin-guard', () => ({
  requireAdmin: mocks.requireAdmin,
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: mocks.adminFrom,
  }),
}));

vi.mock('@/lib/utils/safe-log', () => ({
  safeLog: {
    warn: vi.fn(),
    error: mocks.safeLogError,
    info: vi.fn(),
  },
}));

import { GET } from '../route';

beforeEach(() => {
  mocks.requireAdmin.mockReset();
  mocks.adminFrom.mockReset();
  mocks.safeLogError.mockReset();
});

// Helper to wire a successful catalog query chain:
// .from('beverage_catalog').select('*').order('sort_order').order('display_name')
function mockCatalogQuery(rows: unknown[], error: { message: string } | null = null) {
  const order2 = vi.fn().mockResolvedValue({ data: rows, error });
  const order1 = vi.fn().mockReturnValue({ order: order2 });
  const select = vi.fn().mockReturnValue({ order: order1 });
  mocks.adminFrom.mockReturnValue({ select });
  return { select, order1, order2 };
}

// ---- Auth gate ---------------------------------------------------------------

describe('GET /api/admin/nutrition/beverages: auth', () => {
  it('returns the 401 from requireAdmin when user is not authenticated', async () => {
    const errorResponse = NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    mocks.requireAdmin.mockResolvedValueOnce({ kind: 'error', response: errorResponse });

    const res = await GET();

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toEqual({ error: 'Unauthorized' });
    // createAdminClient must not be called
    expect(mocks.adminFrom).not.toHaveBeenCalled();
  });

  it('returns the 403 from requireAdmin when user lacks admin role', async () => {
    const errorResponse = NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    mocks.requireAdmin.mockResolvedValueOnce({ kind: 'error', response: errorResponse });

    const res = await GET();

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body).toEqual({ error: 'Forbidden' });
    expect(mocks.adminFrom).not.toHaveBeenCalled();
  });
});

// ---- Success -----------------------------------------------------------------

describe('GET /api/admin/nutrition/beverages: success', () => {
  beforeEach(() => {
    mocks.requireAdmin.mockResolvedValue({ kind: 'ok', user: { id: 'admin-1', role: 'admin' } });
  });

  it('returns full catalog (active + inactive) ordered by sort_order then display_name', async () => {
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
        evidence_source: 'Maughan 2016',
        requires_claim_review: false,
        is_active: true,
        sort_order: 10,
      },
      {
        id: 'b',
        slug: 'soft_drink_cola',
        category: 'pop',
        hydration_source_kind: 'sugary_drink',
        display_name: 'Cola (Inactive)',
        default_volume_ml: 355,
        hydration_coefficient: 0.7,
        caffeine_mg_per_serving: 34,
        kcal_per_serving: 140,
        sugar_g: 39,
        sodium_mg: 45,
        potassium_mg: 0,
        magnesium_mg: 0,
        is_alcoholic: false,
        abv: null,
        evidence_source: null,
        requires_claim_review: false,
        is_active: false,
        sort_order: 20,
      },
    ];

    const queryMocks = mockCatalogQuery(rows);

    const res = await GET();

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('beverages');
    expect(body.beverages).toHaveLength(2);
    expect(body.beverages[0].id).toBe('a');
    expect(body.beverages[1].id).toBe('b');

    // Confirm the query was made against beverage_catalog
    expect(mocks.adminFrom).toHaveBeenCalledWith('beverage_catalog');
    // select('*') - no is_active filter (admin sees all rows)
    expect(queryMocks.select).toHaveBeenCalledWith('*');
    // ordered by sort_order first
    expect(queryMocks.order1).toHaveBeenCalledWith('sort_order', { ascending: true });
    // then by display_name
    expect(queryMocks.order2).toHaveBeenCalledWith('display_name', { ascending: true });
  });

  it('returns empty beverages array when catalog is empty', async () => {
    mockCatalogQuery([]);
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ beverages: [] });
  });
});

// ---- Failure -----------------------------------------------------------------

describe('GET /api/admin/nutrition/beverages: failure', () => {
  beforeEach(() => {
    mocks.requireAdmin.mockResolvedValue({ kind: 'ok', user: { id: 'admin-2', role: 'admin' } });
  });

  it('returns 500 with a generic error body on database error', async () => {
    mockCatalogQuery([], { message: 'connection refused' });

    const res = await GET();

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toHaveProperty('error');
    expect(mocks.safeLogError).toHaveBeenCalled();
  });
});
