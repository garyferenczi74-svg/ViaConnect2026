// Meal quality scoring from 5 macro sliders (1-10 each).
// Protein builds the score, healthy fat earns a larger bonus than total
// fat, excess sugar penalizes, high carbs are moderated by protein
// balance.

export function computeMealScore(
  protein: number,
  carbs: number,
  fat: number,
  sugar: number,
  healthyFat: number = 5,
): number {
  const p = clamp10(protein);
  const c = clamp10(carbs);
  const f = clamp10(fat);
  const hf = clamp10(healthyFat);
  const s = clamp10(sugar);

  // Protein: primary positive contributor (40 pts max)
  const proteinScore = (p / 10) * 40;

  // Total fat: modest positive (5 pts max, dietary fat is essential)
  const fatScore = (f / 10) * 5;

  // Healthy fat: larger positive (10 pts max, nudges toward omega-3,
  // avocado, olive, MCT type fats)
  const healthyFatScore = (hf / 10) * 10;

  // Carb balance: ideal carbs ~5, penalty both ways
  const carbDist = Math.abs(c - 5);
  const carbScore = Math.max(0, 25 - carbDist * 3);

  // Sugar: penalty scales — low sugar = full 20 pts, high sugar = 0
  const sugarScore = Math.max(0, 20 - (s - 1) * 2.5);

  const total = proteinScore + fatScore + healthyFatScore + carbScore + sugarScore;
  return Math.round(Math.min(100, Math.max(0, total)));
}

export function mealScoreLabel(score: number): string {
  if (score >= 80) return 'Excellent';
  if (score >= 65) return 'Good';
  if (score >= 45) return 'OK';
  if (score >= 25) return 'Low';
  return 'Poor';
}

export function mealScoreColor(score: number): string {
  if (score >= 80) return '#22C55E';
  if (score >= 65) return '#2DA5A0';
  if (score >= 45) return '#F59E0B';
  if (score >= 25) return '#B75E18';
  return '#EF4444';
}

function clamp10(n: number): number {
  return Math.max(1, Math.min(10, Math.round(n)));
}
