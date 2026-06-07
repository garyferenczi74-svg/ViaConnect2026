import type { MealDistribution, QualityTier } from './types';

export const GORDON_VERSION = '1.0.0';

export const ATWATER_FACTORS = {
  protein: 4,
  carbs: 4,
  fat: 9,
} as const;

export const TIER_BOUNDARIES: Array<{
  tier: QualityTier;
  min: number;
  max: number;
  colorHex: string;
}> = [
  { tier: 'Poor',       min: 0,  max: 19,  colorHex: '#B75E18' },
  { tier: 'Fair',       min: 20, max: 39,  colorHex: '#D4823B' },
  { tier: 'Good',       min: 40, max: 59,  colorHex: '#C9A23A' },
  { tier: 'Excellent',  min: 60, max: 79,  colorHex: '#5BC0BB' },
  { tier: 'Perfection', min: 80, max: 100, colorHex: '#2DA5A0' },
];

export function assignTier(score: number): QualityTier {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  for (const t of TIER_BOUNDARIES) {
    if (clamped >= t.min && clamped <= t.max) return t.tier;
  }
  return 'Good';
}

// Default 3 meals + 2 snacks pool. Per-snack share is half the 0.15 snack pool
// when both snacks are logged; the score-time math at gordon-score-meal applies
// the locked-on-save divisor (capped at 4 per OQ#3).
export const DEFAULT_MEAL_DISTRIBUTION: MealDistribution = {
  breakfast: 0.25,
  lunch: 0.30,
  dinner: 0.30,
  snack: 0.075,
  snackDivisorCap: 4,
};

export const ACTIVITY_FACTORS = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  very_active: 1.725,
  athlete: 1.9,
} as const;

export const GOAL_KCAL_ADJUSTMENT = {
  loss: -500,
  maintenance: 0,
  gain: 300,
  recomposition: -200,
} as const;

export const PROTEIN_GRAMS_PER_KG_DEFAULT = {
  loss: 1.8,
  maintenance: 1.4,
  gain: 1.8,
  recomposition: 2.2,
} as const;

export interface SliderRange {
  unit: 'g' | 'mg' | 'kcal';
  min: number;
  max: number;
  step: number;
  default: number | 'auto';
}

export const SLIDER_RANGES: Record<
  'protein' | 'carbs' | 'fatTotal' | 'fatHealthy' | 'fiber' | 'sugar' | 'sodium' | 'calories',
  SliderRange
> = {
  protein:    { unit: 'g',    min: 0, max: 150,  step: 1,  default: 25 },
  carbs:      { unit: 'g',    min: 0, max: 200,  step: 1,  default: 40 },
  fatTotal:   { unit: 'g',    min: 0, max: 100,  step: 1,  default: 15 },
  fatHealthy: { unit: 'g',    min: 0, max: 100,  step: 1,  default: 8 },
  fiber:      { unit: 'g',    min: 0, max: 50,   step: 1,  default: 5 },
  sugar:      { unit: 'g',    min: 0, max: 100,  step: 1,  default: 10 },
  sodium:     { unit: 'mg',   min: 0, max: 3000, step: 50, default: 400 },
  calories:   { unit: 'kcal', min: 0, max: 2500, step: 10, default: 'auto' },
};

export const SOURCE_CONFIDENCE_DEFAULTS = {
  quick_log: 0.70,
  full_manual: 0.90,
  photo_ai: 0.50,
  tracker_api: 0.95,
} as const;

export const SCORE_BASE = 50;

// Macro fit thresholds (abs delta percent vs per-meal target).
export const MACRO_FIT_TIGHT_THRESHOLD = 0.15;
export const MACRO_FIT_LOOSE_THRESHOLD = 0.30;
export const MACRO_FIT_WIDE_THRESHOLD  = 0.50;

// Fiber bonus thresholds (ratio logged vs per-meal target).
export const FIBER_RATIO_FULL    = 1.00;
export const FIBER_RATIO_HIGH    = 0.75;
export const FIBER_RATIO_MID     = 0.50;
export const FIBER_RATIO_LOW     = 0.25;

// Sugar penalty thresholds (ratio logged vs per-meal limit).
export const SUGAR_RATIO_DOUBLE  = 2.00;
export const SUGAR_RATIO_HIGH    = 1.50;
export const SUGAR_RATIO_FULL    = 1.00;
export const SUGAR_RATIO_NEAR    = 0.75;

// Saturated fat penalty thresholds (ratio sat_fat vs per-meal sat fat limit).
export const SAT_FAT_RATIO_DOUBLE = 2.00;
export const SAT_FAT_RATIO_HIGH   = 1.50;
export const SAT_FAT_RATIO_FULL   = 1.00;

// Sodium penalty thresholds (ratio logged vs per-meal sodium limit).
export const SODIUM_RATIO_DOUBLE  = 2.00;
export const SODIUM_RATIO_HIGH    = 1.50;
export const SODIUM_RATIO_FULL    = 1.00;

// Calorie fit thresholds (abs delta percent vs per-meal kcal target).
export const KCAL_FIT_TIGHT       = 0.15;
export const KCAL_FIT_LOOSE       = 0.30;
export const KCAL_FIT_WIDE        = 0.50;

// Prompt 177e (2026-06-07): Total Daily Macros internal weighting tunable.
// 177 spec section 4.4 (Open Tuning Decision 3) flags this as a Gordon
// tunable. The canonical tracked set per 177e is five macros: calories,
// protein, carbs, fat, fiber.
//
// Calories is the energy-balance dimension; protein, carbs, fat, fiber
// are composition. Calories carries a weight of 0.5 so it influences
// the daily macros score without naively double-counting energy (which
// is approximately 4 * protein + 4 * carbs + 9 * fat). Composition
// macros each weighted 1.0. Single-source-of-truth so flipping the
// preference is a one-line edit here, not a refactor at each call site.
export const DAILY_MACRO_WEIGHTS: Readonly<{
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}> = {
  calories: 0.5,
  protein: 1.0,
  carbs: 1.0,
  fat: 1.0,
  fiber: 1.0,
};
