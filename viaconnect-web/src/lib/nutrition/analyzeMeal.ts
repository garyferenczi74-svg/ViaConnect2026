export interface IdentifiedItem {
  id: string;
  name: string;
  portionDescription: string;
  portionGrams: number;
  confidence: number;
  category: 'protein' | 'carb' | 'fat' | 'vegetable' | 'fruit' | 'dairy' | 'grain' | 'beverage' | 'other';
}

export interface MacroTotals {
  calories: number;
  calorieRange: [number, number];
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
}

export interface MicronutrientEstimate {
  nutrient: string;
  amount: number;
  unit: string;
  dailyValuePercent: number;
}

export interface MealAnalysisResult {
  items: IdentifiedItem[];
  totals: MacroTotals;
  micronutrients: MicronutrientEstimate[];
  mealQualityScore: number;
  qualityFactors: string[];
  portionAssessment: 'small' | 'moderate' | 'large' | 'very_large';
  analysisConfidence: number;
}

export async function analyzeMealPhotos(
  photos: { base64: string; mediaType: string }[],
  mealType: string,
  dietaryContext?: string,
): Promise<MealAnalysisResult> {
  const res = await fetch('/api/ai/meal-analysis', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ images: photos, mealType, dietaryContext }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Meal analysis failed: ${err}`);
  }

  return res.json();
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function recalculateTotals(items: IdentifiedItem[]): MacroTotals {
  const PER_GRAM: Record<string, { cal: number; p: number; c: number; f: number }> = {
    protein:   { cal: 1.5, p: 0.25, c: 0.0, f: 0.05 },
    carb:      { cal: 1.3, p: 0.03, c: 0.22, f: 0.01 },
    fat:       { cal: 5.0, p: 0.01, c: 0.0, f: 0.50 },
    vegetable: { cal: 0.25, p: 0.02, c: 0.04, f: 0.002 },
    fruit:     { cal: 0.5, p: 0.005, c: 0.12, f: 0.002 },
    dairy:     { cal: 0.9, p: 0.06, c: 0.05, f: 0.05 },
    grain:     { cal: 2.5, p: 0.08, c: 0.45, f: 0.02 },
    beverage:  { cal: 0.3, p: 0.0, c: 0.08, f: 0.0 },
    other:     { cal: 1.5, p: 0.05, c: 0.15, f: 0.08 },
  };

  let calories = 0, protein = 0, carbs = 0, fat = 0;
  for (const item of items) {
    const m = PER_GRAM[item.category] ?? PER_GRAM.other;
    const g = item.portionGrams;
    calories += g * m.cal;
    protein += g * m.p;
    carbs += g * m.c;
    fat += g * m.f;
  }

  const cal = Math.round(calories);
  return {
    calories: cal,
    calorieRange: [Math.round(cal * 0.8), Math.round(cal * 1.2)],
    protein: Math.round(protein),
    carbs: Math.round(carbs),
    fat: Math.round(fat),
    fiber: 0,
    sugar: 0,
    sodium: 0,
  };
}
