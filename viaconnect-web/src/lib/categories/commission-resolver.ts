// Prompt #103 Phase 6: Commission-rate resolver.
//
// New SKUs inherit commission defaults from their category unless
// overridden at the product level (§7.6). Pure function used by any
// commission-calculation path to resolve the applicable rate.

export interface CommissionResolutionInput {
  product_override_rate_pct: number | null;
  category_default_rate_pct: number | null;
}

export interface CommissionResolution {
  rate_pct: number | null;
  source: 'product_override' | 'category_default' | 'none';
}

export function resolveCommissionRate(input: CommissionResolutionInput): CommissionResolution {
  if (input.product_override_rate_pct !== null && input.product_override_rate_pct !== undefined) {
    return { rate_pct: input.product_override_rate_pct, source: 'product_override' };
  }
  if (input.category_default_rate_pct !== null && input.category_default_rate_pct !== undefined) {
    return { rate_pct: input.category_default_rate_pct, source: 'category_default' };
  }
  return { rate_pct: null, source: 'none' };
}
