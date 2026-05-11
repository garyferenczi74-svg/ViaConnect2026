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
};

interface CircumferenceRow {
  entry_unit: MeasurementUnit;
  created_at: string;
  neck: number | null;
  shoulder_width: number | null;
  right_bicep: number | null;
  right_forearm: number | null;
  left_bicep: number | null;
  left_forearm: number | null;
  chest: number | null;
  waist: number | null;
  right_quadriceps: number | null;
  right_calf: number | null;
  left_quadriceps: number | null;
  left_calf: number | null;
  body_tracker_entries?: { entry_date: string | null } | null;
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
                order: (col: string, opts: { ascending: boolean }) => {
                  limit: (n: number) => Promise<{ data: CircumferenceRow[] | null; error: { message: string } | null }>;
                };
              };
            };
          };
        })
          .from('body_tracker_circumference')
          .select('*, body_tracker_entries(entry_date)')
          .eq('user_id', opts.userId!)
          .order('created_at', { ascending: false })
          .limit(2);

        const externalWeightQuery = (supabase as never as {
          from: (t: string) => {
            select: (cols: string) => {
              eq: (col: string, val: string) => {
                order: (col: string, opts: { ascending: boolean }) => {
                  limit: (n: number) => Promise<{ data: Array<{ hips_in: number | null }> | null; error: { message: string } | null }>;
                };
              };
            };
          };
        })
          .from('body_tracker_weight')
          .select('hips_in, created_at')
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

        if (list.length > 0) {
          const latestRow = list[0];
          const latestRaw = rowToMeasurements(latestRow);
          latest = convertAllMeasurements(latestRaw, latestRow.entry_unit, opts.displayUnit);
          lastLoggedDate = latestRow.body_tracker_entries?.entry_date ?? latestRow.created_at;

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

        setData({ latest, previous, lastLoggedDate });
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
