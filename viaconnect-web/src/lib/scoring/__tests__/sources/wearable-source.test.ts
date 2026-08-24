// Tests for src/lib/scoring/sources/wearable-source.ts.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getWearableSource } from '../../sources/wearable-source';

interface MockSetup {
  integrations: Record<string, unknown>[];
  dailyScores: Record<string, unknown>[];
  connected?: Record<string, unknown>[];
  recovery?: Record<string, unknown> | null;
  sleep?: Record<string, unknown> | null;
  body?: Record<string, unknown>[];
  integrationsError?: unknown;
  dailyError?: unknown;
}

function emptyChain(data: unknown, error: unknown = null) {
  const resolved = { data, error };
  const maybeSingle = vi.fn().mockResolvedValue(resolved);
  const limit = vi.fn().mockReturnValue({ maybeSingle, ...resolved, then: (fn: (v: unknown) => unknown) => Promise.resolve(resolved).then(fn) });
  const order = vi.fn().mockReturnValue({ limit, maybeSingle });
  const isDeleted = vi.fn().mockReturnValue({ order, then: (fn: (v: unknown) => unknown) => Promise.resolve(resolved).then(fn) });
  const eqStatus = vi.fn().mockResolvedValue(resolved);
  const eq = vi.fn((col: string) => {
    if (col === 'status') return eqStatus;
    return { is: isDeleted, in: vi.fn().mockResolvedValue(resolved), eq: eqStatus };
  });
  const select = vi.fn().mockReturnValue({ eq });
  return { select };
}

function makeClient(setup: MockSetup) {
  const from = vi.fn((table: string) => {
    if (table === 'wearable_integrations') {
      return emptyChain(setup.integrations, setup.integrationsError ?? null);
    }
    if (table === 'daily_scores') {
      return emptyChain(setup.dailyScores, setup.dailyError ?? null);
    }
    if (table === 'connected_sources') {
      return emptyChain(setup.connected ?? []);
    }
    if (table === 'wearable_recovery') {
      return emptyChain(setup.recovery ?? null);
    }
    if (table === 'wearable_sleep_sessions') {
      return emptyChain(setup.sleep ?? null);
    }
    if (table === 'wearable_body_composition') {
      return emptyChain(setup.body ?? []);
    }
    throw new Error(`Unexpected table ${table}`);
  });
  return { from };
}

describe('wearable-source', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns empty when no integrations and no daily_scores', async () => {
    const client = makeClient({ integrations: [], dailyScores: [] });
    const result = await getWearableSource('u-1', client as never);
    expect(result.last_engaged_at).toBeNull();
    expect(result.recent_events_7d).toBe(0);
    expect(result.source_specific?.active_integration_count).toBe(0);
  });

  it('uses MAX of last_sync_date and daily_scores.updated_at for last_engaged_at', async () => {
    const client = makeClient({
      integrations: [
        {
          device_type: 'apple_watch',
          is_active: true,
          last_sync_date: '2026-05-10T08:00:00Z',
          connected_at: '2026-04-01T00:00:00Z',
        },
      ],
      dailyScores: [
        {
          updated_at: '2026-05-11T10:00:00Z',
          date: new Date().toISOString().slice(0, 10),
          data_source: 'wearable',
          recovery_hrv: 55,
          sleep_hours: 7.5,
        },
      ],
    });
    const result = await getWearableSource('u-1', client as never);
    expect(result.last_engaged_at).toBe('2026-05-11T10:00:00Z');
    expect(result.source_specific?.active_integration_count).toBe(1);
    expect(result.source_specific?.device_types).toContain('apple_watch');
  });

  it('counts daily_scores rows within 7 / 30 day windows', async () => {
    const today = new Date();
    const d2 = new Date(today.getTime() - 2 * 86400000).toISOString().slice(0, 10);
    const d20 = new Date(today.getTime() - 20 * 86400000).toISOString().slice(0, 10);
    const client = makeClient({
      integrations: [],
      dailyScores: [
        { updated_at: '2026-05-09T00:00:00Z', date: d2, data_source: 'wearable' },
        { updated_at: '2026-04-21T00:00:00Z', date: d20, data_source: 'mixed' },
      ],
    });
    const result = await getWearableSource('u-1', client as never);
    expect(result.recent_events_7d).toBe(1);
    expect(result.recent_events_30d).toBe(2);
  });

  it('returns defaults on integrations error', async () => {
    const client = makeClient({
      integrations: [],
      dailyScores: [],
      integrationsError: { message: 'boom' },
    });
    const result = await getWearableSource('u-1', client as never);
    expect(result.last_engaged_at).toBeNull();
  });

  it('sees ingested XML / Hume wearable_body_composition rows', async () => {
    const measured = new Date().toISOString();
    const client = makeClient({
      integrations: [],
      dailyScores: [],
      body: [
        {
          measured_at: measured,
          updated_at: measured,
          source_app: 'Hume Health',
        },
      ],
      recovery: { hrv_ms: 41, cycle_date: measured.slice(0, 10), updated_at: measured },
      sleep: { total_sleep_min: 450, end_at: measured },
    });
    const result = await getWearableSource('u-1', client as never);
    expect(result.last_engaged_at).toBe(measured);
    expect(result.source_specific?.latest_hrv).toBe(41);
    expect(result.source_specific?.latest_sleep_hours).toBe(7.5);
    expect(result.source_specific?.device_types).toContain('hume');
    expect(result.recent_events_7d).toBeGreaterThan(0);
  });
});
