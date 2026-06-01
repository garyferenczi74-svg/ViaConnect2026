/**
 * Prompt 170o Phase 1 Phase C: useHydrationToday hook.
 *
 * Polls GET /api/nutrition/hydration/today on mount + after every quick-log.
 * Returns the today summary with total + target + percentage + events
 * timeline + counting_mode + streak.
 */

'use client';

import { useCallback, useEffect, useState } from 'react';

export interface HydrationTodayEvent {
  meal_id: string;
  logged_at: string;
  volume_ml: number;
  beverage_kind: string;
  food_name: string;
}

export interface HydrationTodayData {
  day_utc: string;
  total_ml: number;
  target_ml: number;
  percentage_of_target: number;
  by_source_kind: Record<string, number>;
  log_count: number;
  events_today: HydrationTodayEvent[];
  counting_mode: 'conservative' | 'adjusted';
  streak_days: number;
}

export interface UseHydrationTodayState {
  data: HydrationTodayData | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useHydrationToday(): UseHydrationTodayState {
  const [data, setData] = useState<HydrationTodayData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const resp = await fetch('/api/nutrition/hydration/today');
      if (!resp.ok) {
        if (resp.status === 503) {
          setData(null);
          setError(null);
          return;
        }
        setError('Could not load today data');
        return;
      }
      const json = (await resp.json()) as HydrationTodayData;
      setData(json);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}
