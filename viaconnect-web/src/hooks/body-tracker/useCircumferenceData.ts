'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  MEASUREMENT_DB_COLUMN,
  MEASUREMENT_EXTERNAL_KEYS,
  MEASUREMENT_KEYS,
  convertAllMeasurements,
  convertMeasurement,
  emptyMeasurements,
  type CircumferenceMeasurements,
  type CircumferenceConfidence,
  type MeasurementKey,
  type MeasurementUnit,
} from '@/lib/body-tracker/circumference';

interface UseCircumferenceDataOptions {
  userId: string | null;
  displayUnit: MeasurementUnit;
}

export interface CircumferenceDisplayData {
  latest: CircumferenceMeasurements | null;
  previous: CircumferenceMeasurements | null;
  lastLoggedDate: string | null;
  /**
   * Per-measurement confidence scores (0-1) for the LATEST circumference entry.
   * Populated from the body_tracker_circumference confidence columns added in
   * Task 10 (Prompt 210c). null for manual entries (pre-Task-10 scans, or
   * measurements not from a scan). RULE 9: never 0 for an absent confidence value.
   */
  latestConfidence: CircumferenceConfidence | null;
}

export interface UseCircumferenceDataResult {
  data: CircumferenceDisplayData;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

const EMPTY: CircumferenceDisplayData = {
  latest: null,
  previous: null,
  lastLoggedDate: null,
  latestConfidence: null,
};

interface CircumferenceRow {
  entry_unit: MeasurementUnit;
  created_at: string;
  // Measurement values
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
  body_tracker_entries?: { entry_date: string | null } | null;
  // Per-girth confidence columns (Task 10, Prompt 210c). Null for pre-Task-10 rows.
  neck_confidence: number | null;
  shoulder_width_confidence: number | null;
  right_upper_arm_confidence: number | null;
  right_forearm_confidence: number | null;
  left_upper_arm_confidence: number | null;
  left_forearm_confidence: number | null;
  chest_confidence: number | null;
  waist_confidence: number | null;
  right_upper_thigh_confidence: number | null;
  right_calf_confidence: number | null;
  left_upper_thigh_confidence: number | null;
  left_calf_confidence: number | null;
}

function rowToMeasurements(row: CircumferenceRow): CircumferenceMeasurements {
  const out = emptyMeasurements();
  for (const k of MEASUREMENT_KEYS) {
    const dbCol = MEASUREMENT_DB_COLUMN[k] as keyof CircumferenceRow;
    const v = row[dbCol];
    out[k] = typeof v === 'number' ? v : null;
  }
  return out;
}

/**
 * Build an empty CircumferenceConfidence (all null) for the given measurement keys.
 * Used as a base before merging per-key confidence values.
 */
function emptyConfidence(): CircumferenceConfidence {
  return MEASUREMENT_KEYS.reduce<CircumferenceConfidence>((acc, k) => {
    acc[k] = null;
    return acc;
  }, {} as CircumferenceConfidence);
}

/**
 * Extract per-girth confidence scores from a body_tracker_circumference row.
 * Column pattern: MEASUREMENT_DB_COLUMN[key] + '_confidence', except hip which
 * is sourced from body_tracker_weight.hips_confidence (returned as null here;
 * the caller merges the hip confidence from the weight query).
 * Returns null for any column that is absent or not a number (RULE 9).
 */
function rowToConfidence(row: CircumferenceRow): CircumferenceConfidence {
  const out = emptyConfidence();
  for (const k of MEASUREMENT_KEYS) {
    if (k === 'hip') {
      out[k] = null; // hip confidence comes from body_tracker_weight; merged below
      continue;
    }
    const confCol = (`${MEASUREMENT_DB_COLUMN[k]}_confidence`) as keyof CircumferenceRow;
    const v = row[confCol];
    out[k] = typeof v === 'number' ? v : null;
  }
  return out;
}

/** Check whether all confidence values in a record are null (no scan confidence available). */
function allConfidenceNull(conf: CircumferenceConfidence): boolean {
  return (Object.keys(conf) as MeasurementKey[]).every((k) => conf[k] === null);
}

export function useCircumferenceData(opts: UseCircumferenceDataOptions): UseCircumferenceDataResult {
  const [data, setData] = useState<CircumferenceDisplayData>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refresh = () => setTick((t) => t + 1);

  useEffect(() => {
    if (!opts.userId) {
      setData(EMPTY);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const supabase = createClient();
        const circumferenceQuery = (supabase as never as {
          from: (t: string) => {
            select: (cols: string) => {
              eq: (col: string, val: string) => {
                is: (col: string, val: null) => {
                  order: (col: string, opts: { ascending: boolean }) => {
                    limit: (n: number) => Promise<{ data: CircumferenceRow[] | null; error: { message: string } | null }>;
                  };
                };
              };
            };
          };
        })
          .from('body_tracker_circumference')
          .select('*, body_tracker_entries(entry_date)')
          .eq('user_id', opts.userId!)
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .limit(2);

        const externalWeightQuery = (supabase as never as {
          from: (t: string) => {
            select: (cols: string) => {
              eq: (col: string, val: string) => {
                order: (col: string, opts: { ascending: boolean }) => {
                  limit: (n: number) => Promise<{
                    data: Array<{ hips_in: number | null; hips_confidence: number | null }> | null;
                    error: { message: string } | null;
                  }>;
                };
              };
            };
          };
        })
          .from('body_tracker_weight')
          .select('hips_in, hips_confidence, created_at')
          .eq('user_id', opts.userId!)
          .order('created_at', { ascending: false })
          .limit(2);

        const [{ data: rows, error: dbErr }, { data: weightRows, error: weightErr }] = await Promise.all([
          circumferenceQuery,
          externalWeightQuery,
        ]);

        if (cancelled) return;
        if (dbErr) throw new Error(dbErr.message);
        if (weightErr) throw new Error(weightErr.message);

        const list = rows ?? [];
        const weightList = weightRows ?? [];

        const hipExternal = MEASUREMENT_EXTERNAL_KEYS.hip;
        const latestHipIn = weightList[0]?.hips_in ?? null;
        const previousHipIn = weightList[1]?.hips_in ?? null;
        // Hip confidence from body_tracker_weight (Task 10 column, null for pre-Task-10 rows)
        const latestHipConfidence = weightList[0]?.hips_confidence ?? null;
        const latestHipDisplay =
          latestHipIn !== null && hipExternal
            ? convertMeasurement(latestHipIn, hipExternal.storedUnit, opts.displayUnit)
            : null;
        const previousHipDisplay =
          previousHipIn !== null && hipExternal
            ? convertMeasurement(previousHipIn, hipExternal.storedUnit, opts.displayUnit)
            : null;

        if (list.length === 0 && weightList.length === 0) {
          setData(EMPTY);
          setLoading(false);
          return;
        }

        let latest: CircumferenceMeasurements | null = null;
        let previous: CircumferenceMeasurements | null = null;
        let lastLoggedDate: string | null = null;
        let latestConfidence: CircumferenceConfidence | null = null;

        if (list.length > 0) {
          const latestRow = list[0];
          const latestRaw = rowToMeasurements(latestRow);
          latest = convertAllMeasurements(latestRaw, latestRow.entry_unit, opts.displayUnit);
          lastLoggedDate = latestRow.body_tracker_entries?.entry_date ?? latestRow.created_at;
          // Build confidence from the latest row (confidence values are unit-independent)
          latestConfidence = rowToConfidence(latestRow);

          if (list.length > 1) {
            const prevRow = list[1];
            const prevRaw = rowToMeasurements(prevRow);
            previous = convertAllMeasurements(prevRaw, prevRow.entry_unit, opts.displayUnit);
          }
        } else {
          latest = emptyMeasurements();
        }

        if (latest) latest.hip = latestHipDisplay;
        if (previous) previous.hip = previousHipDisplay;
        else if (previousHipDisplay !== null) {
          previous = emptyMeasurements();
          previous.hip = previousHipDisplay;
        }

        // Merge hip confidence from body_tracker_weight into the confidence record
        if (latestConfidence) {
          latestConfidence.hip = latestHipConfidence;
        } else if (latestHipConfidence !== null) {
          latestConfidence = emptyConfidence();
          latestConfidence.hip = latestHipConfidence;
        }

        // Only surface confidence when at least one measurement has a non-null score
        if (latestConfidence && allConfidenceNull(latestConfidence)) {
          latestConfidence = null;
        }

        setData({ latest, previous, lastLoggedDate, latestConfidence });
        setLoading(false);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Failed to load measurements');
        setData(EMPTY);
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [opts.userId, opts.displayUnit, tick]);

  return { data, loading, error, refresh };
}
