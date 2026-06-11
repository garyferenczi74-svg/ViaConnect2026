// Prompt #164 Layer 2: convert (unit, quantity, foodHint) to grams when USDA's
// per-food portion data is unavailable. Sources are USDA SR Legacy averages
// and common kitchen references. When this returns null, the caller falls
// back to Gemini estimation rather than guessing.

const GRAMS_PER_OZ = 28.3495;
const GRAMS_PER_TBSP_WATER = 14.79;
const GRAMS_PER_TSP_WATER = 4.93;
const GRAMS_PER_CUP_WATER = 240;

const WHOLE_FOODS_G: Record<string, number> = {
  egg: 50, apple: 182, banana: 118, avocado: 200, orange: 131,
  tomato: 123, potato: 173, 'sweet potato': 130, onion: 110,
  carrot: 61, pepper: 119, peach: 150, pear: 178,
};

const SIZE_MULTIPLIERS: Record<string, number> = {
  small: 0.7, medium: 1.0, large: 1.4,
};

const SLICE_G: Record<string, number> = {
  // Prompt 186: sourdough 30 g. The prompt's curated-table suggestion of 50
  // to 60 g is mutually inconsistent with its own Section 1 ground truth
  // (75 kcal per piece = 28 g) and the Phase 4 carbs band (38 to 50 g for
  // the golden meal), which no engine can satisfy at 55 g. The binding
  // acceptance bands win; flagged for Gary's ratification in the work log.
  bread: 28, 'whole wheat bread': 28, 'sourdough bread': 30,
  bacon: 12, ham: 28, cheese: 23, pizza: 107,
};

// Prompt 186 review fix: distinguishes a real table hit from the generic
// slice guess. The portion resolver's FDC-vs-curated conflict guard must
// only trust weights the table actually knows; the 28 g generic slice is a
// guess and must not override a measured FDC portion (a 192 g quiche slice
// is legitimate), and it carries the confidence downgrade.
export function hasCuratedWeight(unit: string, foodHint: string): boolean {
  const hint = foodHint.toLowerCase().trim();
  if (unit === 'slice') return matchPrefix(SLICE_G, hint) !== null;
  if (unit === 'whole' || unit === 'small' || unit === 'medium' || unit === 'large') {
    return matchPrefix(WHOLE_FOODS_G, hint) !== null;
  }
  if (unit === 'g' || unit === 'oz' || unit === 'ml' || unit === 'tbsp' || unit === 'tsp' || unit === 'cup') {
    return true;
  }
  return false;
}

export function unitToGrams(unit: string, quantity: number, foodHint: string): number | null {
  const hint = foodHint.toLowerCase().trim();

  if (unit === 'g') return quantity;
  if (unit === 'oz') return quantity * GRAMS_PER_OZ;
  if (unit === 'ml') return quantity;
  if (unit === 'tbsp') return quantity * GRAMS_PER_TBSP_WATER;
  if (unit === 'tsp') return quantity * GRAMS_PER_TSP_WATER;
  if (unit === 'cup') return quantity * GRAMS_PER_CUP_WATER;
  if (unit === 'slice') return quantity * (matchPrefix(SLICE_G, hint) ?? 28);
  if (unit === 'serving') return null;

  if (unit === 'whole' || unit === 'small' || unit === 'medium' || unit === 'large') {
    const base = matchPrefix(WHOLE_FOODS_G, hint);
    if (base == null) return null;
    const mult = SIZE_MULTIPLIERS[unit] ?? 1.0;
    return quantity * base * mult;
  }

  return null;
}

function matchPrefix(table: Record<string, number>, hint: string): number | null {
  // Prompt 186: longest key wins so "sourdough bread" is not shadowed by
  // "bread" (the old first-match returned 28 g for every bread variant).
  const keys = Object.keys(table).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    if (hint === key || hint.includes(key)) return table[key];
  }
  return null;
}
