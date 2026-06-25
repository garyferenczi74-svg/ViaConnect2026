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
 *   3. useHydrationToday() for hydration percentage
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

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  calculateDailyScores,
  mapCheckInToScoringInput,
  getScoreColor,
  type MealLogData,
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

  // Hydration: real-time hook (same as DailyScoresPanel).
  const hydrationResult = useHydrationToday();
  const hydrationPct = hydrationResult.data?.percentage_of_target ?? null;
  const hydrationClamped =
    hydrationPct !== null
      ? Math.max(0, Math.min(100, Math.round(hydrationPct)))
      : null;

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
        let mealLog: MealLogData = { meals: [] };
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
            mealLog = {
              meals: mealRows.map((m) => ({
                meal_type: m.meal_type,
                calories: m.calories,
                protein_grams: m.protein_g,
                carbs_grams: m.carbs_g,
                fats_grams: m.fat_g,
                includes_vegetables: false,
                includes_whole_grains: false,
                includes_lean_protein: false,
                meal_quality_rating: m.quality_rating,
              })),
            };
            // meal_score is the primary nutrition source (same as DailyScoresPanel Prompt 84).
            dbMealScores = mealRows
              .map((m) => m.meal_score)
              .filter((s): s is number => s !== null);
          }
        } catch (err) {
          safeLog.warn('useDailyScores', 'meal_logs read failed, failing open', { error: err });
        }

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
        if (dbMealScores.length > 0) {
          const avg = Math.round(
            dbMealScores.reduce((s, v) => s + v, 0) / dbMealScores.length,
          );
          result.nutrition = {
            ...result.nutrition,
            score: avg,
            manualScore: avg,
            manualWeight: 1,
            wearableWeight: 0,
            confidence: Math.min(1, 0.4 + dbMealScores.length * 0.15),
            color: getScoreColor(avg),
          };
        } else {
          // Fallback: quality_rating from meal rows (mirrors DailyScoresPanel).
          const ratingScores: number[] = mealLog.meals
            .map((m) => m.meal_quality_rating)
            .filter((r): r is number => r !== null)
            .map((r) => Math.min(100, Math.max(0, r * 25)));
          if (ratingScores.length > 0) {
            const avg = Math.round(
              ratingScores.reduce((s, v) => s + v, 0) / ratingScores.length,
            );
            result.nutrition = {
              ...result.nutrition,
              score: avg,
              manualScore: avg,
              manualWeight: 1,
              wearableWeight: 0,
              confidence: Math.min(1, 0.4 + ratingScores.length * 0.15),
              color: getScoreColor(avg),
            };
          }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Keep hydration in sync with the real-time hook independently of the
  // Supabase reads above (hydration updates on every log event).
  useEffect(() => {
    setScores((prev) => ({
      ...prev,
      hydration: hydrationClamped,
    }));
  }, [hydrationClamped]);

  return scores;
}
