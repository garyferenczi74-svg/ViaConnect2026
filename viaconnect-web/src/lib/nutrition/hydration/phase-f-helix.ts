/**
 * Prompt 172e Phase F Workstream 2: Helix integration helpers.
 *
 * Phase F emits two Helix earning events on catalog driven hydration logs:
 *   nutrivision_hydration_catalog_log         (1 pt, unlimited frequency)
 *   nutrivision_hydration_catalog_diversity_3 (5 pt, once_per_day)
 *
 * The once_per_day frequency rides on the existing earning engine's
 * frequency check at src/lib/helix/earning-engine.ts so the route does
 * not need an app layer idempotency query. The route still gates the
 * crossing moment so a user who already had 3+ distinct categories
 * earlier today does not pile up creditEarning calls that the engine
 * would later reject as frequency limited.
 *
 * The distinct category count is computed by joining the current day's
 * meal_items rows that carry a beverage_catalog_slug to the beverage
 * catalog and counting distinct categories. Falls back to 0 on any DB
 * error so a transient failure does not spuriously fire the event.
 *
 * Consumer portal only by inheritance: the earning engine rejects free
 * tier users upstream and the practitioner portal never reads
 * helix_transactions.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export interface CountDistinctCatalogCategoriesTodayArgs {
  admin: SupabaseClient;
  user_id: string;
  day_anchor_iso: string;
}

/**
 * Count distinct beverage_catalog.category values the user has logged
 * today (UTC anchored to day_anchor_iso). Queries meal_items joined to
 * meals (for user + logged_at) and to beverage_catalog (for category).
 * The join is implemented client side because supabase-js does not
 * expose a chained two hop !inner join with a third table lookup; the
 * pattern is the same one the alcohol daily count helper uses in the
 * Phase C path.
 *
 * Defensive: any error returns 0 so the diversity_3 event does not fire
 * on a transient failure.
 */
export async function countDistinctCatalogCategoriesToday(
  args: CountDistinctCatalogCategoriesTodayArgs,
): Promise<number> {
  const dayStart = new Date(args.day_anchor_iso);
  dayStart.setUTCHours(0, 0, 0, 0);
  const dayStartIso = dayStart.toISOString();

  try {
    // Step 1: pull distinct slugs the user logged today.
    const { data: slugRows, error: slugErr } = await args.admin
      .from('meal_items')
      .select('beverage_catalog_slug, meals!inner(user_id, logged_at)')
      .eq('meals.user_id', args.user_id)
      .gte('meals.logged_at', dayStartIso)
      .lte('meals.logged_at', args.day_anchor_iso)
      .not('beverage_catalog_slug', 'is', null);
    if (slugErr) return 0;
    const slugs = Array.from(new Set(
      (slugRows ?? [])
        .map((r) => (r as { beverage_catalog_slug: string | null }).beverage_catalog_slug)
        .filter((s): s is string => typeof s === 'string'),
    ));
    if (slugs.length === 0) return 0;

    // Step 2: look up the catalog categories for those slugs.
    const { data: catRows, error: catErr } = await args.admin
      .from('beverage_catalog')
      .select('slug, category')
      .in('slug', slugs);
    if (catErr) return 0;
    const categories = new Set<string>();
    for (const row of catRows ?? []) {
      const cat = (row as { category: string | null }).category;
      if (typeof cat === 'string' && cat.length > 0) categories.add(cat);
    }
    return categories.size;
  } catch {
    return 0;
  }
}

/**
 * Pure: should the diversity_3 event fire on this log? True only when
 * the post log distinct category count is exactly 3, i.e. the crossing
 * moment. Counts of 1, 2 fire nothing (not at threshold yet); counts of
 * 4 or more fire nothing (already crossed earlier today, the once_per_day
 * frequency limit caught it). 0 is defensive: count is post log so a
 * successful log should never produce 0 here, but the guard keeps the
 * function honest.
 */
export function shouldFireDiversity3(postLogDistinctCategoryCount: number): boolean {
  return postLogDistinctCategoryCount === 3;
}
