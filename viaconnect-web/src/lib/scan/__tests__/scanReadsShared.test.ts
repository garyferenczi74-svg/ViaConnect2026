import { describe, it, expect, vi, beforeEach } from 'vitest';

// Prompt 231: scanReadsShared is the SINGLE source both the 224 dashboard
// tile and the scan history list use (condition 17). These tests assert the
// protocol filter, the tombstone exclusion, the returned shape
// (capture_status, never is_complete), and the fail-open resilience
// contract. The supabase server client is mocked; no live DB is touched.

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ from: mocks.from }),
}));

vi.mock('@/lib/utils/safe-log', () => ({
  safeLog: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { getLatestScan, listScans } from '../scanReadsShared';

interface QueryCalls {
  eqCalls: Array<[string, unknown]>;
  orArg: string | null;
  orderArg: { col: string; opts: unknown } | null;
  limitArg: number | null;
}

type QueryResult = { data: unknown; error: unknown } | (() => Promise<unknown>);

function makeBuilder(
  result: QueryResult,
  inResult?: QueryResult,
  sharedCalls?: QueryCalls,
): { builder: Record<string, unknown>; calls: QueryCalls; select: ReturnType<typeof vi.fn> } {
  const calls: QueryCalls = sharedCalls ?? { eqCalls: [], orArg: null, orderArg: null, limitArg: null };
  const builder: Record<string, unknown> = {};
  builder.eq = vi.fn((col: string, val: unknown) => {
    calls.eqCalls.push([col, val]);
    return builder;
  });
  builder.or = vi.fn((s: string) => {
    calls.orArg = s;
    return builder;
  });
  builder.order = vi.fn((col: string, opts: unknown) => {
    calls.orderArg = { col, opts };
    return builder;
  });
  builder.limit = vi.fn((n: number) => {
    calls.limitArg = n;
    return typeof result === 'function' ? result() : Promise.resolve(result);
  });
  builder.in = vi.fn(() => {
    const resolved = inResult ?? { data: [], error: null };
    return typeof resolved === 'function' ? resolved() : Promise.resolve(resolved);
  });
  const select = vi.fn(() => builder);
  return { builder, calls, select };
}

function installTable(
  result: QueryResult,
  photoResult: QueryResult = { data: [], error: null },
  retainSessionResult: QueryResult = { data: [], error: null },
) {
  const sessionCalls: QueryCalls = { eqCalls: [], orArg: null, orderArg: null, limitArg: null };
  const photo = makeBuilder(photoResult);
  mocks.from.mockImplementation((tableName: string) => {
    if (tableName === 'body_photo_sessions') {
      return { select: makeBuilder(result, retainSessionResult, sessionCalls).select };
    }
    if (tableName === 'body_tracker_photo_scans') return { select: photo.select };
    throw new Error(`unexpected table ${tableName}`);
  });
  return { calls: sessionCalls, photoCalls: photo.calls };
}

const READY_ROW = {
  id: 'session-1',
  session_date: '2026-08-20',
  protocol: '4pose_v1',
  capture_status: 'ready',
  front_full_path: 'user-1/session-1/front_full_1.jpg',
  right_full_path: null,
  back_full_path: 'user-1/session-1/back_full_1.jpg',
  left_full_path: 'user-1/session-1/left_full_1.jpg',
};

beforeEach(() => {
  mocks.from.mockReset();
});

describe('scanReadsShared', () => {
  describe('getLatestScan', () => {
    it('queries body_photo_sessions filtered by user_id and protocol=4pose_v1', async () => {
      const { calls } = installTable({ data: [READY_ROW], error: null });
      await getLatestScan('user-1');
      expect(mocks.from).toHaveBeenCalledWith('body_photo_sessions');
      expect(calls.eqCalls).toContainEqual(['user_id', 'user-1']);
      expect(calls.eqCalls).toContainEqual(['protocol', '4pose_v1']);
    });

    it('excludes delete_pending and deleted via the tombstone filter, NULL/ready visible', async () => {
      const { calls } = installTable({ data: [READY_ROW], error: null });
      await getLatestScan('user-1');
      expect(calls.orArg).toContain('capture_status.is.null');
      expect(calls.orArg).toContain('delete_pending');
      expect(calls.orArg).toContain('deleted');
    });

    it('orders by session_date descending and limits to 1', async () => {
      const { calls } = installTable({ data: [READY_ROW], error: null });
      await getLatestScan('user-1');
      expect(calls.orderArg?.col).toBe('session_date');
      expect(calls.orderArg?.opts).toMatchObject({ ascending: false });
      expect(calls.limitArg).toBe(1);
    });

    it('returns a newer FormaVision photo scan when it is the latest row', async () => {
      installTable(
        { data: [READY_ROW], error: null },
        { data: [{ id: 'photo-latest', scan_date: '2026-08-22' }], error: null },
      );
      const scan = await getLatestScan('user-1');
      expect(scan).toMatchObject({
        id: 'photo-latest',
        protocol: 'formavision_photo',
        captureStatus: 'ready',
      });
    });

    it('returns capture_status (not is_complete) and no fabricated fields', async () => {
      installTable({ data: [READY_ROW], error: null });
      const scan = await getLatestScan('user-1');
      expect(scan).not.toBeNull();
      expect(scan).toMatchObject({
        id: 'session-1',
        date: '2026-08-20',
        protocol: '4pose_v1',
        captureStatus: 'ready',
      });
      expect(scan).not.toHaveProperty('is_complete');
      expect(scan).not.toHaveProperty('isComplete');
    });

    it('reports pose presence without leaking raw storage paths', async () => {
      installTable({ data: [READY_ROW], error: null });
      const scan = await getLatestScan('user-1');
      expect(scan?.poses).toEqual({ front: true, right: false, back: true, left: true });
      expect(JSON.stringify(scan)).not.toContain('session-1/front_full_1.jpg');
    });

    it('defensively excludes a delete_pending row even if it slips through the query', async () => {
      installTable({
        data: [{ ...READY_ROW, capture_status: 'delete_pending' }],
        error: null,
      });
      const scan = await getLatestScan('user-1');
      expect(scan).toBeNull();
    });

    it('defensively excludes a non-4pose_v1 row even if it slips through the query', async () => {
      installTable({ data: [{ ...READY_ROW, protocol: 'journal_v0' }], error: null });
      const scan = await getLatestScan('user-1');
      expect(scan).toBeNull();
    });

    it('returns null when no row exists', async () => {
      installTable({ data: [], error: null });
      const scan = await getLatestScan('user-1');
      expect(scan).toBeNull();
    });

    it('fails open to null on a query error, never throws', async () => {
      installTable({ data: null, error: { message: 'boom' } });
      await expect(getLatestScan('user-1')).resolves.toBeNull();
    });

    it('fails open to null when the query rejects (timeout-shaped), never throws', async () => {
      installTable(() => Promise.reject(new Error('network down')));
      await expect(getLatestScan('user-1')).resolves.toBeNull();
    });
  });

  describe('listScans', () => {
    it('applies the same protocol + tombstone filter as getLatestScan', async () => {
      const { calls } = installTable({ data: [READY_ROW], error: null });
      await listScans('user-1');
      expect(calls.eqCalls).toContainEqual(['protocol', '4pose_v1']);
      expect(calls.orArg).toContain('delete_pending');
      expect(calls.orArg).toContain('deleted');
    });

    it('returns every row newest first, mapped to the same shape as getLatestScan', async () => {
      const older = { ...READY_ROW, id: 'session-0', session_date: '2026-08-01' };
      installTable({ data: [READY_ROW, older], error: null });
      const scans = await listScans('user-1');
      expect(scans.map((s) => s.id)).toEqual(['session-1', 'session-0']);
      expect(scans[0]).not.toHaveProperty('is_complete');
    });

    it('defensively drops any tombstoned or non-4pose_v1 rows from the result', async () => {
      installTable({
        data: [
          READY_ROW,
          { ...READY_ROW, id: 'session-deleted', capture_status: 'deleted' },
          { ...READY_ROW, id: 'session-legacy', protocol: 'journal_v0' },
        ],
        error: null,
      });
      const scans = await listScans('user-1');
      expect(scans.map((s) => s.id)).toEqual(['session-1']);
    });

    it('fails open to an empty array on a query error, never throws', async () => {
      installTable({ data: null, error: { message: 'boom' } });
      await expect(listScans('user-1')).resolves.toEqual([]);
    });

    it('fails open to an empty array when the query throws, never throws', async () => {
      installTable(() => Promise.reject(new Error('down')));
      await expect(listScans('user-1')).resolves.toEqual([]);
    });

    it('honors a custom limit', async () => {
      const { calls } = installTable({ data: [], error: null });
      await listScans('user-1', 5);
      expect(calls.limitArg).toBe(5);
    });

    it('does not map photo-scan storage paths into pose-present', async () => {
      installTable(
        { data: [], error: null },
        {
          data: [{
            id: 'photo-stored',
            scan_date: '2026-09-01',
            created_at: '2026-09-01T18:00:00Z',
            front_full_path: 'user-1/photo-stored/front.jpg',
            right_thumb_path: 'user-1/photo-stored/right_thumb.jpg',
          }],
          error: null,
        },
      );
      const scans = await listScans('user-1');
      expect(scans[0]).toMatchObject({
        id: 'photo-stored',
        protocol: 'formavision_photo',
        poses: { front: false, right: false, back: false, left: false },
      });
      expect(JSON.stringify(scans[0])).not.toContain('user-1/photo-stored/front.jpg');
    });

    it('merges body_tracker_photo_scans into the list as formavision_photo', async () => {
      installTable(
        { data: [READY_ROW], error: null },
        {
          data: [{
            id: 'photo-1',
            scan_date: '2026-08-21',
            created_at: '2026-08-21T12:00:00Z',
            estimated_body_fat_min: 30,
            estimated_body_fat_max: 36,
          }],
          error: null,
        },
      );
      const scans = await listScans('user-1');
      expect(scans.map((s) => s.id)).toEqual(['photo-1', 'session-1']);
      expect(scans[0]).toMatchObject({
        id: 'photo-1',
        protocol: 'formavision_photo',
        captureStatus: 'ready',
        poses: { front: false, right: false, back: false, left: false },
        estimatedBodyFatMin: 30,
        estimatedBodyFatMax: 36,
      });
    });

    it('coerces numeric-as-string photo-scan estimate fields', async () => {
      installTable(
        { data: [], error: null },
        {
          data: [{
            id: 'photo-str',
            scan_date: '2026-09-01',
            created_at: '2026-09-01T12:00:00Z',
            estimated_body_fat_min: '29',
            estimated_body_fat_max: '33',
          }],
          error: null,
        },
      );
      const scans = await listScans('user-1');
      expect(scans[0]).toMatchObject({
        id: 'photo-str',
        estimatedBodyFatMin: 29,
        estimatedBodyFatMax: 33,
      });
    });

    it('collapses same-day formavision_photo Ready rows to the newest', async () => {
      installTable(
        { data: [], error: null },
        {
          data: [
            { id: 'photo-old', scan_date: '2026-09-01', created_at: '2026-09-01T10:00:00Z' },
            { id: 'photo-new', scan_date: '2026-09-01', created_at: '2026-09-01T18:00:00Z' },
            { id: 'photo-mid', scan_date: '2026-09-01', created_at: '2026-09-01T14:00:00Z' },
          ],
          error: null,
        },
      );
      const scans = await listScans('user-1');
      expect(scans.map((s) => s.id)).toEqual(['photo-new']);
    });

    it('drops an empty-pose 4pose_v1 row on a day that already has a photo scan', async () => {
      const emptyGuided = {
        ...READY_ROW,
        id: 'empty-session',
        session_date: '2026-09-01',
        front_full_path: null,
        right_full_path: null,
        back_full_path: null,
        left_full_path: null,
      };
      installTable(
        { data: [emptyGuided], error: null },
        { data: [{ id: 'photo-1', scan_date: '2026-09-01', created_at: '2026-09-01T18:00:00Z' }], error: null },
      );
      const scans = await listScans('user-1');
      expect(scans.map((s) => s.id)).toEqual(['photo-1']);
    });

    it('keeps a 4pose_v1 row with poses alongside a same-day photo scan', async () => {
      const guided = { ...READY_ROW, id: 'session-same-day', session_date: '2026-09-01' };
      installTable(
        { data: [guided], error: null },
        { data: [{ id: 'photo-1', scan_date: '2026-09-01', created_at: '2026-09-01T18:00:00Z' }], error: null },
      );
      const scans = await listScans('user-1');
      expect(scans).toHaveLength(2);
      expect(scans.map((s) => s.id)).toEqual(expect.arrayContaining(['photo-1', 'session-same-day']));
    });

    it('fails open on photo-scan errors and still returns 4-pose sessions', async () => {
      installTable(
        { data: [READY_ROW], error: null },
        { data: null, error: { message: 'boom' } },
      );
      const scans = await listScans('user-1');
      expect(scans.map((s) => s.id)).toEqual(['session-1']);
    });

    it('does not treat photo_scans retained_views as pose presence without session paths', async () => {
      installTable(
        { data: [], error: null },
        {
          data: [{
            id: 'photo-flags-only',
            scan_date: '2026-09-06',
            created_at: '2026-09-06T12:00:00Z',
            photos_retained: true,
            photo_session_id: 'sess-missing',
            retained_views: ['front', 'right', 'back', 'left'],
          }],
          error: null,
        },
        { data: [], error: null },
      );
      const scans = await listScans('user-1');
      expect(scans[0]).toMatchObject({
        id: 'photo-flags-only',
        protocol: 'formavision_photo',
        photosRetained: false,
        frblSessionId: null,
        poses: { front: false, right: false, back: false, left: false },
      });
    });

    it('sets poses.any from body_photo_sessions *_full_path for retained photo scans', async () => {
      installTable(
        { data: [], error: null },
        {
          data: [{
            id: 'photo-retain',
            scan_date: '2026-09-06',
            created_at: '2026-09-06T12:00:00Z',
            photos_retained: true,
            photo_session_id: 'sess-retain-1',
            retained_views: ['front', 'right', 'back', 'left'],
          }],
          error: null,
        },
        {
          data: [{
            id: 'sess-retain-1',
            front_full_path: 'user-1/sess-retain-1/front_full.jpg',
            right_full_path: 'user-1/sess-retain-1/right_full.jpg',
            back_full_path: 'user-1/sess-retain-1/back_full.jpg',
            left_full_path: 'user-1/sess-retain-1/left_full.jpg',
          }],
          error: null,
        },
      );
      const scans = await listScans('user-1');
      expect(scans[0]).toMatchObject({
        id: 'photo-retain',
        protocol: 'formavision_photo',
        photosRetained: true,
        frblSessionId: 'sess-retain-1',
        poses: { front: true, right: true, back: true, left: true },
      });
      expect(JSON.stringify(scans[0])).not.toContain('user-1/sess-retain-1/front_full.jpg');
    });
  });
});
