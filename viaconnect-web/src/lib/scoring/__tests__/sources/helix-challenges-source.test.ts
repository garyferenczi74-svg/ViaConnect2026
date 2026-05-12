// Tests for src/lib/scoring/sources/helix-challenges-source.ts.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getHelixChallengesSource } from '../../sources/helix-challenges-source';

interface MockSetup {
  rows: Record<string, unknown>[];
  error?: unknown;
}

function makeClient(setup: MockSetup) {
  // helix_challenge_participants has nullable user_id per pre-flight.
  // Query: select ... where user_id = $1 AND user_id IS NOT NULL.
  const notReturn = vi.fn().mockResolvedValue({
    data: setup.rows,
    error: setup.error ?? null,
  });
  const not = vi.fn().mockReturnValue(notReturn());
  const notWrapped = vi.fn().mockResolvedValue({
    data: setup.rows,
    error: setup.error ?? null,
  });
  const eq = vi.fn().mockReturnValue({ not: notWrapped });
  const select = vi.fn().mockReturnValue({ eq });
  const from = vi.fn().mockReturnValue({ select });
  return { from, select, eq, notWrapped };
}

describe('helix-challenges-source', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns empty when no participants', async () => {
    const client = makeClient({ rows: [] });
    const result = await getHelixChallengesSource('u-1', client as never);
    expect(result.last_engaged_at).toBeNull();
    expect(result.recent_events_7d).toBe(0);
    expect(result.recent_events_30d).toBe(0);
    expect(result.source_specific?.active_count).toBe(0);
    expect(result.source_specific?.completed_count).toBe(0);
    expect(result.source_specific?.tokens_earned_30d).toBe(0);
  });

  it('aggregates active vs completed and counts windows', async () => {
    const within7 = new Date(Date.now() - 3 * 86400000).toISOString();
    const within30 = new Date(Date.now() - 20 * 86400000).toISOString();
    const client = makeClient({
      rows: [
        {
          joined_at: within7,
          completion_date: null,
          status: 'active',
          tokens_awarded: 0,
        },
        {
          joined_at: within30,
          completion_date: within7,
          status: 'completed',
          tokens_awarded: 50,
        },
        {
          joined_at: '2026-01-01T00:00:00Z',
          completion_date: '2026-01-15T00:00:00Z',
          status: 'completed',
          tokens_awarded: 100,
        },
      ],
    });
    const result = await getHelixChallengesSource('u-1', client as never);
    expect(result.last_engaged_at).toBe(within7);
    expect(result.recent_events_7d).toBe(2);
    expect(result.recent_events_30d).toBe(2);
    expect(result.source_specific?.active_count).toBe(1);
    expect(result.source_specific?.completed_count).toBe(2);
    expect(result.source_specific?.tokens_earned_30d).toBe(50);
  });

  it('queries helix_challenge_participants', async () => {
    const client = makeClient({ rows: [] });
    await getHelixChallengesSource('u-1', client as never);
    expect(client.from).toHaveBeenCalledWith('helix_challenge_participants');
  });

  it('returns defaults on error', async () => {
    const client = makeClient({ rows: [], error: { message: 'boom' } });
    const result = await getHelixChallengesSource('u-1', client as never);
    expect(result.last_engaged_at).toBeNull();
  });
});
