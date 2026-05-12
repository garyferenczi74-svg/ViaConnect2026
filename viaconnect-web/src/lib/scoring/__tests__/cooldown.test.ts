// Tests for src/lib/scoring/cooldown.ts.
//
// Verifies the 30-minute cooldown query against bio_optimization_history.
// Mocks Supabase via vi.mock; no live DB access.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isInCooldown } from '../cooldown';

type MockClient = ReturnType<typeof makeMockClient>;

function makeMockClient(maxComputedAt: string | null, error: unknown = null) {
  // Phase F-patch (Fix 2): cooldown.ts now chains .order() twice
  // (date DESC, compute_seq DESC) to ride the unique index. The mock
  // mirrors the new chain shape: select -> eq -> order -> order -> limit
  // -> maybeSingle.
  const data = maxComputedAt === null
    ? null
    : { date: maxComputedAt.slice(0, 10), compute_seq: 1, computed_at: maxComputedAt };
  const maybeSingle = vi.fn().mockResolvedValue({ data, error });
  const limit = vi.fn().mockReturnValue({ maybeSingle });
  const order2 = vi.fn().mockReturnValue({ limit });
  const order1 = vi.fn().mockReturnValue({ order: order2 });
  const eq = vi.fn().mockReturnValue({ order: order1 });
  const select = vi.fn().mockReturnValue({ eq });
  const from = vi.fn().mockReturnValue({ select });
  return { from, select, eq, order: order1, order2, limit, maybeSingle };
}

describe('cooldown.isInCooldown', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-11T12:00:00Z'));
  });

  it('returns not in cooldown when no history rows exist', async () => {
    const client = makeMockClient(null);
    const result = await isInCooldown('user-1', client as never);
    expect(result.in_cooldown).toBe(false);
    expect(result.last_compute_at).toBeNull();
    expect(result.minutes_remaining).toBe(0);
  });

  it('returns in cooldown when most recent compute was 5 minutes ago', async () => {
    const client = makeMockClient('2026-05-11T11:55:00Z');
    const result = await isInCooldown('user-1', client as never);
    expect(result.in_cooldown).toBe(true);
    expect(result.minutes_remaining).toBe(25);
    expect(result.last_compute_at).toBe('2026-05-11T11:55:00Z');
  });

  it('returns NOT in cooldown when most recent compute was exactly 30 minutes ago', async () => {
    const client = makeMockClient('2026-05-11T11:30:00Z');
    const result = await isInCooldown('user-1', client as never);
    expect(result.in_cooldown).toBe(false);
    expect(result.minutes_remaining).toBe(0);
  });

  it('returns NOT in cooldown when last compute was an hour ago', async () => {
    const client = makeMockClient('2026-05-11T11:00:00Z');
    const result = await isInCooldown('user-1', client as never);
    expect(result.in_cooldown).toBe(false);
    expect(result.minutes_remaining).toBe(0);
    expect(result.last_compute_at).toBe('2026-05-11T11:00:00Z');
  });

  it('treats an error response as not-in-cooldown (defensive default)', async () => {
    const client = makeMockClient(null, { message: 'connection refused' });
    const result = await isInCooldown('user-1', client as never);
    expect(result.in_cooldown).toBe(false);
    expect(result.last_compute_at).toBeNull();
  });
});
