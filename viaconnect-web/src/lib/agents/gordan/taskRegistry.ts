// Gordan task registry (Prompt #62h).
// All tasks Gordan handles, with types for the API route.

export const GORDAN_TASKS = {
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

export type GordanTask = (typeof GORDAN_TASKS)[keyof typeof GORDAN_TASKS];

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

export function determineGordanTask(query: string): GordanTask {
  const lower = query.toLowerCase();
  if (lower.includes('photo') || lower.includes('picture') || lower.includes('snap'))
    return GORDAN_TASKS.MEAL_VISION_ANALYSIS;
  if (lower.includes('plan') || lower.includes('suggest'))
    return GORDAN_TASKS.MEAL_PLAN_SUGGESTION;
  if (lower.includes('interact') || lower.includes('conflict'))
    return GORDAN_TASKS.FOOD_INTERACTION_CHECK;
  if (lower.includes('week') || lower.includes('pattern') || lower.includes('trend'))
    return GORDAN_TASKS.WEEKLY_PATTERN_ANALYSIS;
  if (lower.includes('today') || lower.includes('summary'))
    return GORDAN_TASKS.DAILY_NUTRITION_SUMMARY;
  return GORDAN_TASKS.NUTRITION_INSIGHT;
}
