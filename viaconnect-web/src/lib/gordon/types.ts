// Gordon AI nutrition scoring engine: type definitions.
//
// App-level types use camelCase. Database row shapes use snake_case to match
// the SQL schema directly; mapping happens in the hook layer (useUserMeals,
// useNutritionTargets) at Refine + Apply phases.
//
// QualityTier carries title-case values (Poor, Fair, Good, Excellent,
// Perfection) at the application boundary. The Postgres ENUM uses lowercase
// (poor, fair, good, excellent, perfection) per the migration. Conversion is
// done in the row-to-app mapper, not at the type level.

// Updated 2026-05-28 for Prompt 170 NutriVision pill rebuild.
export type MealSource =
  | 'quick_log'
  | 'full_manual'
  | 'photo_ai'
  | 'nutrivision'
  | 'tracker_api'
  | 'wearable_cgm';

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export type QualityTier = 'Poor' | 'Fair' | 'Good' | 'Excellent' | 'Perfection';

// Postgres ENUM spelling (lowercase). Used by the row-shape mapper only.
export type QualityTierDb = 'poor' | 'fair' | 'good' | 'excellent' | 'perfection';

// Row shape mirrors meals SQL columns. snake_case intentional for raw row use
// before the hook layer normalizes into camelCase.
export interface MealRow {
  meal_id: string;
  user_id: string;
  logged_at: string;
  meal_type: MealType;
  source: MealSource;
  source_confidence: number;
  protein_g: number;
  carbs_g: number;
  fat_total_g: number;
  fat_healthy_g: number;
  fiber_g: number;
  sugar_g: number;
  sodium_mg: number;
  calories_kcal: number;
  calories_auto_calc: boolean;
  whole_food_flag: boolean | null;
  ingredients_list: unknown;
  meal_name: string | null;
  notes: string | null;
  raw_input: unknown;
  legacy_nutrition_log_id: string | null;
  quality_score: number | null;
  quality_tier: QualityTierDb | null;
  score_breakdown: ScoreBreakdown | null;
  scored_at: string | null;
  gordon_version: string | null;
  created_at: string;
  updated_at: string;
}

// App-level Meal interface. snake_case mapping notes inline where the
// converter must touch the field.
export interface Meal {
  mealId: string;
  userId: string;
  loggedAt: string;
  mealType: MealType;
  source: MealSource;
  sourceConfidence: number;
  proteinG: number;
  carbsG: number;
  // fat_total_g + fat_healthy_g (total includes the healthy subset).
  fatTotalG: number;
  fatHealthyG: number;
  fiberG: number;
  sugarG: number;
  sodiumMg: number;
  caloriesKcal: number;
  // calories_auto_calc TRUE means kcal derives from Atwater factors at save.
  caloriesAutoCalc: boolean;
  wholeFoodFlag: boolean | null;
  ingredientsList: unknown;
  mealName: string | null;
  notes: string | null;
  rawInput: unknown;
  // Set when analyze-text or analyze-photo dual-writes a legacy row alongside
  // the meals row. Dashboard UNION uses this for dedupe.
  legacyNutritionLogId: string | null;
  qualityScore: number | null;
  qualityTier: QualityTier | null;
  scoreBreakdown: ScoreBreakdown | null;
  scoredAt: string | null;
  gordonVersion: string | null;
  // Prompt #168c section 2.2: snack stacking. NULL for breakfast/lunch/dinner.
  // 1, 2, 3, etc. for snacks ordered by logged_at within a single day.
  snackIndex: number | null;
  createdAt: string;
  updatedAt: string;
}

// nutrition_targets row shape (raw DB).
export interface NutritionTargetsRow {
  target_id: string;
  user_id: string;
  effective_from: string;
  daily_kcal: number;
  daily_protein_g: number;
  daily_carbs_g: number;
  daily_fat_total_g: number;
  daily_fat_saturated_g: number;
  daily_fat_unsat_g: number;
  daily_fiber_g: number;
  daily_sugar_g: number;
  daily_sodium_mg: number;
  source_caq_snapshot: unknown;
  source_body_snapshot: unknown | null;
  bio_opt_day: number | null;
  meal_distribution: MealDistribution;
  generated_by_version: string;
  generated_at: string;
  superseded_at: string | null;
}

// App-level NutritionTargets interface.
export interface NutritionTargets {
  targetId: string;
  userId: string;
  effectiveFrom: string;
  dailyKcal: number;
  dailyProteinG: number;
  dailyCarbsG: number;
  dailyFatTotalG: number;
  dailyFatSaturatedG: number;
  dailyFatUnsatG: number;
  dailyFiberG: number;
  dailySugarG: number;
  dailySodiumMg: number;
  sourceCaqSnapshot: unknown;
  sourceBodySnapshot: unknown | null;
  bioOptDay: number | null;
  mealDistribution: MealDistribution;
  generatedByVersion: string;
  generatedAt: string;
  supersededAt: string | null;
}

// meal_distribution JSONB shape. Per OQ#3 locked: snack share is the total
// snack kcal pool divided across snacks at save time, divisor capped at 4.
export interface MealDistribution {
  breakfast: number;
  lunch: number;
  dinner: number;
  // Per-snack share. Total snack pool is share * snackCount in the saved row.
  snack: number;
  // Maximum snack divisor used by Gordon at score time.
  snackDivisorCap: number;
}

export interface ScoreModifier {
  name: string;
  value: number;
  note: string;
}

// Persisted in score_breakdown JSONB column on meals row.
export interface ScoreBreakdown {
  final_score: number;
  tier: QualityTier;
  base: number;
  modifiers: ScoreModifier[];
  calculated_at: string;
  gordon_version: string;
}

export interface ScoreMealRequest {
  meal_id: string;
}

export interface ScoreMealResponse {
  meal_id: string;
  quality_score: number;
  quality_tier: QualityTierDb;
  score_breakdown: ScoreBreakdown;
  gordon_version: string;
}

export interface GenerateTargetsRequest {
  user_id: string;
}

export interface GenerateTargetsResponse {
  target_id: string;
  daily_kcal: number;
  daily_protein_g: number;
  daily_carbs_g: number;
  daily_fat_total_g: number;
  daily_fat_saturated_g: number;
  daily_fat_unsat_g: number;
  daily_fiber_g: number;
  daily_sugar_g: number;
  daily_sodium_mg: number;
  meal_distribution: MealDistribution;
  generated_by_version: string;
  generated_at: string;
}
