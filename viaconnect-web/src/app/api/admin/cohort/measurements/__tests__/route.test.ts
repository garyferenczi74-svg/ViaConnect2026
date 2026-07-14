/**
 * Prompt 211b Workstream 1B: contract tests for /api/admin/cohort/measurements.
 *
 * Contract:
 *   GET  - research-admin gated. Lists cohort_labeled_measurements, optionally
 *          filtered by subject_id and/or session_id.
 *   POST - research-admin gated. Validates region against the 8-value
 *          GirthRegion union (matches accuracyTargets.ts / the CHECK
 *          constraint exactly), positive predicted_cm/truth_cm. Batch-inserts
 *          one row per pair for a subject_id + session_id. measurer_id
 *          defaults to the authenticated admin when omitted.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

const mocks = vi.hoisted(() => ({
  requireResearchAdmin: vi.fn(),
  adminFrom: vi.fn(),
  safeLogError: vi.fn(),
  safeLogInfo: vi.fn(),
}));

vi.mock('@/lib/arnold/scanning/cohort/researchAdminGuard', () => ({
  requireResearchAdmin: mocks.requireResearchAdmin,
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
    info: mocks.safeLogInfo,
  },
}));

import { GET, POST, GIRTH_REGIONS } from '../route';

beforeEach(() => {
  mocks.requireResearchAdmin.mockReset();
  mocks.adminFrom.mockReset();
  mocks.safeLogError.mockReset();
  mocks.safeLogInfo.mockReset();
});

function makeOk(id = 'admin-1', role = 'admin') {
  mocks.requireResearchAdmin.mockResolvedValue({ kind: 'ok', user: { id, role } });
}

function makeError(status: 401 | 403) {
  const msg = status === 401 ? 'Unauthorized' : 'Forbidden';
  mocks.requireResearchAdmin.mockResolvedValue({
    kind: 'error',
    response: NextResponse.json({ error: msg }, { status }),
  });
}

function makeGetRequest(qs = ''): NextRequest {
  return new NextRequest(`http://localhost/api/admin/cohort/measurements${qs}`);
}

function makePostRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/admin/cohort/measurements', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const VALID_BODY = {
  subject_id: '11111111-1111-4111-8111-111111111111',
  session_id: '22222222-2222-4222-8222-222222222222',
  measurements: [
    { region: 'waist', predicted_cm: 80.2, truth_cm: 81.0 },
    { region: 'hip', predicted_cm: 100.1, truth_cm: 99.5 },
  ],
};

function mockListQuery(rows: unknown[], error: { message: string } | null = null) {
  const order = vi.fn().mockResolvedValue({ data: rows, error });
  const eq = vi.fn();
  const select = vi.fn().mockReturnValue({ order, eq });
  eq.mockReturnValue({ order, eq });
  mocks.adminFrom.mockReturnValue({ select });
  return { select, order, eq };
}

function mockInsertSuccess(rows: unknown[]) {
  const select = vi.fn().mockResolvedValue({ data: rows, error: null });
  const insert = vi.fn().mockReturnValue({ select });
  mocks.adminFrom.mockReturnValue({ insert });
  return { insert, select };
}

function mockInsertError(message = 'db error') {
  const select = vi.fn().mockResolvedValue({ data: null, error: { message } });
  const insert = vi.fn().mockReturnValue({ select });
  mocks.adminFrom.mockReturnValue({ insert });
}

// ---------------------------------------------------------------------------
// Region list sanity
// ---------------------------------------------------------------------------

describe('GIRTH_REGIONS', () => {
  it('matches the 8-value GirthRegion union exactly', () => {
    expect([...GIRTH_REGIONS].sort()).toEqual(
      ['chest', 'forearm', 'hip', 'lowerLeg', 'neck', 'upperArm', 'upperLeg', 'waist'].sort(),
    );
  });
});

// ---------------------------------------------------------------------------
// GET: auth
// ---------------------------------------------------------------------------

describe('GET /api/admin/cohort/measurements: auth', () => {
  it('returns 401 when unauthenticated', async () => {
    makeError(401);
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(401);
    expect(mocks.adminFrom).not.toHaveBeenCalled();
  });

  it('returns 403 when caller lacks a research role', async () => {
    makeError(403);
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(403);
  });
});

// ---------------------------------------------------------------------------
// GET: success
// ---------------------------------------------------------------------------

describe('GET /api/admin/cohort/measurements: success', () => {
  beforeEach(() => makeOk());

  it('lists all measurements when no filters are given', async () => {
    mockListQuery([{ id: 'm-1', subject_id: 's-1', region: 'waist', predicted_cm: 80, truth_cm: 81, session_id: 'sess-1', measurer_id: 'admin-1', created_at: '2026-07-10T00:00:00Z' }]);
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.measurements).toHaveLength(1);
  });

  it('filters by subject_id when provided', async () => {
    const { eq } = mockListQuery([]);
    const res = await GET(makeGetRequest('?subject_id=s-1'));
    expect(res.status).toBe(200);
    expect(eq).toHaveBeenCalledWith('subject_id', 's-1');
  });
});

// ---------------------------------------------------------------------------
// POST: auth
// ---------------------------------------------------------------------------

describe('POST /api/admin/cohort/measurements: auth', () => {
  it('returns 401 when unauthenticated', async () => {
    makeError(401);
    const res = await POST(makePostRequest(VALID_BODY));
    expect(res.status).toBe(401);
    expect(mocks.adminFrom).not.toHaveBeenCalled();
  });

  it('returns 403 when caller lacks a research role', async () => {
    makeError(403);
    const res = await POST(makePostRequest(VALID_BODY));
    expect(res.status).toBe(403);
    expect(mocks.adminFrom).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// POST: validation
// ---------------------------------------------------------------------------

describe('POST /api/admin/cohort/measurements: validation', () => {
  beforeEach(() => makeOk());

  it('returns 400 when region is not one of the 8 GirthRegion values', async () => {
    const res = await POST(makePostRequest({
      ...VALID_BODY,
      measurements: [{ region: 'bicep', predicted_cm: 30, truth_cm: 31 }],
    }));
    expect(res.status).toBe(400);
    expect(mocks.adminFrom).not.toHaveBeenCalled();
  });

  it('returns 400 when predicted_cm is not positive', async () => {
    const res = await POST(makePostRequest({
      ...VALID_BODY,
      measurements: [{ region: 'waist', predicted_cm: 0, truth_cm: 31 }],
    }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when truth_cm is not positive', async () => {
    const res = await POST(makePostRequest({
      ...VALID_BODY,
      measurements: [{ region: 'waist', predicted_cm: 30, truth_cm: -1 }],
    }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when measurements array is empty', async () => {
    const res = await POST(makePostRequest({ ...VALID_BODY, measurements: [] }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when subject_id is not a uuid', async () => {
    const res = await POST(makePostRequest({ ...VALID_BODY, subject_id: 'not-a-uuid' }));
    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// POST: success, insert shape, measurer_id default
// ---------------------------------------------------------------------------

describe('POST /api/admin/cohort/measurements: success', () => {
  beforeEach(() => makeOk('admin-7', 'researcher'));

  it('batch-inserts one row per pair with the correct shape', async () => {
    const createdRows = VALID_BODY.measurements.map((m, i) => ({
      id: `m-${i}`,
      subject_id: VALID_BODY.subject_id,
      session_id: VALID_BODY.session_id,
      measurer_id: 'admin-7',
      ...m,
    }));
    const { insert } = mockInsertSuccess(createdRows);

    const res = await POST(makePostRequest(VALID_BODY));

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.measurements).toHaveLength(2);

    expect(mocks.adminFrom).toHaveBeenCalledWith('cohort_labeled_measurements');
    expect(insert).toHaveBeenCalledTimes(1);
    const insertArg = insert.mock.calls[0][0] as Array<Record<string, unknown>>;
    expect(insertArg).toHaveLength(2);
    for (const row of insertArg) {
      expect(row.subject_id).toBe(VALID_BODY.subject_id);
      expect(row.session_id).toBe(VALID_BODY.session_id);
      // measurer_id defaults to the authenticated admin when omitted from the body.
      expect(row.measurer_id).toBe('admin-7');
    }
    expect(insertArg[0].region).toBe('waist');
    expect(insertArg[1].region).toBe('hip');
  });

  it('uses an explicit measurer_id when supplied in the body', async () => {
    const explicitMeasurer = '33333333-3333-4333-8333-333333333333';
    const { insert } = mockInsertSuccess([]);

    await POST(makePostRequest({ ...VALID_BODY, measurer_id: explicitMeasurer }));

    const insertArg = insert.mock.calls[0][0] as Array<Record<string, unknown>>;
    expect(insertArg[0].measurer_id).toBe(explicitMeasurer);
  });

  it('returns 500 when the insert fails', async () => {
    mockInsertError();
    const res = await POST(makePostRequest(VALID_BODY));
    expect(res.status).toBe(500);
    expect(mocks.safeLogError).toHaveBeenCalled();
  });
});
