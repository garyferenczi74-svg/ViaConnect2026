'use server';

import { createClient } from '@/lib/supabase/server';
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';
import {
  calculateDailyScores,
  mapCheckInToScoringInput,
  type DailyScoreResult,
} from '@/lib/scoring/dailyScoreEngineV2';

// Prompt #140b Layer 3 hardening: every Supabase call is wrapped with
// withTimeout, and unexpected errors are logged via safeLog before being
// re-thrown so existing callers retain their throw-on-error contract.

export async function updateGaugeScores(
  userId: string,
  date: string,
  gaugeUpdates: Partial<{
    sleep_score: number | null;
    energy_score: number | null;
    mood_stress_score: number | null;
    nutrition_score: number | null;
    activity_score: number | null;
  }>,
): Promise<void> {
  const supabase = createClient();

  try {
    const { data: existing } = await withTimeout(
      (async () => (supabase as any)
        .from('daily_scores')
        .select('*')
        .eq('user_id', userId)
        .eq('score_date', date)
        .maybeSingle())(),
      8000,
      'actions.dailyScores.updateGaugeScores.read',
    );

    const merged = {
      sleep_score: existing?.sleep_score ?? null,
      energy_score: existing?.energy_score ?? null,
      mood_stress_score: existing?.mood_stress_score ?? null,
      nutrition_score: existing?.nutrition_score ?? null,
      activity_score: existing?.activity_score ?? null,
      ...gaugeUpdates,
    };

    const values = [
      merged.sleep_score,
      merged.energy_score,
      merged.mood_stress_score,
      merged.nutrition_score,
      merged.activity_score,
    ].filter((s): s is number => s !== null && s !== undefined);

    const overall_score = values.length > 0
      ? Math.round(values.reduce((a, b) => a + b, 0) / values.length)
      : 0;

    await withTimeout(
      (async () => (supabase as any).from('daily_scores').upsert({
        user_id: userId,
        score_date: date,
        ...merged,
        overall_score,
        data_mode: 'manual',
        calculated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,score_date' }))(),
      8000,
      'actions.dailyScores.updateGaugeScores.write',
    );
  } catch (error) {
    if (isTimeoutError(error)) {
      safeLog.error('actions.daily-scores.update-gauge-scores', 'database timeout', {
        userId, date, error,
      });
    } else {
      safeLog.error('actions.daily-scores.update-gauge-scores', 'database error', {
        userId, date, error,
      });
    }
    throw error;
  }
}

export async function recalculateNutritionOnly(
  userId: string,
  date: string,
): Promise<number> {
  const supabase = createClient();

  try {
    const { data: meals } = await withTimeout(
      (async () => (supabase as any)
        .from('meal_logs')
        .select('*')
        .eq('user_id', userId)
        .eq('meal_date', date))(),
      8000,
      'actions.dailyScores.recalculateNutritionOnly.read',
    );

    if (!meals || meals.length === 0) {
      await updateGaugeScores(userId, date, { nutrition_score: null });
      return 0;
    }

    const scores: number[] = meals
      .map((m: any) => {
        if (m.meal_score != null) return m.meal_score as number;
        if (m.quality_rating != null) return Math.min(100, Math.max(0, (m.quality_rating as number) * 25));
        return null;
      })
      .filter((s: number | null): s is number => s !== null);

    if (scores.length === 0) {
      await updateGaugeScores(userId, date, { nutrition_score: null });
      return 0;
    }

    const nutritionScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);

    await updateGaugeScores(userId, date, { nutrition_score: nutritionScore });
    return nutritionScore;
  } catch (error) {
    if (isTimeoutError(error)) {
      safeLog.error('actions.daily-scores.recalc-nutrition', 'database timeout', {
        userId, date, error,
      });
    } else {
      safeLog.error('actions.daily-scores.recalc-nutrition', 'database error', {
        userId, date, error,
      });
    }
    throw error;
  }
}

export async function recalculateCheckInOnly(
  userId: string,
  date: string,
): Promise<void> {
  const supabase = createClient();

  try {
    const { data: checkinRaw } = await withTimeout(
      (async () => (supabase as any)
        .from('daily_checkins')
        .select('*')
        .eq('user_id', userId)
        .eq('check_in_date', date)
        .maybeSingle())(),
      8000,
      'actions.dailyScores.recalculateCheckInOnly.read',
    );

    if (!checkinRaw) return;

    const checkin = mapCheckInToScoringInput(checkinRaw);

    const result = calculateDailyScores(checkin, null, null);

    await updateGaugeScores(userId, date, {
      sleep_score: result.sleep.confidence > 0 ? result.sleep.score : null,
      energy_score: result.energy.confidence > 0 ? result.energy.score : null,
      mood_stress_score: result.moodStress.confidence > 0 ? result.moodStress.score : null,
      activity_score: result.activity.confidence > 0 ? result.activity.score : null,
    });
  } catch (error) {
    if (isTimeoutError(error)) {
      safeLog.error('actions.daily-scores.recalc-checkin', 'database timeout', {
        userId, date, error,
      });
    } else {
      safeLog.error('actions.daily-scores.recalc-checkin', 'database error', {
        userId, date, error,
      });
    }
    throw error;
  }
}

export async function recalculateDailyScores(
  userId: string,
  date: string,
): Promise<DailyScoreResult> {
  const supabase = createClient();

  try {
    const [checkinRes, mealsRes] = await withTimeout(
      Promise.all([
        (supabase as any)
          .from('daily_checkins')
          .select('*')
          .eq('user_id', userId)
          .eq('check_in_date', date)
          .maybeSingle(),
        (supabase as any)
          .from('meal_logs')
          .select('*')
          .eq('user_id', userId)
          .eq('meal_date', date),
      ]),
      10000,
      'actions.dailyScores.recalculateDailyScores.read',
    );

    const checkinRaw = checkinRes.data;
    const checkin = checkinRaw ? mapCheckInToScoringInput(checkinRaw) : null;

    const meals = (mealsRes.data ?? []).map((m: any) => ({
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

    const result = calculateDailyScores(checkin, meals.length > 0 ? { meals } : null, null);

    const mealScores: number[] = (mealsRes.data ?? [])
      .map((m: any) => m.meal_score as number | null)
      .filter((s: number | null): s is number => s !== null);
    if (mealScores.length > 0) {
      const avg = Math.round(mealScores.reduce((a: number, b: number) => a + b, 0) / mealScores.length);
      result.nutrition = {
        ...result.nutrition,
        score: avg,
        manualScore: avg,
        manualWeight: 1,
        wearableWeight: 0,
        confidence: Math.min(1, 0.4 + mealScores.length * 0.15),
      };
    }

    await updateGaugeScores(userId, date, {
      sleep_score: result.sleep.confidence > 0 ? result.sleep.score : null,
      energy_score: result.energy.confidence > 0 ? result.energy.score : null,
      mood_stress_score: result.moodStress.confidence > 0 ? result.moodStress.score : null,
      nutrition_score: result.nutrition.confidence > 0 ? result.nutrition.score : null,
      activity_score: result.activity.confidence > 0 ? result.activity.score : null,
    });

    return result;
  } catch (error) {
    if (isTimeoutError(error)) {
      safeLog.error('actions.daily-scores.recalc-full', 'database timeout', {
        userId, date, error,
      });
    } else {
      safeLog.error('actions.daily-scores.recalc-full', 'database error', {
        userId, date, error,
      });
    }
    throw error;
  }
}
