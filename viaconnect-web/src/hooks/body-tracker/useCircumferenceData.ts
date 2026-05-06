'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  MEASUREMENT_DB_COLUMN,
  MEASUREMENT_KEYS,
  convertAllMeasurements,
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
  right_upper_arm: number | null;
  right_forearm: number | null;
  left_upper_arm: number | null;
  left_forearm: number | null;
  chest: number | null;
  waist: number | null;
  hip: number | null;
  right_upper_thigh: number | null;
  right_calf: number | null;
  left_upper_thigh: number | null;
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
        const { data: rows, error: dbErr } = await (supabase as never as {
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

        if (cancelled) return;
        if (dbErr) throw new Error(dbErr.message);

        const list = rows ?? [];
        if (list.length === 0) {
          setData(EMPTY);
          setLoading(false);
          return;
        }

        const latestRow = list[0];
        const latestRaw = rowToMeasurements(latestRow);
        const latest = convertAllMeasurements(latestRaw, latestRow.entry_unit, opts.displayUnit);

        let previous: CircumferenceMeasurements | null = null;
        if (list.length > 1) {
          const prevRow = list[1];
          const prevRaw = rowToMeasurements(prevRow);
          previous = convertAllMeasurements(prevRaw, prevRow.entry_unit, opts.displayUnit);
        }

        setData({
          latest,
          previous,
          lastLoggedDate: latestRow.body_tracker_entries?.entry_date ?? latestRow.created_at,
        });
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
