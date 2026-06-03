// Prompt 172e Phase B: useBeverageCatalog hook.
//
// Fetches the catalog from GET /api/nutrition/hydration/catalog (Phase A
// route). The endpoint returns active rows sorted by category then sort_order.
// Hits the network once per picker mount and caches in plain useState since
// the endpoint already carries Cache-Control public max age 3600.
//
// Matches the read pattern in useHydrationToday.ts so the picker layer reads
// the same as the rest of the 170o surface.

'use client';

import { useCallback, useEffect, useState } from 'react';
import type { BeverageCatalogRow } from './BeveragePicker.types';

export interface UseBeverageCatalogState {
  catalog: ReadonlyArray<BeverageCatalogRow>;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useBeverageCatalog(): UseBeverageCatalogState {
  const [catalog, setCatalog] = useState<ReadonlyArray<BeverageCatalogRow>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/nutrition/hydration/catalog');
      if (!res.ok) {
        setError('Could not load the catalog. Please try again.');
        setCatalog([]);
        return;
      }
      const json = (await res.json()) as BeverageCatalogRow[];
      setCatalog(Array.isArray(json) ? json : []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
      setCatalog([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { catalog, loading, error, refresh };
}
