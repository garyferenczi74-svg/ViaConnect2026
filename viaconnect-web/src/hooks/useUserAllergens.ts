/**
 * Prompt 170l Phase 1c-3: user allergen flag source for ProductConfirmation
 * §11.4 user-flagged allergen highlight.
 *
 * Returns the user's flagged allergens normalized to lowercase strings (no
 * "en:" prefix; spaces instead of hyphens) so they can match OFF
 * `allergens_tags` entries which look like "en:milk" or "en:tree-nuts".
 *
 * v1 placeholder: returns an empty list. The actual data source (likely
 * CAQ Phase 6 allergy fields on user_consumer_assessment_quiz_responses or
 * a dedicated user_allergens table) gets wired when that path is identified.
 * No-op match behavior is correct: zero highlights, allergens render as
 * standard chips without Orange treatment.
 */

'use client';

export function useUserAllergens(): ReadonlyArray<string> {
  // Placeholder until the CAQ allergen data source is wired.
  return [];
}

/**
 * Compare an OFF allergens_tags entry against the user-flagged list.
 * OFF format: "en:milk" or "en:tree-nuts". Normalized format: "milk" /
 * "tree nuts".
 */
export function isAllergenMatch(
  offTag: string,
  userAllergens: ReadonlyArray<string>,
): boolean {
  const normalized = offTag
    .replace(/^en:/, '')
    .replace(/-/g, ' ')
    .toLowerCase()
    .trim();
  return userAllergens.some(
    (flagged) => flagged.toLowerCase().trim() === normalized,
  );
}
