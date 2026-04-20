// Prompt #100 MAP Enforcement — runtime + static guardrails.
//
// This module is the single source of truth for the MAP-specific
// compliance rules. Tests scan the entire MAP tree for violations.

/** §3.1 scope: MAP applies only to L1 + L2. Listings for L3/L4 SKUs
 *  must never enter violation detection. */
export const MAP_ALLOWED_TIERS = ['L1', 'L2'] as const;
export type MAPAllowedTier = typeof MAP_ALLOWED_TIERS[number];

export function isMAPEnforcedTier(tier: string | null | undefined): boolean {
  if (!tier) return false;
  return (MAP_ALLOWED_TIERS as readonly string[]).includes(tier);
}

/** §3.3: MAP data must never touch any consumer reward-program
 *  table or identifier. The tokens below are forbidden anywhere in
 *  the MAP source tree (guardrails.ts itself is the self-referencing
 *  exception; the test allow-lists it). */
export const FORBIDDEN_MAP_TOKENS: readonly string[] = [
  'helix_',
  'token_balance',
  'challenge_',
  'achievement_',
  'leaderboard',
  'tier_multiplier',
  'helixRewards',
  'helix_rewards',
];

/** Naming collision trap: map_compliance_tier uses the words
 *  Platinum/Gold/Silver/Bronze, which also appear in Helix Rewards
 *  consumer tier multipliers. To keep the systems disjoint, MAP code
 *  must only refer to practitioner tier via the exact column name
 *  `map_compliance_tier`. If an identifier names a generic
 *  `practitioner_tier` or `tier_multiplier`, that's a collision. */
export const FORBIDDEN_COLLISION_IDENTIFIERS: readonly string[] = [
  'practitioner_tier',
  'tier_multiplier',
  'helix_tier',
];

/** §3.5 (#94) 42% margin rule: MAP floor must be at least
 *  1.72x ingredient cost. Used by the admin policy editor to block
 *  saves that would violate the margin constraint before the DB
 *  CHECK rejects them. */
export const MARGIN_MULTIPLIER = 1.72;

export function isMarginPreserving(
  mapPriceCents: number,
  ingredientCostFloorCents: number,
): boolean {
  if (ingredientCostFloorCents <= 0) return false;
  return mapPriceCents >= Math.ceil(ingredientCostFloorCents * MARGIN_MULTIPLIER);
}

export function marginPreservingFloorCents(ingredientCostFloorCents: number): number {
  return Math.ceil(ingredientCostFloorCents * MARGIN_MULTIPLIER);
}

/** §3.4 fair enforcement: anonymous observations (no verified
 *  practitioner channel) must never auto-penalize a practitioner. */
export function isAttributableToPractitioner(practitionerId: string | null): boolean {
  return typeof practitionerId === 'string' && practitionerId.length > 0;
}

export interface GuardrailScanResult {
  ok: boolean;
  violations: Array<{ token: string; category: 'map_forbidden' | 'collision' }>;
}

/** Pure: scan a source string for any forbidden MAP token. Used by
 *  the static test that greps the whole MAP tree. */
export function scanForMAPGuardrailViolations(content: string): GuardrailScanResult {
  const violations: GuardrailScanResult['violations'] = [];
  for (const token of FORBIDDEN_MAP_TOKENS) {
    if (content.includes(token)) {
      violations.push({ token, category: 'map_forbidden' });
    }
  }
  for (const token of FORBIDDEN_COLLISION_IDENTIFIERS) {
    if (content.includes(token)) {
      violations.push({ token, category: 'collision' });
    }
  }
  return { ok: violations.length === 0, violations };
}

/** Pure: assert that a SQL query scoped to L1/L2 contains the
 *  expected pricing_tier filter. Used by tests scanning MV + function
 *  bodies for the scope clause. */
export function sqlReferencesL1L2Filter(sql: string): boolean {
  const norm = sql.replace(/\s+/g, ' ');
  return (
    /pricing_tier\s+IN\s*\(\s*'L1'\s*,\s*'L2'\s*\)/i.test(norm) ||
    /tier\s+IN\s*\(\s*'L1'\s*,\s*'L2'\s*\)/i.test(norm)
  );
}
