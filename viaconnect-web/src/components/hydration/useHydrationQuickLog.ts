/**
 * Prompt 170o Phase 1 Phase C: useHydrationQuickLog hook.
 *
 * Posts to /api/nutrition/hydration/quick-log with volume_ml + beverage_kind
 * + log_surface. Returns the new meal_id + hydration_ml_logged + dedup flag.
 * Used by Dashboard widget + NutriVision card + FAB bottom sheet.
 */

'use client';

import { useCallback, useState } from 'react';

export type HydrationLogSurface =
  | 'dashboard_widget'
  | 'nutrivision_card'
  | 'floating_fab'
  | 'hydration_detail_view'
  | 'meal_save_with_beverage';

export type HydrationBeverageKind =
  | 'pure_water'
  | 'coffee_tea'
  | 'juice_smoothie'
  | 'dairy'
  | 'soda'
  | 'alcohol_low'
  | 'alcohol_high'
  | 'sports_drink'
  | 'high_water_food';

export interface HydrationQuickLogArgs {
  volume_ml: number;
  beverage_kind?: HydrationBeverageKind;
  log_surface: HydrationLogSurface;
}

export interface HydrationQuickLogResult {
  meal_id: string | null;
  hydration_ml_logged: number;
  deduplicated: boolean;
}

export interface UseHydrationQuickLogReturn {
  log: (args: HydrationQuickLogArgs) => Promise<HydrationQuickLogResult | null>;
  loading: boolean;
  error: string | null;
}

export function useHydrationQuickLog(): UseHydrationQuickLogReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const log = useCallback(async (args: HydrationQuickLogArgs): Promise<HydrationQuickLogResult | null> => {
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch('/api/nutrition/hydration/quick-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          volume_ml: args.volume_ml,
          beverage_kind: args.beverage_kind ?? 'pure_water',
          log_surface: args.log_surface,
        }),
      });
      if (resp.status === 503) {
        setError('Hydration tracking is temporarily unavailable.');
        return null;
      }
      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}));
        setError(body?.error ?? 'Could not save hydration log');
        return null;
      }
      const json = (await resp.json()) as HydrationQuickLogResult;
      return json;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { log, loading, error };
}
