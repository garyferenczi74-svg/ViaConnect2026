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

function installTable(result: { data: unknown; error: unknown } | (() => Promise<unknown>)) {
  const calls: QueryCalls = { eqCalls: [], orArg: null, orderArg: null, limitArg: null };
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
  const select = vi.fn(() => builder);
  mocks.from.mockImplementation((tableName: string) => {
    if (tableName !== 'body_photo_sessions') throw new Error(`unexpected table ${tableName}`);
    return { select };
  });
  return { calls, select };
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
  });
});
