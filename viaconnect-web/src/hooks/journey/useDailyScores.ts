'use client';

/**
 * src/hooks/journey/useDailyScores.ts
 *
 * Prompt 208j Task J-T1 - Shared pillar selector hook.
 *
 * Single source of truth: reuses calculateDailyScores() from dailyScoreEngineV2
 * over the EXACT same reads as DailyScoresPanel.tsx so Your Journey pillar values
 * equal the dashboard "Your pillars" values for the same user.
 *
 * Reads mirrored from DailyScoresPanel.computeScores():
 *   1. daily_checkins for today (user_id + check_in_date = todayLocal())
 *   2. meal_logs for today (user_id + meal_date = todayLocal())
 *   3. localStorage-cached meals (getCachedMeals) merged after DB meal read
 *   4. useHydrationToday() for hydration percentage
 *
 * Parity mechanisms mirrored from DailyScoresPanel:
 *   getCachedMeals: localStorage key vc_local_meals_cache - date-keyed.
 *     Merged after DB meal read (dedup by meal_type). Meal_score -> avg is
 *     primary; quality_rating * 25 is fallback. Prevents nutrition diverging
 *     when a meal is logged before the DB write reflects.
 *   sessionStorage overlay: key vc_daily_scores_cache - date-keyed.
 *     When freshly computed overall confidence is 0 but a prior valid result
 *     is cached, overlay cached gauge values to prevent flickering to zero.
 *     Valid computed scores are persisted for subsequent re-reads.
 *
 * Equality guarantee: calculateDailyScores is imported from the same module
 * and called with the same arguments as the dashboard. The date scoping uses
 * the same todayLocal() / localDateString(detectTimezone()) function. The
 * meal-score override logic (meal_logs.meal_score -> avg nutrition) mirrors
 * DailyScoresPanel exactly. The only addition is the bioOptimization pillar
 * which reads profiles.bio_optimization_score (per 208j spec; the dashboard
 * shows bio_optimization_score as a separate card, not as part of the 5-gauge
 * composite).
 *
 * Return shape (all 0..100 or null):
 *   sleepQuality, energyLevel, moodStress, nutrition, physicalActivity,
 *   bioOptimization, hydration
 *
 * Resilience:
 *   withTimeout 4000ms on every Supabase read.
 *   try/catch fail-open to null per pillar.
 *   safeLog.warn on any read failure.
 *   All reads scoped to the signed-in user via RLS (user_id = userId).
 *
 * Rules: no em-dashes, no en-dashes, no emojis, no `any` (one cast to
 * unknown is used for the Supabase query builder, same pattern as DailyScoresPanel
 * and YourJourneyCoaching). Lucide strokeWidth 1.5 not applicable (hook only).
 */

import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  calculateDailyScores,
  mapCheckInToScoringInput,
  getScoreColor,
  type MealLogData,
  type DailyScoreResult,
} from '@/lib/scoring/dailyScoreEngineV2';
import { useHydrationToday } from '@/components/hydration/useHydrationToday';
import { detectTimezone, localDateString } from '@/lib/timezone';
import { withTimeout } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';

// ---------------------------------------------------------------------------
// Local date helper (mirrors DailyScoresPanel.todayLocal)
// ---------------------------------------------------------------------------

function todayLocal(): string {
  return localDateString(detectTimezone());
}

// ---------------------------------------------------------------------------
// sessionStorage cache (mirrors DailyScoresPanel CACHE_KEY / getCachedScores /
// setCachedScores). Shared key so the hook and the panel share one cache entry.
// ---------------------------------------------------------------------------

const CACHE_KEY = 'vc_daily_scores_cache';

function getCachedScores(): DailyScoreResult | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { date: string; scores: DailyScoreResult };
    if (parsed.date !== todayLocal()) return null;
    return parsed.scores;
  } catch { return null; }
}

function setCachedScores(scores: DailyScoreResult): void {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ date: todayLocal(), scores }));
  } catch {}
}

// ---------------------------------------------------------------------------
// localStorage meal cache (mirrors DailyScoresPanel MEALS_CACHE_KEY /
// getCachedMeals). Shared key so the hook reads the same events the panel
// caches from meal-logged CustomEvents.
// ---------------------------------------------------------------------------

const MEALS_CACHE_KEY = 'vc_local_meals_cache';

interface LocalMeal {
  meal_type: string;
  quality_rating?: number | null;
  meal_score?: number | null;
  calories?: number | null;
  protein_grams?: number | null;
  carbs_grams?: number | null;
  fats_grams?: number | null;
}

function getCachedMeals(): LocalMeal[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(MEALS_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { date: string; meals?: LocalMeal[] };
    if (parsed.date !== todayLocal()) return [];
    return parsed.meals ?? [];
  } catch { return []; }
}

// ---------------------------------------------------------------------------
// Pure helper: mergeLocalMeals
//
// Exported for TDD. Merges locally-cached meals (from meal-logged events) into
// the meal list that will be passed to calculateDailyScores. Deduplicates by
// meal_type: DB rows take precedence; a cached entry is only appended when its
// meal_type is not already present. Mirrors the dedup logic in
// DailyScoresPanel.computeScores verbatim.
// ---------------------------------------------------------------------------

export interface NormalisedMeal {
  meal_type: string;
  calories: number | null;
  protein_grams: number | null;
  carbs_grams: number | null;
  fats_grams: number | null;
  includes_vegetables: boolean;
  includes_whole_grains: boolean;
  includes_lean_protein: boolean;
  meal_quality_rating: number | null;
}

/**
 * Merges locally-cached meals from localStorage into the DB meal list.
 * Returns a new array; never mutates the input. Pure, deterministic.
 */
export function mergeLocalMeals(
  dbMeals: NormalisedMeal[],
  localMeals: LocalMeal[],
): NormalisedMeal[] {
  if (localMeals.length === 0) return dbMeals;
  const result: NormalisedMeal[] = [...dbMeals];
  const existing = new Set(dbMeals.map((m) => m.meal_type));
  for (const lm of localMeals) {
    if (!existing.has(lm.meal_type)) {
      result.push({
        meal_type: lm.meal_type,
        calories: lm.calories ?? null,
        protein_grams: lm.protein_grams ?? null,
        carbs_grams: lm.carbs_grams ?? null,
        fats_grams: lm.fats_grams ?? null,
        includes_vegetables: false,
        includes_whole_grains: false,
        includes_lean_protein: false,
        meal_quality_rating: lm.quality_rating ?? null,
      });
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Pure helper: applyScoreOverlay
//
// Exported for TDD. When freshly computed overall confidence is 0 but a prior
// valid result is available (from sessionStorage), overlays cached gauge values
// onto any gauge that has confidence 0 in the fresh result. Recomputes overall
// from the merged gauges. Mirrors the stale-cache fill-in guard in
// DailyScoresPanel.computeScores verbatim. Pure, deterministic, never throws.
// ---------------------------------------------------------------------------

type GaugeKey = 'sleep' | 'energy' | 'moodStress' | 'nutrition' | 'activity';

const GAUGES: GaugeKey[] = ['sleep', 'energy', 'moodStress', 'nutrition', 'activity'];

/**
 * Overlays cached gauge values onto a freshly computed result when overall
 * confidence is 0. Returns the same object reference if no overlay is needed
 * (overall confidence > 0 or no valid cached result). Mutates scores in place
 * and returns it for convenience. Pure except for the mutation of the input
 * object (matches the DailyScoresPanel pattern to avoid extra allocations).
 */
export function applyScoreOverlay(
  scores: DailyScoreResult,
  cached: DailyScoreResult | null,
): DailyScoreResult {
  if (scores.overall.confidence > 0 || cached === null || cached.overall.confidence === 0) {
    return scores;
  }
  for (const g of GAUGES) {
    if (scores[g].confidence === 0 && cached[g].confidence > 0) {
      scores[g] = cached[g];
    }
  }
  const active = GAUGES.map((g) => scores[g]).filter((s) => s.confidence > 0);
  if (active.length > 0) {
    const overallScore = Math.round(active.reduce((s, g) => s + g.score, 0) / active.length);
    scores.overall = {
      ...scores.overall,
      score: overallScore,
      confidence: active.length / 5,
      color: getScoreColor(overallScore),
    };
  }
  return scores;
}

// ---------------------------------------------------------------------------
// Return type
// ---------------------------------------------------------------------------

export interface DailyPillarScores {
  /** Sleep Quality from daily_checkins (0..100) or null when no data. */
  sleepQuality: number | null;
  /** Energy Level from daily_checkins (0..100) or null when no data. */
  energyLevel: number | null;
  /** Mood and Stress from daily_checkins (0..100) or null when no data. */
  moodStress: number | null;
  /** Nutrition from meal_logs (0..100) or null when no data. */
  nutrition: number | null;
  /** Physical Activity from daily_checkins (0..100) or null when no data. */
  physicalActivity: number | null;
  /**
   * Bio Optimization from profiles.bio_optimization_score (0..100) or null.
   * This is the stored composite score, NOT the daily_checkins overall gauge.
   * Per 208j spec: never read vitality_score.
   */
  bioOptimization: number | null;
  /** Hydration percentage of target from useHydrationToday (0..100) or null. */
  hydration: number | null;
  /** True while the initial Supabase reads are in flight. */
  loading: boolean;
}

const INITIAL: DailyPillarScores = {
  sleepQuality: null,
  energyLevel: null,
  moodStress: null,
  nutrition: null,
  physicalActivity: null,
  bioOptimization: null,
  hydration: null,
  loading: true,
};

// ---------------------------------------------------------------------------
// Pure mapper: DailyScoreResult fields to our canonical shape.
//
// Exported for TDD. Input is the result from calculateDailyScores plus the
// bioOptimization score from profiles. Confidence 0 means no data -> null.
// Pure, deterministic, never throws.
// ---------------------------------------------------------------------------

export interface ScoreResultInput {
  sleepScore: number;
  sleepConfidence: number;
  energyScore: number;
  energyConfidence: number;
  moodStressScore: number;
  moodStressConfidence: number;
  nutritionScore: number;
  nutritionConfidence: number;
  activityScore: number;
  activityConfidence: number;
}

/**
 * Maps the raw calculateDailyScores output fields to the canonical pillar
 * shape used by useDailyScores. Returns null for any pillar with confidence 0
 * (i.e., no data was provided for that pillar). Never throws.
 *
 * bioOptimization and hydration are NOT derived from calculateDailyScores;
 * callers supply them separately (profiles.bio_optimization_score and
 * useHydrationToday.percentage_of_target respectively).
 */
export function mapScoresToPillars(input: ScoreResultInput): {
  sleepQuality: number | null;
  energyLevel: number | null;
  moodStress: number | null;
  nutrition: number | null;
  physicalActivity: number | null;
} {
  return {
    sleepQuality: input.sleepConfidence > 0 ? input.sleepScore : null,
    energyLevel: input.energyConfidence > 0 ? input.energyScore : null,
    moodStress: input.moodStressConfidence > 0 ? input.moodStressScore : null,
    nutrition: input.nutritionConfidence > 0 ? input.nutritionScore : null,
    physicalActivity: input.activityConfidence > 0 ? input.activityScore : null,
  };
}

// ---------------------------------------------------------------------------
// Supabase row types (avoids `any`)
// ---------------------------------------------------------------------------

interface CheckinRow {
  [key: string]: unknown;
}

interface MealRow {
  meal_type: string;
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  quality_rating: number | null;
  meal_score: number | null;
}

interface ProfileRow {
  bio_optimization_score: number | null;
}

// ---------------------------------------------------------------------------
// useDailyScores
// ---------------------------------------------------------------------------

/**
 * Returns today's 7 pillar scores using the same engine and reads as the
 * dashboard's DailyScoresPanel. Values are null when no data is available.
 *
 * @param userId The authenticated user id, or null before auth resolves.
 */
export function useDailyScores(userId: string | null): DailyPillarScores {
  const [scores, setScores] = useState<DailyPillarScores>(INITIAL);
  const [refreshTick, setRefreshTick] = useState(0);

  // Hydration: real-time hook (same as DailyScoresPanel).
  const hydrationResult = useHydrationToday();
  const hydrationPct = hydrationResult.data?.percentage_of_target ?? null;
  const hydrationClamped =
    hydrationPct !== null
      ? Math.max(0, Math.min(100, Math.round(hydrationPct)))
      : null;

  // eslint-disable-next-line react-hooks/exhaustive-deps
  // Intentional hydration-effect split: this effect is scoped to userId so the
  // Supabase reads (checkins, meals, profile) re-run only when the user changes.
  // A separate effect below tracks hydrationClamped from useHydrationToday so
  // real-time hydration log events update the gauge without re-fetching DB data.
  useEffect(() => {
    if (!userId) {
      setScores({ ...INITIAL, loading: false });
      return;
    }

    let active = true;

    (async () => {
      try {
        const supabase = createClient();
        const today = todayLocal();

        // ---- Step 1: daily_checkins (mirrors DailyScoresPanel.computeScores) ----
        let checkinData = null;
        try {
          const queryResult = supabase
            .from('daily_checkins')
            .select('*')
            .eq('user_id', userId)
            .eq('check_in_date', today)
            .maybeSingle();
          const { data: checkinRow } = await withTimeout(
            queryResult as unknown as Promise<{ data: CheckinRow | null; error: unknown }>,
            4000,
            'useDailyScores.daily_checkins',
          );
          if (checkinRow) {
            checkinData = mapCheckInToScoringInput(checkinRow as Record<string, unknown>);
          }
        } catch (err) {
          safeLog.warn('useDailyScores', 'daily_checkins read failed, failing open', { error: err });
        }

        // ---- Step 2: meal_logs (mirrors DailyScoresPanel.computeScores) ----
        let dbMeals: NormalisedMeal[] = [];
        let dbMealScores: number[] = [];
        try {
          const mealsQuery = supabase
            .from('meal_logs')
            .select('*')
            .eq('user_id', userId)
            .eq('meal_date', today);
          const { data: mealRows } = await withTimeout(
            mealsQuery as unknown as Promise<{ data: MealRow[] | null; error: unknown }>,
            4000,
            'useDailyScores.meal_logs',
          );
          if (mealRows && mealRows.length > 0) {
            dbMeals = mealRows.map((m) => ({
              meal_type: m.meal_type,
              calories: m.calories,
              protein_grams: m.protein_g,
              carbs_grams: m.carbs_g,
              fats_grams: m.fat_g,
              includes_vegetables: false,
              includes_whole_grains: false,
              includes_lean_protein: false,
              meal_quality_rating: m.quality_rating,
            }));
            // meal_score is the primary nutrition source (Prompt 84).
            dbMealScores = mealRows
              .map((m) => m.meal_score)
              .filter((s): s is number => s !== null);
          }
        } catch (err) {
          safeLog.warn('useDailyScores', 'meal_logs read failed, failing open', { error: err });
        }

        // Fix 1: merge localStorage-cached meals (mirrors DailyScoresPanel
        // getCachedMeals supplementation). Covers users whose DB write is still
        // in-flight after a meal-logged event, so nutrition matches the dashboard.
        const mergedMeals = mergeLocalMeals(dbMeals, getCachedMeals());
        const mealLog: MealLogData = mergedMeals.length > 0 ? { meals: mergedMeals } : { meals: [] };

        // ---- Step 3: profiles.bio_optimization_score ----
        let bioOptimizationScore: number | null = null;
        try {
          const profileQuery = supabase
            .from('profiles')
            .select('bio_optimization_score')
            .eq('id', userId)
            .maybeSingle();
          const { data: profileRow } = await withTimeout(
            profileQuery as unknown as Promise<{ data: ProfileRow | null; error: unknown }>,
            4000,
            'useDailyScores.profiles',
          );
          if (profileRow?.bio_optimization_score != null) {
            const raw = Number(profileRow.bio_optimization_score);
            if (isFinite(raw)) {
              bioOptimizationScore = Math.max(0, Math.min(100, Math.round(raw)));
            }
          }
        } catch (err) {
          safeLog.warn('useDailyScores', 'profiles read failed, failing open', { error: err });
        }

        if (!active) return;

        // ---- Step 4: calculateDailyScores (same call as DailyScoresPanel) ----
        const result = calculateDailyScores(
          checkinData,
          mealLog.meals.length > 0 ? mealLog : null,
          null,
        );

        // ---- Step 5: nutrition override from meal_score (mirrors DailyScoresPanel Prompt 84) ----
        // Primary: meal_score average from DB rows.
        const mealScores: number[] = [...dbMealScores];

        // Supplement with cached meals when DB returned none (mirrors DailyScoresPanel lines 209-213).
        if (mealScores.length === 0) {
          for (const lm of getCachedMeals()) {
            const s =
              lm.meal_score != null
                ? lm.meal_score
                : lm.quality_rating != null
                ? Math.min(100, Math.max(0, lm.quality_rating * 25))
                : null;
            if (s != null) mealScores.push(s);
          }
        }

        // Final fallback: quality_rating from any source (mirrors DailyScoresPanel lines 217-227).
        if (mealScores.length === 0) {
          const ratingSource: Array<{ quality_rating?: number | null }> = [
            ...mergedMeals.map((m) => ({ quality_rating: m.meal_quality_rating })),
            ...getCachedMeals(),
          ];
          for (const r of ratingSource) {
            if (r.quality_rating != null) {
              mealScores.push(Math.min(100, Math.max(0, r.quality_rating * 25)));
            }
          }
        }

        if (mealScores.length > 0) {
          const avg = Math.round(mealScores.reduce((s, v) => s + v, 0) / mealScores.length);
          result.nutrition = {
            ...result.nutrition,
            score: avg,
            manualScore: avg,
            manualWeight: 1,
            wearableWeight: 0,
            confidence: Math.min(1, 0.4 + mealScores.length * 0.15),
            color: getScoreColor(avg),
          };
          // Recompute overall so the new nutrition value is reflected.
          const active2 = [result.sleep, result.energy, result.moodStress, result.nutrition, result.activity]
            .filter((g) => g.confidence > 0);
          if (active2.length > 0) {
            const overallScore = Math.round(active2.reduce((s, g) => s + g.score, 0) / active2.length);
            result.overall = {
              ...result.overall,
              score: overallScore,
              confidence: active2.length / 5,
              color: getScoreColor(overallScore),
            };
          }
        }

        // Fix 2: sessionStorage stale-cache overlay (mirrors DailyScoresPanel
        // lines 258-277). Prevents gauges from dropping to zero on a re-read
        // or timeout when the DB returns no data but a prior valid result exists.
        applyScoreOverlay(result, getCachedScores());

        // Persist valid scores to sessionStorage (shared with DailyScoresPanel).
        if (result.overall.confidence > 0) {
          setCachedScores(result);
        }

        // ---- Step 6: map to canonical pillar shape ----
        const mapped = mapScoresToPillars({
          sleepScore: result.sleep.score,
          sleepConfidence: result.sleep.confidence,
          energyScore: result.energy.score,
          energyConfidence: result.energy.confidence,
          moodStressScore: result.moodStress.score,
          moodStressConfidence: result.moodStress.confidence,
          nutritionScore: result.nutrition.score,
          nutritionConfidence: result.nutrition.confidence,
          activityScore: result.activity.score,
          activityConfidence: result.activity.confidence,
        });

        setScores({
          ...mapped,
          bioOptimization: bioOptimizationScore,
          hydration: hydrationClamped,
          loading: false,
        });
      } catch (err) {
        safeLog.warn('useDailyScores', 'scores computation failed, failing open', { error: err });
        if (active) {
          setScores((prev) => ({ ...prev, loading: false }));
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [userId, refreshTick]); // eslint-disable-line react-hooks/exhaustive-deps
  // Intentional split: hydration is tracked by its own effect below so that
  // real-time hydration log events update the gauge without re-running the
  // Supabase reads above. Adding hydrationClamped here would cause unnecessary
  // DB round trips on every hydration change.

  // Keep hydration in sync with the real-time hook independently of the
  // Supabase reads above (hydration updates on every log event).
  useEffect(() => {
    setScores((prev) => ({
      ...prev,
      hydration: hydrationClamped,
    }));
  }, [hydrationClamped]);

  // Window focus listener: re-runs DB reads when the user returns to the tab.
  // Debounced to 500ms to avoid rapid re-fires on focus events.
  // The ref pattern avoids stale closure issues with the debounce timer.
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleFocus = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        setRefreshTick((t) => t + 1);
      }, 500);
    };
    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return scores;
}
