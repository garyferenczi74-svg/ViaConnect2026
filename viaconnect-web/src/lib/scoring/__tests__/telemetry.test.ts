// Tests for src/lib/scoring/telemetry.ts.
//
// Verifies fire-and-forget write to bos_write_telemetry. The helper MUST
// swallow exceptions so a telemetry failure cannot break a BOS compute.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { logBOSWrite } from '../telemetry';

function makeInsertClient(error: unknown = null) {
  const insert = vi.fn().mockResolvedValue({ data: null, error });
  const from = vi.fn().mockReturnValue({ insert });
  return { from, insert };
}

describe('telemetry.logBOSWrite', () => {
  beforeEach(() => vi.clearAllMocks());

  it('inserts a telemetry row with the expected shape', async () => {
    const client = makeInsertClient();
    await logBOSWrite({
      caller_module: 'compute-worker',
      write_target: 'bio_optimization_history',
      is_canonical: true,
      success: true,
      user_id: 'u-1',
      supabase: client as never,
    });
    expect(client.from).toHaveBeenCalledWith('bos_write_telemetry');
    const row = (client.insert as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(row.caller_module).toBe('compute-worker');
    expect(row.write_target).toBe('bio_optimization_history');
    expect(row.is_canonical).toBe(true);
    expect(row.success).toBe(true);
    expect(row.user_id).toBe('u-1');
  });

  it('captures error_message on a failed write', async () => {
    const client = makeInsertClient();
    await logBOSWrite({
      caller_module: 'compute-worker',
      write_target: 'compute_bio_optimization_score_rpc',
      is_canonical: true,
      success: false,
      error_message: 'rpc returned 42501',
      supabase: client as never,
    });
    const row = (client.insert as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(row.success).toBe(false);
    expect(row.error_message).toBe('rpc returned 42501');
  });

  it('swallows Supabase insert errors (fire-and-forget)', async () => {
    const client = makeInsertClient({ message: 'rls denied' });
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    await expect(
      logBOSWrite({
        caller_module: 'compute-worker',
        write_target: 'daily_scores.bio_optimization_score',
        is_canonical: false,
        success: true,
        supabase: client as never,
      }),
    ).resolves.toBeUndefined();
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('swallows thrown exceptions from the client itself', async () => {
    const throwingClient = {
      from: () => {
        throw new Error('client exploded');
      },
    };
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    await expect(
      logBOSWrite({
        caller_module: 'x',
        write_target: 'health_scores',
        is_canonical: false,
        success: false,
        supabase: throwingClient as never,
      }),
    ).resolves.toBeUndefined();
    consoleSpy.mockRestore();
  });
});

describe('telemetry.logBOSWrite error_message sanitization (#161b)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('redacts a UUID in error_message before insert', async () => {
    const client = makeInsertClient();
    await logBOSWrite({
      caller_module: 'compute-worker',
      write_target: 'compute_bio_optimization_score_rpc',
      is_canonical: true,
      success: false,
      error_message: 'failed for 550e8400-e29b-41d4-a716-446655440000',
      supabase: client as never,
    });
    const row = (client.insert as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(row.error_message).toBe('failed for <uuid>');
  });

  it('truncates a 600 char error_message to 500 chars before insert', async () => {
    const client = makeInsertClient();
    const long = 'a'.repeat(600);
    await logBOSWrite({
      caller_module: 'compute-worker',
      write_target: 'compute_bio_optimization_score_rpc',
      is_canonical: true,
      success: false,
      error_message: long,
      supabase: client as never,
    });
    const row = (client.insert as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(row.error_message.length).toBe(500);
    expect(row.error_message.endsWith(' ...')).toBe(true);
  });

  it('passes null error_message through as null', async () => {
    const client = makeInsertClient();
    await logBOSWrite({
      caller_module: 'compute-worker',
      write_target: 'bio_optimization_history',
      is_canonical: true,
      success: true,
      error_message: undefined,
      supabase: client as never,
    });
    const row = (client.insert as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(row.error_message).toBeNull();
  });

  it('handles missing error_message field with null insert', async () => {
    const client = makeInsertClient();
    await logBOSWrite({
      caller_module: 'compute-worker',
      write_target: 'bio_optimization_history',
      is_canonical: true,
      success: true,
      supabase: client as never,
    });
    const row = (client.insert as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(row.error_message).toBeNull();
  });
});
