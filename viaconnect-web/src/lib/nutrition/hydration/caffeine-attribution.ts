/**
 * Prompt 172e Phase C Workstream 1: caffeine attribution from beverage_slug
 * at the hydration write boundary.
 *
 * Per spec section 6: each caffeinated beverage contributes
 *   caffeine_mg_per_serving * (volume_ml / default_volume_ml)
 * to the existing 171b caffeine model, rounded to nearest mg. The 171b
 * engine reads meal_items.caffeine_mg directly; the 170o quick log write
 * path is the single boundary that persists this value into meal_items
 * at insert time. No touch to the 171b engine
 * (src/lib/scoring/sources/caffeine-timing-source.ts), no touch to BOS
 * scoring, no touch to the photo analyze path.
 *
 * Dedup contract: when the 170o 5 min dedup window fires for a
 * caffeinated category (coffee_tea), the photo path meal item keeps its
 * caffeine and the hydration path re logs hydration only without re
 * attributing caffeine a second time. The route already short circuits
 * before insert on dedup hits; this module exports a defensive guard
 * for any future caller that wants to compute attribution outside the
 * route's existing short circuit.
 */

import type { HydrationSourceKind } from './types';

export interface ComputeEffectiveCaffeineMgArgs {
  caffeine_mg_per_serving: number;
  default_volume_ml: number;
  volume_ml: number;
}

/**
 * Scale catalog row caffeine to the logged volume and round to nearest mg.
 * Returns 0 for any non finite or non positive input. The route uses
 * the returned value directly as meal_items.caffeine_mg so the 171b
 * engine reads it on the next scoring pass.
 */
export function computeEffectiveCaffeineMg(args: ComputeEffectiveCaffeineMgArgs): number {
  const perServing = Number(args.caffeine_mg_per_serving);
  const defaultMl = Number(args.default_volume_ml);
  const volumeMl = Number(args.volume_ml);
  if (!Number.isFinite(perServing) || perServing <= 0) return 0;
  if (!Number.isFinite(defaultMl) || defaultMl <= 0) return 0;
  if (!Number.isFinite(volumeMl) || volumeMl <= 0) return 0;
  const raw = perServing * (volumeMl / defaultMl);
  return Math.round(raw);
}

export interface ShouldAttributeCaffeineArgs {
  deduplicated: boolean;
  beverage_kind: HydrationSourceKind;
}

/**
 * Defensive guard: when a dedup hit fires the route already returns
 * before the new meal_item insert, so the new caffeine never lands in
 * the database. This guard pins the rule at the helper layer too so a
 * future refactor that splits the dedup short circuit from the insert
 * path cannot accidentally double attribute caffeine for the same drink.
 */
export function shouldAttributeCaffeineForBeverageSlug(
  args: ShouldAttributeCaffeineArgs,
): boolean {
  if (args.deduplicated) return false;
  return true;
}
