// Prompt 210b P3-T1b: behavioral tests for the circumference history read.
//
// Node env (no jsdom): we test the exported pure fetcher fetchCircumferenceHistory
// against a mocked Supabase client rather than rendering the hook. This exercises
// the real query shapes, ordering, merge/dedupe, the shared circumference
// conversion + DB-column reuse, hip-by-entry_id join, UNKNOWN preservation, the
// genuine-earliest probe, and fail-open resilience. The thin
// useCircumferenceHistory wrapper only adapts this fetcher into React state.

import { describe, it, expect, vi } from 'vitest';
import {
  fetchCircumferenceHistory,
  MAX_ENTRIES,
} from '../useCircumferenceHistory';
import { inchToCm } from '@/lib/body-tracker/circumference';

interface TableConfig {
  rows?: unknown[];
  error?: { message: string } | null;
  reject?: boolean;
  delayMs?: number;
}

// Build a minimal chainable client.
// body_tracker_circumference uses .select().eq().is().order().limit();
// body_tracker_weight (hip) uses .select().eq().in().
// order ascending/descending sorts the configured rows by created_at, then limit
// slices, mirroring the real query so the genuine-earliest probe is realistic.
function makeClient(config: Record<string, TableConfig>) {
  function settle(cfg: TableConfig, data: unknown[]) {
    return new Promise<{ data: unknown[] | null; error: { message: string } | null }>(
      (resolve, reject) => {
        const run = () => {
          if (cfg.reject) {
            reject(new Error('network failure'));
            return;
          }
          if (cfg.error) {
            resolve({ data: null, error: cfg.error });
            return;
          }
          resolve({ data, error: null });
        };
        if (cfg.delayMs && cfg.delayMs > 0) {
          setTimeout(run, cfg.delayMs);
        } else {
          run();
        }
      }
    );
  }

  return {
    from(table: string) {
      const cfg = config[table] ?? {};
      const rows = cfg.rows ?? [];
      return {
        select() {
          return {
            eq() {
              return {
                // circumference path: .is().order().limit()
                is() {
                  return {
                    order(_col: string, opts: { ascending: boolean }) {
                      const sorted = [...(rows as Array<{ created_at: string }>)].sort((a, b) => {
                        const da = new Date(a.created_at).getTime();
                        const db = new Date(b.created_at).getTime();
                        return opts.ascending ? da - db : db - da;
                      });
                      return {
                        limit(n: number) {
                          return settle(cfg, sorted.slice(0, n));
                        },
                      };
                    },
                  };
                },
                // weight (hip) path: .in()
                in(_col: string, _vals: string[]) {
                  return settle(cfg, rows);
                },
              };
            },
          };
        },
      };
    },
  };
}

// A circumference row in inches. waist defaults to a known value for unit checks.
function circRow(
  created_at: string,
  entry_id: string,
  overrides: Record<string, unknown> = {}
) {
  return {
    entry_id,
    entry_unit: 'in' as const,
    created_at,
    neck: 15,
    shoulder_width: 48,
    right_upper_arm: 14,
    right_forearm: 11,
    left_upper_arm: 14,
    left_forearm: 11,
    chest: 40,
    waist: 34,
    right_upper_thigh: 22,
    right_calf: 15,
    left_upper_thigh: 22,
    left_calf: 15,
    ...overrides,
  };
}

function hipRow(entry_id: string, hips_in: number | null) {
  return { entry_id, hips_in };
}

describe('fetchCircumferenceHistory: ordering', () => {
  it('returns entries oldest first with first = earliest and latest = newest', async () => {
    const client = makeClient({
      body_tracker_circumference: {
        rows: [
          circRow('2026-03-01T00:00:00Z', 'e2'),
          circRow('2026-06-01T00:00:00Z', 'e3'),
          circRow('2026-01-01T00:00:00Z', 'e1'),
        ],
      },
      body_tracker_weight: { rows: [] },
    });

    const { entries, error } = await fetchCircumferenceHistory(client, 'user-1', 'in');

    expect(error).toBe(false);
    expect(entries.map((e) => e.recordedAt)).toEqual([
      '2026-01-01T00:00:00Z',
      '2026-03-01T00:00:00Z',
      '2026-06-01T00:00:00Z',
    ]);
    expect(entries[0].recordedAt).toBe('2026-01-01T00:00:00Z');
    expect(entries[entries.length - 1].recordedAt).toBe('2026-06-01T00:00:00Z');
  });
});

describe('fetchCircumferenceHistory: empty', () => {
  it('returns empty entries and error false when the user has no measurements', async () => {
    const client = makeClient({
      body_tracker_circumference: { rows: [] },
      body_tracker_weight: { rows: [] },
    });

    const { entries, error } = await fetchCircumferenceHistory(client, 'user-1', 'in');

    expect(entries).toEqual([]);
    expect(error).toBe(false);
  });
});

describe('fetchCircumferenceHistory: single entry', () => {
  it('first and latest reference the same single entry', async () => {
    const client = makeClient({
      body_tracker_circumference: { rows: [circRow('2026-02-02T00:00:00Z', 'only')] },
      body_tracker_weight: { rows: [] },
    });

    const { entries } = await fetchCircumferenceHistory(client, 'user-1', 'in');

    expect(entries).toHaveLength(1);
    const first = entries[0];
    const latest = entries[entries.length - 1];
    expect(first).toBe(latest);
    expect(first.recordedAt).toBe('2026-02-02T00:00:00Z');
  });
});

describe('fetchCircumferenceHistory: UNKNOWN preservation', () => {
  it('preserves a null measurement as null and a real 0 as 0', async () => {
    const client = makeClient({
      body_tracker_circumference: {
        rows: [circRow('2026-01-01T00:00:00Z', 'e1', { waist: null, neck: 0 })],
      },
      body_tracker_weight: { rows: [] },
    });

    const { entries } = await fetchCircumferenceHistory(client, 'user-1', 'in');
    const m = entries[0].measurements;

    expect(m.waist).toBeNull();
    expect(m.neck).toBe(0);
  });

  it('leaves hip null when no weight row shares the entry_id', async () => {
    const client = makeClient({
      body_tracker_circumference: { rows: [circRow('2026-01-01T00:00:00Z', 'e1')] },
      body_tracker_weight: { rows: [] },
    });

    const { entries } = await fetchCircumferenceHistory(client, 'user-1', 'in');
    expect(entries[0].measurements.hip).toBeNull();
  });
});

describe('fetchCircumferenceHistory: hip join by entry_id', () => {
  it('merges hip from body_tracker_weight onto the matching entry only', async () => {
    const client = makeClient({
      body_tracker_circumference: {
        rows: [
          circRow('2026-01-01T00:00:00Z', 'e1'),
          circRow('2026-02-01T00:00:00Z', 'e2'),
        ],
      },
      body_tracker_weight: { rows: [hipRow('e1', 38)] },
    });

    const { entries } = await fetchCircumferenceHistory(client, 'user-1', 'in');

    // e1 gets hip 38 (in), e2 has no weight row so hip stays null.
    expect(entries[0].measurements.hip).toBe(38);
    expect(entries[1].measurements.hip).toBeNull();
  });
});

describe('fetchCircumferenceHistory: unit conversion locked', () => {
  it('converts stored inches to centimetres when displayUnit is cm', async () => {
    const client = makeClient({
      body_tracker_circumference: { rows: [circRow('2026-01-01T00:00:00Z', 'e1', { waist: 34 })] },
      body_tracker_weight: { rows: [hipRow('e1', 38)] },
    });

    const { entries } = await fetchCircumferenceHistory(client, 'user-1', 'cm');
    const m = entries[0].measurements;

    expect(m.waist).toBe(inchToCm(34));
    expect(m.waist).toBeCloseTo(86.4, 1);
    // hip is stored in inches and must convert too.
    expect(m.hip).toBe(inchToCm(38));
  });

  it('returns stored inches unchanged when displayUnit is in', async () => {
    const client = makeClient({
      body_tracker_circumference: { rows: [circRow('2026-01-01T00:00:00Z', 'e1', { waist: 34 })] },
      body_tracker_weight: { rows: [hipRow('e1', 38)] },
    });

    const { entries } = await fetchCircumferenceHistory(client, 'user-1', 'in');
    expect(entries[0].measurements.waist).toBe(34);
    expect(entries[0].measurements.hip).toBe(38);
  });
});

describe('fetchCircumferenceHistory: resilience fail-open', () => {
  it('fails open (error true, empty) when the circumference query rejects', async () => {
    const client = makeClient({
      body_tracker_circumference: { reject: true },
      body_tracker_weight: { rows: [] },
    });

    const { entries, error } = await fetchCircumferenceHistory(client, 'user-1', 'in');
    expect(entries).toEqual([]);
    expect(error).toBe(true);
  });

  it('fails open when the circumference query returns a Supabase error', async () => {
    const client = makeClient({
      body_tracker_circumference: { error: { message: 'permission denied' } },
      body_tracker_weight: { rows: [] },
    });

    const { entries, error } = await fetchCircumferenceHistory(client, 'user-1', 'in');
    expect(entries).toEqual([]);
    expect(error).toBe(true);
  });

  it('times out the circumference query within the timeout and fails open, never throwing', async () => {
    vi.useFakeTimers();
    try {
      const client = makeClient({
        body_tracker_circumference: {
          delayMs: 10000,
          rows: [circRow('2026-01-01T00:00:00Z', 'e1')],
        },
        body_tracker_weight: { rows: [] },
      });

      const promise = fetchCircumferenceHistory(client, 'user-1', 'in');
      await vi.advanceTimersByTimeAsync(5000);
      const { entries, error } = await promise;

      expect(entries).toEqual([]);
      expect(error).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it('still returns history when the hip query fails (hip fails open to null)', async () => {
    const client = makeClient({
      body_tracker_circumference: {
        rows: [circRow('2026-01-01T00:00:00Z', 'e1'), circRow('2026-02-01T00:00:00Z', 'e2')],
      },
      body_tracker_weight: { reject: true },
    });

    const { entries, error } = await fetchCircumferenceHistory(client, 'user-1', 'in');

    expect(error).toBe(false);
    expect(entries.map((e) => e.recordedAt)).toEqual([
      '2026-01-01T00:00:00Z',
      '2026-02-01T00:00:00Z',
    ]);
    expect(entries[0].measurements.hip).toBeNull();
    // Non-hip measurements still present.
    expect(entries[0].measurements.waist).toBe(34);
  });
});

describe('fetchCircumferenceHistory: genuine earliest under cap', () => {
  it('exports a positive MAX_ENTRIES cap', () => {
    expect(MAX_ENTRIES).toBeGreaterThan(0);
  });

  it('keeps first as the genuine earliest even when it falls outside the recent window', async () => {
    const rows: ReturnType<typeof circRow>[] = [];
    const base = Date.UTC(2026, 0, 1);
    const dayMs = 24 * 60 * 60 * 1000;
    for (let i = 0; i < MAX_ENTRIES + 2; i += 1) {
      rows.push(circRow(new Date(base + i * dayMs).toISOString(), `e${i}`));
    }
    const client = makeClient({
      body_tracker_circumference: { rows },
      body_tracker_weight: { rows: [] },
    });

    const { entries } = await fetchCircumferenceHistory(client, 'user-1', 'in');

    expect(entries[0].recordedAt).toBe(new Date(base).toISOString());
    expect(entries[entries.length - 1].recordedAt).toBe(
      new Date(base + (MAX_ENTRIES + 1) * dayMs).toISOString()
    );
  });
});
