'use client';

import { useEffect, useState } from 'react';
import type { DimensionSourceRow } from '@/lib/body-tracker/source-disagreement';
import {
  FIRST_CLASS_TILE_IDS,
  buildWearableTiles,
  type WearableTileView,
} from '@/lib/body-tracker/wearable-tiles';

const FETCH_TIMEOUT_MS = 8000;

export interface WearableTilesSnapshot {
  tiles: WearableTileView[];
  scoreDetail: DimensionSourceRow[];
  lastUpdatedAt: string | null;
  status: 'loading' | 'ready' | 'error';
}

export function emptyWearableTilesSnapshot(
  platform: 'web' | 'ios' | 'android' = 'web',
): WearableTileView[] {
  return buildWearableTiles({
    oauth: [],
    humeIngestCount: 0,
    humeLastPersistAt: null,
    appleXmlIngested: 0,
    appleXmlLastPersistAt: null,
    healthKitPersisted: false,
    healthKitLastPersistAt: null,
    dimensionsFed: {},
    whoopConfigured: false,
    ouraConfigured: false,
    googleHealthConfigured: false,
    garminConfigured: false,
    platform,
  });
}

interface WearableTilesPayload {
  tiles?: WearableTileView[];
  scoreDetail?: DimensionSourceRow[];
  lastUpdatedAt?: string | null;
}

export function useWearableTilesSnapshot(): WearableTilesSnapshot {
  const [snapshot, setSnapshot] = useState<WearableTilesSnapshot>(() => ({
    tiles: emptyWearableTilesSnapshot('web'),
    scoreDetail: [],
    lastUpdatedAt: null,
    status: 'loading',
  }));

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
        if (!res.ok) {
          if (active) {
            setSnapshot((prev) => ({ ...prev, status: 'error' }));
          }
          return;
        }
        const json = (await res.json()) as WearableTilesPayload;
        if (!active) return;
        const next = Array.isArray(json.tiles) ? json.tiles : [];
        const filtered = next.filter((tile) =>
          (FIRST_CLASS_TILE_IDS as readonly string[]).includes(tile.id),
        );
        setSnapshot({
          tiles: filtered.length ? filtered : emptyWearableTilesSnapshot('web'),
          scoreDetail: Array.isArray(json.scoreDetail) ? json.scoreDetail : [],
          lastUpdatedAt: typeof json.lastUpdatedAt === 'string' ? json.lastUpdatedAt : null,
          status: 'ready',
        });
      } catch {
        if (active) {
          setSnapshot((prev) => ({ ...prev, status: 'error' }));
        }
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

  return snapshot;
}
