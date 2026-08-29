import { describe, it, expect, vi, beforeEach } from 'vitest';

// Prompt 231: /api/scan/submit route security tests. Mocks auth, the consent
// gate, height read, and the admin Supabase client (never hits a real DB).

const mocks = vi.hoisted(() => ({
  supabaseGetUser: vi.fn(),
  adminFrom: vi.fn(),
  storageUpload: vi.fn(),
  hasScanConsent: vi.fn(),
  readHeightCm: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth: { getUser: mocks.supabaseGetUser } }),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: mocks.adminFrom,
    storage: { from: () => ({ upload: mocks.storageUpload }) },
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

import { POST } from '@/app/api/scan/submit/route';

const CONSENT_OK = { ok: true, version: '231-scan-v1' };

function buildInsertChain(result: { data: unknown; error: unknown }) {
  const single = vi.fn().mockResolvedValue(result);
  const select = vi.fn().mockReturnValue({ single });
  return { insert: vi.fn().mockReturnValue({ select }) };
}

interface SessionsTableOpts {
  insertResult?: { data: unknown; error: unknown };
  readyResult?: { data: unknown; error: unknown };
}

function buildSessionsTable(opts: SessionsTableOpts = {}) {
  const insertResult = opts.insertResult ?? { data: { id: 'session-1' }, error: null };
  const readyResult = opts.readyResult ?? { data: { capture_status: 'ready' }, error: null };

  const { insert } = buildInsertChain(insertResult);
  const updateCalls: unknown[] = [];
  const update = vi.fn((payload: Record<string, unknown>) => {
    updateCalls.push(payload);
    const isReadyUpdate = payload.capture_status === 'ready';
    const result = isReadyUpdate ? readyResult : { data: { id: 'session-1' }, error: null };
    const single = vi.fn().mockResolvedValue(result);
    const select = vi.fn().mockReturnValue({ single });
    const eq = vi.fn().mockReturnValue({ select });
    return { eq };
  });

  return { insert, update, updateCalls };
}

function buildFramesTable() {
  const insert = vi.fn().mockResolvedValue({ data: null, error: null });
  return { insert };
}

function installAdminMock(opts: {
  sessionsOpts?: SessionsTableOpts;
  frameInsertError?: unknown;
} = {}) {
  const sessions = buildSessionsTable(opts.sessionsOpts);
  const frames = buildFramesTable();
  if (opts.frameInsertError) {
    frames.insert.mockResolvedValue({ data: null, error: opts.frameInsertError });
  }
  mocks.adminFrom.mockImplementation((table: string) => {
    if (table === 'body_photo_sessions') return sessions;
    if (table === 'body_photo_session_frames') return frames;
    throw new Error(`unexpected table ${table}`);
  });
  return { sessions, frames };
}

function buildFrame(view: string, overrides: Record<string, unknown> = {}) {
  return {
    view,
    skipped: false,
    qa: { pass: true, code: 'PASS', message: '', mode: 'weak' },
    capturedWidth: 100,
    capturedHeight: 200,
    capturedAt: '2026-08-28T00:00:00.000Z',
    retryCount: 0,
    ...overrides,
  };
}

function buildRequest(frames: unknown[], blobViews: string[] = ['front', 'right', 'back', 'left']) {
  const form = new FormData();
  form.set('frames', JSON.stringify(frames));
  for (const view of blobViews) {
    form.set(`frame_${view}`, new Blob(['jpeg-bytes'], { type: 'image/jpeg' }), `${view}.jpg`);
  }
  return new Request('http://localhost/api/scan/submit', { method: 'POST', body: form });
}

const FOUR_FRAMES = ['front', 'right', 'back', 'left'].map((v) => buildFrame(v));

beforeEach(() => {
  mocks.supabaseGetUser.mockReset();
  mocks.adminFrom.mockReset();
  mocks.storageUpload.mockReset();
  mocks.storageUpload.mockResolvedValue({ error: null });
  mocks.hasScanConsent.mockReset();
  mocks.hasScanConsent.mockResolvedValue(CONSENT_OK);
  mocks.readHeightCm.mockReset();
  mocks.readHeightCm.mockResolvedValue(null);
});

describe('POST /api/scan/submit', () => {
  it('rejects an unauthenticated request with 401 and never writes', async () => {
    mocks.supabaseGetUser.mockResolvedValue({ data: { user: null } });
    const res = await POST(buildRequest(FOUR_FRAMES) as never);
    expect(res.status).toBe(401);
    expect(mocks.adminFrom).not.toHaveBeenCalled();
  });

  it('rejects when consent has not been given, without writing', async () => {
    mocks.supabaseGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    mocks.hasScanConsent.mockResolvedValue({ ok: false });
    installAdminMock();
    const res = await POST(buildRequest(FOUR_FRAMES) as never);
    const body = await res.json();
    expect(res.status).toBe(403);
    expect(body.ok).toBe(false);
    expect(body.error).toBe('consent_required');
    expect(body.nextAction).toBeTruthy();
    expect(mocks.adminFrom).not.toHaveBeenCalled();
  });

  it('strips client-supplied landmarks from the frame insert when SCAN_PERSIST_LANDMARKS is off', async () => {
    delete process.env.SCAN_PERSIST_LANDMARKS;
    mocks.supabaseGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    const { frames } = installAdminMock();

    const framesWithLandmarks = ['front', 'right', 'back', 'left'].map((v) =>
      buildFrame(v, { landmarks: [{ x: 1, y: 2, z: 3, visibility: 1, presence: 1 }] }),
    );

    const res = await POST(buildRequest(framesWithLandmarks) as never);
    expect(res.status).toBe(200);
    expect(frames.insert).toHaveBeenCalledTimes(1);
    const insertedRows = frames.insert.mock.calls[0][0] as Record<string, unknown>[];
    expect(insertedRows).toHaveLength(4);
    for (const row of insertedRows) {
      expect(row).not.toHaveProperty('landmarks');
    }
  });

  it('includes landmarks in the frame insert when SCAN_PERSIST_LANDMARKS is on', async () => {
    process.env.SCAN_PERSIST_LANDMARKS = 'true';
    try {
      mocks.supabaseGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
      const { frames } = installAdminMock();
      const landmarks = [{ x: 1, y: 2, z: 3, visibility: 1, presence: 1 }];
      const framesWithLandmarks = ['front', 'right', 'back', 'left'].map((v) =>
        buildFrame(v, { landmarks }),
      );
      const res = await POST(buildRequest(framesWithLandmarks) as never);
      expect(res.status).toBe(200);
      const insertedRows = frames.insert.mock.calls[0][0] as Record<string, unknown>[];
      const front = insertedRows.find((r) => r.view === 'front');
      expect(front?.landmarks).toEqual(landmarks);
    } finally {
      delete process.env.SCAN_PERSIST_LANDMARKS;
    }
  });

  it('reports success only after the ready UPDATE confirms', async () => {
    mocks.supabaseGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    installAdminMock({
      sessionsOpts: { readyResult: { data: null, error: { message: 'update failed' } } },
    });
    const res = await POST(buildRequest(FOUR_FRAMES) as never);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(res.status).not.toBe(200);
  });

  it('does not report success when the ready UPDATE resolves without capture_status ready', async () => {
    mocks.supabaseGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    installAdminMock({
      sessionsOpts: { readyResult: { data: { capture_status: 'partial' }, error: null } },
    });
    const res = await POST(buildRequest(FOUR_FRAMES) as never);
    const body = await res.json();
    expect(body.ok).toBe(false);
  });

  it('inserts skipped:true with no upload for a skipped pose', async () => {
    mocks.supabaseGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    const { frames } = installAdminMock();

    const framesWithSkip = [
      buildFrame('front', { skipped: true, capturedWidth: 0, capturedHeight: 0 }),
      buildFrame('right'),
      buildFrame('back'),
      buildFrame('left'),
    ];
    const res = await POST(buildRequest(framesWithSkip, ['right', 'back', 'left']) as never);
    expect(res.status).toBe(200);

    // No upload attempted for the skipped pose's paths.
    expect(mocks.storageUpload).not.toHaveBeenCalledWith(
      expect.stringMatching(/^user-1\/session-1\/front_/),
      expect.anything(),
      expect.anything(),
    );

    const insertedRows = frames.insert.mock.calls[0][0] as Record<string, unknown>[];
    const frontRow = insertedRows.find((r) => r.view === 'front');
    expect(frontRow?.skipped).toBe(true);
    expect(frontRow).not.toHaveProperty('full_path');
    expect(frontRow).not.toHaveProperty('thumb_path');
    expect(frontRow).not.toHaveProperty('image_path');
  });

  it('reports partial (never success) and names the failed pose when an upload fails after retries', async () => {
    mocks.supabaseGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    const { sessions } = installAdminMock();
    mocks.storageUpload.mockImplementation((path: string) =>
      typeof path === 'string' && path.includes('/front_')
        ? Promise.resolve({ error: { message: 'storage unavailable' } })
        : Promise.resolve({ error: null }),
    );

    const res = await POST(buildRequest(FOUR_FRAMES) as never);
    const body = await res.json();

    expect(res.status).toBe(502);
    expect(body.ok).toBe(false);
    expect(body.error).toBe('upload_failed');
    expect(body.failedPoses).toEqual(['front']);
    expect(body.nextAction).toBeTruthy();
    expect(sessions.updateCalls).toContainEqual({ capture_status: 'partial' });
  });

  it('rejects malformed frames payload with 400 and does not write', async () => {
    mocks.supabaseGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    installAdminMock();
    const form = new FormData();
    form.set('frames', 'not-json');
    const req = new Request('http://localhost/api/scan/submit', { method: 'POST', body: form });
    const res = await POST(req as never);
    expect(res.status).toBe(400);
    expect(mocks.adminFrom).not.toHaveBeenCalled();
  });
});
