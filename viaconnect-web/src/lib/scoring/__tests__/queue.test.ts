// Tests for src/lib/scoring/queue.ts.
//
// Verifies enqueue + drain helpers against bos_compute_queue.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  enqueueBOSCompute,
  fetchUnprocessedEventsGroupedByUser,
  markEventsProcessed,
  markEventsErrored,
} from '../queue';
import type { QueuedEvent } from '../types';

function makeInsertClient(returnedId: string, error: unknown = null) {
  const single = vi.fn().mockResolvedValue({ data: { id: returnedId }, error });
  const select = vi.fn().mockReturnValue({ single });
  const insert = vi.fn().mockReturnValue({ select });
  const from = vi.fn().mockReturnValue({ insert });
  return { from, insert, select, single };
}

function makeFetchClient(rows: QueuedEvent[], error: unknown = null) {
  const order = vi.fn().mockResolvedValue({ data: rows, error });
  const is = vi.fn().mockReturnValue({ order });
  const select = vi.fn().mockReturnValue({ is });
  const from = vi.fn().mockReturnValue({ select });
  return { from, select, is, order };
}

function makeUpdateClient(error: unknown = null) {
  const inMethod = vi.fn().mockResolvedValue({ data: null, error });
  const update = vi.fn().mockReturnValue({ in: inMethod });
  const from = vi.fn().mockReturnValue({ update });
  return { from, update, in: inMethod };
}

describe('queue.enqueueBOSCompute', () => {
  beforeEach(() => vi.clearAllMocks());

  it('inserts one row into bos_compute_queue and returns the queued id', async () => {
    const client = makeInsertClient('q-1');
    const result = await enqueueBOSCompute({
      userId: 'u-1',
      source: 'caq_completed',
      event_id: 'caq-evt-9',
      payload: { foo: 'bar' },
      supabase: client as never,
    });
    expect(result.queued_id).toBe('q-1');
    expect(client.from).toHaveBeenCalledWith('bos_compute_queue');
    const insertedRow = (client.insert as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(insertedRow.user_id).toBe('u-1');
    expect(insertedRow.source).toBe('caq_completed');
    expect(insertedRow.event_id).toBe('caq-evt-9');
    expect(insertedRow.payload).toEqual({ foo: 'bar' });
    expect(insertedRow.bypass_cooldown).toBe(false);
  });

  it('honors bypass_cooldown when explicitly true', async () => {
    const client = makeInsertClient('q-2');
    await enqueueBOSCompute({
      userId: 'u-1',
      source: 'admin_recalc',
      bypass_cooldown: true,
      supabase: client as never,
    });
    const row = (client.insert as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(row.bypass_cooldown).toBe(true);
  });

  it('defaults payload to empty object when omitted', async () => {
    const client = makeInsertClient('q-3');
    await enqueueBOSCompute({
      userId: 'u-1',
      source: 'daily_log',
      supabase: client as never,
    });
    const row = (client.insert as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(row.payload).toEqual({});
  });

  it('throws when Supabase returns an error', async () => {
    const client = makeInsertClient('q-x', { message: 'rls denied' });
    await expect(
      enqueueBOSCompute({
        userId: 'u-1',
        source: 'manual_recalc',
        supabase: client as never,
      }),
    ).rejects.toThrow();
  });
});

describe('queue.fetchUnprocessedEventsGroupedByUser', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns empty Map when there are no unprocessed rows', async () => {
    const client = makeFetchClient([]);
    const result = await fetchUnprocessedEventsGroupedByUser(client as never, 100);
    expect(result.size).toBe(0);
  });

  it('groups rows by user_id', async () => {
    const rows: QueuedEvent[] = [
      {
        id: 'a',
        user_id: 'u-1',
        source: 'caq_completed',
        event_id: null,
        payload: {},
        enqueued_at: '2026-05-11T10:00:00Z',
        processed_at: null,
        processing_error: null,
        bypass_cooldown: false,
        retry_count: 0,
      },
      {
        id: 'b',
        user_id: 'u-2',
        source: 'daily_log',
        event_id: null,
        payload: {},
        enqueued_at: '2026-05-11T10:01:00Z',
        processed_at: null,
        processing_error: null,
        bypass_cooldown: false,
        retry_count: 0,
      },
      {
        id: 'c',
        user_id: 'u-1',
        source: 'nutrition_log',
        event_id: null,
        payload: {},
        enqueued_at: '2026-05-11T10:02:00Z',
        processed_at: null,
        processing_error: null,
        bypass_cooldown: false,
        retry_count: 0,
      },
    ];
    const client = makeFetchClient(rows);
    const result = await fetchUnprocessedEventsGroupedByUser(client as never, 100);
    expect(result.size).toBe(2);
    expect(result.get('u-1')?.length).toBe(2);
    expect(result.get('u-2')?.length).toBe(1);
  });

  it('throws on Supabase error', async () => {
    const client = makeFetchClient([], { message: 'boom' });
    await expect(fetchUnprocessedEventsGroupedByUser(client as never, 100)).rejects.toThrow();
  });
});

describe('queue.markEventsProcessed', () => {
  beforeEach(() => vi.clearAllMocks());

  it('updates the rows with processed_at = now()', async () => {
    const client = makeUpdateClient();
    await markEventsProcessed(['a', 'b'], client as never);
    expect(client.from).toHaveBeenCalledWith('bos_compute_queue');
    const updateArg = (client.update as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(updateArg).toHaveProperty('processed_at');
    expect(client.in).toHaveBeenCalledWith('id', ['a', 'b']);
  });

  it('no-ops when the id list is empty', async () => {
    const client = makeUpdateClient();
    await markEventsProcessed([], client as never);
    expect(client.from).not.toHaveBeenCalled();
  });

  it('throws on update error', async () => {
    const client = makeUpdateClient({ message: 'boom' });
    await expect(markEventsProcessed(['a'], client as never)).rejects.toThrow();
  });
});

describe('queue.markEventsErrored', () => {
  beforeEach(() => vi.clearAllMocks());

  function makeMarkErroredClient(
    existing: Array<{ id: string; retry_count: number }>,
    updateError: unknown = null,
    readError: unknown = null,
  ) {
    // Phase F-patch (Fix 1): markEventsErrored now reads the prior
    // retry_count then performs a per-row update with
    // processed_at = NULL + processing_error + retry_count + 1. The
    // mock supports two from('bos_compute_queue') chains: one for the
    // .select().in() read, one for the .update().eq() write.
    const selectIn = vi.fn().mockResolvedValue({ data: existing, error: readError });
    const select = vi.fn().mockReturnValue({ in: selectIn });
    const updateEq = vi.fn().mockResolvedValue({ data: null, error: updateError });
    const update = vi.fn().mockReturnValue({ eq: updateEq });
    const from = vi.fn().mockImplementation(() => ({ select, update }));
    return { from, select, selectIn, update, updateEq };
  }

  it('releases the row (processed_at=null), writes the error, and bumps retry_count', async () => {
    const client = makeMarkErroredClient([
      { id: 'a', retry_count: 2 },
    ]);
    await markEventsErrored(['a'], 'BOS compute failed', client as never);

    // Update payload: processed_at must be null, retry_count must be prior+1,
    // processing_error must carry the message.
    const updateArg = client.update.mock.calls[0][0];
    expect(updateArg.processed_at).toBeNull();
    expect(updateArg.processing_error).toBe('BOS compute failed');
    expect(updateArg.retry_count).toBe(3);
    expect(client.updateEq).toHaveBeenCalledWith('id', 'a');
  });

  it('bumps from zero when prior retry_count is null', async () => {
    const client = makeMarkErroredClient([
      { id: 'a', retry_count: null as unknown as number },
    ]);
    await markEventsErrored(['a'], 'msg', client as never);
    const updateArg = client.update.mock.calls[0][0];
    expect(updateArg.retry_count).toBe(1);
  });

  it('no-ops when ids empty', async () => {
    const client = makeMarkErroredClient([]);
    await markEventsErrored([], 'msg', client as never);
    expect(client.from).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Phase F-patch (Fix 1): claimBOSComputeBatch + releaseClaimedEvents
// ---------------------------------------------------------------------------

import { claimBOSComputeBatch, releaseClaimedEvents } from '../queue';

describe('queue.claimBOSComputeBatch', () => {
  beforeEach(() => vi.clearAllMocks());

  function makeRpcClient(rows: QueuedEvent[], error: unknown = null) {
    const rpc = vi.fn().mockResolvedValue({ data: rows, error });
    return { rpc };
  }

  it('invokes the claim_bos_compute_batch RPC with the limit', async () => {
    const client = makeRpcClient([]);
    await claimBOSComputeBatch(client as never, 250);
    expect(client.rpc).toHaveBeenCalledWith('claim_bos_compute_batch', { p_limit: 250 });
  });

  it('returns the claimed rows verbatim', async () => {
    const rows: QueuedEvent[] = [
      {
        id: 'claim-1',
        user_id: 'u-1',
        source: 'daily_log',
        event_id: null,
        payload: {},
        enqueued_at: '2026-05-11T10:00:00Z',
        processed_at: '9999-01-01T00:00:00Z',
        processing_error: null,
        bypass_cooldown: false,
        retry_count: 0,
      },
    ];
    const client = makeRpcClient(rows);
    const result = await claimBOSComputeBatch(client as never, 10);
    expect(result).toEqual(rows);
  });

  it('returns empty array when RPC returns null data', async () => {
    const client = makeRpcClient([] as QueuedEvent[]);
    // Force null data path.
    (client.rpc as ReturnType<typeof vi.fn>).mockResolvedValue({ data: null, error: null });
    const result = await claimBOSComputeBatch(client as never, 10);
    expect(result).toEqual([]);
  });

  it('throws when the RPC returns an error', async () => {
    const client = makeRpcClient([], { message: 'rpc denied' });
    await expect(claimBOSComputeBatch(client as never, 10)).rejects.toThrow(/rpc denied/);
  });
});

describe('queue.releaseClaimedEvents', () => {
  beforeEach(() => vi.clearAllMocks());

  it('updates processed_at = null on the given ids', async () => {
    const client = makeUpdateClient();
    await releaseClaimedEvents(['x', 'y'], client as never);
    const arg = (client.update as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(arg.processed_at).toBeNull();
    expect(client.in).toHaveBeenCalledWith('id', ['x', 'y']);
  });

  it('no-ops when ids empty', async () => {
    const client = makeUpdateClient();
    await releaseClaimedEvents([], client as never);
    expect(client.from).not.toHaveBeenCalled();
  });

  it('throws on update error', async () => {
    const client = makeUpdateClient({ message: 'rls' });
    await expect(releaseClaimedEvents(['x'], client as never)).rejects.toThrow();
  });
});
