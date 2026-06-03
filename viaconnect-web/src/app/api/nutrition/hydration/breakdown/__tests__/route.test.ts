/**
 * Prompt 172e Phase D Workstream 1: GET /api/nutrition/hydration/breakdown.
 *
 * Contract:
 *   - 401 when unauthenticated
 *   - 503 when BEVERAGE_CATALOG_RENDERING_ENABLED kill switch is off
 *   - 500 with generic error body on a database error (events or catalog)
 *   - 200 with BreakdownData on success, Cache-Control private max-age=300
 *   - Aggregation matches the pure aggregateBreakdown helper so the
 *     legend numbers reconcile with the chart
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

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
    info: vi.fn(),
  },
}));

import { GET } from '@/app/api/nutrition/hydration/breakdown/route';

function mockEventsQuery(rows: unknown[], error: { message: string } | null = null) {
  const not = vi.fn().mockResolvedValue({ data: rows, error });
  const gte = vi.fn().mockReturnValue({ not });
  const eq = vi.fn().mockReturnValue({ gte });
  const select = vi.fn().mockReturnValue({ eq });
  return { select, eq, gte, not };
}

function mockCatalogQuery(rows: unknown[], error: { message: string } | null = null) {
  const order = vi.fn().mockResolvedValue({ data: rows, error });
  const eq = vi.fn().mockReturnValue({ order });
  const select = vi.fn().mockReturnValue({ eq });
  return { select, eq, order };
}

beforeEach(() => {
  mocks.supabaseAuth.mockReset();
  mocks.adminFrom.mockReset();
});

afterEach(() => {
  delete process.env.BEVERAGE_CATALOG_RENDERING_ENABLED;
  delete process.env.NEXT_PUBLIC_BEVERAGE_CATALOG_RENDERING_ENABLED;
});

describe('GET /api/nutrition/hydration/breakdown: kill switch', () => {
  it('returns 503 when BEVERAGE_CATALOG_RENDERING_ENABLED is off', async () => {
    process.env.BEVERAGE_CATALOG_RENDERING_ENABLED = 'false';
    const res = await GET();
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body).toEqual({ error: 'beverage catalog disabled' });
    expect(mocks.supabaseAuth).not.toHaveBeenCalled();
    expect(mocks.adminFrom).not.toHaveBeenCalled();
  });
});

describe('GET /api/nutrition/hydration/breakdown: auth', () => {
  it('returns 401 when unauthenticated', async () => {
    mocks.supabaseAuth.mockResolvedValueOnce({ data: { user: null } });
    const res = await GET();
    expect(res.status).toBe(401);
  });
});

describe('GET /api/nutrition/hydration/breakdown: success', () => {
  it('returns aggregated breakdown with Cache-Control private', async () => {
    mocks.supabaseAuth.mockResolvedValueOnce({ data: { user: { id: 'u-1' } } });

    const eventsMock = mockEventsQuery([
      { meal_id: 'm1', hydration_source_kind: 'pure_water', beverage_catalog_slug: 'water_still', portion_volume_ml: 500 },
      { meal_id: 'm2', hydration_source_kind: 'coffee_tea', beverage_catalog_slug: 'coffee_drip', portion_volume_ml: 240 },
    ]);
    const catalogMock = mockCatalogQuery([
      { slug: 'water_still', category: 'water', hydration_source_kind: 'pure_water', hydration_coefficient: 1.0 },
      { slug: 'coffee_drip', category: 'coffee', hydration_source_kind: 'coffee_tea', hydration_coefficient: 1.0 },
    ]);
    mocks.adminFrom
      .mockReturnValueOnce({ select: eventsMock.select })
      .mockReturnValueOnce({ select: catalogMock.select });

    const res = await GET();
    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe('private, max-age=300');

    const body = await res.json();
    expect(body.total_gross_ml).toBe(740);
    expect(body.total_effective_ml).toBe(740);
    const water = body.segments.find((s: { category: string }) => s.category === 'water');
    expect(water.gross_ml).toBe(500);
    const coffee = body.segments.find((s: { category: string }) => s.category === 'coffee');
    expect(coffee.gross_ml).toBe(240);
  });

  it('returns zero totals when no events match', async () => {
    mocks.supabaseAuth.mockResolvedValueOnce({ data: { user: { id: 'u-2' } } });

    const eventsMock = mockEventsQuery([]);
    const catalogMock = mockCatalogQuery([]);
    mocks.adminFrom
      .mockReturnValueOnce({ select: eventsMock.select })
      .mockReturnValueOnce({ select: catalogMock.select });

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.total_gross_ml).toBe(0);
    expect(body.total_effective_ml).toBe(0);
  });
});

describe('GET /api/nutrition/hydration/breakdown: failure', () => {
  it('returns 500 when events query fails', async () => {
    mocks.supabaseAuth.mockResolvedValueOnce({ data: { user: { id: 'u-3' } } });
    const eventsMock = mockEventsQuery([], { message: 'rls denied' });
    mocks.adminFrom.mockReturnValueOnce({ select: eventsMock.select });

    const res = await GET();
    expect(res.status).toBe(500);
  });

  it('returns 500 when catalog query fails', async () => {
    mocks.supabaseAuth.mockResolvedValueOnce({ data: { user: { id: 'u-4' } } });
    const eventsMock = mockEventsQuery([]);
    const catalogMock = mockCatalogQuery([], { message: 'rls denied' });
    mocks.adminFrom
      .mockReturnValueOnce({ select: eventsMock.select })
      .mockReturnValueOnce({ select: catalogMock.select });

    const res = await GET();
    expect(res.status).toBe(500);
  });
});
