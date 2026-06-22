/**
 * src/lib/protocol/phenotypeEnrich.ts
 *
 * Pure helpers for phenotype-driven post-processing in synthesis.
 * Prompt 208a, Module F, Task F4 (2026-06-21).
 *
 * Three exported behaviours:
 *   1. matchesAllergen / screenAllergens  -- hard safety exclusion
 *   2. goalRank                           -- relevance score for stable-sort
 *
 * All functions are pure/deterministic. Never throw. No side effects.
 * No em/en-dashes. No emojis. No new dependencies.
 */

// ---------------------------------------------------------------------------
// Allergen screen
// ---------------------------------------------------------------------------

/**
 * Conservative substring match (case-insensitive) in BOTH directions:
 *   - form contains any allergen substring, OR
 *   - allergen contains the form as a substring.
 * Over-exclusion is intentional (safety first).
 * Returns false if allergens is empty.
 */
export function matchesAllergen(form: string, allergens: string[]): boolean {
  if (!allergens || allergens.length === 0) return false;
  const formLower = form.toLowerCase();
  for (const allergen of allergens) {
    const allergenLower = allergen.toLowerCase();
    if (formLower.includes(allergenLower) || allergenLower.includes(formLower)) {
      return true;
    }
  }
  return false;
}

/**
 * Filter out items where matchesAllergen is true.
 * Generic: works with any object that has a `form: string` field.
 */
export function screenAllergens<T extends { form: string }>(
  items: T[],
  allergens: string[],
): T[] {
  if (!allergens || allergens.length === 0) return items;
  return items.filter((item) => !matchesAllergen(item.form, allergens));
}

// ---------------------------------------------------------------------------
// Goal weighting
// ---------------------------------------------------------------------------

export interface GoalWeightable {
  form: string;
}

/**
 * Simple, deterministic relevance score.
 * For each goal keyword that appears as a substring in `form` (case-insensitive),
 * add 1. Returns 0 if goals is empty or no keyword matches.
 */
export function goalRank(form: string, goals: string[]): number {
  if (!goals || goals.length === 0) return 0;
  const formLower = form.toLowerCase();
  let score = 0;
  for (const goal of goals) {
    const keyword = goal.toLowerCase().replace(/_/g, ' ');
    if (formLower.includes(keyword)) {
      score += 1;
    }
  }
  return score;
}
