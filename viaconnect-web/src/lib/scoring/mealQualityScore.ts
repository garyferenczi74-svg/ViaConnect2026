// Prompt #79 — meal quality scoring from 4 macro sliders (1-10 each).
// Protein builds the score, fat lifts it modestly, excess sugar penalizes,
// high carbs are moderated by protein balance.

export function computeMealScore(
  protein: number,
  carbs: number,
  fat: number,
  sugar: number,
): number {
  const p = clamp10(protein);
  const c = clamp10(carbs);
  const f = clamp10(fat);
  const s = clamp10(sugar);

  // Protein: primary positive contributor (40 pts max)
  const proteinScore = (p / 10) * 40;

  // Fat: secondary positive (15 pts max, dietary fat is essential)
  const fatScore = (f / 10) * 15;

  // Carb balance: ideal carbs ~5, penalty both ways
  const carbDist = Math.abs(c - 5);
  const carbScore = Math.max(0, 25 - carbDist * 3);

  // Sugar: penalty scales — low sugar = full 20 pts, high sugar = 0
  const sugarScore = Math.max(0, 20 - (s - 1) * 2.5);

  const total = proteinScore + fatScore + carbScore + sugarScore;
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
