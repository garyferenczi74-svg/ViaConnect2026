// Prompt #103 Phase 2: MAP auto-enrollment gating rules.
//
// Mirrors the DB trigger auto_generate_map_policy_for_new_sku()
// decisions in pure TypeScript so we can unit-test the policy without
// hitting a live database. Any divergence between this file and the
// SQL function is a bug — the SQL function is the runtime authority.

import type { CategorySlug } from './types';

export type PricingTier = 'L1' | 'L2' | 'L3' | 'L4';

export interface MapGatingInput {
  pricing_tier: PricingTier | null;
  category_slug: CategorySlug | null;
}

export type MapGatingDecision =
  | { enroll: true; tier: 'L1' | 'L2' }
  | { enroll: false; reason: 'no_tier' | 'tier_exempt' | 'no_category' | 'genex360_testing' };

export function shouldAutoEnrollMap(input: MapGatingInput): MapGatingDecision {
  if (!input.pricing_tier) return { enroll: false, reason: 'no_tier' };
  if (input.pricing_tier === 'L3' || input.pricing_tier === 'L4') {
    return { enroll: false, reason: 'tier_exempt' };
  }
  if (!input.category_slug) return { enroll: false, reason: 'no_category' };
  if (input.category_slug === 'genex360_testing') {
    return { enroll: false, reason: 'genex360_testing' };
  }
  return { enroll: true, tier: input.pricing_tier };
}
