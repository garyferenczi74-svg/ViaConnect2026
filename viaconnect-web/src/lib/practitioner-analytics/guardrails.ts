// Prompt #99 Phase 1 (Path A): Helix Rewards isolation guardrail.
//
// Per §3.1 of the prompt, practitioner analytics must NEVER touch any
// helix_* table, column, view, RPC, edge function, or type. The only
// engagement signal surfaced is the aggregate engagement_score from
// the practitioner rollup view.
//
// These pure functions are intended to be called from unit tests that
// scan the compiled bundle + every source file under the practitioner
// analytics tree. A positive match is a hard failure.

/** Forbidden tokens that must never appear in practitioner analytics
 *  surfaces. List derived from Prompt #99 §3.1 and #17b Addendum. */
export const FORBIDDEN_HELIX_TOKENS: readonly string[] = [
  'helix_',
  'token_balance',
  'token_balances',
  'challenge_',
  'challenges_',
  'achievement_',
  'achievements_',
  'leaderboard',
  'tier_multiplier',
  'helixRewards',
  'helix_rewards',
  'helixToken',
  'helix_token',
] as const;

/** Forbidden brand / copy strings. Prompt #99 §3.5 forbids
 *  "Vitality Score" and "Genetic Optimization" in favor of the
 *  canonical "Bio Optimization" label. */
export const FORBIDDEN_BRAND_TOKENS: readonly string[] = [
  'Vitality Score',
  'VitalityScore',
  'vitality_score',
  'Genetic Optimization',
  'GeneticOptimization',
  'genetic_optimization',
] as const;

/** A banned product that must never appear in any catalog, label,
 *  or recommendation surface. Prompt #60d + #99 §3.3. */
export const FORBIDDEN_PRODUCT_TOKENS: readonly string[] = [
  'Semaglutide',
  'semaglutide',
  'SEMAGLUTIDE',
] as const;

export interface GuardrailViolation {
  token: string;
  category: 'helix' | 'brand' | 'product';
  /** Byte offset of the first occurrence within the scanned content. */
  offset: number;
}

export interface GuardrailScanResult {
  ok: boolean;
  violations: GuardrailViolation[];
}

/** Pure: scan `content` for any forbidden token across all three
 *  categories. Returns every violation with its byte offset so the
 *  caller can report a precise file:offset pair. */
export function scanForForbiddenTokens(content: string): GuardrailScanResult {
  const violations: GuardrailViolation[] = [];
  const buckets: Array<[readonly string[], GuardrailViolation['category']]> = [
    [FORBIDDEN_HELIX_TOKENS, 'helix'],
    [FORBIDDEN_BRAND_TOKENS, 'brand'],
    [FORBIDDEN_PRODUCT_TOKENS, 'product'],
  ];
  for (const [tokens, category] of buckets) {
    for (const token of tokens) {
      const offset = content.indexOf(token);
      if (offset !== -1) {
        violations.push({ token, category, offset });
      }
    }
  }
  return { ok: violations.length === 0, violations };
}

/** Pure: returns true if the given SQL / TS source references any
 *  helix_* identifier. Used by migration + query-helper tests to
 *  block materialized-view SQL that accidentally joins helix tables. */
export function containsHelixReference(source: string): boolean {
  for (const token of FORBIDDEN_HELIX_TOKENS) {
    if (source.includes(token)) return true;
  }
  return false;
}

/** Pure: assert a canonical medical disclaimer is present in a page
 *  body. Case-insensitive substring check — template wrapping is OK
 *  as long as the anchor phrase is preserved verbatim. Prompt #99
 *  §3.4 canonical text. */
export const CANONICAL_MEDICAL_DISCLAIMER_ANCHOR =
  'decision-support tools, not medical advice';

export function containsMedicalDisclaimer(pageSource: string): boolean {
  return pageSource.toLowerCase().includes(
    CANONICAL_MEDICAL_DISCLAIMER_ANCHOR.toLowerCase(),
  );
}

/** Pure: assert an engagement surface only renders aggregate
 *  signals (practice-level rollups) and never raw user-level Helix
 *  artifacts. The aggregate score name is always "engagement_score"
 *  per #17b Addendum; anything with "helix_" is a hard fail. */
export function isAggregateOnlyEngagementSource(source: string): boolean {
  if (containsHelixReference(source)) return false;
  const hasAggregateSignal =
    source.includes('engagement_score') ||
    source.includes('engagementScore');
  return hasAggregateSignal;
}
