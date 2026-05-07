'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export interface ActivitySnapshot {
  activeCalories: number | null;
  targetCalories: number | null;
  bmrCalories: number | null;
  cohortPercentile: number | null;
  recordedAt: string | null;
}

export interface UseUserActivityDataResult {
  data: ActivitySnapshot | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

interface ActivityRow {
  active_calories: number | null;
  target_calories: number | null;
  bmr_calories: number | null;
  cohort_percentile: number | null;
  created_at: string | null;
}

export function useUserActivityData(userId: string | null): UseUserActivityDataResult {
  const [data, setData] = useState<ActivitySnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!userId) {
      setData(null);
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
        type Loose = {
          from: (t: string) => {
            select: (cols: string) => {
              eq: (col: string, val: string) => {
                order: (col: string, opts: { ascending: boolean }) => {
                  limit: (n: number) => {
                    maybeSingle: () => Promise<{ data: ActivityRow | null; error: { message: string } | null }>;
                  };
                };
              };
            };
          };
        };
        const sb = supabase as unknown as Loose;
        const { data: row, error: dbErr } = await sb.from('body_tracker_activity')
          .select('active_calories, target_calories, bmr_calories, cohort_percentile, created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (cancelled) return;
        if (dbErr) throw new Error(dbErr.message);

        if (!row) {
          setData(null);
        } else {
          setData({
            activeCalories:   row.active_calories,
            targetCalories:   row.target_calories,
            bmrCalories:      row.bmr_calories,
            cohortPercentile: row.cohort_percentile,
            recordedAt:       row.created_at,
          });
        }
        setLoading(false);
      } catch (e) {
        if (cancelled) return;
        setData(null);
        setError(e instanceof Error ? e.message : 'Failed to load activity data');
        setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [userId, tick]);

  return { data, loading, error, refresh: () => setTick((t) => t + 1) };
}
