'use client';

// Prompt 210b P3-T1b: ordered circumference history read for the FormaVision
// Time Machine. The circumference twin of useCompositionHistory (P3-T1).
//
// useCircumferenceData (the existing latest read) returns only latest + previous
// (limit 2) and no genuine earliest, so a full ordered history is NOT already
// available there. This hook adds that history WITHOUT redefining the
// measurement shape: it reuses the shared circumference lib as the single source
// of truth for the CircumferenceMeasurements type, MEASUREMENT_KEYS, the
// DB column mapping, emptyMeasurements, and the unit conversion. Composition of
// rows is not recomputed and no new table is introduced.
//
// Hip is sourced from body_tracker_weight.hips_in (per the #85d WHR-as-source
// storage decision) exactly as the latest read does. Here we join hip by the
// shared entry_id (both circumference and weight detail rows hang off one
// body_tracker_entries header) rather than positionally, so hip stays correct
// across the full history. UNKNOWN is preserved: a null measurement stays null,
// a real 0 stays 0, hip is null when no weight row shares the entry.
//
// History cap mirrors P3-T1: fetch the most recent MAX_ENTRIES rows (desc) PLUS
// the single genuine earliest row (ascending limit 1), merge, dedupe, sort
// ascending. This guarantees first is the real earliest measurement even when
// the middle of a long history is capped out.

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { withTimeout } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';
import {
  MEASUREMENT_DB_COLUMN,
  MEASUREMENT_EXTERNAL_KEYS,
  MEASUREMENT_KEYS,
  convertAllMeasurements,
  convertMeasurement,
  emptyMeasurements,
  type CircumferenceMeasurements,
  type MeasurementUnit,
} from '@/lib/body-tracker/circumference';

export interface CircumferenceHistoryEntry {
  measurements: CircumferenceMeasurements;
  recordedAt: string;
}

export interface UseCircumferenceHistoryResult {
  entries: CircumferenceHistoryEntry[];
  first: CircumferenceHistoryEntry | null;
  latest: CircumferenceHistoryEntry | null;
  unit: MeasurementUnit;
  loading: boolean;
  error: boolean;
  refresh: () => void;
}

const TIMEOUT_MS = 4000;
const SCOPE = 'body-tracker.circumference-history';

// Most recent rows fetched in the primary window. The genuine earliest row is
// always fetched separately so first stays real even past this cap.
export const MAX_ENTRIES = 60;

// Raw body_tracker_circumference shape this read touches. entry_id is the join
// key to the parent entry (and to the external hip source).
interface CircumferenceRow {
  entry_id: string | null;
  entry_unit: MeasurementUnit;
  created_at: string;
  neck: number | null;
  shoulder_width: number | null;
  right_upper_arm: number | null;
  right_forearm: number | null;
  left_upper_arm: number | null;
  left_forearm: number | null;
  chest: number | null;
  waist: number | null;
  right_upper_thigh: number | null;
  right_calf: number | null;
  left_upper_thigh: number | null;
  left_calf: number | null;
}

interface WeightHipRow {
  entry_id: string | null;
  hips_in: number | null;
}

// Minimal structural views of the Supabase client surface this read touches.
type QueryResult<T> = { data: T | null; error: { message: string } | null };

interface IsThenOrder<T> {
  is: (col: string, val: null) => {
    order: (col: string, opts: { ascending: boolean }) => {
      limit: (n: number) => Promise<QueryResult<T[]>>;
    };
  };
}

interface MinimalClient {
  from: (table: string) => {
    select: (cols: string) => {
      eq: (col: string, val: string) => IsThenOrder<unknown> & {
        in: (col: string, vals: string[]) => Promise<QueryResult<unknown[]>>;
      };
    };
  };
}

const CIRCUMFERENCE_COLS =
  'entry_id,entry_unit,created_at,neck,shoulder_width,right_upper_arm,right_forearm,left_upper_arm,left_forearm,chest,waist,right_upper_thigh,right_calf,left_upper_thigh,left_calf';

// Reuse the shared DB column mapping so the measurement keys stay single-source.
// Hip is external (body_tracker_weight); it is skipped here and merged below.
function rowToMeasurements(row: CircumferenceRow): CircumferenceMeasurements {
  const out = emptyMeasurements();
  for (const k of MEASUREMENT_KEYS) {
    if (MEASUREMENT_EXTERNAL_KEYS[k]) continue; // hip handled separately
    const dbCol = MEASUREMENT_DB_COLUMN[k] as keyof CircumferenceRow;
    const v = row[dbCol];
    out[k] = typeof v === 'number' ? v : null;
  }
  return out;
}

/**
 * Pure async read: returns the user's circumference history oldest first, with
 * all values converted to displayUnit. Every Supabase call is wrapped in
 * withTimeout and an individual try/catch that fails open. The function never
 * throws: on a hard failure it returns empty entries with error true.
 *
 * Exported for unit testing with a mocked client.
 */
export async function fetchCircumferenceHistory(
  client: unknown,
  userId: string,
  displayUnit: MeasurementUnit
): Promise<{ entries: CircumferenceHistoryEntry[]; error: boolean }> {
  const supabase = client as MinimalClient;

  // 1. Most recent MAX_ENTRIES circumference rows (desc).
  let recentRows: CircumferenceRow[] = [];
  try {
    const result = await withTimeout(
      supabase
        .from('body_tracker_circumference')
        .select(CIRCUMFERENCE_COLS)
        .eq('user_id', userId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(MAX_ENTRIES),
      TIMEOUT_MS,
      `${SCOPE}.recent`
    );
    if (result.error) {
      safeLog.warn(SCOPE, 'recent rows query error', { message: result.error.message });
      return { entries: [], error: true };
    }
    recentRows = (result.data as CircumferenceRow[] | null) ?? [];
  } catch (e) {
    safeLog.warn(SCOPE, 'recent rows fetch failed (fail-open)', { error: e });
    return { entries: [], error: true };
  }

  // 2. Genuine earliest circumference row (ascending limit 1).
  let earliestRows: CircumferenceRow[] = [];
  try {
    const result = await withTimeout(
      supabase
        .from('body_tracker_circumference')
        .select(CIRCUMFERENCE_COLS)
        .eq('user_id', userId)
        .is('deleted_at', null)
        .order('created_at', { ascending: true })
        .limit(1),
      TIMEOUT_MS,
      `${SCOPE}.earliest`
    );
    if (result.error) {
      safeLog.warn(SCOPE, 'earliest row query error', { message: result.error.message });
    } else {
      earliestRows = (result.data as CircumferenceRow[] | null) ?? [];
    }
  } catch (e) {
    // Fail open: if the earliest probe fails we still return the recent window.
    safeLog.warn(SCOPE, 'earliest row fetch failed (fail-open)', { error: e });
  }

  // Merge recent + earliest, dedupe by created_at, sort ascending (oldest first).
  // created_at is the natural per-row key here (one circumference row per save).
  const byKey = new Map<string, CircumferenceRow>();
  for (const row of recentRows) byKey.set(row.created_at, row);
  for (const row of earliestRows) byKey.set(row.created_at, row);

  const rows = Array.from(byKey.values()).sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  if (rows.length === 0) {
    return { entries: [], error: false };
  }

  // 3. External hip values keyed by entry_id (per #85d hip-from-weight storage).
  const hipByEntry = new Map<string, number | null>();
  const entryIds = rows
    .map((r) => r.entry_id)
    .filter((id): id is string => typeof id === 'string' && id.length > 0);

  if (entryIds.length > 0) {
    try {
      const result = await withTimeout(
        supabase
          .from('body_tracker_weight')
          .select('entry_id,hips_in')
          .eq('user_id', userId)
          .in('entry_id', entryIds) as unknown as Promise<QueryResult<WeightHipRow[]>>,
        TIMEOUT_MS,
        `${SCOPE}.hip`
      );
      if (result.error) {
        safeLog.warn(SCOPE, 'hip rows query error (fail-open)', { message: result.error.message });
      } else {
        for (const row of (result.data as WeightHipRow[] | null) ?? []) {
          if (row.entry_id) hipByEntry.set(row.entry_id, row.hips_in);
        }
      }
    } catch (e) {
      safeLog.warn(SCOPE, 'hip rows fetch failed (fail-open)', { error: e });
    }
  }

  const hipExternal = MEASUREMENT_EXTERNAL_KEYS.hip;

  // 4. Convert each row to displayUnit via the shared converter, merge hip.
  const entries: CircumferenceHistoryEntry[] = rows.map((row) => {
    const raw = rowToMeasurements(row);
    const measurements = convertAllMeasurements(raw, row.entry_unit, displayUnit);

    const hipRaw = row.entry_id ? hipByEntry.get(row.entry_id) ?? null : null;
    measurements.hip =
      hipRaw !== null && hipExternal
        ? convertMeasurement(hipRaw, hipExternal.storedUnit, displayUnit)
        : null;

    return { measurements, recordedAt: row.created_at };
  });

  return { entries, error: false };
}

export function useCircumferenceHistory(
  userId: string | null,
  displayUnit: MeasurementUnit
): UseCircumferenceHistoryResult {
  const [entries, setEntries] = useState<CircumferenceHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const refresh = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    if (!userId) {
      setEntries([]);
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
        const { entries: rows, error: failed } = await fetchCircumferenceHistory(
          supabase,
          userId,
          displayUnit
        );
        if (cancelled) return;
        setEntries(rows);
        setError(failed);
        setLoading(false);
      } catch (e) {
        if (cancelled) return;
        safeLog.error(SCOPE, 'top-level history load failed (fail-open)', { error: e, userId });
        setEntries([]);
        setError(true);
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, displayUnit, reloadKey]);

  const first = entries.length > 0 ? entries[0] : null;
  const latest = entries.length > 0 ? entries[entries.length - 1] : null;

  return { entries, first, latest, unit: displayUnit, loading, error, refresh };
}
