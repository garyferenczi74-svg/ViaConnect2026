'use server';

import { createClient } from '@/lib/supabase/server';
import {
  calculateDailyScores,
  mapCheckInToScoringInput,
  type DailyScoreResult,
} from '@/lib/scoring/dailyScoreEngineV2';

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
      .select('meal_type, calories, protein_g, carbs_g, fat_g, quality_rating')
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

  // Best-effort persist to daily_scores (table may not exist yet)
  try {
    await (supabase as any).from('daily_scores').upsert({
      user_id: userId,
      score_date: date,
      sleep_score: result.sleep.score,
      energy_score: result.energy.score,
      mood_stress_score: result.moodStress.score,
      nutrition_score: result.nutrition.score,
      activity_score: result.activity.score,
      overall_score: result.overall.score,
      data_mode: result.dataMode,
      manual_completeness: result.manualCompleteness,
      wearable_completeness: result.wearableCompleteness,
      source_breakdown: {
        sleep: { manual: result.sleep.manualScore, wearable: result.sleep.wearableScore, blended: result.sleep.score },
        energy: { manual: result.energy.manualScore, wearable: result.energy.wearableScore, blended: result.energy.score },
        moodStress: { manual: result.moodStress.manualScore, wearable: result.moodStress.wearableScore, blended: result.moodStress.score },
        nutrition: { manual: result.nutrition.manualScore, wearable: result.nutrition.wearableScore, blended: result.nutrition.score },
        activity: { manual: result.activity.manualScore, wearable: result.activity.wearableScore, blended: result.activity.score },
      },
      calculated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,score_date' });
  } catch (err) {
    console.error('[recalculateDailyScores] upsert failed:', err);
  }

  return result;
}
