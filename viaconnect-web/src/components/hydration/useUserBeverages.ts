'use client';

/**
 * Prompt 207a Task 5: useUserBeverages client hook.
 *
 * Fetches the authenticated user's own active custom beverages from
 * GET /api/nutrition/user-beverages on mount and provides create/update
 * mutations backed by the Task 4 CRUD routes.
 *
 * Mirrors useHydrationToday and useHydrationQuickLog conventions:
 *   - fetch on mount via useEffect
 *   - expose refresh
 *   - fail open: set error and return null/empty; never throw to caller
 */

import { useCallback, useEffect, useState } from 'react';

export interface UserBeverage {
  id: string;
  display_name: string;
  category: string;
  hydration_source_kind: string;
  default_volume_ml: number;
  hydration_coefficient: number;
  caffeine_mg_per_serving: number;
  is_alcoholic: boolean;
  is_active: boolean;
}

export interface CreateBeverageInput {
  display_name: string;
  category: string;
  default_volume_ml: number;
  caffeine_mg_per_serving?: number;
}

export interface UpdateBeveragePatch {
  display_name?: string;
  default_volume_ml?: number;
  is_active?: boolean;
}

export interface UseUserBeveragesReturn {
  beverages: UserBeverage[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  create: (input: CreateBeverageInput) => Promise<UserBeverage | null>;
  update: (id: string, patch: UpdateBeveragePatch) => Promise<UserBeverage | null>;
}

export function useUserBeverages(): UseUserBeveragesReturn {
  const [beverages, setBeverages] = useState<UserBeverage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (): Promise<void> => {
    try {
      const resp = await fetch('/api/nutrition/user-beverages');
      if (!resp.ok) {
        setError('Could not load custom beverages');
        return;
      }
      const json = (await resp.json()) as { beverages: UserBeverage[] };
      setBeverages(json.beverages ?? []);
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

  const create = useCallback(
    async (input: CreateBeverageInput): Promise<UserBeverage | null> => {
      try {
        const payload: Record<string, unknown> = {
          display_name: input.display_name,
          category: input.category,
          default_volume_ml: input.default_volume_ml,
        };
        if (input.caffeine_mg_per_serving !== undefined) {
          payload.caffeine_mg_per_serving = input.caffeine_mg_per_serving;
        }
        const resp = await fetch('/api/nutrition/user-beverages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!resp.ok) {
          const body = await resp.json().catch(() => ({}));
          setError((body as Record<string, unknown>)?.error as string ?? 'Could not create beverage');
          return null;
        }
        const json = (await resp.json()) as { beverage: UserBeverage };
        await refresh();
        return json.beverage ?? null;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Network error');
        return null;
      }
    },
    [refresh],
  );

  const update = useCallback(
    async (id: string, patch: UpdateBeveragePatch): Promise<UserBeverage | null> => {
      try {
        const resp = await fetch(`/api/nutrition/user-beverages/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patch),
        });
        if (!resp.ok) {
          const body = await resp.json().catch(() => ({}));
          setError((body as Record<string, unknown>)?.error as string ?? 'Could not update beverage');
          return null;
        }
        const json = (await resp.json()) as { beverage: UserBeverage };
        await refresh();
        return json.beverage ?? null;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Network error');
        return null;
      }
    },
    [refresh],
  );

  return { beverages, loading, error, refresh, create, update };
}
