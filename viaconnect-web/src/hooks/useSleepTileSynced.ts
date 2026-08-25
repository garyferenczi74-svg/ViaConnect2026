'use client';

import { useEffect, useState } from 'react';
import { sleepLastSyncFromWearablePayload } from '@/lib/body-tracker/habit-sleep-pair';
import type { LastSyncKind } from '@/lib/body-tracker/last-sync-state';

const FETCH_TIMEOUT_MS = 8000;

interface WearableTilesPayload {
  tiles?: Array<{
    id: string;
    lastSyncState: LastSyncKind;
    lastSyncAt?: string | null;
  }>;
  bedtimeStrip?: { sleepTileSynced?: boolean };
}

export function useSleepTileSynced(): boolean {
  const [synced, setSynced] = useState(false);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    (async () => {
      try {
        const res = await fetch('/api/integrations/wearable-tiles', {
          method: 'GET',
          signal: controller.signal,
          credentials: 'same-origin',
        });
        if (!res.ok) return;
        const json = (await res.json()) as WearableTilesPayload;
        if (!active) return;
        setSynced(sleepLastSyncFromWearablePayload(json));
      } catch {
        if (active) setSynced(false);
      } finally {
        clearTimeout(timer);
      }
    })();

    return () => {
      active = false;
      clearTimeout(timer);
      controller.abort();
    };
  }, []);

  return synced;
}
