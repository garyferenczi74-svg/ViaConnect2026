import { describe, it, expect, vi, beforeEach } from 'vitest';

// Prompt 231: /api/scan/finalize route tests (client-direct signed
// uploads). The client has already uploaded bytes directly to
// Storage via prepare's signed upload URLs; finalize takes metadata only
// (JSON, no image bytes) plus the paths reported uploaded, and must verify
// both that the path matches the exact pattern this user/session/pose was
// authorized to write AND that the object actually exists before recording
// it. Mocks auth and the admin Supabase client (never hits a real DB).

const mocks = vi.hoisted(() => ({
  supabaseGetUser: vi.fn(),
  adminFrom: vi.fn(),
  storageExists: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth: { getUser: mocks.supabaseGetUser } }),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: mocks.adminFrom,
    storage: { from: () => ({ exists: mocks.storageExists }) },
  }),
}));

vi.mock('@/lib/utils/safe-log', () => ({
  safeLog: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock('@/lib/utils/inMemoryRateLimit', () => ({
  inMemoryRateLimit: () => true,
}));

vi.mock('@/lib/formavision/meshy/startMeshyForReadySession', () => ({
  startMeshyForReadySession: vi.fn().mockResolvedValue(undefined),
}));

import { POST } from '@/app/api/scan/finalize/route';

const SESSION_ID = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
const USER_ID = 'user-1';
const TS = 1700000000000;

function fullPath(pose: string) {
  return `${USER_ID}/${SESSION_ID}/${pose}_full_${TS}.jpg`;
}
function thumbPath(pose: string) {
  return `${USER_ID}/${SESSION_ID}/${pose}_thumb_${TS}.jpg`;
}

function buildFramesTable(result: { data: unknown; error: unknown }) {
  return { upsert: vi.fn().mockResolvedValue(result) };
}

interface SessionsTableOpts {
  readyResult?: { data: unknown; error: unknown };
  ownerUserId?: string;
}

function buildSessionsTable(opts: SessionsTableOpts = {}) {
  const ownerUserId = opts.ownerUserId ?? USER_ID;
  const readyResult = opts.readyResult ?? { data: { capture_status: 'ready' }, error: null };
  const updateCalls: unknown[] = [];

  const select = vi.fn(() => {
    const filters: Record<string, unknown> = {};
    const chain = {
      eq: vi.fn((col: string, val: unknown) => {
        filters[col] = val;
        return chain;
      }),
      maybeSingle: vi.fn(() =>
        Promise.resolve(
          filters.id === SESSION_ID && filters.user_id === ownerUserId
            ? { data: { id: SESSION_ID }, error: null }
            : { data: null, error: null },
        ),
      ),
    };
    return chain;
  });

  const update = vi.fn((payload: Record<string, unknown>) => {
    updateCalls.push(payload);
    const isReadyUpdate = payload.capture_status === 'ready';
    const result = isReadyUpdate ? readyResult : { data: { id: SESSION_ID }, error: null };
    const single = vi.fn().mockResolvedValue(result);
    const select2 = vi.fn().mockReturnValue({ single });
    const eq2 = vi.fn().mockReturnValue({ select: select2 });
    const eq1 = vi.fn().mockReturnValue({ eq: eq2 });
    return { eq: eq1 };
  });

  return { select, update, updateCalls };
}

function installAdminMock(opts: { sessionsOpts?: SessionsTableOpts; frameInsertError?: unknown } = {}) {
  const sessions = buildSessionsTable(opts.sessionsOpts);
  const frames = buildFramesTable({ data: null, error: opts.frameInsertError ?? null });
  mocks.adminFrom.mockImplementation((table: string) => {
    if (table === 'body_photo_sessions') return sessions;
    if (table === 'body_photo_session_frames') return frames;
    throw new Error(`unexpected table ${table}`);
  });
  return { sessions, frames };
}

function buildFrame(view: string, overrides: Record<string, unknown> = {}) {
  const skipped = Boolean(overrides.skipped);
  return {
    view,
    skipped,
    qa: { pass: true, code: 'PASS', message: '', mode: 'weak' },
    capturedWidth: 100,
    capturedHeight: 200,
    capturedAt: '2026-08-28T00:00:00.000Z',
    retryCount: 0,
    paths: skipped ? null : { full: fullPath(view), thumb: thumbPath(view) },
    ...overrides,
  };
}

const FOUR_FRAMES = ['front', 'right', 'back', 'left'].map((v) => buildFrame(v));

function buildRequest(body: Record<string, unknown>) {
  return new Request('http://localhost/api/scan/finalize', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  mocks.supabaseGetUser.mockReset();
  mocks.adminFrom.mockReset();
  mocks.storageExists.mockReset();
  mocks.storageExists.mockResolvedValue({ data: true, error: null });
});

describe('POST /api/scan/finalize', () => {
  it('rejects an unauthenticated request with 401 and never writes', async () => {
    mocks.supabaseGetUser.mockResolvedValue({ data: { user: null } });
    const res = await POST(buildRequest({ sessionId: SESSION_ID, frames: FOUR_FRAMES }) as never);
    expect(res.status).toBe(401);
    expect(mocks.adminFrom).not.toHaveBeenCalled();
  });

  it('rejects a non-uuid sessionId with 400', async () => {
    mocks.supabaseGetUser.mockResolvedValue({ data: { user: { id: USER_ID } } });
    installAdminMock();
    const res = await POST(buildRequest({ sessionId: 'not-a-uuid', frames: FOUR_FRAMES }) as never);
    expect(res.status).toBe(400);
  });

  it('a second user cannot finalize another user\'s session (404, no write)', async () => {
    mocks.supabaseGetUser.mockResolvedValue({ data: { user: { id: 'attacker-user' } } });
    installAdminMock({ sessionsOpts: { ownerUserId: USER_ID } });
    const res = await POST(buildRequest({ sessionId: SESSION_ID, frames: FOUR_FRAMES }) as never);
    const body = await res.json();
    expect(res.status).toBe(404);
    expect(body.ok).toBe(false);
    expect(mocks.storageExists).not.toHaveBeenCalled();
  });

  it('reports success only after the ready UPDATE confirms', async () => {
    mocks.supabaseGetUser.mockResolvedValue({ data: { user: { id: USER_ID } } });
    installAdminMock({ sessionsOpts: { readyResult: { data: null, error: { message: 'update failed' } } } });
    const res = await POST(buildRequest({ sessionId: SESSION_ID, frames: FOUR_FRAMES }) as never);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(res.status).not.toBe(200);
  });

  it('does not report success when the ready UPDATE resolves without capture_status ready', async () => {
    mocks.supabaseGetUser.mockResolvedValue({ data: { user: { id: USER_ID } } });
    installAdminMock({ sessionsOpts: { readyResult: { data: { capture_status: 'partial' }, error: null } } });
    const res = await POST(buildRequest({ sessionId: SESSION_ID, frames: FOUR_FRAMES }) as never);
    const body = await res.json();
    expect(body.ok).toBe(false);
  });

  it('strips client-supplied landmarks from the frame insert when SCAN_PERSIST_LANDMARKS is off', async () => {
    delete process.env.SCAN_PERSIST_LANDMARKS;
    mocks.supabaseGetUser.mockResolvedValue({ data: { user: { id: USER_ID } } });
    const { frames } = installAdminMock();
    const framesWithLandmarks = ['front', 'right', 'back', 'left'].map((v) =>
      buildFrame(v, { landmarks: [{ x: 1, y: 2, z: 3, visibility: 1, presence: 1 }] }),
    );
    const res = await POST(buildRequest({ sessionId: SESSION_ID, frames: framesWithLandmarks }) as never);
    expect(res.status).toBe(200);
    const insertedRows = frames.upsert.mock.calls[0][0] as Record<string, unknown>[];
    expect(insertedRows).toHaveLength(4);
    for (const row of insertedRows) {
      expect(row).not.toHaveProperty('landmarks');
    }
  });

  it('includes landmarks in the frame insert when SCAN_PERSIST_LANDMARKS is on', async () => {
    process.env.SCAN_PERSIST_LANDMARKS = 'true';
    try {
      mocks.supabaseGetUser.mockResolvedValue({ data: { user: { id: USER_ID } } });
      const { frames } = installAdminMock();
      const landmarks = [{ x: 1, y: 2, z: 3, visibility: 1, presence: 1 }];
      const framesWithLandmarks = ['front', 'right', 'back', 'left'].map((v) =>
        buildFrame(v, { landmarks }),
      );
      const res = await POST(buildRequest({ sessionId: SESSION_ID, frames: framesWithLandmarks }) as never);
      expect(res.status).toBe(200);
      const insertedRows = frames.upsert.mock.calls[0][0] as Record<string, unknown>[];
      const front = insertedRows.find((r) => r.view === 'front');
      expect(front?.landmarks).toEqual(landmarks);
    } finally {
      delete process.env.SCAN_PERSIST_LANDMARKS;
    }
  });

  it('inserts skipped:true with no path lookup for a skipped pose', async () => {
    mocks.supabaseGetUser.mockResolvedValue({ data: { user: { id: USER_ID } } });
    const { frames } = installAdminMock();
    const framesWithSkip = [
      buildFrame('front', { skipped: true, capturedWidth: 0, capturedHeight: 0, paths: null }),
      buildFrame('right'),
      buildFrame('back'),
      buildFrame('left'),
    ];
    const res = await POST(buildRequest({ sessionId: SESSION_ID, frames: framesWithSkip }) as never);
    expect(res.status).toBe(200);
    expect(mocks.storageExists).not.toHaveBeenCalledWith(expect.stringContaining('front_'));
    const insertedRows = frames.upsert.mock.calls[0][0] as Record<string, unknown>[];
    const frontRow = insertedRows.find((r) => r.view === 'front');
    expect(frontRow?.skipped).toBe(true);
    expect(frontRow).not.toHaveProperty('full_path');
    expect(frontRow).not.toHaveProperty('thumb_path');
    expect(frontRow).not.toHaveProperty('image_path');
  });

  it('reports partial (never success) and names the pose when a reported object is missing from storage', async () => {
    mocks.supabaseGetUser.mockResolvedValue({ data: { user: { id: USER_ID } } });
    const { sessions } = installAdminMock();
    mocks.storageExists.mockImplementation((path: string) =>
      Promise.resolve(path.includes('/front_') ? { data: false, error: null } : { data: true, error: null }),
    );
    const res = await POST(buildRequest({ sessionId: SESSION_ID, frames: FOUR_FRAMES }) as never);
    const body = await res.json();
    expect(res.status).toBe(422);
    expect(body.ok).toBe(false);
    expect(body.error).toBe('incomplete_upload');
    expect(body.failedPoses).toEqual(['front']);
    expect(body.nextAction).toBeTruthy();
    expect(sessions.updateCalls).toContainEqual({ capture_status: 'partial' });
  });

  it('rejects a reported path that does not match this user/session/pose pattern and never writes it to the session', async () => {
    mocks.supabaseGetUser.mockResolvedValue({ data: { user: { id: USER_ID } } });
    const { sessions } = installAdminMock();
    const framesWithForeignPath = [
      buildFrame('front', {
        paths: {
          full: `attacker-user/other-session/front_full_${TS}.jpg`,
          thumb: thumbPath('front'),
        },
      }),
      buildFrame('right'),
      buildFrame('back'),
      buildFrame('left'),
    ];
    const res = await POST(buildRequest({ sessionId: SESSION_ID, frames: framesWithForeignPath }) as never);
    const body = await res.json();
    expect(res.status).toBe(422);
    expect(body.failedPoses).toEqual(['front']);
    // The foreign path is never even stat'd, let alone written to the column.
    expect(mocks.storageExists).not.toHaveBeenCalledWith(
      `attacker-user/other-session/front_full_${TS}.jpg`,
    );
    const pathPatchCalls = sessions.updateCalls.filter(
      (c) => !(c as Record<string, unknown>).capture_status,
    ) as Record<string, unknown>[];
    for (const call of pathPatchCalls) {
      expect(call).not.toHaveProperty('front_full_path');
    }
  });

  it('a retried finalize for the same session upserts frame rows instead of failing on the UNIQUE(session_id, view) constraint', async () => {
    mocks.supabaseGetUser.mockResolvedValue({ data: { user: { id: USER_ID } } });
    const { frames } = installAdminMock();

    const first = await POST(buildRequest({ sessionId: SESSION_ID, frames: FOUR_FRAMES }) as never);
    expect(first.status).toBe(200);

    const second = await POST(buildRequest({ sessionId: SESSION_ID, frames: FOUR_FRAMES }) as never);
    const secondBody = await second.json();
    expect(second.status).toBe(200);
    expect(secondBody.ok).toBe(true);

    // Frame rows are written via upsert (onConflict session_id,view), never
    // a bare insert that would 500 on the second call.
    expect(frames.upsert).toHaveBeenCalledTimes(2);
  });

  it('rejects malformed frames payload with 400 and does not write', async () => {
    mocks.supabaseGetUser.mockResolvedValue({ data: { user: { id: USER_ID } } });
    installAdminMock();
    const res = await POST(buildRequest({ sessionId: SESSION_ID, frames: 'not-an-array' }) as never);
    expect(res.status).toBe(400);
    expect(mocks.adminFrom).not.toHaveBeenCalled();
  });
});
