// Helper: compute Gordon score for a meal being INSERTed by a server-side
// API route (analyze-text, analyze-photo, future tracker webhook). Loads
// the user's active nutrition_targets row (USDA fallback if absent),
// counts today's snacks (for the snack divisor), constructs a Meal-shaped
// preview, and runs scoreMeal(). Returns the four columns the meals row
// needs so callers can spread into their insert payload.
//
// Per Gary 2026-05-15: all four meal channels (Quick Log slider, Log a
// Full Meal text, Photo AI, Tracker App) must persist consistent scoring
// using the same 7-macro algorithm. This helper is the single entry point
// for the three server-side channels; the Quick Log channel computes the
// same score on the client and persists it directly.

import type { SupabaseClient } from '@supabase/supabase-js';
import { scoreMeal } from './scoreMeal';
import { generateTargets } from './generateTargets';
import { DEFAULT_MEAL_DISTRIBUTION } from './constants';
import { fetchGoalOverlay } from './resolveDailyTarget';
import type {
  KnownNutrients,
  Meal,
  MealType,
  MealSource,
  NutritionTargets,
  MealDistribution,
} from './types';

export interface ScoreMealForInsertInput {
  readonly userId: string;
  readonly loggedAt: string;
  readonly mealType: MealType;
  readonly source: MealSource;
  readonly sourceConfidence: number;
  readonly proteinG: number;
  readonly carbsG: number;
  readonly fatTotalG: number;
  readonly fatHealthyG: number;
  readonly fiberG: number;
  readonly sugarG: number;
  readonly sodiumMg: number;
  readonly caloriesKcal: number;
  readonly caloriesAutoCalc: boolean;
  readonly wholeFoodFlag: boolean | null;
  readonly mealName: string | null;
  // Prompt 177d Phase C (2026-06-07): optional map of which nutrients the
  // originating channel could determine. Missing or undefined treats
  // every nutrient as known (preserves the pre-177d behavior for
  // Photo AI, Quick Log, Connected Apps). The analyze-text route
  // passes sodium_mg false because the parser does not extract it.
  readonly knownNutrients?: KnownNutrients;
}

export interface ScoreMealForInsertResult {
  readonly quality_score: number;
  readonly quality_tier: 'poor' | 'fair' | 'good' | 'excellent' | 'perfection';
  readonly score_breakdown: unknown;
  readonly scored_at: string;
  readonly gordon_version: string;
}

function rowToTargets(row: Record<string, unknown>): NutritionTargets {
  const dist = (row.meal_distribution as MealDistribution | null) ?? DEFAULT_MEAL_DISTRIBUTION;
  return {
    targetId: String(row.target_id ?? ''),
    userId: String(row.user_id ?? ''),
    effectiveFrom: String(row.effective_from ?? ''),
    dailyKcal: Number(row.daily_kcal ?? 2000),
    dailyProteinG: Number(row.daily_protein_g ?? 0),
    dailyCarbsG: Number(row.daily_carbs_g ?? 0),
    dailyFatTotalG: Number(row.daily_fat_total_g ?? 0),
    dailyFatSaturatedG: Number(row.daily_fat_saturated_g ?? 0),
    dailyFatUnsatG: Number(row.daily_fat_unsat_g ?? 0),
    dailyFiberG: Number(row.daily_fiber_g ?? 0),
    dailySugarG: Number(row.daily_sugar_g ?? 0),
    dailySodiumMg: Number(row.daily_sodium_mg ?? 0),
    sourceCaqSnapshot: row.source_caq_snapshot ?? null,
    sourceBodySnapshot: row.source_body_snapshot ?? null,
    bioOptDay: row.bio_opt_day === null ? null : Number(row.bio_opt_day),
    mealDistribution: dist,
    generatedByVersion: String(row.generated_by_version ?? ''),
    generatedAt: String(row.generated_at ?? ''),
    supersededAt: row.superseded_at === null ? null : String(row.superseded_at),
  } as NutritionTargets;
}

export async function scoreMealForServerInsert(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  input: ScoreMealForInsertInput,
): Promise<ScoreMealForInsertResult> {
  // Load active nutrition_targets. Fall back to USDA generic if none exists yet.
  let targets: NutritionTargets;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from('nutrition_targets')
      .select('*')
      .eq('user_id', input.userId)
      .is('superseded_at', null)
      .order('effective_from', { ascending: false })
      .limit(1)
      .maybeSingle();
    targets = data
      ? rowToTargets(data)
      : generateTargets({ caqSnapshot: null, bodySnapshot: null, bioOptDay: null, mealPatternHistory: null });
    targets = { ...targets, userId: input.userId };
  } catch {
    targets = generateTargets({ caqSnapshot: null, bodySnapshot: null, bioOptDay: null, mealPatternHistory: null });
    targets = { ...targets, userId: input.userId };
  }

  // Prompt 179 DD-1: overlay the active goal target (manual override, then the
  // latest effective goal target) onto the static CAQ target so meal scoring
  // matches the daily target the member sees. fetchGoalOverlay fails open to
  // null, so when there is no active goal the CAQ/USDA target is untouched.
  try {
    const todayISO = new Date(input.loggedAt).toISOString().slice(0, 10);
    const overlay = await fetchGoalOverlay(input.userId, todayISO, supabase);
    if (overlay) {
      targets = {
        ...targets,
        dailyKcal: overlay.dailyKcal,
        dailyProteinG: overlay.dailyProteinG,
        dailyCarbsG: overlay.dailyCarbsG,
        dailyFatTotalG: overlay.dailyFatTotalG,
        dailyFiberG: overlay.dailyFiberG,
        targetSource: overlay.source,
      };
    }
  } catch {
    // fetchGoalOverlay already fails open; this guard is defensive only.
  }

  // Count today's snacks for the snack divisor (locked-on-save per OQ#3).
  let snacksToday = 0;
  try {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from('meals')
      .select('meal_id')
      .eq('user_id', input.userId)
      .eq('meal_type', 'snack')
      .gte('logged_at', today.toISOString())
      .lt('logged_at', tomorrow.toISOString());
    snacksToday = Array.isArray(data) ? data.length : 0;
  } catch {
    snacksToday = 0;
  }

  const previewMeal: Meal = {
    mealId: 'preview',
    userId: input.userId,
    loggedAt: input.loggedAt,
    mealType: input.mealType,
    source: input.source,
    sourceConfidence: input.sourceConfidence,
    proteinG: input.proteinG,
    carbsG: input.carbsG,
    fatTotalG: input.fatTotalG,
    fatHealthyG: input.fatHealthyG,
    fiberG: input.fiberG,
    sugarG: input.sugarG,
    sodiumMg: input.sodiumMg,
    caloriesKcal: input.caloriesKcal,
    caloriesAutoCalc: input.caloriesAutoCalc,
    wholeFoodFlag: input.wholeFoodFlag,
    ingredientsList: null,
    mealName: input.mealName,
    notes: null,
    rawInput: null,
    legacyNutritionLogId: null,
    qualityScore: null,
    qualityTier: null,
    scoreBreakdown: null,
    scoredAt: null,
    gordonVersion: null,
    snackIndex: null,
    createdAt: input.loggedAt,
    updatedAt: input.loggedAt,
  };

  const breakdown = scoreMeal(
    previewMeal,
    targets,
    targets.mealDistribution ?? DEFAULT_MEAL_DISTRIBUTION,
    snacksToday,
    input.knownNutrients,
  );

  return {
    quality_score: breakdown.final_score,
    quality_tier: breakdown.tier.toLowerCase() as ScoreMealForInsertResult['quality_tier'],
    score_breakdown: breakdown,
    scored_at: breakdown.calculated_at,
    gordon_version: breakdown.gordon_version,
  };
}
