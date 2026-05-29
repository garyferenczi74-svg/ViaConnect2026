// Prompt #170 Phase 1b: tests for the salted user-hash helper that stamps
// every user_meal_corpus row. Salt is read at runtime via Vault function
// public.get_corpus_salt(); for unit tests we use the deterministic seam
// computeUserHashWithSalt.

import { describe, it, expect, vi } from 'vitest';
import { computeUserHashWithSalt, computeUserHash } from '../user-hash';

describe('computeUserHashWithSalt', () => {
  it('produces a deterministic 64-char lowercase hex digest for known input', () => {
    const r = computeUserHashWithSalt('user-123', 'salt-v1', 1);
    expect(r.userHash).toMatch(/^[0-9a-f]{64}$/);
    expect(r.saltVersion).toBe(1);
  });

  it('is deterministic across calls with the same input', () => {
    const a = computeUserHashWithSalt('user-123', 'salt-v1', 1);
    const b = computeUserHashWithSalt('user-123', 'salt-v1', 1);
    expect(a.userHash).toBe(b.userHash);
  });

  it('produces different hashes for different userIds', () => {
    const a = computeUserHashWithSalt('user-A', 'salt-v1', 1);
    const b = computeUserHashWithSalt('user-B', 'salt-v1', 1);
    expect(a.userHash).not.toBe(b.userHash);
  });

  it('produces different hashes for different salts', () => {
    const a = computeUserHashWithSalt('user-X', 'salt-v1', 1);
    const b = computeUserHashWithSalt('user-X', 'salt-v2', 2);
    expect(a.userHash).not.toBe(b.userHash);
    expect(a.saltVersion).toBe(1);
    expect(b.saltVersion).toBe(2);
  });

  it('throws when userId is empty', () => {
    expect(() => computeUserHashWithSalt('', 'salt', 1)).toThrow();
  });

  it('throws when salt is empty', () => {
    expect(() => computeUserHashWithSalt('user', '', 1)).toThrow();
  });
});

describe('computeUserHash', () => {
  it('calls supabaseAdmin.rpc with get_corpus_salt and uses the returned salt', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: 'live-salt-value', error: null });
    const fakeClient = { rpc } as unknown as Parameters<typeof computeUserHash>[0]['supabaseAdmin'];

    const r = await computeUserHash({ userId: 'user-rpc', supabaseAdmin: fakeClient });

    expect(rpc).toHaveBeenCalledWith('get_corpus_salt');
    expect(r.userHash).toMatch(/^[0-9a-f]{64}$/);
    expect(r.saltVersion).toBe(1);

    const expected = computeUserHashWithSalt('user-rpc', 'live-salt-value', 1);
    expect(r.userHash).toBe(expected.userHash);
  });

  it('throws when rpc returns an error', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: { message: 'denied' } });
    const fakeClient = { rpc } as unknown as Parameters<typeof computeUserHash>[0]['supabaseAdmin'];

    await expect(
      computeUserHash({ userId: 'u', supabaseAdmin: fakeClient }),
    ).rejects.toThrow(/salt/i);
  });

  it('throws when rpc returns null data', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: null });
    const fakeClient = { rpc } as unknown as Parameters<typeof computeUserHash>[0]['supabaseAdmin'];

    await expect(
      computeUserHash({ userId: 'u', supabaseAdmin: fakeClient }),
    ).rejects.toThrow();
  });
});
