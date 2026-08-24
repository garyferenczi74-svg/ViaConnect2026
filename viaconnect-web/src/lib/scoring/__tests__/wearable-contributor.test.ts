import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  applyWearableContributorToBreakdown,
  wearableContributorFromSource,
} from '../wearable-contributor';
import type { WearableSource } from '../sources/wearable-source';

function source(over: Partial<WearableSource> = {}): WearableSource {
  return {
    last_engaged_at: '2026-08-20T12:00:00.000Z',
    recent_events_7d: 2,
    recent_events_30d: 4,
    source_specific: {
      active_integration_count: 1,
      device_types: ['health_kit'],
      latest_hrv: 42,
      latest_sleep_hours: 7.5,
    },
    ...over,
  };
}

describe('wearable contributor snapshot', () => {
  it('is absent when nothing was ingested', () => {
    const snap = wearableContributorFromSource({
      last_engaged_at: null,
      recent_events_7d: 0,
      recent_events_30d: 0,
      source_specific: {
        active_integration_count: 0,
        device_types: [],
        latest_hrv: null,
        latest_sleep_hours: null,
      },
    });
    expect(snap.present).toBe(false);
  });

  it('is present after ingested wearable metrics', () => {
    const snap = wearableContributorFromSource(source());
    expect(snap.present).toBe(true);
    expect(snap.latest_hrv).toBe(42);
    expect(snap.latest_sleep_hours).toBe(7.5);
  });
});

describe('applyWearableContributorToBreakdown', () => {
  const update = vi.fn();
  const maybeSingle = vi.fn();

  beforeEach(() => {
    update.mockReset();
    maybeSingle.mockReset();
  });

  it('writes contributors.wearable into existing history breakdown', async () => {
    maybeSingle.mockResolvedValue({
      data: {
        id: 'hist-1',
        breakdown: {
          engagement_state: {
            wearable: { last_engaged_at: null, recent_events_7d: 0, recent_events_30d: 0 },
          },
        },
      },
      error: null,
    });
    update.mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
    const admin = {
      from: vi.fn((table: string) => {
        if (table === 'bio_optimization_history') {
          return {
            select: () => ({
              eq: () => ({
                order: () => ({
                  order: () => ({
                    limit: () => ({ maybeSingle }),
                  }),
                }),
              }),
            }),
            update: (payload: { breakdown: Record<string, unknown> }) => {
              expect(payload.breakdown.contributors).toEqual(
                expect.objectContaining({
                  wearable: expect.objectContaining({ present: true, latest_hrv: 42 }),
                }),
              );
              return update(payload);
            },
          };
        }
        throw new Error(table);
      }),
    };
    const result = await applyWearableContributorToBreakdown(admin as never, 'u-1', source());
    expect(result.applied).toBe(true);
    expect(result.historyId).toBe('hist-1');
  });

  it('does not invent a history row when CAQ has never computed', async () => {
    maybeSingle.mockResolvedValue({ data: null, error: null });
    const admin = {
      from: vi.fn(() => ({
        select: () => ({
          eq: () => ({
            order: () => ({
              order: () => ({
                limit: () => ({ maybeSingle }),
              }),
            }),
          }),
        }),
      })),
    };
    const result = await applyWearableContributorToBreakdown(admin as never, 'u-1', source());
    expect(result.applied).toBe(false);
  });
});
