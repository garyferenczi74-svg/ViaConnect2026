import type { NormalizedData, NormalizedMeal, NormalizedFoodItem } from '../dataNormalizer';

const MEAL_TYPE_MAP: Record<number, NormalizedMeal['mealType']> = {
  0: 'breakfast', 1: 'lunch', 2: 'dinner', 3: 'snack',
};

export function normalizeMyFitnessPal(userId: string, raw: any): NormalizedData {
  const items: NormalizedFoodItem[] = (raw.food_entries ?? []).map((e: any) => ({
    name: e.food?.description ?? e.food_name ?? 'Unknown',
    servingSize: `${e.servings ?? 1} ${e.serving_description ?? 'serving'}`,
    calories: e.calories ?? 0,
    protein: e.protein ?? 0,
    carbs: e.carbohydrate ?? e.carbs ?? 0,
    fat: e.fat ?? 0,
  }));

  const meal: NormalizedMeal = {
    type: 'meal',
    mealType: MEAL_TYPE_MAP[raw.meal_type ?? 0] ?? 'snack',
    items,
    totals: {
      calories: raw.total_calories ?? items.reduce((s, i) => s + i.calories, 0),
      protein: raw.total_protein ?? items.reduce((s, i) => s + i.protein, 0),
      carbs: raw.total_carbohydrate ?? items.reduce((s, i) => s + i.carbs, 0),
      fat: raw.total_fat ?? items.reduce((s, i) => s + i.fat, 0),
      fiber: raw.total_fiber,
      sodium: raw.total_sodium,
    },
  };

  return {
    id: `mfp_${raw.id ?? Date.now()}`,
    userId,
    dataType: 'meal',
    source: { appId: 'myfitnesspal', appName: 'MyFitnessPal', tier: 2, originalId: String(raw.id ?? '') },
    timestamp: raw.date ?? new Date().toISOString(),
    date: (raw.date ?? new Date().toISOString()).split('T')[0],
    data: meal,
    raw,
  };
}
