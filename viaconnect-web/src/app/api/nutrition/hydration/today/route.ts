/**
 * Prompt 170o Phase 1 Phase B: today's hydration summary endpoint.
 *
 * Real-time query against meal_items joined to meals filtered by today's
 * date in user's locale. Does NOT use the materialized view (that's for
 * historical week/month aggregations on the Detail view).
 *
 * Returns: today's total + target + percentage + per-kind breakdown +
 * events timeline + counting_mode + streak.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { safeLog } from '@/lib/utils/safe-log';
import { personalizeHydrationTarget } from '@/lib/nutrition/hydration/target-personalizer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
  if (process.env.HYDRATION_TRACKING_ENABLED !== 'true') {
    return NextResponse.json({ error: 'Hydration tracking is temporarily unavailable.' }, { status: 503 });
  }

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();

  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);
  const todayStartIso = todayStart.toISOString();
  const dayUtc = todayStartIso.slice(0, 10);

  const { data: profileRow } = await admin
    .from('profiles')
    .select('body_weight_kg, hydration_target_ml_per_day_custom, hydration_counting_mode')
    .eq('id', user.id)
    .maybeSingle();

  const target = personalizeHydrationTarget({
    body_weight_kg: profileRow?.body_weight_kg ?? null,
    custom_target_ml_per_day: profileRow?.hydration_target_ml_per_day_custom ?? null,
  });
  const countingMode = (profileRow?.hydration_counting_mode === 'adjusted' ? 'adjusted' : 'conservative') as 'conservative' | 'adjusted';

  // Prompt 172e Phase D: select also beverage_catalog_slug + caffeine_mg
  // so the BeverageBreakdown / CaffeineOverlay / ElectrolyteSummary can
  // consume the same events list without a second fetch. Append only;
  // existing fields stay identical so the 170o quick log buttons and the
  // edit panel continue reading exactly what they read before.
  const { data: events, error: eventsErr } = await admin
    .from('meal_items')
    .select('meal_id, hydration_source_kind, hydration_ml, portion_volume_ml, food_name, beverage_catalog_slug, caffeine_mg, meals!inner(user_id, logged_at, meal_kind)')
    .eq('meals.user_id', user.id)
    .gte('meals.logged_at', todayStartIso)
    .not('hydration_source_kind', 'is', null)
    .order('meals(logged_at)', { ascending: true });

  if (eventsErr) {
    safeLog.warn('api.hydration.today', 'events fetch failed', { error: eventsErr, userId: user.id });
    return NextResponse.json({ error: 'Could not load today data' }, { status: 500 });
  }

  type EventRow = {
    meal_id: string;
    hydration_source_kind: string | null;
    hydration_ml: number | null;
    portion_volume_ml: number | null;
    food_name: string;
    beverage_catalog_slug: string | null;
    caffeine_mg: number | null;
    meals: { logged_at: string; meal_kind: string } | { logged_at: string; meal_kind: string }[];
  };

  const rows = (events ?? []) as EventRow[];

  let totalMl = 0;
  const byKind: Record<string, number> = {};
  const eventsToday: Array<{
    meal_id: string;
    logged_at: string;
    volume_ml: number;
    beverage_kind: string;
    food_name: string;
    beverage_catalog_slug: string | null;
    caffeine_mg: number | null;
  }> = [];

  for (const row of rows) {
    if (row.hydration_source_kind === null) continue;
    const ml = Number(row.hydration_ml ?? 0);
    totalMl += ml;
    byKind[row.hydration_source_kind] = (byKind[row.hydration_source_kind] ?? 0) + ml;
    const meals = Array.isArray(row.meals) ? row.meals[0] : row.meals;
    eventsToday.push({
      meal_id: row.meal_id,
      logged_at: meals?.logged_at ?? todayStartIso,
      volume_ml: Number(row.portion_volume_ml ?? 0),
      beverage_kind: row.hydration_source_kind,
      food_name: row.food_name,
      beverage_catalog_slug: row.beverage_catalog_slug,
      caffeine_mg: row.caffeine_mg !== null ? Number(row.caffeine_mg) : null,
    });
  }

  const percentageOfTarget = target > 0 ? Math.round((totalMl / target) * 1000) / 10 : 0;

  return NextResponse.json({
    day_utc: dayUtc,
    user_locale_day: dayUtc,
    total_ml: Math.round(totalMl * 100) / 100,
    target_ml: target,
    percentage_of_target: percentageOfTarget,
    by_source_kind: byKind,
    log_count: eventsToday.length,
    events_today: eventsToday,
    counting_mode: countingMode,
    streak_days: 0,
  });
}
