/**
 * Prompt 207a Task 8: write API contract tests for admin beverage catalog.
 *
 * Contract:
 *   POST /api/admin/nutrition/beverages   - create a catalog row
 *   PATCH /api/admin/nutrition/beverages/[slug] - update / toggle a row
 *
 * Assertions:
 *   - Non-admin blocked on POST and PATCH (401 / 403 passthrough).
 *   - POST calls requireAdmin then createAdminClient for the insert.
 *   - PATCH rejects a slug change in the request body (400).
 *   - PATCH with is_active:false issues an UPDATE (no .delete() call).
 *   - hydration_coefficient outside 0.50-1.60 returns 400 on POST.
 *   - setting requires_claim_review=true returns a compliance_note in the response.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  adminInsert: vi.fn(),
  adminUpdate: vi.fn(),
  adminSelect: vi.fn(),
  adminFrom: vi.fn(),
  safeLogError: vi.fn(),
  safeLogInfo: vi.fn(),
  safeLogWarn: vi.fn(),
}));

vi.mock('@/lib/flags/admin-guard', () => ({
  requireAdmin: mocks.requireAdmin,
}));

// Wire admin client so .from() returns chainable mock
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: mocks.adminFrom,
  }),
}));

vi.mock('@/lib/utils/safe-log', () => ({
  safeLog: {
    warn: mocks.safeLogWarn,
    error: mocks.safeLogError,
    info: mocks.safeLogInfo,
  },
}));

import { POST } from '../route';
import { PATCH } from '../[slug]/route';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeAdminOk() {
  mocks.requireAdmin.mockResolvedValue({ kind: 'ok', user: { id: 'admin-1', role: 'admin' } });
}

function makeAdminError(status: number) {
  const msg = status === 401 ? 'Unauthorized' : 'Forbidden';
  mocks.requireAdmin.mockResolvedValue({
    kind: 'error',
    response: NextResponse.json({ error: msg }, { status }),
  });
}

function makePostRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/admin/nutrition/beverages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function makePatchRequest(slug: string, body: unknown): NextRequest {
  return new NextRequest(`http://localhost/api/admin/nutrition/beverages/${slug}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

/** Minimal valid beverage body for POST. */
const VALID_BODY = {
  slug: 'green_tea_standard',
  display_name: 'Green Tea',
  category: 'tea',
  hydration_source_kind: 'coffee_tea',
  default_volume_ml: 240,
  hydration_coefficient: 1.0,
  caffeine_mg_per_serving: 28,
  kcal_per_serving: 0,
  sugar_g: 0,
  sodium_mg: 2,
  potassium_mg: 20,
  magnesium_mg: 3,
  is_alcoholic: false,
  abv: null,
  evidence_source: null,
  requires_claim_review: false,
  is_active: true,
  sort_order: 40,
};

/** Wire a successful insert chain: .from().insert().select().single() */
function mockInsertSuccess(row: unknown) {
  const single = vi.fn().mockResolvedValue({ data: row, error: null });
  const select = vi.fn().mockReturnValue({ single });
  const insert = vi.fn().mockReturnValue({ select });
  mocks.adminFrom.mockReturnValue({ insert });
  return { insert, select, single };
}

/** Wire a failing insert chain. */
function mockInsertError(message = 'db error') {
  const single = vi.fn().mockResolvedValue({ data: null, error: { message } });
  const select = vi.fn().mockReturnValue({ single });
  const insert = vi.fn().mockReturnValue({ select });
  mocks.adminFrom.mockReturnValue({ insert });
}

/** Wire a successful update chain: .from().update().eq().select().single() */
function mockUpdateSuccess(row: unknown) {
  const single = vi.fn().mockResolvedValue({ data: row, error: null });
  const select = vi.fn().mockReturnValue({ single });
  const eq = vi.fn().mockReturnValue({ select });
  const update = vi.fn().mockReturnValue({ eq });
  mocks.adminFrom.mockReturnValue({ update });
  return { update, eq, select, single };
}

// ---------------------------------------------------------------------------
// POST: auth gate
// ---------------------------------------------------------------------------

describe('POST /api/admin/nutrition/beverages: auth', () => {
  beforeEach(() => {
    mocks.requireAdmin.mockReset();
    mocks.adminFrom.mockReset();
  });

  it('returns 401 from requireAdmin when unauthenticated', async () => {
    makeAdminError(401);
    const res = await POST(makePostRequest(VALID_BODY));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toEqual({ error: 'Unauthorized' });
    expect(mocks.adminFrom).not.toHaveBeenCalled();
  });

  it('returns 403 from requireAdmin when user lacks admin role', async () => {
    makeAdminError(403);
    const res = await POST(makePostRequest(VALID_BODY));
    expect(res.status).toBe(403);
    expect(mocks.adminFrom).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// POST: validation
// ---------------------------------------------------------------------------

describe('POST /api/admin/nutrition/beverages: validation', () => {
  beforeEach(() => {
    mocks.requireAdmin.mockReset();
    mocks.adminFrom.mockReset();
    makeAdminOk();
  });

  it('returns 400 when hydration_coefficient is below 0.50', async () => {
    const req = makePostRequest({ ...VALID_BODY, hydration_coefficient: 0.3 });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/hydration_coefficient/i);
  });

  it('returns 400 when hydration_coefficient is above 1.60', async () => {
    const req = makePostRequest({ ...VALID_BODY, hydration_coefficient: 1.7 });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/hydration_coefficient/i);
  });

  it('accepts hydration_coefficient at boundary 0.50', async () => {
    mockInsertSuccess({ ...VALID_BODY, hydration_coefficient: 0.5 });
    const req = makePostRequest({ ...VALID_BODY, hydration_coefficient: 0.5 });
    const res = await POST(req);
    expect(res.status).toBe(201);
  });

  it('accepts hydration_coefficient at boundary 1.60', async () => {
    mockInsertSuccess({ ...VALID_BODY, hydration_coefficient: 1.6 });
    const req = makePostRequest({ ...VALID_BODY, hydration_coefficient: 1.6 });
    const res = await POST(req);
    expect(res.status).toBe(201);
  });

  it('returns 400 when category is not in the 9 allowed values', async () => {
    const req = makePostRequest({ ...VALID_BODY, category: 'energy_shot' });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 when hydration_source_kind is not in the 9 allowed values', async () => {
    const req = makePostRequest({ ...VALID_BODY, hydration_source_kind: 'swamp_water' });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 when default_volume_ml is not positive', async () => {
    const req = makePostRequest({ ...VALID_BODY, default_volume_ml: 0 });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// POST: success + createAdminClient usage
// ---------------------------------------------------------------------------

describe('POST /api/admin/nutrition/beverages: success', () => {
  beforeEach(() => {
    mocks.requireAdmin.mockReset();
    mocks.adminFrom.mockReset();
    makeAdminOk();
  });

  it('inserts via createAdminClient and returns 201 with the new row', async () => {
    const created = { ...VALID_BODY, id: 'row-1' };
    const { insert } = mockInsertSuccess(created);

    const req = makePostRequest(VALID_BODY);
    const res = await POST(req);

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toHaveProperty('beverage');
    expect(body.beverage.id).toBe('row-1');

    // Confirm createAdminClient was used (mocks.adminFrom is from the admin client mock)
    expect(mocks.adminFrom).toHaveBeenCalledWith('beverage_catalog');
    expect(insert).toHaveBeenCalled();
  });

  it('returns compliance_note when requires_claim_review is true', async () => {
    const bodyWithClaim = { ...VALID_BODY, requires_claim_review: true };
    const created = { ...bodyWithClaim, id: 'row-2' };
    mockInsertSuccess(created);

    const req = makePostRequest(bodyWithClaim);
    const res = await POST(req);

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toHaveProperty('compliance_note');
    // Should contain Kelsey and Marshall resolved display names (not hardcoded)
    expect(typeof body.compliance_note).toBe('string');
    expect(body.compliance_note).toContain('Kelsey');
    expect(body.compliance_note).toContain('Marshall');
  });

  it('returns compliance_note when evidence_source is provided', async () => {
    const bodyWithEvidence = { ...VALID_BODY, evidence_source: 'Maughan 2016' };
    const created = { ...bodyWithEvidence, id: 'row-3' };
    mockInsertSuccess(created);

    const req = makePostRequest(bodyWithEvidence);
    const res = await POST(req);

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toHaveProperty('compliance_note');
  });

  it('does NOT return compliance_note when neither requires_claim_review nor evidence_source is set', async () => {
    const bodyNoCompliance = { ...VALID_BODY, requires_claim_review: false, evidence_source: null };
    const created = { ...bodyNoCompliance, id: 'row-4' };
    mockInsertSuccess(created);

    const req = makePostRequest(bodyNoCompliance);
    const res = await POST(req);

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).not.toHaveProperty('compliance_note');
  });
});

// ---------------------------------------------------------------------------
// PATCH: auth gate
// ---------------------------------------------------------------------------

describe('PATCH /api/admin/nutrition/beverages/[slug]: auth', () => {
  beforeEach(() => {
    mocks.requireAdmin.mockReset();
    mocks.adminFrom.mockReset();
  });

  it('returns 401 from requireAdmin when unauthenticated', async () => {
    makeAdminError(401);
    const res = await PATCH(makePatchRequest('water_still', { display_name: 'Still Water 2' }), {
      params: { slug: 'water_still' },
    });
    expect(res.status).toBe(401);
    expect(mocks.adminFrom).not.toHaveBeenCalled();
  });

  it('returns 403 from requireAdmin when user lacks admin role', async () => {
    makeAdminError(403);
    const res = await PATCH(makePatchRequest('water_still', { display_name: 'Still Water 2' }), {
      params: { slug: 'water_still' },
    });
    expect(res.status).toBe(403);
    expect(mocks.adminFrom).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// PATCH: slug immutability
// ---------------------------------------------------------------------------

describe('PATCH /api/admin/nutrition/beverages/[slug]: slug immutability', () => {
  beforeEach(() => {
    mocks.requireAdmin.mockReset();
    mocks.adminFrom.mockReset();
    makeAdminOk();
  });

  it('returns 400 when request body contains a slug field (slug must not be changed)', async () => {
    const res = await PATCH(
      makePatchRequest('water_still', { display_name: 'Updated', slug: 'water_still_v2' }),
      { params: { slug: 'water_still' } },
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/slug/i);
    // createAdminClient must not be called
    expect(mocks.adminFrom).not.toHaveBeenCalled();
  });

  it('proceeds normally when the body does NOT contain a slug field', async () => {
    const updated = { id: 'row-1', slug: 'water_still', display_name: 'Updated Still Water' };
    mockUpdateSuccess(updated);

    const res = await PATCH(
      makePatchRequest('water_still', { display_name: 'Updated Still Water' }),
      { params: { slug: 'water_still' } },
    );
    expect(res.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// PATCH: soft delete (is_active: false)
// ---------------------------------------------------------------------------

describe('PATCH /api/admin/nutrition/beverages/[slug]: soft delete', () => {
  beforeEach(() => {
    mocks.requireAdmin.mockReset();
    mocks.adminFrom.mockReset();
    makeAdminOk();
  });

  it('issues an UPDATE when is_active is set to false (no .delete() call)', async () => {
    const updated = { id: 'row-1', slug: 'water_still', is_active: false };
    const { update } = mockUpdateSuccess(updated);

    const res = await PATCH(
      makePatchRequest('water_still', { is_active: false }),
      { params: { slug: 'water_still' } },
    );

    expect(res.status).toBe(200);
    // update must have been called, not delete
    expect(update).toHaveBeenCalled();
    expect(mocks.adminFrom).toHaveBeenCalledWith('beverage_catalog');

    // Verify the mock chain does NOT have a .delete() call
    const fromResult = mocks.adminFrom.mock.results[0].value as Record<string, unknown>;
    expect(typeof fromResult.update).toBe('function');
    expect(fromResult).not.toHaveProperty('delete');
  });

  it('re-enables a beverage with is_active: true via UPDATE', async () => {
    const updated = { id: 'row-1', slug: 'water_still', is_active: true };
    const { update } = mockUpdateSuccess(updated);

    const res = await PATCH(
      makePatchRequest('water_still', { is_active: true }),
      { params: { slug: 'water_still' } },
    );

    expect(res.status).toBe(200);
    expect(update).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// PATCH: compliance note
// ---------------------------------------------------------------------------

describe('PATCH /api/admin/nutrition/beverages/[slug]: compliance note', () => {
  beforeEach(() => {
    mocks.requireAdmin.mockReset();
    mocks.adminFrom.mockReset();
    makeAdminOk();
  });

  it('returns compliance_note when requires_claim_review is set true in PATCH body', async () => {
    const updated = { id: 'row-1', slug: 'water_still', requires_claim_review: true };
    mockUpdateSuccess(updated);

    const res = await PATCH(
      makePatchRequest('water_still', { requires_claim_review: true }),
      { params: { slug: 'water_still' } },
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('compliance_note');
    expect(body.compliance_note).toContain('Kelsey');
    expect(body.compliance_note).toContain('Marshall');
  });

  it('returns compliance_note when evidence_source is edited in PATCH body', async () => {
    const updated = { id: 'row-1', slug: 'water_still', evidence_source: 'USDA 2024' };
    mockUpdateSuccess(updated);

    const res = await PATCH(
      makePatchRequest('water_still', { evidence_source: 'USDA 2024' }),
      { params: { slug: 'water_still' } },
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('compliance_note');
  });

  it('does NOT return compliance_note for a plain display_name update', async () => {
    const updated = { id: 'row-1', slug: 'water_still', display_name: 'Still Water v2' };
    mockUpdateSuccess(updated);

    const res = await PATCH(
      makePatchRequest('water_still', { display_name: 'Still Water v2' }),
      { params: { slug: 'water_still' } },
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).not.toHaveProperty('compliance_note');
  });
});

// ---------------------------------------------------------------------------
// PATCH: hydration_coefficient range validation
// ---------------------------------------------------------------------------

describe('PATCH /api/admin/nutrition/beverages/[slug]: validation', () => {
  beforeEach(() => {
    mocks.requireAdmin.mockReset();
    mocks.adminFrom.mockReset();
    makeAdminOk();
  });

  it('returns 400 when hydration_coefficient is out of range on PATCH', async () => {
    const res = await PATCH(
      makePatchRequest('water_still', { hydration_coefficient: 2.0 }),
      { params: { slug: 'water_still' } },
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/hydration_coefficient/i);
    expect(mocks.adminFrom).not.toHaveBeenCalled();
  });
});
