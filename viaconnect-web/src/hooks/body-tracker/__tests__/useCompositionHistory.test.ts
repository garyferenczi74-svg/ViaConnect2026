// Prompt 210b P3-T1: behavioral tests for the composition history read.
//
// Node env (no jsdom): we test the exported pure fetcher fetchCompositionHistory
// against a mocked Supabase client rather than rendering the hook. This exercises
// the real query shapes, ordering, merge/dedupe, mapRows reuse, UNKNOWN
// preservation, and fail-open resilience. The thin useCompositionHistory wrapper
// only adapts this fetcher into React state, so the data contract lives here.

import { describe, it, expect, vi } from 'vitest';
import {
  fetchCompositionHistory,
  MAX_ENTRIES,
} from '../useCompositionHistory';

type EntryRow = { id: string; source: 'scan' | 'manual'; created_at: string };

interface TableConfig {
  // Rows returned by the terminal query (.limit for entries, .in for segmental).
  rows?: unknown[];
  // Force a Supabase-style { error } result.
  error?: { message: string } | null;
  // Reject the awaited query (network style failure).
  reject?: boolean;
  // Delay before settling, in ms (used to trip the timeout).
  delayMs?: number;
}

// Build a minimal chainable client. entries use .eq().order().limit(); segmental
// tables use .select().in(). order ascending/descending sorts the configured rows
// by created_at so the fetcher sees realistic ordering.
function makeClient(config: Record<string, TableConfig>) {
  function settle(cfg: TableConfig, data: unknown[]) {
    const make = () =>
      new Promise<{ data: unknown[] | null; error: { message: string } | null }>(
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
    return make();
  }

  return {
    from(table: string) {
      const cfg = config[table] ?? {};
      const rows = cfg.rows ?? [];
      return {
        select() {
          return {
            // entries path
            eq() {
              return {
                order(_col: string, opts: { ascending: boolean }) {
                  const sorted = [...(rows as EntryRow[])].sort((a, b) => {
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
            // segmental path
            in(_col: string, _vals: string[]) {
              return settle(cfg, rows);
            },
          };
        },
      };
    },
  };
}

function entry(id: string, created_at: string, source: 'scan' | 'manual' = 'scan'): EntryRow {
  return { id, source, created_at };
}

function fatRow(entry_id: string, overrides: Record<string, unknown> = {}) {
  return {
    entry_id,
    right_arm_pct: 20,
    left_arm_pct: 20,
    trunk_pct: 25,
    right_leg_pct: 22,
    left_leg_pct: 22,
    total_body_fat_pct: 23,
    visceral_fat_rating: 8,
    body_water_pct: 55,
    ...overrides,
  };
}

function muscleRow(entry_id: string, overrides: Record<string, unknown> = {}) {
  return {
    entry_id,
    right_arm_lbs: 8,
    left_arm_lbs: 8,
    trunk_lbs: 40,
    right_leg_lbs: 18,
    left_leg_lbs: 18,
    total_muscle_mass_lbs: 92,
    skeletal_muscle_mass_lbs: 80,
    ...overrides,
  };
}

describe('fetchCompositionHistory: ordering', () => {
  it('returns snapshots oldest first with first = earliest and latest = newest', async () => {
    const e1 = entry('e1', '2026-01-01T00:00:00Z');
    const e2 = entry('e2', '2026-03-01T00:00:00Z');
    const e3 = entry('e3', '2026-06-01T00:00:00Z');
    const client = makeClient({
      body_tracker_entries: { rows: [e2, e3, e1] },
      body_tracker_segmental_fat: { rows: [fatRow('e1'), fatRow('e2'), fatRow('e3')] },
      body_tracker_segmental_muscle: {
        rows: [muscleRow('e1'), muscleRow('e2'), muscleRow('e3')],
      },
    });

    const { snapshots, error } = await fetchCompositionHistory(client, 'user-1');

    expect(error).toBe(false);
    expect(snapshots.map((s) => s.entryId)).toEqual(['e1', 'e2', 'e3']);
    expect(snapshots[0].entryId).toBe('e1');
    expect(snapshots[snapshots.length - 1].entryId).toBe('e3');
  });
});

describe('fetchCompositionHistory: empty', () => {
  it('returns empty snapshots and error false when the user has no scans', async () => {
    const client = makeClient({
      body_tracker_entries: { rows: [] },
      body_tracker_segmental_fat: { rows: [] },
      body_tracker_segmental_muscle: { rows: [] },
    });

    const { snapshots, error } = await fetchCompositionHistory(client, 'user-1');

    expect(snapshots).toEqual([]);
    expect(error).toBe(false);
  });
});

describe('fetchCompositionHistory: single scan', () => {
  it('first and latest reference the same single snapshot', async () => {
    const e1 = entry('only', '2026-02-02T00:00:00Z');
    const client = makeClient({
      body_tracker_entries: { rows: [e1] },
      body_tracker_segmental_fat: { rows: [fatRow('only')] },
      body_tracker_segmental_muscle: { rows: [muscleRow('only')] },
    });

    const { snapshots } = await fetchCompositionHistory(client, 'user-1');

    expect(snapshots).toHaveLength(1);
    const first = snapshots[0];
    const latest = snapshots[snapshots.length - 1];
    expect(first).toBe(latest);
    expect(first.entryId).toBe('only');
  });
});

describe('fetchCompositionHistory: UNKNOWN preservation', () => {
  it('preserves null regions as null (never coerces to 0) and a real 0 as 0', async () => {
    const e1 = entry('e1', '2026-01-01T00:00:00Z');
    const client = makeClient({
      body_tracker_entries: { rows: [e1] },
      body_tracker_segmental_fat: {
        // trunk explicitly 0 (a real measurement), total + arm unknown (null).
        rows: [
          fatRow('e1', {
            total_body_fat_pct: null,
            right_arm_pct: null,
            trunk_pct: 0,
          }),
        ],
      },
      body_tracker_segmental_muscle: { rows: [muscleRow('e1')] },
    });

    const { snapshots } = await fetchCompositionHistory(client, 'user-1');
    const snap = snapshots[0];

    expect(snap.totalBodyFatPct).toBeNull();
    expect(snap.regionFatPct.right_arm).toBeNull();
    expect(snap.regionFatPct.trunk).toBe(0);
  });

  it('preserves nulls across a scan that has an entry but no segmental rows', async () => {
    const e1 = entry('e1', '2026-01-01T00:00:00Z', 'manual');
    const client = makeClient({
      body_tracker_entries: { rows: [e1] },
      // No fat/muscle rows for this entry at all.
      body_tracker_segmental_fat: { rows: [] },
      body_tracker_segmental_muscle: { rows: [] },
    });

    const { snapshots } = await fetchCompositionHistory(client, 'user-1');
    const snap = snapshots[0];

    expect(snap.entryId).toBe('e1');
    expect(snap.totalBodyFatPct).toBeNull();
    expect(snap.regionFatPct.trunk).toBeNull();
    expect(snap.totalMuscleMassLbs).toBeNull();
    expect(snap.regionMuscleLbs.trunk).toBeNull();
  });
});

describe('fetchCompositionHistory: resilience fail-open', () => {
  it('fails open (error true, empty history) when the entries query rejects', async () => {
    const client = makeClient({
      body_tracker_entries: { reject: true },
      body_tracker_segmental_fat: { rows: [] },
      body_tracker_segmental_muscle: { rows: [] },
    });

    const { snapshots, error } = await fetchCompositionHistory(client, 'user-1');

    expect(snapshots).toEqual([]);
    expect(error).toBe(true);
  });

  it('fails open when the entries query returns a Supabase error', async () => {
    const client = makeClient({
      body_tracker_entries: { error: { message: 'permission denied' } },
      body_tracker_segmental_fat: { rows: [] },
      body_tracker_segmental_muscle: { rows: [] },
    });

    const { snapshots, error } = await fetchCompositionHistory(client, 'user-1');

    expect(snapshots).toEqual([]);
    expect(error).toBe(true);
  });

  it('times out the entries query within the timeout and fails open, never throwing', async () => {
    vi.useFakeTimers();
    try {
      const client = makeClient({
        // Settles only after 10s; the 4s timeout must win first.
        body_tracker_entries: { delayMs: 10000, rows: [entry('e1', '2026-01-01T00:00:00Z')] },
        body_tracker_segmental_fat: { rows: [] },
        body_tracker_segmental_muscle: { rows: [] },
      });

      const promise = fetchCompositionHistory(client, 'user-1');
      // Advance past the 4s withTimeout window.
      await vi.advanceTimersByTimeAsync(5000);
      const { snapshots, error } = await promise;

      expect(snapshots).toEqual([]);
      expect(error).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it('still returns the history when a segmental query fails (fat/muscle fail open to nulls)', async () => {
    const e1 = entry('e1', '2026-01-01T00:00:00Z');
    const e2 = entry('e2', '2026-02-01T00:00:00Z');
    const client = makeClient({
      body_tracker_entries: { rows: [e1, e2] },
      body_tracker_segmental_fat: { reject: true },
      body_tracker_segmental_muscle: { rows: [muscleRow('e1'), muscleRow('e2')] },
    });

    const { snapshots, error } = await fetchCompositionHistory(client, 'user-1');

    expect(error).toBe(false);
    expect(snapshots.map((s) => s.entryId)).toEqual(['e1', 'e2']);
    // Fat failed open: fat-derived fields are null, muscle still present.
    expect(snapshots[0].totalBodyFatPct).toBeNull();
    expect(snapshots[0].regionFatPct.trunk).toBeNull();
    expect(snapshots[0].totalMuscleMassLbs).toBe(92);
  });
});

describe('fetchCompositionHistory: genuine earliest under cap', () => {
  it('exports a positive MAX_ENTRIES cap', () => {
    expect(MAX_ENTRIES).toBeGreaterThan(0);
  });

  it('keeps first as the genuine earliest even when it falls outside the recent window', async () => {
    // The mock entries table sorts + slices by limit like the real query. The
    // recent window (desc, limit MAX_ENTRIES) would drop the oldest if there are
    // more than MAX_ENTRIES rows; the separate ascending limit-1 probe pulls it
    // back. Simulate MAX_ENTRIES + 2 entries.
    const rows: EntryRow[] = [];
    const base = Date.UTC(2026, 0, 1); // 2026-01-01
    const dayMs = 24 * 60 * 60 * 1000;
    for (let i = 0; i < MAX_ENTRIES + 2; i += 1) {
      rows.push(entry(`e${i}`, new Date(base + i * dayMs).toISOString()));
    }
    // earliest is e0 (2026-01-01).
    const client = makeClient({
      body_tracker_entries: { rows },
      body_tracker_segmental_fat: { rows: [] },
      body_tracker_segmental_muscle: { rows: [] },
    });

    const { snapshots } = await fetchCompositionHistory(client, 'user-1');

    expect(snapshots[0].entryId).toBe('e0');
    // newest present too.
    expect(snapshots[snapshots.length - 1].entryId).toBe(`e${MAX_ENTRIES + 1}`);
  });
});
