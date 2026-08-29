import { describe, it, expect, vi, beforeEach } from 'vitest';

// Prompt 231: /api/scan/prepare route tests. Client-direct signed-upload
// flow (Task 16a): this route never receives image bytes. It idempotently
// creates (or returns) the body_photo_sessions row keyed by a
// client-supplied scanId, then mints signed UPLOAD URLs for each
// non-skipped pose. Mocks auth, consent gate, height read, and the admin
// Supabase client (never hits a real DB).

const mocks = vi.hoisted(() => ({
  supabaseGetUser: vi.fn(),
  adminFrom: vi.fn(),
  createSignedUploadUrl: vi.fn(),
  hasScanConsent: vi.fn(),
  readHeightCm: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth: { getUser: mocks.supabaseGetUser } }),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: mocks.adminFrom,
    storage: { from: () => ({ createSignedUploadUrl: mocks.createSignedUploadUrl }) },
  }),
}));

vi.mock('@/lib/scan/scanConsentGate', () => ({
  hasScanConsent: mocks.hasScanConsent,
}));

vi.mock('@/lib/scan/readHeightCm', () => ({
  readHeightCm: mocks.readHeightCm,
}));

vi.mock('@/lib/utils/safe-log', () => ({
  safeLog: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock('@/lib/utils/inMemoryRateLimit', () => ({
  inMemoryRateLimit: () => true,
}));

import { POST } from '@/app/api/scan/prepare/route';

const CONSENT_OK = { ok: true, version: '231-scan-v1' };
const SCAN_ID = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';

const FULL_POSES = [
  { pose: 'front', skipped: false },
  { pose: 'right', skipped: false },
  { pose: 'back', skipped: false },
  { pose: 'left', skipped: false },
];

/**
 * Models a persistent store keyed by scanId so idempotency and cross-user
 * collision can be exercised: upsert "creates" a row only if none exists for
 * that id (ON CONFLICT (id) DO NOTHING semantics never error); the
 * ownership-scoped select only ever resolves a row that matches BOTH id and
 * user_id.
 */
function installSessionsStore() {
  const store = new Map<string, { id: string; user_id: string }>();
  const upsert = vi.fn((row: Record<string, unknown>) => {
    const id = row.id as string;
    if (!store.has(id)) {
      store.set(id, { id, user_id: row.user_id as string });
    }
    return Promise.resolve({ data: null, error: null });
  });
  const select = vi.fn(() => {
    const filters: Record<string, unknown> = {};
    const chain = {
      eq: vi.fn((col: string, val: unknown) => {
        filters[col] = val;
        return chain;
      }),
      maybeSingle: vi.fn(() => {
        const row = store.get(filters.id as string);
        if (row && row.user_id === filters.user_id) {
          return Promise.resolve({ data: { id: row.id }, error: null });
        }
        return Promise.resolve({ data: null, error: null });
      }),
    };
    return chain;
  });
  mocks.adminFrom.mockImplementation((table: string) => {
    if (table === 'body_photo_sessions') return { upsert, select };
    throw new Error(`unexpected table ${table}`);
  });
  return { upsert, select, store };
}

function buildRequest(body: Record<string, unknown>) {
  return new Request('http://localhost/api/scan/prepare', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  mocks.supabaseGetUser.mockReset();
  mocks.adminFrom.mockReset();
  mocks.createSignedUploadUrl.mockReset();
  mocks.createSignedUploadUrl.mockImplementation((path: string) =>
    Promise.resolve({ data: { signedUrl: `https://signed.example/${path}`, token: `token-${path}`, path }, error: null }),
  );
  mocks.hasScanConsent.mockReset();
  mocks.hasScanConsent.mockResolvedValue(CONSENT_OK);
  mocks.readHeightCm.mockReset();
  mocks.readHeightCm.mockResolvedValue(null);
});

describe('POST /api/scan/prepare', () => {
  it('rejects an unauthenticated request with 401 and never writes', async () => {
    mocks.supabaseGetUser.mockResolvedValue({ data: { user: null } });
    const res = await POST(buildRequest({ scanId: SCAN_ID, poses: FULL_POSES }) as never);
    expect(res.status).toBe(401);
    expect(mocks.adminFrom).not.toHaveBeenCalled();
  });

  it('rejects when consent has not been given, without writing', async () => {
    mocks.supabaseGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    mocks.hasScanConsent.mockResolvedValue({ ok: false });
    installSessionsStore();
    const res = await POST(buildRequest({ scanId: SCAN_ID, poses: FULL_POSES }) as never);
    const body = await res.json();
    expect(res.status).toBe(403);
    expect(body.ok).toBe(false);
    expect(body.error).toBe('consent_required');
    expect(body.nextAction).toBeTruthy();
    expect(mocks.adminFrom).not.toHaveBeenCalled();
  });

  it('rejects a non-uuid scanId with 400 and never writes', async () => {
    mocks.supabaseGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    installSessionsStore();
    const res = await POST(buildRequest({ scanId: '../not-a-uuid', poses: FULL_POSES }) as never);
    expect(res.status).toBe(400);
    expect(mocks.adminFrom).not.toHaveBeenCalled();
  });

  it('rejects malformed poses payload with 400 and does not write', async () => {
    mocks.supabaseGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    installSessionsStore();
    const res = await POST(
      buildRequest({ scanId: SCAN_ID, poses: [{ pose: 'front', skipped: false }] }) as never,
    );
    expect(res.status).toBe(400);
    expect(mocks.adminFrom).not.toHaveBeenCalled();
  });

  it('is idempotent: a retried prepare with the same scanId returns the same session', async () => {
    mocks.supabaseGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    const { upsert, store } = installSessionsStore();

    const first = await POST(buildRequest({ scanId: SCAN_ID, poses: FULL_POSES }) as never);
    const firstBody = await first.json();
    expect(firstBody.ok).toBe(true);
    expect(firstBody.sessionId).toBe(SCAN_ID);
    expect(store.size).toBe(1);

    const second = await POST(buildRequest({ scanId: SCAN_ID, poses: FULL_POSES }) as never);
    const secondBody = await second.json();
    expect(secondBody.ok).toBe(true);
    expect(secondBody.sessionId).toBe(SCAN_ID);

    // Both attempts call upsert (ON CONFLICT DO NOTHING never errors on a
    // repeat), but the store never accumulates a second row for the id.
    expect(upsert).toHaveBeenCalledTimes(2);
    expect(store.size).toBe(1);
  });

  it('rejects a scanId that already belongs to another user (cannot hijack)', async () => {
    const { store } = installSessionsStore();
    store.set(SCAN_ID, { id: SCAN_ID, user_id: 'owner-user' });

    mocks.supabaseGetUser.mockResolvedValue({ data: { user: { id: 'attacker-user' } } });
    const res = await POST(buildRequest({ scanId: SCAN_ID, poses: FULL_POSES }) as never);
    const body = await res.json();

    expect(res.status).toBe(409);
    expect(body.ok).toBe(false);
    expect(body.error).toBe('session_conflict');
    expect(mocks.createSignedUploadUrl).not.toHaveBeenCalled();
    // The attacker's row is never recorded as their own.
    expect(store.get(SCAN_ID)?.user_id).toBe('owner-user');
  });

  it('returns signed upload URLs only for non-skipped poses', async () => {
    mocks.supabaseGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    installSessionsStore();
    const poses = [
      { pose: 'front', skipped: true },
      { pose: 'right', skipped: false },
      { pose: 'back', skipped: false },
      { pose: 'left', skipped: false },
    ];
    const res = await POST(buildRequest({ scanId: SCAN_ID, poses }) as never);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.uploads).toHaveLength(3);
    expect(body.uploads.some((u: { pose: string }) => u.pose === 'front')).toBe(false);
    for (const upload of body.uploads) {
      expect(upload.full.path).toContain(`user-1/${SCAN_ID}/${upload.pose}_full_`);
      expect(upload.thumb.path).toContain(`user-1/${SCAN_ID}/${upload.pose}_thumb_`);
      expect(typeof upload.full.token).toBe('string');
      expect(typeof upload.thumb.token).toBe('string');
    }
  });

  it('device_info carries UA family only, no raw UA string and no platform', async () => {
    mocks.supabaseGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    const { upsert } = installSessionsStore();
    const req = new Request('http://localhost/api/scan/prepare', {
      method: 'POST',
      body: JSON.stringify({ scanId: SCAN_ID, poses: FULL_POSES }),
      headers: { 'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0) AppleWebKit/605.1.15 Safari/604.1' },
    });
    await POST(req as never);
    const row = upsert.mock.calls[0][0] as Record<string, unknown>;
    expect(row.device_info).toEqual({ family: 'Safari' });
    expect(Object.keys(row.device_info as Record<string, unknown>)).toEqual(['family']);
  });
});
