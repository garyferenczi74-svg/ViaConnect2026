import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const mocks = vi.hoisted(() => ({
  supabaseGetUser: vi.fn(),
  adminFrom: vi.fn(),
  storageRemove: vi.fn(),
  storageList: vi.fn(),
  startMeshy: vi.fn(),
  startTripo: vi.fn(),
  rateLimit: vi.fn(() => true),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth: { getUser: mocks.supabaseGetUser } }),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: mocks.adminFrom,
    storage: { from: () => ({ remove: mocks.storageRemove, list: mocks.storageList }) },
  }),
}));

vi.mock('@/lib/utils/safe-log', () => ({
  safeLog: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock('@/lib/utils/inMemoryRateLimit', () => ({
  inMemoryRateLimit: (...args: unknown[]) => mocks.rateLimit(...args),
}));

vi.mock('@/lib/formavision/meshy/startMeshyForReadySession', () => ({
  startMeshyForReadySession: mocks.startMeshy,
}));

vi.mock('@/lib/formavision/tripo/startTripoForReadySession', () => ({
  startTripoForReadySession: mocks.startTripo,
}));

import { POST } from '@/app/api/formavision/retain-frbl/route';

const USER_ID = 'owner-user';
const PHOTO_SCAN_ID = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
const SESSION_ID = '11111111-2222-4333-8444-555555555555';

const SESSION_ROW = {
  id: SESSION_ID,
  user_id: USER_ID,
  front_full_path: `${USER_ID}/${SESSION_ID}/front_full_1.jpg`,
  front_thumb_path: `${USER_ID}/${SESSION_ID}/front_thumb_1.jpg`,
  right_full_path: `${USER_ID}/${SESSION_ID}/right_full_1.jpg`,
  right_thumb_path: `${USER_ID}/${SESSION_ID}/right_thumb_1.jpg`,
  back_full_path: `${USER_ID}/${SESSION_ID}/back_full_1.jpg`,
  back_thumb_path: `${USER_ID}/${SESSION_ID}/back_thumb_1.jpg`,
  left_full_path: `${USER_ID}/${SESSION_ID}/left_full_1.jpg`,
  left_thumb_path: `${USER_ID}/${SESSION_ID}/left_thumb_1.jpg`,
};

interface InstallOpts {
  ownerUserId?: string;
  scan?: { id: string; photos_retained: boolean | null; photo_session_id: string | null };
  sessionRow?: typeof SESSION_ROW | null;
  sessionLookupError?: { message: string } | null;
  scanUpdateError?: { message: string } | null;
  sessionUpdateError?: { message: string } | null;
}

function installTables(opts: InstallOpts = {}) {
  const ownerUserId = opts.ownerUserId ?? USER_ID;
  const scan = opts.scan ?? {
    id: PHOTO_SCAN_ID,
    photos_retained: true,
    photo_session_id: SESSION_ID,
  };
  const scanUpdates: Record<string, unknown>[] = [];
  const sessionUpdates: Record<string, unknown>[] = [];
  const sessionDeletes: number[] = [];

  const photoScansTable = {
    select: vi.fn(() => {
      const filters: Record<string, unknown> = {};
      const chain = {
        eq: vi.fn((col: string, val: unknown) => {
          filters[col] = val;
          return chain;
        }),
        maybeSingle: vi.fn(() =>
          Promise.resolve(
            filters.id === scan.id && filters.user_id === ownerUserId
              ? { data: scan, error: null }
              : { data: null, error: null },
          ),
        ),
      };
      return chain;
    }),
    update: vi.fn((payload: Record<string, unknown>) => {
      scanUpdates.push(payload);
      return {
        eq: vi.fn(() => ({
          eq: vi.fn(() =>
            Promise.resolve(opts.scanUpdateError ? { error: opts.scanUpdateError } : { error: null }),
          ),
        })),
      };
    }),
  };

  const sessionsTable = {
    select: vi.fn(() => {
      const filters: Record<string, unknown> = {};
      const chain = {
        eq: vi.fn((col: string, val: unknown) => {
          filters[col] = val;
          return chain;
        }),
        maybeSingle: vi.fn(() =>
          Promise.resolve(
            opts.sessionLookupError
              ? { data: null, error: opts.sessionLookupError }
              : filters.id === SESSION_ID && filters.user_id === ownerUserId
                ? { data: opts.sessionRow === undefined ? SESSION_ROW : opts.sessionRow, error: null }
                : { data: null, error: null },
          ),
        ),
      };
      return chain;
    }),
    update: vi.fn((payload: Record<string, unknown>) => {
      sessionUpdates.push(payload);
      return {
        eq: vi.fn(() => ({
          eq: vi.fn(() =>
            Promise.resolve(
              opts.sessionUpdateError ? { error: opts.sessionUpdateError } : { error: null },
            ),
          ),
        })),
      };
    }),
    delete: vi.fn(() => {
      sessionDeletes.push(1);
      return { eq: vi.fn(() => ({ eq: vi.fn() })) };
    }),
    insert: vi.fn(),
  };

  mocks.adminFrom.mockImplementation((tableName: string) => {
    if (tableName === 'body_tracker_photo_scans') return photoScansTable;
    if (tableName === 'body_photo_sessions') return sessionsTable;
    throw new Error(`unexpected table ${tableName}`);
  });

  return { photoScansTable, sessionsTable, scanUpdates, sessionUpdates, sessionDeletes };
}

function buildRequest(body: Record<string, unknown>) {
  return new Request('http://localhost/api/formavision/retain-frbl', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  mocks.supabaseGetUser.mockReset();
  mocks.adminFrom.mockReset();
  mocks.storageRemove.mockReset();
  mocks.storageRemove.mockResolvedValue({ error: null });
  mocks.storageList.mockReset();
  mocks.storageList.mockResolvedValue({
    data: [
      { name: 'front_full_1.jpg' },
      { name: 'front_thumb_1.jpg' },
      { name: 'meshy', id: null, metadata: null },
    ],
    error: null,
  });
  mocks.startMeshy.mockReset();
  mocks.startTripo.mockReset();
  mocks.rateLimit.mockReset();
  mocks.rateLimit.mockReturnValue(true);
});

describe('POST /api/formavision/retain-frbl action=discard', () => {
  it('rejects an unauthenticated request with 401', async () => {
    mocks.supabaseGetUser.mockResolvedValue({ data: { user: null } });
    const res = await POST(buildRequest({ action: 'discard', photoScanId: PHOTO_SCAN_ID }));
    expect(res.status).toBe(401);
  });

  it('rejects a non-UUID photoScanId with 400', async () => {
    mocks.supabaseGetUser.mockResolvedValue({ data: { user: { id: USER_ID } } });
    const res = await POST(buildRequest({ action: 'discard', photoScanId: 'photo-1' }));
    expect(res.status).toBe(400);
  });

  it('rate-limits the same retain-frbl key', async () => {
    mocks.supabaseGetUser.mockResolvedValue({ data: { user: { id: USER_ID } } });
    mocks.rateLimit.mockReturnValue(false);
    const res = await POST(buildRequest({ action: 'discard', photoScanId: PHOTO_SCAN_ID }));
    expect(res.status).toBe(429);
    expect(mocks.rateLimit).toHaveBeenCalledWith(`formavision-retain-frbl:${USER_ID}`, 8, 60_000);
  });

  it('returns 404 when the photo scan is not owned', async () => {
    mocks.supabaseGetUser.mockResolvedValue({ data: { user: { id: 'attacker-user' } } });
    installTables({ ownerUserId: USER_ID });
    const res = await POST(buildRequest({ action: 'discard', photoScanId: PHOTO_SCAN_ID }));
    expect(res.status).toBe(404);
    expect(mocks.storageList).not.toHaveBeenCalled();
    expect(mocks.storageRemove).not.toHaveBeenCalled();
  });

  it('is idempotent when already discarded — 200, no storage', async () => {
    mocks.supabaseGetUser.mockResolvedValue({ data: { user: { id: USER_ID } } });
    const { scanUpdates, sessionDeletes } = installTables({
      scan: { id: PHOTO_SCAN_ID, photos_retained: false, photo_session_id: null },
    });
    const res = await POST(buildRequest({ action: 'discard', photoScanId: PHOTO_SCAN_ID }));
    const body = (await res.json()) as { ok: boolean; discarded: boolean };
    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.discarded).toBe(true);
    expect(mocks.storageList).not.toHaveBeenCalled();
    expect(mocks.storageRemove).not.toHaveBeenCalled();
    expect(scanUpdates).toHaveLength(0);
    expect(sessionDeletes).toHaveLength(0);
    expect(mocks.startMeshy).not.toHaveBeenCalled();
    expect(mocks.startTripo).not.toHaveBeenCalled();
  });

  it('removes named + listed + explicit GLB paths, clears session paths, keeps the session row and BF', async () => {
    mocks.supabaseGetUser.mockResolvedValue({ data: { user: { id: USER_ID } } });
    const { scanUpdates, sessionUpdates, sessionDeletes } = installTables();
    mocks.storageList.mockResolvedValue({
      data: [
        { name: 'front_full_1.jpg' },
        { name: 'orphan_full_0.jpg' },
        { name: 'meshy', id: null, metadata: null },
      ],
      error: null,
    });

    const res = await POST(buildRequest({ action: 'discard', photoScanId: PHOTO_SCAN_ID }));
    const body = (await res.json()) as { ok: boolean; discarded: boolean };
    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.discarded).toBe(true);

    expect(mocks.storageList).toHaveBeenCalledWith(
      `${USER_ID}/${SESSION_ID}/`,
      expect.objectContaining({ offset: 0 }),
    );

    const removed = mocks.storageRemove.mock.calls[0]?.[0] as string[];
    expect(removed).toEqual(expect.arrayContaining([
      SESSION_ROW.front_full_path,
      SESSION_ROW.front_thumb_path,
      `${USER_ID}/${SESSION_ID}/orphan_full_0.jpg`,
      `${USER_ID}/${SESSION_ID}/meshy/visual.glb`,
      `${USER_ID}/${SESSION_ID}/tripo/visual.glb`,
    ]));
    expect(removed).not.toContain(`${USER_ID}/${SESSION_ID}/meshy`);

    expect(sessionUpdates[0]).toEqual({
      front_full_path: null,
      front_thumb_path: null,
      right_full_path: null,
      right_thumb_path: null,
      back_full_path: null,
      back_thumb_path: null,
      left_full_path: null,
      left_thumb_path: null,
    });
    expect(scanUpdates[0]).toEqual({
      photos_retained: false,
      photo_session_id: null,
      retained_views: null,
    });
    expect(scanUpdates[0]).not.toHaveProperty('estimated_body_fat_min');
    expect(scanUpdates[0]).not.toHaveProperty('estimated_body_fat_max');
    expect(scanUpdates[0]).not.toHaveProperty('estimated_whr_min');
    expect(scanUpdates[0]).not.toHaveProperty('estimated_whr_max');
    expect(sessionDeletes).toHaveLength(0);
    expect(mocks.startMeshy).not.toHaveBeenCalled();
    expect(mocks.startTripo).not.toHaveBeenCalled();
  });

  it('fails closed when storage list fails — no scan/session write', async () => {
    mocks.supabaseGetUser.mockResolvedValue({ data: { user: { id: USER_ID } } });
    const { scanUpdates, sessionUpdates } = installTables();
    mocks.storageList.mockResolvedValue({ data: null, error: { message: 'list down' } });

    const res = await POST(buildRequest({ action: 'discard', photoScanId: PHOTO_SCAN_ID }));
    const body = (await res.json()) as { ok: boolean; error: string };
    expect(res.status).toBe(500);
    expect(body.ok).toBe(false);
    expect(body.error).toBe('storage_list_failed');
    expect(mocks.storageRemove).not.toHaveBeenCalled();
    expect(scanUpdates).toHaveLength(0);
    expect(sessionUpdates).toHaveLength(0);
  });

  it('fails closed when storage remove fails — no scan/session write', async () => {
    mocks.supabaseGetUser.mockResolvedValue({ data: { user: { id: USER_ID } } });
    const { scanUpdates, sessionUpdates } = installTables();
    mocks.storageRemove.mockResolvedValue({ error: { message: 'remove down' } });

    const res = await POST(buildRequest({ action: 'discard', photoScanId: PHOTO_SCAN_ID }));
    const body = (await res.json()) as { ok: boolean; error: string };
    expect(res.status).toBe(500);
    expect(body.ok).toBe(false);
    expect(body.error).toBe('storage_remove_failed');
    expect(scanUpdates).toHaveLength(0);
    expect(sessionUpdates).toHaveLength(0);
  });
});

describe('retain-frbl discard source contract', () => {
  it('does not reuse /api/scan/delete, does not start Meshy/Tripo, never writes BF', () => {
    const route = readFileSync(
      join(process.cwd(), 'src/app/api/formavision/retain-frbl/route.ts'),
      'utf8',
    );
    const discardFn = route.slice(route.indexOf('async function discardRetain'));
    expect(discardFn).toMatch(/async function discardRetain/);
    expect(discardFn).toMatch(/photos_retained:\s*false/);
    expect(discardFn).toMatch(/photo_session_id:\s*null/);
    expect(discardFn).toMatch(/retained_views:\s*null/);
    expect(discardFn).toMatch(/frblGlbStoragePath/);
    expect(discardFn).toMatch(/tripoGlbStoragePath/);
    expect(discardFn).toMatch(/listAllUnderPrefix/);
    expect(discardFn).not.toMatch(/estimated_body_fat/);
    expect(discardFn).not.toMatch(/startMeshyForReadySession/);
    expect(discardFn).not.toMatch(/startTripoForReadySession/);
    expect(discardFn).not.toMatch(/\/api\/scan\/delete/);
    expect(discardFn).not.toMatch(/\.delete\(/);
    expect(route).not.toMatch(/from '@\/app\/api\/scan\/delete/);
  });
});
