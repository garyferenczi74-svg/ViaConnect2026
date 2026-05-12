// Tests for src/lib/scoring/sources/body-tracker-source.ts.
//
// Primary: body_tracker_entries.
// Optional: body_tracker_weight for latest_weight join.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getBodyTrackerSource } from '../../sources/body-tracker-source';

interface MockSetup {
  entries: Record<string, unknown>[];
  weight: Record<string, unknown> | null;
  entriesError?: unknown;
  weightError?: unknown;
}

function makeClient(setup: MockSetup) {
  const from = vi.fn((table: string) => {
    if (table === 'body_tracker_entries') {
      const eq = vi.fn().mockResolvedValue({
        data: setup.entries,
        error: setup.entriesError ?? null,
      });
      const select = vi.fn().mockReturnValue({ eq });
      return { select };
    }
    if (table === 'body_tracker_weight') {
      const maybeSingle = vi.fn().mockResolvedValue({
        data: setup.weight,
        error: setup.weightError ?? null,
      });
      const limit = vi.fn().mockReturnValue({ maybeSingle });
      const order = vi.fn().mockReturnValue({ limit });
      const eq = vi.fn().mockReturnValue({ order });
      const select = vi.fn().mockReturnValue({ eq });
      return { select };
    }
    throw new Error(`Unexpected table ${table}`);
  });
  return { from };
}

describe('body-tracker-source', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns empty / zeros when no entries', async () => {
    const client = makeClient({ entries: [], weight: null });
    const result = await getBodyTrackerSource('u-1', client as never);
    expect(result.last_engaged_at).toBeNull();
    expect(result.recent_events_7d).toBe(0);
    expect(result.recent_events_30d).toBe(0);
    expect(result.source_specific?.latest_weight).toBeNull();
  });

  it('returns populated shape when entries exist', async () => {
    const within7 = new Date(Date.now() - 2 * 86400000);
    const within30 = new Date(Date.now() - 20 * 86400000);
    const within7Date = within7.toISOString().slice(0, 10);
    const within30Date = within30.toISOString().slice(0, 10);
    const client = makeClient({
      entries: [
        {
          created_at: within7.toISOString(),
          entry_date: within7Date,
          source: 'manual',
          scan_photo_url: null,
        },
        {
          created_at: within30.toISOString(),
          entry_date: within30Date,
          source: 'photo',
          scan_photo_url: 'a.jpg',
        },
      ],
      weight: { weight_kg: 75.2, recorded_at: '2026-05-09T00:00:00Z' },
    });
    const result = await getBodyTrackerSource('u-1', client as never);
    expect(result.last_engaged_at).toBe(within7.toISOString());
    expect(result.recent_events_7d).toBe(1);
    expect(result.recent_events_30d).toBe(2);
    expect(result.source_specific?.has_photo_scans).toBe(true);
    expect(result.source_specific?.latest_weight?.weight_kg).toBe(75.2);
  });

  it('returns defaults on entries error', async () => {
    const client = makeClient({ entries: [], weight: null, entriesError: { message: 'x' } });
    const result = await getBodyTrackerSource('u-1', client as never);
    expect(result.last_engaged_at).toBeNull();
  });
});
