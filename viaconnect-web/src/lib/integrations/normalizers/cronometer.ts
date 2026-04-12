import type { NormalizedData, NormalizedMeal } from '../dataNormalizer';

export function normalizeCronometer(userId: string, raw: any): NormalizedData {
  const meal: NormalizedMeal = {
    type: 'meal',
    mealType: mapMealGroup(raw.group ?? raw.meal_type),
    items: (raw.food_items ?? []).map((i: any) => ({
      name: i.name ?? 'Unknown',
      servingSize: i.serving ?? '1 serving',
      calories: i.energy ?? 0,
      protein: i.protein ?? 0,
      carbs: i.carbs ?? 0,
      fat: i.fat ?? 0,
    })),
    totals: {
      calories: raw.total_energy ?? 0,
      protein: raw.total_protein ?? 0,
      carbs: raw.total_carbs ?? 0,
      fat: raw.total_fat ?? 0,
      fiber: raw.total_fiber,
      sugar: raw.total_sugar,
      sodium: raw.total_sodium,
    },
    micronutrients: (raw.nutrient_totals ?? []).map((n: any) => ({
      nutrient: n.name ?? n.nutrient_id,
      amount: n.amount ?? 0,
      unit: n.unit ?? 'mg',
      dailyValuePercent: n.dv_percent ?? 0,
    })),
  };

  return {
    id: `cron_${raw.id ?? Date.now()}`,
    userId,
    dataType: 'meal',
    source: { appId: 'cronometer', appName: 'Cronometer', tier: 2, originalId: String(raw.id ?? '') },
    timestamp: raw.date ?? new Date().toISOString(),
    date: (raw.date ?? new Date().toISOString()).split('T')[0],
    data: meal,
    raw,
  };
}

function mapMealGroup(group: string | number): NormalizedMeal['mealType'] {
  const g = String(group).toLowerCase();
  if (g.includes('break') || g === '0') return 'breakfast';
  if (g.includes('lunch') || g === '1') return 'lunch';
  if (g.includes('dinner') || g.includes('supper') || g === '2') return 'dinner';
  return 'snack';
}
