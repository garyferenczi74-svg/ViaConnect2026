/**
 * src/lib/genetics/ancestry/populationMatch.ts
 *
 * Ancestry-aware population matching helpers for protocol synthesis.
 * Prompt 208a Module C Task C2 (2026-06-22).
 *
 * FAIRNESS RULE: empty user populations (unknown ancestry) are NEVER penalized.
 * Caveats are informational only -- they do not gate or remove any rule or interlock.
 *
 * No em/en-dashes. No emojis. No new dependencies. No package.json changes.
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { safeLog } from '@/lib/utils/safe-log';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface PopulationCaveat {
  rsid: string;
  caveat: string;
}

// ---------------------------------------------------------------------------
// populationMatches
//
// Returns true when:
//   - rulePopulations is null/undefined/empty (universal rule, applies to all).
//   - Any element of rulePopulations overlaps userPopulations (case-insensitive).
//   - userPopulations is empty (unknown ancestry -- do not penalize the user).
//
// Returns false ONLY when:
//   - rulePopulations is non-empty AND userPopulations is non-empty AND no
//     case-insensitive overlap exists.
// ---------------------------------------------------------------------------
export function populationMatches(
  rulePopulations: string[] | null | undefined,
  userPopulations: string[],
): boolean {
  // Universal rule: empty/null rulePopulations -> always matches.
  if (!rulePopulations || rulePopulations.length === 0) return true;

  // Unknown ancestry: do not penalize. Treat as match.
  if (userPopulations.length === 0) return true;

  // Case-insensitive overlap check.
  const userLower = userPopulations.map((p) => p.toLowerCase().trim());
  return rulePopulations.some((rp) => userLower.includes(rp.toLowerCase().trim()));
}

// ---------------------------------------------------------------------------
// populationCaveatFor
//
// Returns a PopulationCaveat when ALL of the following are true:
//   1. rule.validated_populations is non-empty (rule is population-specific).
//   2. userPopulations is non-empty (ancestry is known).
//   3. populationMatches returns false (user population does not match).
//   4. rule.cross_population_caveat is a non-empty string.
//
// Returns null in all other cases (no caveat when ancestry unknown, when the
// rule is universal, when it matches, or when no caveat text is provided).
// ---------------------------------------------------------------------------
export function populationCaveatFor(
  rule: {
    rsid: string;
    validated_populations?: string[] | null;
    cross_population_caveat?: string | null;
  },
  userPopulations: string[],
): PopulationCaveat | null {
  // Rule must have non-empty validated_populations.
  if (!rule.validated_populations || rule.validated_populations.length === 0) return null;

  // Unknown ancestry: do not penalize.
  if (userPopulations.length === 0) return null;

  // Populations match: no caveat needed.
  if (populationMatches(rule.validated_populations, userPopulations)) return null;

  // No caveat text: nothing to surface.
  if (!rule.cross_population_caveat || rule.cross_population_caveat.trim().length === 0) return null;

  return { rsid: rule.rsid, caveat: rule.cross_population_caveat };
}

// ---------------------------------------------------------------------------
// getUserAncestry
//
// Reads the user's ancestry from:
//   1. The latest ancestry_context row's populations jsonb (coerced to string[]).
//   2. Falls back to the user's CAQ demographics.ethnicity (string[]).
//
// Returns [] (fail-open) on any error. Values are lowercased and trimmed.
// ---------------------------------------------------------------------------
export async function getUserAncestry(userId: string): Promise<string[]> {
  try {
    const supabase = createAdminClient();

    // Step 1: Read latest ancestry_context row.
    const { data, error } = await (supabase
      .from('ancestry_context')
      .select('populations')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle() as unknown as Promise<{
      data: { populations: unknown } | null;
      error: { message: string } | null;
    }>);

    if (!error && data && Array.isArray(data.populations) && data.populations.length > 0) {
      return (data.populations as unknown[])
        .filter((p): p is string => typeof p === 'string')
        .map((p) => p.toLowerCase().trim())
        .filter((p) => p.length > 0);
    }

    // Step 2: Fall back to CAQ demographics.ethnicity via user_health_context.
    try {
      const { data: hcData, error: hcError } = await (supabase
        .from('user_health_context')
        .select('demographics')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle() as unknown as Promise<{
        data: { demographics: unknown } | null;
        error: { message: string } | null;
      }>);

      if (!hcError && hcData && typeof hcData.demographics === 'object' && hcData.demographics !== null) {
        const demo = hcData.demographics as Record<string, unknown>;
        const rawEthnicity = demo['ethnicity'];
        if (Array.isArray(rawEthnicity) && rawEthnicity.length > 0) {
          return rawEthnicity
            .filter((e): e is string => typeof e === 'string')
            .map((e) => e.toLowerCase().trim())
            .filter((e) => e.length > 0);
        }
      }
    } catch (fallbackErr) {
      safeLog.warn('population-match', 'getUserAncestry: CAQ fallback threw; returning []', {
        userId,
        err: fallbackErr,
      });
    }

    return [];
  } catch (err) {
    safeLog.warn('population-match', 'getUserAncestry: threw; returning []', { userId, err });
    return [];
  }
}
