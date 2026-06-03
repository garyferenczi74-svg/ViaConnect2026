// Prompt 172e Phase D Workstream 1: useBeverageBreakdown hook.
//
// Polls GET /api/nutrition/hydration/breakdown on mount. The endpoint
// runs the same aggregateBreakdown helper as the unit tests so the
// numbers the legend renders reconcile with the chart.
//
// Read pattern mirrors useHydrationToday + useBeverageCatalog so the
// breakdown surface reads the same as the rest of the 170o + 172e
// Phase B surface.

'use client';

import { useCallback, useEffect, useState } from 'react';
import type { BreakdownData } from './breakdown-aggregator';

export interface UseBeverageBreakdownState {
  data: BreakdownData | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useBeverageBreakdown(): UseBeverageBreakdownState {
  const [data, setData] = useState<BreakdownData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/nutrition/hydration/breakdown');
      if (!res.ok) {
        if (res.status === 503) {
          // Kill switch off: silent UX, hold null data + clear error so
          // the orchestrator unmounts cleanly without a "feature
          // disabled" message.
          setData(null);
          setError(null);
          return;
        }
        setError('Could not load breakdown');
        return;
      }
      const json = (await res.json()) as BreakdownData;
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
