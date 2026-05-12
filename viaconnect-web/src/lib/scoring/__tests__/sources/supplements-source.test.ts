// Tests for src/lib/scoring/sources/supplements-source.ts.
//
// Reads supplement_adherence; no dose-log table found in the live schema
// (verified via grep against supabase/migrations/), so last_engaged_at
// falls back to MAX(started_at) per the pre-flight contingency note.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getSupplementsSource } from '../../sources/supplements-source';

interface MockSetup {
  rows: Record<string, unknown>[];
  error?: unknown;
}

function makeClient(setup: MockSetup) {
  const eq = vi.fn().mockResolvedValue({ data: setup.rows, error: setup.error ?? null });
  const select = vi.fn().mockReturnValue({ eq });
  const from = vi.fn().mockReturnValue({ select });
  return { from, select, eq };
}

describe('supplements-source', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns zeros when no rows', async () => {
    const client = makeClient({ rows: [] });
    const result = await getSupplementsSource('u-1', client as never);
    expect(result.last_engaged_at).toBeNull();
    expect(result.recent_events_7d).toBe(0);
    expect(result.recent_events_30d).toBe(0);
    expect(result.source_specific?.active_supplement_count).toBe(0);
  });

  it('returns populated shape when adherence rows present', async () => {
    const within7Start = new Date(Date.now() - 4 * 86400000).toISOString();
    const within30Start = new Date(Date.now() - 25 * 86400000).toISOString();
    const client = makeClient({
      rows: [
        {
          started_at: within7Start,
          status: 'active',
          adherence_percent: 80,
          streak_days: 10,
        },
        {
          started_at: within30Start,
          status: 'active',
          adherence_percent: 60,
          streak_days: 3,
        },
        {
          started_at: '2026-01-01T00:00:00Z',
          status: 'completed',
          adherence_percent: 100,
          streak_days: 60,
        },
      ],
    });
    const result = await getSupplementsSource('u-1', client as never);
    expect(result.last_engaged_at).toBe(within7Start);
    expect(result.recent_events_7d).toBe(1);
    expect(result.recent_events_30d).toBe(2);
    expect(result.source_specific?.active_supplement_count).toBe(2);
    expect(result.source_specific?.longest_streak).toBe(60);
    expect(result.source_specific?.avg_adherence_percent).toBe(80);
  });

  it('returns defaults on error', async () => {
    const client = makeClient({ rows: [], error: { message: 'boom' } });
    const result = await getSupplementsSource('u-1', client as never);
    expect(result.last_engaged_at).toBeNull();
  });

  it('queries supplement_adherence table', async () => {
    const client = makeClient({ rows: [] });
    await getSupplementsSource('u-1', client as never);
    expect(client.from).toHaveBeenCalledWith('supplement_adherence');
  });
});
