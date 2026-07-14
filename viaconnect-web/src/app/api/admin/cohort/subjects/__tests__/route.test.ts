/**
 * Prompt 211b Workstream 1B: contract tests for /api/admin/cohort/subjects.
 *
 * Contract:
 *   GET  - research-admin gated (401/403 passthrough). Lists cohort_subjects
 *          ordered by collected_at desc, including chain-of-custody columns.
 *   POST - research-admin gated. Validates the body (sex enum, positive
 *          height_cm, required consent_ledger_id uuid). Inserts with
 *          collected_by/collected_at set server-side from the authenticated
 *          admin (never trusted from the client) -- the chain-of-custody
 *          guarantee.
 *
 * Mock strategy mirrors admin/nutrition/beverages/__tests__/route.test.ts.
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

import { GET, POST } from '../route';

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

function makePostRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/admin/cohort/subjects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const VALID_BODY = {
  sex: 'female',
  height_cm: 165.5,
  weight_kg: 62,
  body_size_bucket: 'M',
  consent_ledger_id: '11111111-1111-4111-8111-111111111111',
  protocol_version: 'tape-v1',
  notes: null,
};

function mockListQuery(rows: unknown[], error: { message: string } | null = null) {
  const order = vi.fn().mockResolvedValue({ data: rows, error });
  const select = vi.fn().mockReturnValue({ order });
  mocks.adminFrom.mockReturnValue({ select });
  return { select, order };
}

function mockInsertSuccess(row: unknown) {
  const single = vi.fn().mockResolvedValue({ data: row, error: null });
  const select = vi.fn().mockReturnValue({ single });
  const insert = vi.fn().mockReturnValue({ select });
  mocks.adminFrom.mockReturnValue({ insert });
  return { insert, select, single };
}

function mockInsertError(message = 'db error') {
  const single = vi.fn().mockResolvedValue({ data: null, error: { message } });
  const select = vi.fn().mockReturnValue({ single });
  const insert = vi.fn().mockReturnValue({ select });
  mocks.adminFrom.mockReturnValue({ insert });
}

// ---------------------------------------------------------------------------
// GET: auth
// ---------------------------------------------------------------------------

describe('GET /api/admin/cohort/subjects: auth', () => {
  it('returns the 401 from requireResearchAdmin when unauthenticated', async () => {
    makeError(401);
    const res = await GET();
    expect(res.status).toBe(401);
    expect(mocks.adminFrom).not.toHaveBeenCalled();
  });

  it('returns the 403 from requireResearchAdmin when caller lacks a research role', async () => {
    makeError(403);
    const res = await GET();
    expect(res.status).toBe(403);
    expect(mocks.adminFrom).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// GET: success
// ---------------------------------------------------------------------------

describe('GET /api/admin/cohort/subjects: success', () => {
  beforeEach(() => makeOk());

  it('returns subjects ordered by collected_at desc with chain-of-custody columns', async () => {
    const rows = [
      {
        id: 'subj-1', sex: 'female', height_cm: 165, weight_kg: 60, body_size_bucket: 'M',
        consent_ledger_id: 'c-1', collected_by: 'admin-1', collected_at: '2026-07-10T00:00:00Z',
        protocol_version: 'tape-v1', notes: null, created_at: '2026-07-10T00:00:00Z',
      },
    ];
    const { select, order } = mockListQuery(rows);

    const res = await GET();

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.subjects).toHaveLength(1);
    expect(body.subjects[0].collected_by).toBe('admin-1');
    expect(mocks.adminFrom).toHaveBeenCalledWith('cohort_subjects');
    expect(select).toHaveBeenCalled();
    expect(order).toHaveBeenCalledWith('collected_at', { ascending: false });
  });

  it('returns 500 on database error', async () => {
    mockListQuery([], { message: 'connection refused' });
    const res = await GET();
    expect(res.status).toBe(500);
    expect(mocks.safeLogError).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// POST: auth
// ---------------------------------------------------------------------------

describe('POST /api/admin/cohort/subjects: auth', () => {
  it('returns 401 from requireResearchAdmin when unauthenticated', async () => {
    makeError(401);
    const res = await POST(makePostRequest(VALID_BODY));
    expect(res.status).toBe(401);
    expect(mocks.adminFrom).not.toHaveBeenCalled();
  });

  it('returns 403 from requireResearchAdmin when caller lacks a research role', async () => {
    makeError(403);
    const res = await POST(makePostRequest(VALID_BODY));
    expect(res.status).toBe(403);
    expect(mocks.adminFrom).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// POST: validation
// ---------------------------------------------------------------------------

describe('POST /api/admin/cohort/subjects: validation', () => {
  beforeEach(() => makeOk());

  it('returns 400 when consent_ledger_id is missing (consent ref required for new enrollments)', async () => {
    const { consent_ledger_id: _omit, ...rest } = VALID_BODY;
    void _omit;
    const res = await POST(makePostRequest(rest));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/consent_ledger_id/i);
    expect(mocks.adminFrom).not.toHaveBeenCalled();
  });

  it('returns 400 when sex is not one of male/female/other', async () => {
    const res = await POST(makePostRequest({ ...VALID_BODY, sex: 'unknown' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when height_cm is not positive', async () => {
    const res = await POST(makePostRequest({ ...VALID_BODY, height_cm: 0 }));
    expect(res.status).toBe(400);
  });

  it('returns 400 on invalid JSON body', async () => {
    const req = new NextRequest('http://localhost/api/admin/cohort/subjects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{not json',
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// POST: success and chain-of-custody
// ---------------------------------------------------------------------------

describe('POST /api/admin/cohort/subjects: success', () => {
  beforeEach(() => makeOk('admin-42', 'researcher'));

  it('inserts via createAdminClient with server-set collected_by/collected_at', async () => {
    const created = { id: 'subj-9', ...VALID_BODY, collected_by: 'admin-42' };
    const { insert } = mockInsertSuccess(created);

    const res = await POST(makePostRequest(VALID_BODY));

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.subject.id).toBe('subj-9');

    expect(mocks.adminFrom).toHaveBeenCalledWith('cohort_subjects');
    expect(insert).toHaveBeenCalledTimes(1);
    const insertArg = insert.mock.calls[0][0];
    // Chain-of-custody: collected_by comes from the authenticated admin, not the body.
    expect(insertArg.collected_by).toBe('admin-42');
    expect(typeof insertArg.collected_at).toBe('string');
    expect(insertArg.consent_ledger_id).toBe(VALID_BODY.consent_ledger_id);
    expect(insertArg.protocol_version).toBe('tape-v1');
  });

  it('returns 500 when the insert fails', async () => {
    mockInsertError();
    const res = await POST(makePostRequest(VALID_BODY));
    expect(res.status).toBe(500);
    expect(mocks.safeLogError).toHaveBeenCalled();
  });
});
