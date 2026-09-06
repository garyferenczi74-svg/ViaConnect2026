'use client';

// Prompt 210b P3-T1: ordered scan history read for the FormaVision Time Machine.
//
// This generalizes the latest-scan read (useLatestComposition) to the FULL
// ordered history against the SAME body_tracker tables. It is the single data
// foundation that the Phase 3 timeline scrubber, the avatar firstScan prop, and
// the Section 8 latest vs first delta will consume.
//
// Single source of truth: each entry is mapped to a CompositionSnapshot via the
// existing pure mapRows. Composition is NOT recomputed here and the snapshot
// shape is NOT redefined. UNKNOWN is preserved exactly as the latest read does:
// null stays null, never coerced to 0, never fabricated.
//
// Spine: body_tracker_entries ordered by created_at, joined to
// body_tracker_segmental_fat and body_tracker_segmental_muscle by entry_id.
//
// History cap: to bound payload we fetch the most recent MAX_ENTRIES entries by
// created_at DESC, PLUS the single genuine earliest entry separately, then merge
// and sort ascending. This guarantees first is the real earliest scan even when
// the middle of a long history is capped out. See fetchCompositionHistory.

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { withTimeout } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';
import { mapRows } from '@/lib/body-tracker/composition/mapRows';
import type { CompositionSnapshot } from '@/lib/body-tracker/composition/types';

export interface UseCompositionHistoryResult {
  snapshots: CompositionSnapshot[];
  first: CompositionSnapshot | null;
  latest: CompositionSnapshot | null;
  loading: boolean;
  error: boolean;
  refresh: () => void;
}

const TIMEOUT_MS = 4000;
const SCOPE = 'body-tracker.composition-history';

// Most recent entries fetched in the primary window. The genuine earliest entry
// is always fetched separately so first stays real even past this cap.
export const MAX_ENTRIES = 60;

type EntryRow = {
  id: string;
  source: string;
  created_at: string;
  scan_id?: string | null;
  notes?: string | null;
  device_name?: string | null;
  manual_source_id?: string | null;
};

type FatRow = {
  right_arm_pct: number | null;
  left_arm_pct: number | null;
  trunk_pct: number | null;
  right_leg_pct: number | null;
  left_leg_pct: number | null;
  total_body_fat_pct: number | null;
  visceral_fat_rating: number | null;
  body_water_pct: number | null;
  entry_id: string | null;
};

type MuscleRow = {
  right_arm_lbs: number | null;
  left_arm_lbs: number | null;
  trunk_lbs: number | null;
  right_leg_lbs: number | null;
  left_leg_lbs: number | null;
  total_muscle_mass_lbs: number | null;
  skeletal_muscle_mass_lbs: number | null;
  entry_id: string | null;
};

// Minimal structural view of the Supabase client surface this read touches.
// Kept local so the hook never imports generated DB types it does not own.
type QueryResult<T> = { data: T | null; error: { message: string } | null };

interface OrderedQuery<T> {
  order: (col: string, opts: { ascending: boolean }) => {
    limit: (n: number) => Promise<QueryResult<T[]>>;
  };
}

interface FilterableQuery<T> {
  eq: (col: string, val: string) => OrderedQuery<T>;
  in: (col: string, vals: string[]) => Promise<QueryResult<T[]>>;
}

interface MinimalClient {
  from: (table: string) => {
    select: (cols: string) => FilterableQuery<unknown>;
  };
}

const ENTRY_COLS = 'id,source,created_at,scan_id,notes,device_name,manual_source_id';
const FAT_COLS =
  'right_arm_pct,left_arm_pct,trunk_pct,right_leg_pct,left_leg_pct,total_body_fat_pct,visceral_fat_rating,body_water_pct,entry_id';
const MUSCLE_COLS =
  'right_arm_lbs,left_arm_lbs,trunk_lbs,right_leg_lbs,left_leg_lbs,total_muscle_mass_lbs,skeletal_muscle_mass_lbs,entry_id';

/**
 * Pure async read: returns the user's composition history oldest first.
 *
 * Every Supabase call is wrapped in withTimeout and an individual try/catch that
 * fails open (the affected slice becomes empty), so a single missing table never
 * collapses the whole read. The function itself never throws: on a hard failure
 * it returns empty snapshots with error true.
 *
 * Exported for unit testing with a mocked client.
 */
export async function fetchCompositionHistory(
  client: unknown,
  userId: string
): Promise<{ snapshots: CompositionSnapshot[]; error: boolean }> {
  const supabase = client as MinimalClient;

  // 1. Spine: most recent MAX_ENTRIES entries (desc) plus the genuine earliest.
  let recentEntries: EntryRow[] = [];
  try {
    const result = await withTimeout(
      supabase
        .from('body_tracker_entries')
        .select(ENTRY_COLS)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(MAX_ENTRIES),
      TIMEOUT_MS,
      `${SCOPE}.entries.recent`
    );
    if (result.error) {
      safeLog.warn(SCOPE, 'recent entries query error', { message: result.error.message });
      return { snapshots: [], error: true };
    }
    recentEntries = (result.data as EntryRow[] | null) ?? [];
  } catch (e) {
    safeLog.warn(SCOPE, 'recent entries fetch failed (fail-open)', { error: e });
    return { snapshots: [], error: true };
  }

  let earliestEntries: EntryRow[] = [];
  try {
    const result = await withTimeout(
      supabase
        .from('body_tracker_entries')
        .select(ENTRY_COLS)
        .eq('user_id', userId)
        .order('created_at', { ascending: true })
        .limit(1),
      TIMEOUT_MS,
      `${SCOPE}.entries.earliest`
    );
    if (result.error) {
      safeLog.warn(SCOPE, 'earliest entry query error', { message: result.error.message });
    } else {
      earliestEntries = (result.data as EntryRow[] | null) ?? [];
    }
  } catch (e) {
    // Fail open: if the earliest probe fails we still return the recent window.
    safeLog.warn(SCOPE, 'earliest entry fetch failed (fail-open)', { error: e });
  }

  // Merge recent + earliest, dedupe by id, sort ascending (oldest first).
  const byId = new Map<string, EntryRow>();
  for (const row of recentEntries) byId.set(row.id, row);
  for (const row of earliestEntries) byId.set(row.id, row);

  const entries = Array.from(byId.values()).sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  if (entries.length === 0) {
    return { snapshots: [], error: false };
  }

  const entryIds = entries.map((e) => e.id);

  // 2. Segmental fat rows for those entries, keyed by entry_id.
  const fatByEntry = new Map<string, FatRow>();
  try {
    const result = await withTimeout(
      supabase
        .from('body_tracker_segmental_fat')
        .select(FAT_COLS)
        .in('entry_id', entryIds),
      TIMEOUT_MS,
      `${SCOPE}.fat`
    );
    if (result.error) {
      safeLog.warn(SCOPE, 'fat rows query error (fail-open)', { message: result.error.message });
    } else {
      for (const row of (result.data as FatRow[] | null) ?? []) {
        if (row.entry_id) fatByEntry.set(row.entry_id, row);
      }
    }
  } catch (e) {
    safeLog.warn(SCOPE, 'fat rows fetch failed (fail-open)', { error: e });
  }

  // 3. Segmental muscle rows for those entries, keyed by entry_id.
  const muscleByEntry = new Map<string, MuscleRow>();
  try {
    const result = await withTimeout(
      supabase
        .from('body_tracker_segmental_muscle')
        .select(MUSCLE_COLS)
        .in('entry_id', entryIds),
      TIMEOUT_MS,
      `${SCOPE}.muscle`
    );
    if (result.error) {
      safeLog.warn(SCOPE, 'muscle rows query error (fail-open)', { message: result.error.message });
    } else {
      for (const row of (result.data as MuscleRow[] | null) ?? []) {
        if (row.entry_id) muscleByEntry.set(row.entry_id, row);
      }
    }
  } catch (e) {
    safeLog.warn(SCOPE, 'muscle rows fetch failed (fail-open)', { error: e });
  }

  // 4. Map each entry through the SAME pure mapRows. Entry is always present so
  // mapRows never returns null here; fat/muscle absence yields preserved nulls.
  const snapshots: CompositionSnapshot[] = [];
  for (const entry of entries) {
    const snap = mapRows({
      entry,
      fat: fatByEntry.get(entry.id) ?? null,
      muscle: muscleByEntry.get(entry.id) ?? null,
    });
    if (snap) snapshots.push(snap);
  }

  return { snapshots, error: false };
}

export function useCompositionHistory(userId: string | null): UseCompositionHistoryResult {
  const [snapshots, setSnapshots] = useState<CompositionSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const refresh = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    if (!userId) {
      setSnapshots([]);
      setLoading(false);
      setError(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(false);

    (async () => {
      try {
        const supabase = createClient();
        const { snapshots: rows, error: failed } = await fetchCompositionHistory(supabase, userId);
        if (cancelled) return;
        setSnapshots(rows);
        setError(failed);
        setLoading(false);
      } catch (e) {
        if (cancelled) return;
        safeLog.error(SCOPE, 'top-level history load failed (fail-open)', { error: e, userId });
        setSnapshots([]);
        setError(true);
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, reloadKey]);

  const first = snapshots.length > 0 ? snapshots[0] : null;
  const latest = snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;

  return { snapshots, first, latest, loading, error, refresh };
}
