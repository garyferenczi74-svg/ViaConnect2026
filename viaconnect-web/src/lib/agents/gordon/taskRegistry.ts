// Gordon task registry (Prompt #62h).
// All tasks Gordon handles, with types for the API route.

export const GORDON_TASKS = {
  // Real-time (consumer triggered)
  MEAL_VISION_ANALYSIS: 'meal_vision_analysis',
  NUTRITION_INSIGHT: 'nutrition_insight',
  FOOD_INTERACTION_CHECK: 'food_interaction_check',
  MEAL_QUALITY_SCORE: 'meal_quality_score',
  FARMCEUTICA_GAP_MATCH: 'farmceutica_gap_match',
  NEXT_MEAL_SUGGESTION: 'next_meal_suggestion',

  // Scheduled (cron triggered)
  DAILY_NUTRITION_SUMMARY: 'daily_nutrition_summary',
  WEEKLY_PATTERN_ANALYSIS: 'weekly_pattern_analysis',

  // On demand (consumer requests in chat)
  MEAL_PLAN_SUGGESTION: 'meal_plan_suggestion',
  NUTRIENT_DEEP_DIVE: 'nutrient_deep_dive',
  DIETARY_ADJUSTMENT: 'dietary_adjustment',
} as const;

export type GordonTask = (typeof GORDON_TASKS)[keyof typeof GORDON_TASKS];

const NUTRITION_KEYWORDS = [
  'eat', 'meal', 'food', 'diet', 'nutrition', 'calories', 'protein',
  'carbs', 'fat', 'macro', 'micro', 'vitamin', 'mineral', 'recipe',
  'breakfast', 'lunch', 'dinner', 'snack', 'cook', 'ingredient',
  'hungry', 'appetite', 'fasting', 'weight', 'nutrient',
];

export function isNutritionQuery(query: string): boolean {
  const lower = query.toLowerCase();
  return NUTRITION_KEYWORDS.some((kw) => lower.includes(kw));
}

export function determineGordonTask(query: string): GordonTask {
  const lower = query.toLowerCase();
  if (lower.includes('photo') || lower.includes('picture') || lower.includes('snap'))
    return GORDON_TASKS.MEAL_VISION_ANALYSIS;
  if (lower.includes('plan') || lower.includes('suggest'))
    return GORDON_TASKS.MEAL_PLAN_SUGGESTION;
  if (lower.includes('interact') || lower.includes('conflict'))
    return GORDON_TASKS.FOOD_INTERACTION_CHECK;
  if (lower.includes('week') || lower.includes('pattern') || lower.includes('trend'))
    return GORDON_TASKS.WEEKLY_PATTERN_ANALYSIS;
  if (lower.includes('today') || lower.includes('summary'))
    return GORDON_TASKS.DAILY_NUTRITION_SUMMARY;
  return GORDON_TASKS.NUTRITION_INSIGHT;
}

// === PROMPT 208 EXTENSION START ===
// Additive only, see Prompt 208 v2. Does not modify existing Gordon exports above.
export const GORDON_208_TASKS = {
  NUTRITION_BY_GENETICS: 'nutrition_by_genetics',
} as const;

export type Gordon208Task = (typeof GORDON_208_TASKS)[keyof typeof GORDON_208_TASKS];
// === PROMPT 208 EXTENSION END ===
