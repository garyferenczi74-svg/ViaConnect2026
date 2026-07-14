/**
 * Prompt 211b Workstream 1B: contract tests for /api/admin/cohort/validation-runs.
 *
 * Contract:
 *   POST - research-admin gated. Wires the real cohortLoader -> runValidation ->
 *          runAndPersist pipeline (none of those pure modules are mocked here,
 *          only the Supabase admin client is), persists the report, then
 *          responds with the claim-gated state ONLY -- never the raw report
 *          or a bare number. A freshly-inserted run always has
 *          gary_signed_off = false in the DB, so the gate must read 'closed'
 *          on the very next read after a trigger.
 *   GET  - research-admin gated. Reads the gated state without triggering a
 *          new run.
 *
 * HARD RULE under test: no response body ever contains an accuracy number
 * unless gate.status === 'open' (held_out_pass && gary_signed_off both true
 * on the row actually stored).
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

// cohortLoader, runValidation, runAndPersist and cohortClaimGate are
// deliberately NOT mocked: the point of these tests is to prove the real
// wiring cohortLoader -> runValidation -> runAndPersist -> claim gate.
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

function makePostRequest(body: unknown = { notes: null }): NextRequest {
  return new NextRequest('http://localhost/api/admin/cohort/validation-runs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

interface SetupOpts {
  measurementRows?: unknown[];
  measurementError?: { message: string } | null;
  insertedId?: string;
  insertError?: { message: string } | null;
  latestRun?: unknown;
  latestError?: { message: string } | null;
}

function setupAdminMocks(opts: SetupOpts = {}) {
  const {
    measurementRows = [],
    measurementError = null,
    insertedId = 'run-1',
    insertError = null,
    latestRun = null,
    latestError = null,
  } = opts;

  const measurementsSelect = vi.fn().mockResolvedValue({ data: measurementRows, error: measurementError });

  const insertSingle = vi.fn().mockResolvedValue(
    insertError ? { data: null, error: insertError } : { data: { id: insertedId }, error: null },
  );
  const insertSelect = vi.fn().mockReturnValue({ single: insertSingle });
  const insert = vi.fn().mockReturnValue({ select: insertSelect });

  const maybeSingle = vi.fn().mockResolvedValue({ data: latestRun, error: latestError });
  const limit = vi.fn().mockReturnValue({ maybeSingle });
  const order = vi.fn().mockReturnValue({ limit });
  const runsSelect = vi.fn().mockReturnValue({ order });

  mocks.adminFrom.mockImplementation((table: string) => {
    if (table === 'cohort_labeled_measurements') return { select: measurementsSelect };
    if (table === 'cohort_validation_runs') return { insert, select: runsSelect };
    throw new Error(`unexpected table: ${table}`);
  });

  return { measurementsSelect, insert, insertSelect, insertSingle, runsSelect, order, limit, maybeSingle };
}

// ---------------------------------------------------------------------------
// POST: auth
// ---------------------------------------------------------------------------

describe('POST /api/admin/cohort/validation-runs: auth', () => {
  it('returns 401 when unauthenticated', async () => {
    makeError(401);
    const res = await POST(makePostRequest());
    expect(res.status).toBe(401);
    expect(mocks.adminFrom).not.toHaveBeenCalled();
  });

  it('returns 403 when caller lacks a research role', async () => {
    makeError(403);
    const res = await POST(makePostRequest());
    expect(res.status).toBe(403);
    expect(mocks.adminFrom).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// POST: wiring -- cohortLoader -> runValidation -> runAndPersist
// ---------------------------------------------------------------------------

describe('POST /api/admin/cohort/validation-runs: wiring', () => {
  beforeEach(() => makeOk('admin-9', 'researcher'));

  it('loads measurements, runs the harness, persists the run, and returns the gated state', async () => {
    const rows = [
      { id: 'm-1', subject_id: 's-1', region: 'waist', predicted_cm: 80, truth_cm: 81, cohort_subjects: { sex: 'female' } },
      { id: 'm-2', subject_id: 's-1', region: 'hip', predicted_cm: 100, truth_cm: 99, cohort_subjects: { sex: 'female' } },
    ];
    const { measurementsSelect, insert } = setupAdminMocks({
      measurementRows: rows,
      // The gate read after insert sees a fresh row: gary_signed_off is
      // always false immediately after a trigger.
      latestRun: {
        id: 'run-1', run_at: '2026-07-13T00:00:00Z', calibration_version: 'v1-uncalibrated-2026-06',
        report: {}, held_out_pass: false, gary_signed_off: false,
      },
    });

    const res = await POST(makePostRequest());

    expect(res.status).toBe(201);
    const body = await res.json();

    // fetchMeasurements was wired to the real cohortLoader / runValidation path.
    expect(measurementsSelect).toHaveBeenCalled();
    expect(body.totalSamples).toBe(2);
    expect(body.skippedRows).toBe(0);
    expect(body.runId).toBe('run-1');

    // insertValidationRun received a real ValidationReport shape.
    expect(insert).toHaveBeenCalledTimes(1);
    const insertArg = insert.mock.calls[0][0];
    expect(insertArg).toHaveProperty('report');
    expect(insertArg).toHaveProperty('held_out_pass');
    expect(insertArg).toHaveProperty('calibration_version');
    expect(typeof insertArg.run_at).toBe('string');

    // HARD RULE: the response carries the gated state, not the raw report.
    expect(body.gate.status).toBe('closed');
    expect(body.gate.accuracyClaim).toBe('unproven');
    expect(body).not.toHaveProperty('report');
  });

  it('never surfaces a number when the freshly-persisted run has gary_signed_off=false, even if held_out_pass is true', async () => {
    setupAdminMocks({
      measurementRows: [],
      latestRun: {
        id: 'run-2', run_at: '2026-07-13T00:00:00Z', calibration_version: 'v1-uncalibrated-2026-06',
        report: {}, held_out_pass: true, gary_signed_off: false,
      },
    });

    const res = await POST(makePostRequest());
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.gate.status).toBe('closed');
    expect(body.gate.reason).toBe('pending_sign_off');
    expect(JSON.stringify(body)).not.toMatch(/"accuracyClaim":"proven"/);
  });

  it('handles an empty labeled set honestly (0 samples, held_out_pass false)', async () => {
    setupAdminMocks({ measurementRows: [], latestRun: null });

    const res = await POST(makePostRequest());
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.totalSamples).toBe(0);
    expect(body.gate.status).toBe('closed');
    expect(body.gate.reason).toBe('no_run');
  });

  it('returns 500 when a labeled row has an invalid region (data-integrity guard)', async () => {
    setupAdminMocks({
      measurementRows: [
        { id: 'm-bad', subject_id: 's-1', region: 'bicep', predicted_cm: 30, truth_cm: 31, cohort_subjects: null },
      ],
    });

    const res = await POST(makePostRequest());
    expect(res.status).toBe(500);
    expect(mocks.safeLogError).toHaveBeenCalled();
  });

  it('returns 500 when persisting the run fails', async () => {
    setupAdminMocks({ measurementRows: [], insertError: { message: 'db down' } });

    const res = await POST(makePostRequest());
    expect(res.status).toBe(500);
    expect(mocks.safeLogError).toHaveBeenCalled();
  });

  it('accepts a missing/empty request body (notes optional)', async () => {
    setupAdminMocks({ measurementRows: [], latestRun: null });
    const req = new NextRequest('http://localhost/api/admin/cohort/validation-runs', { method: 'POST' });

    const res = await POST(req);
    expect(res.status).toBe(201);
  });
});

// ---------------------------------------------------------------------------
// GET: auth
// ---------------------------------------------------------------------------

describe('GET /api/admin/cohort/validation-runs: auth', () => {
  it('returns 401 when unauthenticated', async () => {
    makeError(401);
    const res = await GET();
    expect(res.status).toBe(401);
    expect(mocks.adminFrom).not.toHaveBeenCalled();
  });

  it('returns 403 when caller lacks a research role', async () => {
    makeError(403);
    const res = await GET();
    expect(res.status).toBe(403);
  });
});

// ---------------------------------------------------------------------------
// GET: gated read, no run triggered
// ---------------------------------------------------------------------------

describe('GET /api/admin/cohort/validation-runs: gated read', () => {
  beforeEach(() => makeOk());

  it('returns closed/no_run when no validation run exists yet', async () => {
    setupAdminMocks({ latestRun: null });
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.gate.status).toBe('closed');
    expect(body.gate.reason).toBe('no_run');
    // No insert call should ever happen on a GET.
  });

  it('opens the gate only when held_out_pass AND gary_signed_off are both true on the stored row', async () => {
    setupAdminMocks({
      latestRun: {
        id: 'run-signed', run_at: '2026-08-01T00:00:00Z', calibration_version: 'v1-uncalibrated-2026-06',
        report: { heldOutPerRegion: {}, cohortStatus: 'proven' }, held_out_pass: true, gary_signed_off: true,
      },
    });
    const res = await GET();
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.gate.status).toBe('open');
    expect(body.gate.accuracyClaim).toBe('proven');
    expect(body.gate.runId).toBe('run-signed');
  });

  it('stays closed when held_out_pass is true but gary_signed_off is false', async () => {
    setupAdminMocks({
      latestRun: {
        id: 'run-unsigned', run_at: '2026-08-01T00:00:00Z', calibration_version: 'v1-uncalibrated-2026-06',
        report: {}, held_out_pass: true, gary_signed_off: false,
      },
    });
    const res = await GET();
    const body = await res.json();
    expect(body.gate.status).toBe('closed');
    expect(body.gate.reason).toBe('pending_sign_off');
  });
});
