'use client';

// Prompt 183 Task 2 (2026-06-10): fail open metric hook for the My
// Nutrition bento hub. Mirrors the My Biology hub hook
// (components/body-tracker/hub/useHubMetrics.ts) resilience structure:
//   - Timeout: a 4000ms race via the canonical lib/utils/with-timeout
//     so a slow source cannot hang the hub (the spec allows 3 to 5
//     seconds). Each call passes a nutrition.hub.* label for the logs.
//   - Fail open: every read sits in its own try/catch. On timeout,
//     thrown error, or no data the field is left undefined and the tile
//     renders its empty state. A failed read NEVER blocks the others
//     and a missing value is NEVER invented as 0.
//   - Structured logging: one safeLog.warn line per failed read so the
//     drop off is observable in the Vercel runtime logs.
//
// Read only. No new scoring math: the three gauges reuse the exact
// helpers the existing Nutrition cards use. Nutrition Score reuses
// calorieWeightedMealQualityScore with NutritionScoreCard's today
// filter; Total Daily Macros reuses totalDailyMacrosScore over the same
// per-macro attainment; targets read the active nutrition_targets row
// the way useNutritionTargets does and fall back to generateTargets the
// way the cards do. The consecutive streak math lives in the pure
// ./streak module.

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { safeLog } from '@/lib/utils/safe-log';
import {
  calorieWeightedMealQualityScore,
  totalDailyMacrosScore,
  type DailyMacroAttainments,
  type ScoredMealContribution,
} from '@/lib/gordon/daily-aggregate';
import { generateTargets } from '@/lib/gordon/generateTargets';
import { fetchGoalOverlay } from '@/lib/gordon/resolveDailyTarget';
import { withTimeout } from '@/lib/utils/with-timeout';
import { computeConsecutiveMealStreak } from './streak';

// Re-export the canonical timeout helper so the timeout contract stays
// unit-testable from this module (the hook body itself is not, it needs
// a browser supabase client). Reuses lib/utils/with-timeout rather than
// a local copy; that helper throws TimeoutError on elapse.
// Exported for unit testing.
export { withTimeout } from '@/lib/utils/with-timeout';

export interface NutritionHubMetrics {
  nutritionScore?: number; // 0..100
  nutritionMealCount?: number; // meals counted toward the score today
  dailyMacrosPct?: number; // 0..100 overall percent to target
  proteinPct?: number; // 0..100
  carbsPct?: number; // 0..100
  fatPct?: number; // 0..100
  fiberPct?: number; // 0..100
  streakDays?: number; // 0..7
  dailyMealCounts?: number[]; // length 7, oldest..today, for the history bars
  savedMealsCount?: number; // count of saved_meals
}

export interface UseNutritionHubMetricsResult {
  metrics: NutritionHubMetrics;
  loading: boolean;
}

const TIMEOUT_MS = 4_000;
const WINDOW_DAYS = 7;

// Local date key (YYYY-MM-DD) for an ISO instant in the given timezone.
// Mirrors NutritionScoreCard.localDateKey so the today filter and the
// per-day grouping land on the same calendar day the cards use.
function localDateKey(iso: string, timezone: string): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return new Intl.DateTimeFormat('en-CA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      timeZone: timezone,
    }).format(d);
  } catch {
    return '';
  }
}

// Exported for unit testing. The pure helpers and types below
// (HubMealRow, HubMacroTargets, sevenDayKeys, dailyMealCountsFromRows,
// computeTodayNutrition, plus the re-exported withTimeout above) are
// exposed only so the gauge math is unit-testable; they are not a public
// API and should not be imported as one.
/**
 * A canonical meals row, narrowed to the fields the hub gauges read.
 * Mirrors the column names fetchUserMeals selects from the meals table.
 */
export interface HubMealRow {
  logged_at?: string | null;
  quality_score?: number | null;
  calories_kcal?: number | null;
  protein_g?: number | null;
  carbs_g?: number | null;
  fat_total_g?: number | null;
  fiber_g?: number | null;
}

/** Minimal target shape the macro attainment math needs. */
export interface HubMacroTargets {
  dailyKcal: number;
  dailyProteinG: number;
  dailyCarbsG: number;
  dailyFatTotalG: number;
  dailyFiberG: number;
}

function numeric(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

/**
 * Pure. The seven local date keys for the WINDOW_DAYS window ending at
 * `todayKey`, ordered oldest to newest. The final element is today.
 * `now` and `tz` are injected so the function is unit-testable.
 */
export function sevenDayKeys(now: Date, tz: string): string[] {
  const keys: string[] = [];
  for (let i = WINDOW_DAYS - 1; i >= 0; i -= 1) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    keys.push(localDateKey(d.toISOString(), tz));
  }
  return keys;
}

/**
 * Pure. Groups canonical meal rows into per-day counts over the seven
 * day window ending today, ordered oldest to newest (index 6 is today).
 * Every meal row counts toward its local day regardless of quality
 * score so the history bars reflect logging activity, matching the
 * NutritionScoreCard 7 day check-in which counts any logged meal.
 */
export function dailyMealCountsFromRows(
  rows: ReadonlyArray<HubMealRow>,
  now: Date,
  tz: string,
): number[] {
  const keys = sevenDayKeys(now, tz);
  const counts = new Map<string, number>();
  for (const key of keys) counts.set(key, 0);
  for (const row of rows) {
    const key = localDateKey(String(row.logged_at ?? ''), tz);
    if (counts.has(key)) counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return keys.map((k) => counts.get(k) ?? 0);
}

/**
 * Pure. Reproduces the NutritionScoreCard today computation: builds the
 * calorie weighted Nutrition Score over today's scored meals (quality
 * score not null) and the per-macro attainment for the Total Daily
 * Macros gauge, then folds the attainment with totalDailyMacrosScore.
 * Returns undefined fields when there is no signal so the hub omits the
 * chip rather than showing a fabricated zero.
 *
 * Note: the known_nutrients per-meal gate that NutritionScoreCard
 * applies via isMealNutrientKnown is intentionally not reapplied here.
 * The hub reads the meals table select that does not include
 * score_breakdown, so every present macro is treated as known, matching
 * the pre-177d behavior for non-text channels. The score helpers and
 * the targets are reused unchanged; only the data source is leaner.
 */
export function computeTodayNutrition(
  rows: ReadonlyArray<HubMealRow>,
  targets: HubMacroTargets,
  now: Date,
  tz: string,
): {
  nutritionScore?: number;
  nutritionMealCount?: number;
  dailyMacrosPct?: number;
  proteinPct?: number;
  carbsPct?: number;
  fatPct?: number;
  fiberPct?: number;
} {
  const todayKey = localDateKey(now.toISOString(), tz);
  if (!todayKey) return {};

  const scoredMealsToday: ScoredMealContribution[] = [];
  let todayMealCount = 0;
  let caloriesSum = 0;
  let proteinSum = 0;
  let carbsSum = 0;
  let fatSum = 0;
  let fiberSum = 0;

  for (const m of rows) {
    if (localDateKey(String(m.logged_at ?? ''), tz) !== todayKey) continue;
    // Same legacy exclusion NutritionScoreCard uses: a null or absent
    // quality score is a pre-177d legacy row and does not contribute.
    if (m.quality_score === null || m.quality_score === undefined) continue;
    todayMealCount += 1;
    caloriesSum += numeric(m.calories_kcal);
    proteinSum += numeric(m.protein_g);
    carbsSum += numeric(m.carbs_g);
    fatSum += numeric(m.fat_total_g);
    fiberSum += numeric(m.fiber_g);
    scoredMealsToday.push({
      qualityScore: numeric(m.quality_score),
      caloriesKcal: numeric(m.calories_kcal),
    });
  }

  if (todayMealCount === 0) {
    return {};
  }

  const nutritionScore = calorieWeightedMealQualityScore(scoredMealsToday);

  // Per-macro attainment, each capped at 100, gated on a positive
  // target. Mirrors NutritionScoreCard. With todayMealCount > 0 every
  // tracked macro has a contributor, so none are null here.
  const caloriesPct =
    targets.dailyKcal > 0 ? Math.min(100, (caloriesSum / targets.dailyKcal) * 100) : null;
  const proteinPct =
    targets.dailyProteinG > 0 ? Math.min(100, (proteinSum / targets.dailyProteinG) * 100) : null;
  const carbsPct =
    targets.dailyCarbsG > 0 ? Math.min(100, (carbsSum / targets.dailyCarbsG) * 100) : null;
  const fatPct =
    targets.dailyFatTotalG > 0 ? Math.min(100, (fatSum / targets.dailyFatTotalG) * 100) : null;
  const fiberPct =
    targets.dailyFiberG > 0 ? Math.min(100, (fiberSum / targets.dailyFiberG) * 100) : null;

  const attainments: DailyMacroAttainments = {
    calories: caloriesPct,
    protein: proteinPct,
    carbs: carbsPct,
    fat: fatPct,
    fiber: fiberPct,
  };
  const dailyMacrosPct = totalDailyMacrosScore(attainments);

  return {
    nutritionScore,
    nutritionMealCount: todayMealCount,
    dailyMacrosPct,
    proteinPct: proteinPct === null ? undefined : Math.round(proteinPct),
    carbsPct: carbsPct === null ? undefined : Math.round(carbsPct),
    fatPct: fatPct === null ? undefined : Math.round(fatPct),
    fiberPct: fiberPct === null ? undefined : Math.round(fiberPct),
  };
}

// Reads the 5 macro target fields off an active nutrition_targets row.
function targetsFromRow(row: Record<string, unknown>): HubMacroTargets {
  return {
    dailyKcal: numeric(row.daily_kcal),
    dailyProteinG: numeric(row.daily_protein_g),
    dailyCarbsG: numeric(row.daily_carbs_g),
    dailyFatTotalG: numeric(row.daily_fat_total_g),
    dailyFiberG: numeric(row.daily_fiber_g),
  };
}

// generateTargets fallback (mirrors NutritionScoreCard / DailyMacrosCard
// when no active row exists), narrowed to the 5 macro fields the hub
// gauges need.
function fallbackTargets(): HubMacroTargets {
  const t = generateTargets({
    caqSnapshot: null,
    bodySnapshot: null,
    bioOptDay: null,
    mealPatternHistory: null,
  });
  return {
    dailyKcal: t.dailyKcal,
    dailyProteinG: t.dailyProteinG,
    dailyCarbsG: t.dailyCarbsG,
    dailyFatTotalG: t.dailyFatTotalG,
    dailyFiberG: t.dailyFiberG,
  };
}

export function useNutritionHubMetrics(): UseNutritionHubMetricsResult {
  const [metrics, setMetrics] = useState<NutritionHubMetrics>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const next: NutritionHubMetrics = {};
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const supabase = createClient() as any;
        const authResult = (await withTimeout(
          supabase.auth.getUser(),
          TIMEOUT_MS,
          'nutrition.hub.auth',
        )) as { data: { user: { id: string } | null } };
        const user = authResult.data.user;
        if (!user) {
          if (!cancelled) {
            setMetrics(next);
            setLoading(false);
          }
          return;
        }

        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
        const now = new Date();

        // Active nutrition_targets row, read the same way
        // useNutritionTargets does (eq user_id, superseded_at IS NULL,
        // effective_from desc, limit 1, maybeSingle). On any failure or
        // absence, fall back to generateTargets like the cards do so the
        // macro attainment still has a denominator.
        //
        // Prompt 183 review Fix 1 (2026-06-10): match useNutritionTargets
        // exactly by overlaying the active goal target onto the static row.
        // When a goal user has a same-day manual override or an effective
        // goal target, fetchGoalOverlay replaces the five macro targets so
        // the hub's dailyMacrosPct and per-macro percents track
        // DailyMacrosCard rather than the static CAQ row. The overlay is
        // only applied over a real base row, mirroring how
        // useNutritionTargets overlays only when a base row exists (no base
        // row -> the cards use generateTargets with no overlay).
        let targets: HubMacroTargets = fallbackTargets();
        try {
          const targetsResult = (await withTimeout(
            supabase
              .from('nutrition_targets')
              .select('daily_kcal, daily_protein_g, daily_carbs_g, daily_fat_total_g, daily_fiber_g')
              .eq('user_id', user.id)
              .is('superseded_at', null)
              .order('effective_from', { ascending: false })
              .limit(1)
              .maybeSingle(),
            TIMEOUT_MS,
            'nutrition.hub.targets',
          )) as { data: Record<string, unknown> | null };
          if (targetsResult.data) {
            targets = targetsFromRow(targetsResult.data);
            // Goal overlay, applied the same way useNutritionTargets does:
            // localDateISO is the YYYY-MM-DD slice of the current instant,
            // and fetchGoalOverlay returns the override-then-goal target or
            // null. This sub-read fails open to no overlay (keeps the base
            // targets) so an overlay failure never nukes the base targets;
            // only the base read failing leaves the macro metrics undefined.
            try {
              const todayISO = now.toISOString().slice(0, 10);
              const overlay = await withTimeout(
                fetchGoalOverlay(user.id, todayISO, supabase),
                TIMEOUT_MS,
                'nutrition.hub.overlay',
              );
              if (overlay) {
                targets = {
                  dailyKcal: overlay.dailyKcal,
                  dailyProteinG: overlay.dailyProteinG,
                  dailyCarbsG: overlay.dailyCarbsG,
                  dailyFatTotalG: overlay.dailyFatTotalG,
                  dailyFiberG: overlay.dailyFiberG,
                };
              }
            } catch (overlayErr) {
              safeLog.warn('nutrition.hub.metrics', 'goal overlay read failed', {
                error: overlayErr instanceof Error ? overlayErr.message : String(overlayErr),
              });
            }
          }
        } catch (err) {
          safeLog.warn('nutrition.hub.metrics', 'nutrition_targets read failed', {
            error: err instanceof Error ? err.message : String(err),
          });
        }

        // Canonical meals over the last 7 days. Mirrors the meals select
        // fetchUserMeals issues (meals table, eq user_id, gte logged_at,
        // logged_at desc). fetchUserMeals is not exported from
        // useUserMeals, so the hub reads the same table directly per the
        // spec fallback rather than recomputing columns. Drives the
        // Nutrition Score, the Total Daily Macros gauge, the per-day
        // history bars, and the streak.
        try {
          // Deliberate one day slop buffer: WINDOW_DAYS*24h back from now
          // over-fetches so the oldest local calendar day is fully covered
          // even when now is late in the day; the extra rows are dropped by
          // the per-day grouping in dailyMealCountsFromRows.
          const sinceIso = new Date(
            now.getTime() - WINDOW_DAYS * 24 * 60 * 60 * 1000,
          ).toISOString();
          const mealsResult = (await withTimeout(
            supabase
              .from('meals')
              .select('logged_at, quality_score, calories_kcal, protein_g, carbs_g, fat_total_g, fiber_g')
              .eq('user_id', user.id)
              .gte('logged_at', sinceIso)
              .order('logged_at', { ascending: false }),
            TIMEOUT_MS,
            'nutrition.hub.meals',
          )) as { data: HubMealRow[] | null; error: { code?: string } | null };
          const rows = Array.isArray(mealsResult.data) ? mealsResult.data : [];

          const today = computeTodayNutrition(rows, targets, now, tz);
          if (today.nutritionScore !== undefined) next.nutritionScore = today.nutritionScore;
          if (today.nutritionMealCount !== undefined) {
            next.nutritionMealCount = today.nutritionMealCount;
          }
          if (today.dailyMacrosPct !== undefined) next.dailyMacrosPct = today.dailyMacrosPct;
          if (today.proteinPct !== undefined) next.proteinPct = today.proteinPct;
          if (today.carbsPct !== undefined) next.carbsPct = today.carbsPct;
          if (today.fatPct !== undefined) next.fatPct = today.fatPct;
          if (today.fiberPct !== undefined) next.fiberPct = today.fiberPct;

          const counts = dailyMealCountsFromRows(rows, now, tz);
          next.dailyMealCounts = counts;
          next.streakDays = computeConsecutiveMealStreak(counts);
        } catch (err) {
          safeLog.warn('nutrition.hub.metrics', 'meals read failed', {
            error: err instanceof Error ? err.message : String(err),
          });
        }

        // Saved meals count. head + exact count only. A missing table in
        // dev fails open to undefined rather than surfacing an error.
        try {
          const savedResult = (await withTimeout(
            supabase
              .from('saved_meals')
              .select('id', { count: 'exact', head: true })
              .eq('user_id', user.id),
            TIMEOUT_MS,
            'nutrition.hub.saved',
          )) as { count: number | null };
          if (typeof savedResult.count === 'number') {
            next.savedMealsCount = savedResult.count;
          }
        } catch (err) {
          safeLog.warn('nutrition.hub.metrics', 'saved_meals count failed', {
            error: err instanceof Error ? err.message : String(err),
          });
        }
      } catch (err) {
        // Top level fail open: any auth or network error returns the
        // empty (or partial) map the hub already collected.
        safeLog.warn('nutrition.hub.metrics', 'top level failure', {
          error: err instanceof Error ? err.message : String(err),
        });
      } finally {
        if (!cancelled) {
          setMetrics(next);
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { metrics, loading };
}

export default useNutritionHubMetrics;
