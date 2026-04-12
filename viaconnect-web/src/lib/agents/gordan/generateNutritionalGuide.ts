// Genetics Nutritional Guide types and generation orchestrator (Prompt #62i).
// Gordan combines genetics, labs, allergies, and CAQ to produce a
// personalized dietary blueprint stored as structured JSON.

export interface GeneticsNutritionalGuide {
  userId: string;
  generatedAt: string;
  confidenceTier: 1 | 2 | 3;
  confidencePercent: number;
  dataSources: string[];

  dietType: {
    name: string;
    description: string;
    keyPrinciples: string[];
    macroRatio: { protein: number; carbs: number; fat: number };
    caloricTarget: { base: number; range: [number, number]; adjustedFor: string[] };
  };

  priorityFoods: FoodRecommendation[];
  avoidFoods: FoodAvoidance[];
  nutrientTargets: NutrientTarget[];
  mealFramework: MealFramework;
  synergyMap: SupplementDietSynergy[];
}

export interface FoodRecommendation {
  id: string;
  food: string;
  category: string;
  frequency: string;
  servingSize: string;
  geneticReason: string;
  labReason?: string;
  nutrientsProvided: string[];
  supplementSynergy?: string;
  priority: 'essential' | 'recommended' | 'beneficial';
}

export interface FoodAvoidance {
  id: string;
  food: string;
  category: string;
  severity: 'avoid' | 'limit' | 'caution';
  reason: string;
  geneticBasis?: string;
  labBasis?: string;
  allergyBasis?: string;
  alternatives: string[];
}

export interface NutrientTarget {
  nutrient: string;
  dailyTarget: number;
  unit: string;
  standardRDA: number;
  geneticAdjustment: string;
  adjustmentReason: string;
  topFoodSources: string[];
  supplementCoverage: number;
  dietGap: number;
}

export interface MealFramework {
  mealsPerDay: number;
  eatingWindow?: { start: string; end: string };
  meals: MealTemplate[];
}

export interface MealTemplate {
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  timing: string;
  macroTarget: { protein: number; carbs: number; fat: number };
  principles: string[];
  exampleMeals: string[];
  supplementSync: string[];
}

export interface SupplementDietSynergy {
  supplement: string;
  bestPairedWith: string[];
  avoidPairingWith: string[];
  optimalTiming: string;
  geneticReason: string;
}

export type ConfidenceTier = 1 | 2 | 3;

export function determineTier(
  hasGenetics: boolean,
  hasLabs: boolean,
): { tier: ConfidenceTier; percent: number; sources: string[] } {
  const sources: string[] = ['CAQ'];
  if (hasLabs) sources.push('Lab Results');
  if (hasGenetics) sources.push('GeneX360 Genetics');

  if (hasGenetics && hasLabs) return { tier: 3, percent: 96, sources };
  if (hasLabs) return { tier: 2, percent: 86, sources };
  return { tier: 1, percent: 72, sources };
}

export async function fetchGuide(userId: string): Promise<GeneticsNutritionalGuide | null> {
  const { createClient } = await import('@/lib/supabase/client');
  const supabase = createClient();

  const { data } = await (supabase as any)
    .from('genetics_nutritional_guides')
    .select('guide_data')
    .eq('user_id', userId)
    .eq('is_current', true)
    .single();

  return data?.guide_data ?? null;
}

export async function requestGuideGeneration(userId: string): Promise<GeneticsNutritionalGuide> {
  const res = await fetch('/api/ai/nutrition', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ task: 'generate_nutritional_guide', payload: {} }),
  });
  if (!res.ok) throw new Error('Guide generation failed');
  return res.json();
}
