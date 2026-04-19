// Prompt #92 Phase 3: Helix + supplement discount stacking.
//
// Interpretation B: Helix supplement_discount redemption applies to the
// POST base-discount price, capped at 15% of that post-discount price.
//
// Example (MSRP $100, base 20%, Helix 15%):
//   after base:  $100 * 0.80 = $80
//   after Helix: $80  * 0.85 = $68
//   total savings: $32 (32% off MSRP)
//
// The base discount remains capped at 25% of MSRP (Prompt #90's rule).
// The Helix portion stacks separately on top; there is no combined cap.

import { computeDiscount, type ComputeDiscountOptions } from '@/lib/pricing/discount-engine';
import type { DiscountCalculationResult, SupplementDiscountRule, UserPricingContext } from '@/types/pricing';

const MAX_HELIX_PERCENT = 15;

export interface HelixStackedResult extends DiscountCalculationResult {
  helixContributionPercent: number;
  helixSavingsCents: number;
  /** Combined effective percent off MSRP: 1 - (post-Helix price / original). */
  effectiveTotalPercent: number;
  /** Base discount savings in cents (= savingsCents before Helix). */
  baseSavingsCents: number;
}

export interface HelixStackedInputs {
  originalPriceCents: number;
  context: UserPricingContext;
  rules: SupplementDiscountRule[];
  options: ComputeDiscountOptions;
  /** Percent off from the redeemed Helix supplement discount (0..15). */
  helixDiscountPercent: number;
}

/** Pure: combine the base discount (from Prompt #90) with a Helix redemption
 *  per Interpretation B. */
export function computeDiscountWithHelix(inputs: HelixStackedInputs): HelixStackedResult {
  const {
    originalPriceCents,
    context,
    rules,
    options,
    helixDiscountPercent,
  } = inputs;

  const base = computeDiscount(originalPriceCents, context, rules, options);
  const postBaseCents = base.finalPriceCents;

  // Cap Helix at 15% per Interpretation B.
  const helixPct = Math.max(0, Math.min(MAX_HELIX_PERCENT, helixDiscountPercent));
  const helixSavingsCents = Math.round(postBaseCents * (helixPct / 100));
  const finalPriceCents = postBaseCents - helixSavingsCents;

  const totalSavingsCents = originalPriceCents - finalPriceCents;
  const effectiveTotalPercent =
    originalPriceCents > 0 ? Math.round((totalSavingsCents / originalPriceCents) * 1000) / 10 : 0;

  return {
    ...base,
    helixContributionPercent: helixPct,
    helixSavingsCents,
    effectiveTotalPercent,
    baseSavingsCents: base.savingsCents,
    // Update the top-level fields to reflect the final stacked result
    finalPriceCents,
    savingsCents: totalSavingsCents,
  };
}

export { MAX_HELIX_PERCENT };
