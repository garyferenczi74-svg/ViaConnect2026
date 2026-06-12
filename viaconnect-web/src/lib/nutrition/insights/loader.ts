// Prompt 192 Task 2: data loader for the insight engine.
//
// The ONLY supabase touching module in the insight core. Integration code,
// kept thin: every query is wrapped in withTimeout(4000), fails open to an
// empty slice with a single safeLog.warn, and does no business logic beyond
// row to type mapping. The engine and detectors stay pure over the
// DetectorInput this assembles.

import type { SupabaseClient } from '@supabase/supabase-js';
import { safeLog } from '@/lib/utils/safe-log';
import { withTimeout } from '@/lib/utils/with-timeout';
import { getKnownNutrients } from '@/lib/gordon/known-nutrients';
import type { Meal } from '@/lib/gordon/types';
import { fetchResolvedDailyTarget } from '@/lib/gordon/resolveDailyTarget';
import { personalizeHydrationTarget } from '@/lib/nutrition/hydration/target-personalizer';
import { addDays, localDateOf } from './time';
import type {
  DetectorInput,
  HydrationDay,
  InsightMeal,
  InsightTargets,
  MicronutrientDay,
  PriorActiveInsight,
  ScheduledSupplement,
} from './types';

const QUERY_TIMEOUT_MS = 4000;
const SCOPE = 'insights.loader';

export interface LoadDetectorInputOpts {
  now?: string;
  timezone?: string;
}

interface MealRowSlice {
  meal_id: string;
  logged_at: string;
  meal_type: string;
  calories_kcal: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_total_g: number | null;
  fiber_g: number | null;
  quality_score: number | null;
  score_breakdown: unknown;
}

interface MealItemRowSlice {
  meal_id: string;
  food_name: string | null;
  micronutrients_json: Record<string, unknown> | null;
}

function n(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

async function query<T>(
  label: string,
  run: () => PromiseLike<{ data: T | null; error: unknown }>,
  fallback: T,
): Promise<T> {
  try {
    const { data, error } = await withTimeout(
      Promise.resolve(run()),
      QUERY_TIMEOUT_MS,
      `${SCOPE}.${label}`,
    );
    if (error) {
      safeLog.warn(SCOPE, `${label} query returned error`, { error });
      return fallback;
    }
    return data ?? fallback;
  } catch (err) {
    safeLog.warn(SCOPE, `${label} query failed`, { err });
    return fallback;
  }
}

function normalizeName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export async function loadDetectorInput(
  supabase: SupabaseClient,
  userId: string,
  opts: LoadDetectorInputOpts = {},
): Promise<DetectorInput> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  const nowIso = opts.now ?? new Date().toISOString();

  // Profile: timezone plus hydration target inputs (one thin query).
  const profile = await query<{
    timezone: string | null;
    body_weight_kg: number | null;
    hydration_target_ml_per_day_custom: number | null;
  } | null>(
    'profile',
    () =>
      sb
        .from('profiles')
        .select('timezone, body_weight_kg, hydration_target_ml_per_day_custom')
        .eq('id', userId)
        .maybeSingle(),
    null,
  );
  const timezone = opts.timezone ?? profile?.timezone ?? 'UTC';
  const todayLocal = localDateOf(nowIso, timezone);
  const windowStartLocal = addDays(todayLocal, -7);
  // Instant window padded one day so local date filtering never clips edges.
  const sinceIso = new Date(Date.parse(nowIso) - 8 * 24 * 3_600_000).toISOString();

  // Meals: 7 day window with macros, quality, and the 177d known flags.
  const mealRows = await query<MealRowSlice[]>(
    'meals',
    () =>
      sb
        .from('meals')
        .select(
          'meal_id, logged_at, meal_type, calories_kcal, protein_g, carbs_g, fat_total_g, fiber_g, quality_score, score_breakdown',
        )
        .eq('user_id', userId)
        .gte('logged_at', sinceIso)
        .order('logged_at', { ascending: true }),
    [],
  );

  // Meal items: names for interaction matching plus micronutrient totals.
  const mealIds = mealRows.map((r) => r.meal_id);
  const itemRows =
    mealIds.length > 0
      ? await query<MealItemRowSlice[]>(
          'mealItems',
          () =>
            sb
              .from('meal_items')
              .select('meal_id, food_name, micronutrients_json')
              .in('meal_id', mealIds),
          [],
        )
      : [];

  const itemsByMeal = new Map<string, MealItemRowSlice[]>();
  for (const row of itemRows) {
    const list = itemsByMeal.get(row.meal_id);
    if (list) list.push(row);
    else itemsByMeal.set(row.meal_id, [row]);
  }

  const scoredMeals: InsightMeal[] = [];
  const microTotalsByDate = new Map<string, Record<string, number>>();
  const dayFullyScored = new Map<string, boolean>();

  for (const row of mealRows) {
    const date = localDateOf(row.logged_at, timezone);
    if (date < windowStartLocal || date > todayLocal) continue;

    // getKnownNutrients only reads scoreBreakdown; the cast narrows a full
    // Meal to the single field this helper actually touches.
    const knownMap = getKnownNutrients({
      scoreBreakdown: (row.score_breakdown ?? null) as Meal['scoreBreakdown'],
    } as Meal);

    const items = itemsByMeal.get(row.meal_id) ?? [];
    scoredMeals.push({
      mealId: row.meal_id,
      date,
      loggedAt: row.logged_at,
      mealType: (['breakfast', 'lunch', 'dinner', 'snack'].includes(row.meal_type)
        ? row.meal_type
        : 'snack') as InsightMeal['mealType'],
      caloriesKcal: n(row.calories_kcal),
      proteinG: n(row.protein_g),
      carbsG: n(row.carbs_g),
      fatTotalG: n(row.fat_total_g),
      fiberG: n(row.fiber_g),
      known: {
        calories: knownMap?.calories_kcal !== false,
        protein: knownMap?.protein_g !== false,
        carbs: knownMap?.carbs_g !== false,
        fat: knownMap?.fat_total_g !== false,
        fiber: knownMap?.fiber_g !== false,
      },
      qualityScore: typeof row.quality_score === 'number' ? row.quality_score : null,
      itemNames: items
        .map((i) => i.food_name)
        .filter((name): name is string => typeof name === 'string' && name.length > 0),
    });

    const fullyScoredSoFar = dayFullyScored.get(date) ?? true;
    dayFullyScored.set(date, fullyScoredSoFar && typeof row.quality_score === 'number');

    for (const item of items) {
      const micro = item.micronutrients_json;
      if (!micro || typeof micro !== 'object') continue;
      const totals = microTotalsByDate.get(date) ?? {};
      for (const [key, value] of Object.entries(micro)) {
        const amount = Number(value);
        if (!Number.isFinite(amount)) continue;
        totals[key] = (totals[key] ?? 0) + amount;
      }
      microTotalsByDate.set(date, totals);
    }
  }

  const micronutrientDays: MicronutrientDay[] = Array.from(microTotalsByDate.entries())
    .map(([date, totals]) => ({
      date,
      totals,
      fullyScored: dayFullyScored.get(date) ?? false,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Hydration window from the materialized view; target personalized the
  // same way the hydration history endpoint does it.
  const hydrationTarget = personalizeHydrationTarget({
    body_weight_kg: profile?.body_weight_kg ?? null,
    custom_target_ml_per_day: profile?.hydration_target_ml_per_day_custom ?? null,
  });
  const hydrationRows = await query<
    Array<{ day_utc: string; total_hydration_ml_adjusted: number | null }>
  >(
    'hydration',
    () =>
      sb
        .from('hydration_aggregations_daily')
        .select('day_utc, total_hydration_ml_adjusted')
        .eq('user_id', userId)
        .gte('day_utc', windowStartLocal)
        .lte('day_utc', todayLocal)
        .order('day_utc', { ascending: true }),
    [],
  );
  const hydrationDays: HydrationDay[] = hydrationRows.map((row) => ({
    date: row.day_utc,
    totalMl: n(row.total_hydration_ml_adjusted),
    targetMl: hydrationTarget > 0 ? hydrationTarget : null,
  }));

  // Supplement schedule (Prompt 185) with taken stamps from the adherence log.
  const scheduleRows = await query<
    Array<{
      time_of_day: string;
      user_current_supplements: { supplement_name: string | null } | null;
    }>
  >(
    'schedule',
    () =>
      sb
        .from('user_supplement_schedule')
        .select('time_of_day, user_current_supplements(supplement_name)')
        .eq('user_id', userId),
    [],
  );
  const adherenceRows = await query<
    Array<{ product_slug: string; time_of_day: string; completed_at: string | null }>
  >(
    'adherence',
    () =>
      sb
        .from('protocol_adherence_log')
        .select('product_slug, time_of_day, completed_at')
        .eq('user_id', userId)
        .eq('completed', true)
        .gte('scheduled_date', addDays(todayLocal, -1)),
    [],
  );

  const scheduledSupplements: ScheduledSupplement[] = [];
  for (const row of scheduleRows) {
    const name = row.user_current_supplements?.supplement_name;
    if (!name) continue;
    const bucket = row.time_of_day;
    if (bucket !== 'morning' && bucket !== 'afternoon' && bucket !== 'evening') continue;
    const taken = adherenceRows.find(
      (a) => a.time_of_day === bucket && normalizeName(a.product_slug) === normalizeName(name),
    );
    const entry: ScheduledSupplement = { name, timingBucket: bucket };
    if (taken?.completed_at) entry.takenAt = taken.completed_at;
    scheduledSupplements.push(entry);
  }

  // Targets: reuse the resolver (CAQ static + fetchGoalOverlay precedence).
  // It carries its own timeout + fail open hardening and never throws.
  const resolved = await fetchResolvedDailyTarget(userId, todayLocal, supabase);
  const targets: InsightTargets | null = resolved
    ? {
        dailyKcal: resolved.dailyKcal,
        dailyProteinG: resolved.dailyProteinG,
        dailyCarbsG: resolved.dailyCarbsG,
        dailyFatTotalG: resolved.dailyFatTotalG,
        dailyFiberG: resolved.dailyFiberG,
      }
    : null;

  // Prior active insights for dedup; the fingerprint is persisted inside
  // data_snapshot by the engine.
  const priorRows = await query<
    Array<{ insight_type: string; severity: string; data_snapshot: Record<string, unknown> | null }>
  >(
    'priorInsights',
    () =>
      sb
        .from('nutrition_insights')
        .select('insight_type, severity, data_snapshot')
        .eq('user_id', userId)
        .eq('status', 'active')
        .gt('expires_at', nowIso),
    [],
  );
  const priorActiveInsights: PriorActiveInsight[] = priorRows
    .map((row) => ({
      type: row.insight_type as PriorActiveInsight['type'],
      severity: row.severity as PriorActiveInsight['severity'],
      factFingerprint:
        typeof row.data_snapshot?.factFingerprint === 'string'
          ? row.data_snapshot.factFingerprint
          : '',
    }))
    .filter((p) => p.factFingerprint.length > 0);

  return {
    scoredMeals,
    micronutrientDays,
    hydrationDays,
    scheduledSupplements,
    targets,
    priorActiveInsights,
    // Catalog wiring for micronutrient_gap suggestions arrives in a later
    // task; an empty list keeps the suggestion path dormant.
    productCandidates: [],
    now: nowIso,
    timezone,
  };
}
