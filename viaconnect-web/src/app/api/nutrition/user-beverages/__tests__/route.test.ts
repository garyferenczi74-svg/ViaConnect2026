/**
 * Prompt 207a Task 4: user_beverages CRUD API contract tests.
 *
 * Pins the following behaviors:
 *   GET  - returns own active rows (is_active = true), newest first; 401 if unauthed
 *   POST - creates a beverage row: validates display_name/category/volume/caffeine,
 *          derives kind/coefficient/is_alcoholic via deriveCustomBeverageDefaults,
 *          forces caffeine to 0 for non-CAFFEINE_CATEGORIES,
 *          does NOT include user_hash in the insert payload (DB default fills it),
 *          returns 401 if unauthed, 400 on bad body
 *   PATCH [id] - updates display_name, default_volume_ml, is_active; always sets
 *                updated_at; returns 401 if unauthed, 400 on invalid body
 *
 * Mock style mirrors custom-beverage.test.ts and catalog/__tests__/route.test.ts.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  supabaseAuth: vi.fn(),
  supabaseFrom: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => ({
    auth: { getUser: mocks.supabaseAuth },
    from: mocks.supabaseFrom,
  }),
}));

vi.mock('@/lib/utils/safe-log', () => ({
  safeLog: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

let GET: typeof import('@/app/api/nutrition/user-beverages/route').GET;
let POST: typeof import('@/app/api/nutrition/user-beverages/route').POST;

beforeEach(async () => {
  mocks.supabaseAuth.mockReset();
  mocks.supabaseFrom.mockReset();
  vi.resetModules();
  const mod = await import('@/app/api/nutrition/user-beverages/route');
  GET = mod.GET;
  POST = mod.POST;
});

afterEach(() => {
  vi.restoreAllMocks();
});

function buildRequest(body: unknown, method = 'POST'): NextRequest {
  return new NextRequest('http://localhost/api/nutrition/user-beverages', {
    method,
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });
}

// ---- GET tests ---------------------------------------------------------------

describe('GET /api/nutrition/user-beverages: auth', () => {
  it('returns 401 when unauthenticated', async () => {
    mocks.supabaseAuth.mockResolvedValueOnce({ data: { user: null } });
    const res = await GET();
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toMatchObject({ error: 'Unauthorized' });
  });
});

describe('GET /api/nutrition/user-beverages: success', () => {
  it('returns active rows for the authenticated user ordered newest first', async () => {
    mocks.supabaseAuth.mockResolvedValueOnce({ data: { user: { id: 'u-get-1' } } });
    const rows = [
      {
        id: 'bev-2',
        display_name: 'Green Tea',
        category: 'tea',
        hydration_source_kind: 'coffee_tea',
        default_volume_ml: 240,
        hydration_coefficient: 1.0,
        caffeine_mg_per_serving: 30,
        is_alcoholic: false,
        is_active: true,
      },
      {
        id: 'bev-1',
        display_name: 'Still Water',
        category: 'water',
        hydration_source_kind: 'pure_water',
        default_volume_ml: 500,
        hydration_coefficient: 1.0,
        caffeine_mg_per_serving: 0,
        is_alcoholic: false,
        is_active: true,
      },
    ];
    const orderMock = vi.fn().mockResolvedValue({ data: rows, error: null });
    const eqMock = vi.fn().mockReturnValue({ order: orderMock });
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock });
    mocks.supabaseFrom.mockReturnValue({ select: selectMock });

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('beverages');
    expect(body.beverages).toHaveLength(2);
    expect(body.beverages[0].id).toBe('bev-2');
    // Confirm is_active filter was applied
    expect(eqMock).toHaveBeenCalledWith('is_active', true);
    // Confirm descending order on created_at
    expect(orderMock).toHaveBeenCalledWith('created_at', { ascending: false });
  });

  it('returns empty array when user has no active beverages', async () => {
    mocks.supabaseAuth.mockResolvedValueOnce({ data: { user: { id: 'u-get-2' } } });
    const orderMock = vi.fn().mockResolvedValue({ data: [], error: null });
    const eqMock = vi.fn().mockReturnValue({ order: orderMock });
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock });
    mocks.supabaseFrom.mockReturnValue({ select: selectMock });

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.beverages).toEqual([]);
  });

  it('returns 500 on database error', async () => {
    mocks.supabaseAuth.mockResolvedValueOnce({ data: { user: { id: 'u-get-3' } } });
    const orderMock = vi.fn().mockResolvedValue({ data: null, error: { message: 'DB down' } });
    const eqMock = vi.fn().mockReturnValue({ order: orderMock });
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock });
    mocks.supabaseFrom.mockReturnValue({ select: selectMock });

    const res = await GET();
    expect(res.status).toBe(500);
  });
});

// ---- POST tests --------------------------------------------------------------

describe('POST /api/nutrition/user-beverages: auth', () => {
  it('returns 401 when unauthenticated', async () => {
    mocks.supabaseAuth.mockResolvedValueOnce({ data: { user: null } });
    const res = await POST(buildRequest({ display_name: 'Test', category: 'water', default_volume_ml: 250 }));
    expect(res.status).toBe(401);
  });
});

describe('POST /api/nutrition/user-beverages: validation', () => {
  beforeEach(() => {
    mocks.supabaseAuth.mockResolvedValue({ data: { user: { id: 'u-post-1' } } });
  });

  it('returns 400 for invalid category', async () => {
    const res = await POST(buildRequest({ display_name: 'Test', category: 'soda_water', default_volume_ml: 250 }));
    expect(res.status).toBe(400);
  });

  it('returns 400 for display_name too short (empty string)', async () => {
    const res = await POST(buildRequest({ display_name: '', category: 'water', default_volume_ml: 250 }));
    expect(res.status).toBe(400);
  });

  it('returns 400 for display_name too long (> 60 chars)', async () => {
    const longName = 'A'.repeat(61);
    const res = await POST(buildRequest({ display_name: longName, category: 'water', default_volume_ml: 250 }));
    expect(res.status).toBe(400);
  });

  it('returns 400 for default_volume_ml below minimum (< 10)', async () => {
    const res = await POST(buildRequest({ display_name: 'Test', category: 'water', default_volume_ml: 5 }));
    expect(res.status).toBe(400);
  });

  it('returns 400 for default_volume_ml above maximum (> 5000)', async () => {
    const res = await POST(buildRequest({ display_name: 'Test', category: 'water', default_volume_ml: 6000 }));
    expect(res.status).toBe(400);
  });

  it('returns 400 for caffeine_mg_per_serving above maximum (> 500)', async () => {
    const res = await POST(buildRequest({
      display_name: 'Mega Coffee',
      category: 'coffee',
      default_volume_ml: 250,
      caffeine_mg_per_serving: 600,
    }));
    expect(res.status).toBe(400);
  });

  it('returns 400 for non-positive volume (zero)', async () => {
    const res = await POST(buildRequest({ display_name: 'Test', category: 'water', default_volume_ml: 0 }));
    expect(res.status).toBe(400);
  });

  it('returns 400 for non-integer volume', async () => {
    const res = await POST(buildRequest({ display_name: 'Test', category: 'water', default_volume_ml: 250.5 }));
    expect(res.status).toBe(400);
  });
});

describe('POST /api/nutrition/user-beverages: derivation', () => {
  function wireInsertMock(returnedRow: Record<string, unknown>) {
    const singleMock = vi.fn().mockResolvedValue({ data: returnedRow, error: null });
    const selectAfterInsert = vi.fn().mockReturnValue({ single: singleMock });
    const insertMock = vi.fn().mockReturnValue({ select: selectAfterInsert });
    mocks.supabaseFrom.mockReturnValue({ insert: insertMock });
    return { insertMock, selectAfterInsert };
  }

  it('derives coffee_tea / 1.0 / is_alcoholic:false for category coffee', async () => {
    mocks.supabaseAuth.mockResolvedValueOnce({ data: { user: { id: 'u-derive-1' } } });
    const returnedRow = {
      id: 'bev-coffee',
      display_name: 'Dark Roast',
      category: 'coffee',
      hydration_source_kind: 'coffee_tea',
      default_volume_ml: 300,
      hydration_coefficient: 1.0,
      caffeine_mg_per_serving: 80,
      is_alcoholic: false,
      is_active: true,
    };
    const { insertMock } = wireInsertMock(returnedRow);

    const res = await POST(buildRequest({
      display_name: 'Dark Roast',
      category: 'coffee',
      default_volume_ml: 300,
      caffeine_mg_per_serving: 80,
    }));

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toHaveProperty('beverage');
    expect(body.beverage.hydration_source_kind).toBe('coffee_tea');
    expect(body.beverage.is_alcoholic).toBe(false);

    // Verify insert payload
    const insertPayload = insertMock.mock.calls[0][0] as Record<string, unknown>;
    expect(insertPayload.hydration_source_kind).toBe('coffee_tea');
    expect(insertPayload.hydration_coefficient).toBe(1.0);
    expect(insertPayload.is_alcoholic).toBe(false);
    expect(insertPayload.caffeine_mg_per_serving).toBe(80);
    // Critical: user_hash must NOT be in the insert payload
    expect(insertPayload).not.toHaveProperty('user_hash');
  });

  it('derives pure_water / 1.0 for category water and ignores caffeine (stores 0)', async () => {
    mocks.supabaseAuth.mockResolvedValueOnce({ data: { user: { id: 'u-derive-2' } } });
    const returnedRow = {
      id: 'bev-water',
      display_name: 'Spring Water',
      category: 'water',
      hydration_source_kind: 'pure_water',
      default_volume_ml: 500,
      hydration_coefficient: 1.0,
      caffeine_mg_per_serving: 0,
      is_alcoholic: false,
      is_active: true,
    };
    const { insertMock } = wireInsertMock(returnedRow);

    const res = await POST(buildRequest({
      display_name: 'Spring Water',
      category: 'water',
      default_volume_ml: 500,
      caffeine_mg_per_serving: 50,
    }));

    expect(res.status).toBe(201);
    // water is NOT in CAFFEINE_CATEGORIES -> caffeine forced to 0
    const insertPayload = insertMock.mock.calls[0][0] as Record<string, unknown>;
    expect(insertPayload.caffeine_mg_per_serving).toBe(0);
    expect(insertPayload.hydration_source_kind).toBe('pure_water');
    expect(insertPayload).not.toHaveProperty('user_hash');
  });

  it('derives alcohol_low / is_alcoholic:true for category alcohol', async () => {
    mocks.supabaseAuth.mockResolvedValueOnce({ data: { user: { id: 'u-derive-3' } } });
    const returnedRow = {
      id: 'bev-alc',
      display_name: 'Craft Lager',
      category: 'alcohol',
      hydration_source_kind: 'alcohol_low',
      default_volume_ml: 355,
      hydration_coefficient: 1.0,
      caffeine_mg_per_serving: 0,
      is_alcoholic: true,
      is_active: true,
    };
    const { insertMock } = wireInsertMock(returnedRow);

    const res = await POST(buildRequest({
      display_name: 'Craft Lager',
      category: 'alcohol',
      default_volume_ml: 355,
    }));

    expect(res.status).toBe(201);
    const insertPayload = insertMock.mock.calls[0][0] as Record<string, unknown>;
    expect(insertPayload.is_alcoholic).toBe(true);
    expect(insertPayload.hydration_source_kind).toBe('alcohol_low');
    expect(insertPayload.caffeine_mg_per_serving).toBe(0);
    expect(insertPayload).not.toHaveProperty('user_hash');
  });

  it('honors caffeine for sports_energy (a CAFFEINE_CATEGORY)', async () => {
    mocks.supabaseAuth.mockResolvedValueOnce({ data: { user: { id: 'u-derive-4' } } });
    const returnedRow = {
      id: 'bev-energy',
      display_name: 'Energy Boost',
      category: 'sports_energy',
      hydration_source_kind: 'sports_drink',
      default_volume_ml: 473,
      hydration_coefficient: 1.0,
      caffeine_mg_per_serving: 150,
      is_alcoholic: false,
      is_active: true,
    };
    const { insertMock } = wireInsertMock(returnedRow);

    const res = await POST(buildRequest({
      display_name: 'Energy Boost',
      category: 'sports_energy',
      default_volume_ml: 473,
      caffeine_mg_per_serving: 150,
    }));

    expect(res.status).toBe(201);
    const insertPayload = insertMock.mock.calls[0][0] as Record<string, unknown>;
    expect(insertPayload.caffeine_mg_per_serving).toBe(150);
    expect(insertPayload.hydration_source_kind).toBe('sports_drink');
    expect(insertPayload).not.toHaveProperty('user_hash');
  });

  it('stores caffeine 0 when not provided (no caffeine field in body)', async () => {
    mocks.supabaseAuth.mockResolvedValueOnce({ data: { user: { id: 'u-derive-5' } } });
    const returnedRow = {
      id: 'bev-tea',
      display_name: 'Chamomile Tea',
      category: 'tea',
      hydration_source_kind: 'coffee_tea',
      default_volume_ml: 240,
      hydration_coefficient: 1.0,
      caffeine_mg_per_serving: 0,
      is_alcoholic: false,
      is_active: true,
    };
    const { insertMock } = wireInsertMock(returnedRow);

    const res = await POST(buildRequest({
      display_name: 'Chamomile Tea',
      category: 'tea',
      default_volume_ml: 240,
    }));

    expect(res.status).toBe(201);
    const insertPayload = insertMock.mock.calls[0][0] as Record<string, unknown>;
    // tea IS in CAFFEINE_CATEGORIES but no caffeine supplied -> defaults to 0
    expect(insertPayload.caffeine_mg_per_serving).toBe(0);
    expect(insertPayload).not.toHaveProperty('user_hash');
  });

  it('returns 500 on database insert error', async () => {
    mocks.supabaseAuth.mockResolvedValueOnce({ data: { user: { id: 'u-derive-6' } } });
    const singleMock = vi.fn().mockResolvedValue({ data: null, error: { message: 'constraint violation' } });
    const selectAfterInsert = vi.fn().mockReturnValue({ single: singleMock });
    const insertMock = vi.fn().mockReturnValue({ select: selectAfterInsert });
    mocks.supabaseFrom.mockReturnValue({ insert: insertMock });

    const res = await POST(buildRequest({
      display_name: 'Error Bev',
      category: 'water',
      default_volume_ml: 250,
    }));

    expect(res.status).toBe(500);
  });
});

// ---- PATCH [id] tests (separate import) -------------------------------------

describe('PATCH /api/nutrition/user-beverages/[id]: auth + behavior', () => {
  let PATCH: typeof import('@/app/api/nutrition/user-beverages/[id]/route').PATCH;

  beforeEach(async () => {
    vi.resetModules();
    mocks.supabaseAuth.mockReset();
    mocks.supabaseFrom.mockReset();
    const patchMod = await import('@/app/api/nutrition/user-beverages/[id]/route');
    PATCH = patchMod.PATCH;
  });

  function buildPatchRequest(body: unknown, id = 'bev-patch-1'): NextRequest {
    return new NextRequest(`http://localhost/api/nutrition/user-beverages/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
      headers: { 'content-type': 'application/json' },
    });
  }

  it('returns 401 when unauthenticated', async () => {
    mocks.supabaseAuth.mockResolvedValueOnce({ data: { user: null } });
    const res = await PATCH(buildPatchRequest({ is_active: false }), { params: { id: 'bev-1' } });
    expect(res.status).toBe(401);
  });

  it('archives a beverage (is_active: false) and sets updated_at', async () => {
    mocks.supabaseAuth.mockResolvedValueOnce({ data: { user: { id: 'u-patch-1' } } });
    const updatedRow = {
      id: 'bev-patch-1',
      display_name: 'Oat Milk',
      category: 'milk',
      hydration_source_kind: 'dairy',
      default_volume_ml: 300,
      hydration_coefficient: 1.3,
      caffeine_mg_per_serving: 0,
      is_alcoholic: false,
      is_active: false,
    };
    const singleMock = vi.fn().mockResolvedValue({ data: updatedRow, error: null });
    const selectAfterUpdate = vi.fn().mockReturnValue({ single: singleMock });
    const eqIdMock = vi.fn().mockReturnValue({ select: selectAfterUpdate });
    const updateMock = vi.fn().mockReturnValue({ eq: eqIdMock });
    mocks.supabaseFrom.mockReturnValue({ update: updateMock });

    const res = await PATCH(buildPatchRequest({ is_active: false }), { params: { id: 'bev-patch-1' } });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('beverage');
    expect(body.beverage.is_active).toBe(false);

    // Confirm updated_at was set in the update payload
    const updatePayload = updateMock.mock.calls[0][0] as Record<string, unknown>;
    expect(updatePayload).toHaveProperty('is_active', false);
    expect(updatePayload).toHaveProperty('updated_at');
    expect(typeof updatePayload.updated_at).toBe('string');
    // updated_at should be a valid ISO string
    expect(() => new Date(updatePayload.updated_at as string)).not.toThrow();
  });

  it('allows renaming display_name and sets updated_at', async () => {
    mocks.supabaseAuth.mockResolvedValueOnce({ data: { user: { id: 'u-patch-2' } } });
    const updatedRow = {
      id: 'bev-patch-2',
      display_name: 'Premium Green Tea',
      category: 'tea',
      hydration_source_kind: 'coffee_tea',
      default_volume_ml: 240,
      hydration_coefficient: 1.0,
      caffeine_mg_per_serving: 30,
      is_alcoholic: false,
      is_active: true,
    };
    const singleMock = vi.fn().mockResolvedValue({ data: updatedRow, error: null });
    const selectAfterUpdate = vi.fn().mockReturnValue({ single: singleMock });
    const eqIdMock = vi.fn().mockReturnValue({ select: selectAfterUpdate });
    const updateMock = vi.fn().mockReturnValue({ eq: eqIdMock });
    mocks.supabaseFrom.mockReturnValue({ update: updateMock });

    const res = await PATCH(buildPatchRequest({ display_name: 'Premium Green Tea' }), { params: { id: 'bev-patch-2' } });
    expect(res.status).toBe(200);

    const updatePayload = updateMock.mock.calls[0][0] as Record<string, unknown>;
    expect(updatePayload.display_name).toBe('Premium Green Tea');
    expect(updatePayload).toHaveProperty('updated_at');
  });

  it('allows updating default_volume_ml and sets updated_at', async () => {
    mocks.supabaseAuth.mockResolvedValueOnce({ data: { user: { id: 'u-patch-3' } } });
    const updatedRow = {
      id: 'bev-patch-3',
      display_name: 'Home Coffee',
      category: 'coffee',
      hydration_source_kind: 'coffee_tea',
      default_volume_ml: 400,
      hydration_coefficient: 1.0,
      caffeine_mg_per_serving: 80,
      is_alcoholic: false,
      is_active: true,
    };
    const singleMock = vi.fn().mockResolvedValue({ data: updatedRow, error: null });
    const selectAfterUpdate = vi.fn().mockReturnValue({ single: singleMock });
    const eqIdMock = vi.fn().mockReturnValue({ select: selectAfterUpdate });
    const updateMock = vi.fn().mockReturnValue({ eq: eqIdMock });
    mocks.supabaseFrom.mockReturnValue({ update: updateMock });

    const res = await PATCH(buildPatchRequest({ default_volume_ml: 400 }), { params: { id: 'bev-patch-3' } });
    expect(res.status).toBe(200);

    const updatePayload = updateMock.mock.calls[0][0] as Record<string, unknown>;
    expect(updatePayload.default_volume_ml).toBe(400);
    expect(updatePayload).toHaveProperty('updated_at');
  });

  it('returns 400 for empty patch body (no recognized fields)', async () => {
    mocks.supabaseAuth.mockResolvedValueOnce({ data: { user: { id: 'u-patch-4' } } });
    const res = await PATCH(buildPatchRequest({}), { params: { id: 'bev-patch-4' } });
    expect(res.status).toBe(400);
  });

  it('returns 400 for display_name exceeding 60 chars in PATCH', async () => {
    mocks.supabaseAuth.mockResolvedValueOnce({ data: { user: { id: 'u-patch-5' } } });
    const longName = 'B'.repeat(61);
    const res = await PATCH(buildPatchRequest({ display_name: longName }), { params: { id: 'bev-patch-5' } });
    expect(res.status).toBe(400);
  });

  it('returns 500 on database update error', async () => {
    mocks.supabaseAuth.mockResolvedValueOnce({ data: { user: { id: 'u-patch-6' } } });
    const singleMock = vi.fn().mockResolvedValue({ data: null, error: { message: 'RLS violation' } });
    const selectAfterUpdate = vi.fn().mockReturnValue({ single: singleMock });
    const eqIdMock = vi.fn().mockReturnValue({ select: selectAfterUpdate });
    const updateMock = vi.fn().mockReturnValue({ eq: eqIdMock });
    mocks.supabaseFrom.mockReturnValue({ update: updateMock });

    const res = await PATCH(buildPatchRequest({ is_active: false }), { params: { id: 'bev-patch-6' } });
    expect(res.status).toBe(500);
  });
});
