// Prompt #96 Phase 5 + 7: Binding production-order quote calculator.
//
// Pure function. Takes line items + timeline; returns the quote shape
// the API persists into white_label_production_orders.
//
// Phase 7 makes the calculator parameter-aware so governance-approved
// changes to discount tiers / MOV / expedited surcharge take effect at
// runtime. The route layer loads governed values from
// white_label_parameters + white_label_discount_tiers and passes them
// in; tests + the financial-model UI use the spec defaults exported
// alongside.

import {
  EXPEDITED_SURCHARGE_PERCENT as SPEC_EXPEDITED,
  MIN_ORDER_VALUE_CENTS as SPEC_MOV,
  MOQ_PER_SKU,
} from './schema-types';

export interface QuoteLineInput {
  label_design_id: string;
  product_catalog_id: string;
  quantity: number;
  base_msrp_cents: number;
}

export interface QuoteLineResult {
  label_design_id: string;
  product_catalog_id: string;
  quantity: number;
  base_msrp_cents: number;
  unit_cost_cents: number;
  line_subtotal_cents: number;
}

export interface DiscountTierRule {
  tier_id: string;
  min_units: number;
  max_units: number | null;     // null = open upper bound
  discount_percent: number;
}

export interface WhiteLabelParameters {
  minimum_order_value_cents: number;
  expedited_surcharge_percent: number;
}

export const DEFAULT_PARAMETERS: WhiteLabelParameters = {
  minimum_order_value_cents: SPEC_MOV,
  expedited_surcharge_percent: SPEC_EXPEDITED,
};

export const DEFAULT_DISCOUNT_TIERS: DiscountTierRule[] = [
  { tier_id: 'tier_100_499',  min_units: 100,  max_units: 499,  discount_percent: 60 },
  { tier_id: 'tier_500_999',  min_units: 500,  max_units: 999,  discount_percent: 65 },
  { tier_id: 'tier_1000_plus', min_units: 1000, max_units: null, discount_percent: 70 },
];

export interface ProductionQuote {
  line_items: QuoteLineResult[];
  total_units: number;
  applied_discount_tier: string;
  applied_discount_percent: number;
  subtotal_cents: number;
  expedited_surcharge_cents: number;
  total_cents: number;
  deposit_cents: number;
  final_payment_cents: number;
  meets_minimum_order_value: boolean;
  minimum_order_value_cents: number;
}

export interface QuoteInput {
  items: QuoteLineInput[];
  timeline: 'standard' | 'expedited';
  /** Optional governance-loaded discount tiers; defaults to spec. */
  tiers?: DiscountTierRule[];
  /** Optional governance-loaded scalar parameters; defaults to spec. */
  params?: Partial<WhiteLabelParameters>;
}

function classifyTier(totalUnits: number, tiers: DiscountTierRule[]): DiscountTierRule | null {
  for (const t of tiers) {
    if (totalUnits >= t.min_units && (t.max_units === null || totalUnits <= t.max_units)) {
      return t;
    }
  }
  return null;
}

export function calculateProductionQuote(input: QuoteInput): ProductionQuote {
  if (input.items.length === 0) {
    throw new Error('Quote requires at least one line item.');
  }
  for (const item of input.items) {
    if (item.quantity < MOQ_PER_SKU) {
      throw new Error(
        `Line for ${item.product_catalog_id}: ${item.quantity} units is below the ${MOQ_PER_SKU}-unit MOQ.`,
      );
    }
  }

  const tiers = input.tiers ?? DEFAULT_DISCOUNT_TIERS;
  const params: WhiteLabelParameters = { ...DEFAULT_PARAMETERS, ...(input.params ?? {}) };

  const totalUnits = input.items.reduce((acc, i) => acc + i.quantity, 0);
  const tier = classifyTier(totalUnits, tiers);
  if (!tier) {
    throw new Error(`Total order ${totalUnits} units does not meet any discount tier.`);
  }

  const lineItems: QuoteLineResult[] = input.items.map((item) => {
    const unitCost = Math.round(item.base_msrp_cents * (1 - tier.discount_percent / 100));
    return {
      label_design_id: item.label_design_id,
      product_catalog_id: item.product_catalog_id,
      quantity: item.quantity,
      base_msrp_cents: item.base_msrp_cents,
      unit_cost_cents: unitCost,
      line_subtotal_cents: unitCost * item.quantity,
    };
  });

  const subtotalCents = lineItems.reduce((s, l) => s + l.line_subtotal_cents, 0);
  const expeditedSurchargeCents = input.timeline === 'expedited'
    ? Math.round(subtotalCents * params.expedited_surcharge_percent / 100)
    : 0;
  const totalCents = subtotalCents + expeditedSurchargeCents;
  const depositCents = Math.round(totalCents * 0.5);
  const finalPaymentCents = totalCents - depositCents;

  return {
    line_items: lineItems,
    total_units: totalUnits,
    applied_discount_tier: tier.tier_id,
    applied_discount_percent: tier.discount_percent,
    subtotal_cents: subtotalCents,
    expedited_surcharge_cents: expeditedSurchargeCents,
    total_cents: totalCents,
    deposit_cents: depositCents,
    final_payment_cents: finalPaymentCents,
    meets_minimum_order_value: totalCents >= params.minimum_order_value_cents,
    minimum_order_value_cents: params.minimum_order_value_cents,
  };
}
