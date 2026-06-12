// Prompt 192 Task 2: Gordon insight engine core types.
//
// The unions below mirror the nutrition_insights table CHECK constraints
// exactly (migration 20260612090000_prompt_192_nutrition_insights.sql).
// Detectors are pure functions over DetectorInput and return typed facts,
// never prose; composition writes copy FROM facts and may never invent
// numbers. UNKNOWN nutrients are excluded from gap math entirely; partial
// coverage is carried in the fact snapshot so copy can state it.

export type InsightType =
  | 'macro_gap'
  | 'micronutrient_gap'
  | 'meal_timing_pattern'
  | 'hydration_correlation'
  | 'supplement_meal_alignment'
  | 'quality_trend'
  | 'consistency_streak'
  | 'score_mover';

export type InsightHorizon = 'meal' | 'daily' | 'weekly';

export type InsightSeverity = 'info' | 'attention' | 'positive';

export type InsightConfidence = 'high' | 'medium' | 'low';

export interface ProductSuggestion {
  slug: string;
  name: string;
  reason: string;
}

export interface InsightFact {
  type: InsightType;
  horizon: InsightHorizon;
  severity: InsightSeverity;
  confidence: InsightConfidence;
  factFingerprint: string;
  snapshot: Record<string, unknown>;
  productSuggestion?: ProductSuggestion | null;
}

export type TrackedMacro = 'protein' | 'carbs' | 'fat' | 'fiber';

// Per meal channel determinability flags (Prompt 177d honesty contract,
// camelCase projection of KnownNutrients). false means the originating
// channel could not determine the nutrient; it must never be read as 0.
export interface MealKnownFlags {
  calories: boolean;
  protein: boolean;
  carbs: boolean;
  fat: boolean;
  fiber: boolean;
}

export interface InsightMeal {
  mealId: string;
  // Local calendar date (YYYY-MM-DD) in the user's timezone; the loader
  // derives it from logged_at so detectors never do timezone math on rows.
  date: string;
  loggedAt: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  caloriesKcal: number;
  proteinG: number;
  carbsG: number;
  fatTotalG: number;
  fiberG: number;
  known: MealKnownFlags;
  // null means a legacy unscored meal; detectors exclude it everywhere.
  qualityScore: number | null;
  itemNames: string[];
}

export interface MicronutrientDay {
  date: string;
  // Summed amounts keyed by canonical nutrient key (for example iron_mg).
  // A missing key is UNKNOWN for the day, never 0.
  totals: Record<string, number>;
  fullyScored: boolean;
}

export interface HydrationDay {
  date: string;
  totalMl: number;
  targetMl: number | null;
}

export interface ScheduledSupplement {
  name: string;
  timingBucket: 'morning' | 'afternoon' | 'evening';
  takenAt?: string;
}

export interface InsightTargets {
  dailyKcal: number;
  dailyProteinG: number;
  dailyCarbsG: number;
  dailyFatTotalG: number;
  dailyFiberG: number;
}

export interface PriorActiveInsight {
  type: InsightType;
  factFingerprint: string;
  severity: InsightSeverity;
}

// Catalog candidates the loader may supply for micronutrient_gap product
// suggestions. Empty by default: the suggestion path stays dormant until a
// later task wires a vetted catalog source.
export interface ProductCandidate {
  slug: string;
  name: string;
  nutrientKeys: string[];
}

export interface DetectorInput {
  scoredMeals: InsightMeal[];
  micronutrientDays: MicronutrientDay[];
  hydrationDays: HydrationDay[];
  scheduledSupplements: ScheduledSupplement[];
  targets: InsightTargets | null;
  priorActiveInsights: PriorActiveInsight[];
  productCandidates: ProductCandidate[];
  // Injected clock (ISO timestamp). Detectors never call Date.now().
  now: string;
  timezone: string;
}

export interface ComposedCopy {
  title: string;
  body: string;
}

export interface ComposedInsight {
  fact: InsightFact;
  title: string;
  body: string;
}

// Copy layer. compose returns null on ANY failure so the engine can fall
// back to the deterministic template composer; copy must never block
// generation.
export interface InsightComposer {
  compose(fact: InsightFact): Promise<ComposedCopy | null>;
}

// Row shape for INSERT into public.nutrition_insights (service role adds
// user_id and lets the DB default id/status/generated_at).
export interface PersistableInsight {
  insight_type: InsightType;
  horizon: InsightHorizon;
  title: string;
  body: string;
  severity: InsightSeverity;
  confidence: InsightConfidence;
  data_snapshot: Record<string, unknown>;
  product_suggestion: ProductSuggestion | null;
  expires_at: string;
  compliance_passed: true;
}

export interface DroppedInsight {
  fact: InsightFact;
  title: string;
  body: string;
  reasons: string[];
}
