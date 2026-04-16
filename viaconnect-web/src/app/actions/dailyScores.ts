'use server';

import { createClient } from '@/lib/supabase/server';
import {
  calculateDailyScores,
  mapCheckInToScoringInput,
  type DailyScoreResult,
} from '@/lib/scoring/dailyScoreEngineV2';

// ── Additive gauge merge ──────────────────────────────────
// Reads the existing daily_scores row, overlays ONLY the supplied gauge
// updates, recalculates the composite, and upserts the merged result.
// Untouched gauges keep their values — meal saves never zero check-in
// scores and vice-versa.

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

  // 1. Fetch existing row (may not exist yet)
  const { data: existing } = await (supabase as any)
    .from('daily_scores')
    .select('*')
    .eq('user_id', userId)
    .eq('score_date', date)
    .maybeSingle();

  // 2. Merge: existing scores + new scores overlay
  const merged = {
    sleep_score: existing?.sleep_score ?? null,
    energy_score: existing?.energy_score ?? null,
    mood_stress_score: existing?.mood_stress_score ?? null,
    nutrition_score: existing?.nutrition_score ?? null,
    activity_score: existing?.activity_score ?? null,
    ...gaugeUpdates,
  };

  // 3. Recalculate composite from ALL gauge scores (existing + new)
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

  // 4. Upsert the MERGED row — untouched gauges keep their values
  await (supabase as any).from('daily_scores').upsert({
    user_id: userId,
    score_date: date,
    ...merged,
    overall_score,
    data_mode: 'manual',
    calculated_at: new Date().toISOString(),
  }, { onConflict: 'user_id,score_date' });
}

// ── Nutrition-only recalculation ──────────────────────────
// Reads meal_logs for the given date, computes a single nutrition score,
// and calls updateGaugeScores to merge ONLY nutrition — leaving sleep,
// exercise, stress, energy, activity untouched.

export async function recalculateNutritionOnly(
  userId: string,
  date: string,
): Promise<number> {
  const supabase = createClient();

  // Select * so the query works whether or not meal_score/macro_sliders
  // columns exist (migration may not have been applied yet).
  const { data: meals } = await (supabase as any)
    .from('meal_logs')
    .select('*')
    .eq('user_id', userId)
    .eq('meal_date', date);

  if (!meals || meals.length === 0) {
    // No meals logged — set nutrition to null (not 0) so it doesn't drag
    // down the composite when the user hasn't logged anything yet.
    await updateGaugeScores(userId, date, { nutrition_score: null });
    return 0;
  }

  // Score priority: meal_score (macro sliders, 0-100) > quality_rating * 25
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
}

// ── Check-in-only recalculation ───────────────────────────
// Reads daily_checkins, computes check-in-derived gauges, and calls
// updateGaugeScores to merge ONLY those — nutrition is untouched.

export async function recalculateCheckInOnly(
  userId: string,
  date: string,
): Promise<void> {
  const supabase = createClient();

  const { data: checkinRaw } = await (supabase as any)
    .from('daily_checkins')
    .select('*')
    .eq('user_id', userId)
    .eq('check_in_date', date)
    .maybeSingle();

  if (!checkinRaw) return;

  const checkin = mapCheckInToScoringInput(checkinRaw);

  // Use the V2 engine for individual gauge scores but only extract
  // the check-in-derived gauges (sleep, energy, moodStress, activity).
  const result = calculateDailyScores(checkin, null, null);

  await updateGaugeScores(userId, date, {
    sleep_score: result.sleep.confidence > 0 ? result.sleep.score : null,
    energy_score: result.energy.confidence > 0 ? result.energy.score : null,
    mood_stress_score: result.moodStress.confidence > 0 ? result.moodStress.score : null,
    activity_score: result.activity.confidence > 0 ? result.activity.score : null,
    // nutrition_score: intentionally NOT included — meals are a separate stream
  });
}

// ── Legacy full recalculation (kept for backward compat) ──
// Recalculates ALL gauges. Should only be used by the midnight cron
// or other full-refresh scenarios — NOT from individual save handlers.

export async function recalculateDailyScores(
  userId: string,
  date: string,
): Promise<DailyScoreResult> {
  const supabase = createClient();

  const [checkinRes, mealsRes] = await Promise.all([
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
  ]);

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

  // Override nutrition with meal_score if available (macro-slider scoring)
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

  // Use additive merge to persist — never overwrites with nulls
  await updateGaugeScores(userId, date, {
    sleep_score: result.sleep.confidence > 0 ? result.sleep.score : null,
    energy_score: result.energy.confidence > 0 ? result.energy.score : null,
    mood_stress_score: result.moodStress.confidence > 0 ? result.moodStress.score : null,
    nutrition_score: result.nutrition.confidence > 0 ? result.nutrition.score : null,
    activity_score: result.activity.confidence > 0 ? result.activity.score : null,
  });

  return result;
}
