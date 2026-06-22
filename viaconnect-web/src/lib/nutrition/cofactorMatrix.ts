/**
 * Prompt 208b Task 4.5-T2: cofactor / nutrient-interaction engine.
 *
 * Pure matcher: given the user's supplement stack nutrients, surface the
 * applicable cofactor interactions from the seeded nutrient_interactions
 * matrix (pair/co-time synergists, separate antagonists, balance inhibitors).
 *
 * BOTH nutrients of a pair must be present in the user's set for a match.
 * This module is INFORMATIONAL: it feeds Hannah's schedule guidance and
 * Gordon's meal recommendations. It does NOT gate anything and has no effect
 * on synthesis, interlocks, or UL safety decisions.
 *
 * Every public function is fail-open: it logs and returns an empty result
 * rather than throwing. The module reads via the service-role admin client and
 * owns no user-session auth.
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { safeLog } from '@/lib/utils/safe-log';
import { getSupplementContributions } from '@/lib/nutrition/intakeReconciliation';

const SCOPE = 'nutrition.cofactorMatrix';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface InteractionRow {
  nutrient_a: string;
  nutrient_b: string;
  interaction_type: 'synergy' | 'inhibition' | 'timing_separation';
  mechanism: string | null;
  evidence_tier: number | null;
}

export type CofactorAction = 'pair_or_cotime' | 'separate_timing' | 'balance_ratio';

export interface CofactorGuidance {
  nutrientA: string;
  nutrientB: string;
  interactionType: InteractionRow['interaction_type'];
  action: CofactorAction;
  mechanism: string | null;
}

// ---------------------------------------------------------------------------
// actionFor - map interaction_type to the consumer-facing action
// ---------------------------------------------------------------------------

/**
 * Map a database interaction_type to the consumer-facing action label.
 *   synergy           -> pair_or_cotime  (take together, they enhance each other)
 *   timing_separation -> separate_timing (take apart, one inhibits the other when co-timed)
 *   inhibition        -> balance_ratio   (watch the ratio, excess of one displaces the other)
 */
export function actionFor(interactionType: InteractionRow['interaction_type']): CofactorAction {
  switch (interactionType) {
    case 'synergy':
      return 'pair_or_cotime';
    case 'timing_separation':
      return 'separate_timing';
    case 'inhibition':
      return 'balance_ratio';
  }
}

// ---------------------------------------------------------------------------
// Normalization helpers
// ---------------------------------------------------------------------------

/**
 * Normalize a nutrient key for matching: lowercase and map
 * 'magnesium_supplemental' -> 'magnesium' (the seed table uses 'magnesium').
 */
function normalizeNutrient(key: string): string {
  const lower = key.toLowerCase();
  return lower === 'magnesium_supplemental' ? 'magnesium' : lower;
}

// ---------------------------------------------------------------------------
// cofactorGuidance - pure matcher
// ---------------------------------------------------------------------------

/**
 * Given a set of user nutrient keys and the full interactions list, return
 * one CofactorGuidance per matched pair. A pair matches only when BOTH
 * nutrient_a AND nutrient_b are present in the user's normalized set.
 *
 * Deduplicates identical (nutrient_a, nutrient_b, interaction_type) triples.
 * Deterministic (stable output given the same inputs). Never throws.
 */
export function cofactorGuidance(
  userNutrients: string[],
  interactions: InteractionRow[],
): CofactorGuidance[] {
  try {
    if (!Array.isArray(userNutrients) || !Array.isArray(interactions)) return [];
    if (userNutrients.length === 0 || interactions.length === 0) return [];

    // Build a normalized lookup set of the user's nutrients.
    const userSet = new Set<string>(userNutrients.map(normalizeNutrient));

    const seen = new Set<string>();
    const out: CofactorGuidance[] = [];

    for (const row of interactions) {
      if (!row || typeof row !== 'object') continue;
      const a = typeof row.nutrient_a === 'string' ? row.nutrient_a : '';
      const b = typeof row.nutrient_b === 'string' ? row.nutrient_b : '';
      if (!a || !b) continue;

      // Both must be present.
      if (!userSet.has(normalizeNutrient(a)) || !userSet.has(normalizeNutrient(b))) continue;

      // Dedup by (a, b, type).
      const key = `${a}|${b}|${row.interaction_type}`;
      if (seen.has(key)) continue;
      seen.add(key);

      out.push({
        nutrientA: a,
        nutrientB: b,
        interactionType: row.interaction_type,
        action: actionFor(row.interaction_type),
        mechanism: row.mechanism ?? null,
      });
    }

    return out;
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// loadNutrientInteractions - read the seed table
// ---------------------------------------------------------------------------

/**
 * Read all rows from nutrient_interactions via the admin client.
 * Fail-open: returns [] on any read error or client failure.
 */
export async function loadNutrientInteractions(): Promise<InteractionRow[]> {
  try {
    const sb = createAdminClient();
    const { data, error } = await sb
      .from('nutrient_interactions')
      .select('nutrient_a, nutrient_b, interaction_type, mechanism, evidence_tier');

    if (error) {
      safeLog.warn(SCOPE, 'nutrient_interactions read failed; returning empty', { error });
      return [];
    }

    if (!Array.isArray(data)) return [];

    const out: InteractionRow[] = [];
    for (const raw of data) {
      if (!raw || typeof raw !== 'object') continue;
      const row = raw as Record<string, unknown>;
      const a = typeof row.nutrient_a === 'string' ? row.nutrient_a : '';
      const b = typeof row.nutrient_b === 'string' ? row.nutrient_b : '';
      const type = row.interaction_type as InteractionRow['interaction_type'];
      if (!a || !b || !type) continue;
      out.push({
        nutrient_a: a,
        nutrient_b: b,
        interaction_type: type,
        mechanism: typeof row.mechanism === 'string' ? row.mechanism : null,
        evidence_tier: typeof row.evidence_tier === 'number' ? row.evidence_tier : null,
      });
    }
    return out;
  } catch (err) {
    safeLog.error(SCOPE, 'loadNutrientInteractions threw; returning empty', { err });
    return [];
  }
}

// ---------------------------------------------------------------------------
// buildCofactorGuidance - orchestrate stack read + interaction load + match
// ---------------------------------------------------------------------------

/**
 * Get the user's current supplement stack nutrients, load the interactions
 * matrix, and return the matched cofactor guidance for that user.
 *
 * Fail-open: any error in either read path returns []. Never throws.
 */
export async function buildCofactorGuidance(userId: string): Promise<CofactorGuidance[]> {
  try {
    const [contributions, interactions] = await Promise.all([
      getSupplementContributions(userId),
      loadNutrientInteractions(),
    ]);

    // Extract the nutrient key strings from the contribution objects.
    const userNutrients = contributions.map((c) => c.nutrient);

    return cofactorGuidance(userNutrients, interactions);
  } catch (err) {
    safeLog.error(SCOPE, 'buildCofactorGuidance threw; returning empty', { userId, err });
    return [];
  }
}
