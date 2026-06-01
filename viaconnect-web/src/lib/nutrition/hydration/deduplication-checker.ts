/**
 * Prompt 170o Phase 1 Phase B: 5-minute deduplication window.
 *
 * Per spec §3.4: when a hydration_only log is saved, check whether a meal
 * within HYDRATION_DEDUP_WINDOW_SECONDS (default 300) already captured the
 * same beverage_kind. If so, the new log is treated as a duplicate of the
 * existing meal and quietly discarded.
 *
 * Per spec §16.3: target ≥90% true-positive (catches real duplicates) and
 * ≤5% false-positive (rejects legitimate separate logs within 5 minutes).
 * Window is env-var configurable (HYDRATION_DEDUP_WINDOW_SECONDS) for
 * post-launch tuning.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export interface DeduplicationCheckArgs {
  admin: SupabaseClient;
  user_id: string;
  beverage_kind: string;
  captured_at_iso: string;
}

export interface DeduplicationResult {
  deduplicated: boolean;
  reference_meal_id: string | null;
}

export function getDedupWindowSeconds(): number {
  const raw = process.env.HYDRATION_DEDUP_WINDOW_SECONDS;
  if (!raw) return 300;
  const parsed = Number(raw);
  if (Number.isNaN(parsed) || parsed < 30 || parsed > 3600) return 300;
  return Math.floor(parsed);
}

export async function checkHydrationDeduplication(
  args: DeduplicationCheckArgs,
): Promise<DeduplicationResult> {
  const windowSeconds = getDedupWindowSeconds();
  const capturedAt = new Date(args.captured_at_iso);
  const windowStart = new Date(capturedAt.getTime() - windowSeconds * 1000).toISOString();

  const { data, error } = await args.admin
    .from('meal_items')
    .select('meal_id, meals!inner(user_id, logged_at, meal_kind)')
    .eq('hydration_source_kind', args.beverage_kind)
    .gte('meals.logged_at', windowStart)
    .lte('meals.logged_at', args.captured_at_iso)
    .eq('meals.user_id', args.user_id)
    .limit(1);

  if (error || !data || data.length === 0) {
    return { deduplicated: false, reference_meal_id: null };
  }

  const refMealId = (data[0] as { meal_id: string }).meal_id;
  return { deduplicated: true, reference_meal_id: refMealId };
}
