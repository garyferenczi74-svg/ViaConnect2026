// Tests for src/lib/scoring/sources/plug-ins-source.ts.
//
// Currently a near-duplicate of wearable-source because the only real
// plug-in backing table is wearable_integrations. When non-wearable
// plug-in tables ship, this source diverges.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getPlugInsSource } from '../../sources/plug-ins-source';

interface MockSetup {
  integrations: Record<string, unknown>[];
  error?: unknown;
}

function makeClient(setup: MockSetup) {
  const eq = vi.fn().mockResolvedValue({
    data: setup.integrations,
    error: setup.error ?? null,
  });
  const select = vi.fn().mockReturnValue({ eq });
  const from = vi.fn().mockReturnValue({ select });
  return { from, select, eq };
}

describe('plug-ins-source', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns empty when no integrations', async () => {
    const client = makeClient({ integrations: [] });
    const result = await getPlugInsSource('u-1', client as never);
    expect(result.last_engaged_at).toBeNull();
    expect(result.source_specific?.active_count).toBe(0);
    expect(result.source_specific?.device_types).toEqual([]);
  });

  it('returns connected_at MAX as last_engaged_at and counts within windows', async () => {
    const within7 = new Date(Date.now() - 3 * 86400000).toISOString();
    const within30 = new Date(Date.now() - 20 * 86400000).toISOString();
    const client = makeClient({
      integrations: [
        {
          device_type: 'oura',
          connected_at: within7,
          last_sync_date: within7,
          is_active: true,
        },
        {
          device_type: 'whoop',
          connected_at: within30,
          last_sync_date: within30,
          is_active: true,
        },
      ],
    });
    const result = await getPlugInsSource('u-1', client as never);
    expect(result.last_engaged_at).toBe(within7);
    expect(result.recent_events_7d).toBe(1);
    expect(result.recent_events_30d).toBe(2);
    expect(result.source_specific?.active_count).toBe(2);
    expect(result.source_specific?.device_types.sort()).toEqual(['oura', 'whoop']);
  });

  it('queries wearable_integrations table', async () => {
    const client = makeClient({ integrations: [] });
    await getPlugInsSource('u-1', client as never);
    expect(client.from).toHaveBeenCalledWith('wearable_integrations');
  });

  it('returns defaults on error', async () => {
    const client = makeClient({ integrations: [], error: { message: 'boom' } });
    const result = await getPlugInsSource('u-1', client as never);
    expect(result.last_engaged_at).toBeNull();
  });
});
