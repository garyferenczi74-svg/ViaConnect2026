/**
 * Prompt 170o Phase 1 Phase C: useHydrationHistory hook.
 *
 * GET /api/nutrition/hydration/history?range=week|month. Powers the weekly
 * bar chart + monthly calendar heatmap on the Detail view.
 */

'use client';

import { useCallback, useEffect, useState } from 'react';

export interface HydrationHistoryDay {
  day_utc: string;
  total_ml: number;
  pure_water_ml: number;
  target_ml: number;
  percentage_of_target: number;
  beverage_count: number;
  quick_log_count: number;
}

export interface HydrationHistoryData {
  range: 'week' | 'month';
  days: HydrationHistoryDay[];
  average_total_ml: number;
  average_percentage: number;
  days_at_target_count: number;
  streak_days: number;
  best_day: { day_utc: string; total_ml: number };
}

export function useHydrationHistory(range: 'week' | 'month' = 'week'): {
  data: HydrationHistoryData | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
} {
  const [data, setData] = useState<HydrationHistoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const resp = await fetch(`/api/nutrition/hydration/history?range=${range}`);
      if (!resp.ok) {
        if (resp.status === 503) {
          setData(null);
          return;
        }
        setError('Could not load history data');
        return;
      }
      const json = (await resp.json()) as HydrationHistoryData;
      setData(json);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}
