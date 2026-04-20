// Prompt #96 Phase 5: Binding production-order quote calculator.
//
// Pure function. Takes line items + timeline; returns the quote shape
// the API persists into white_label_production_orders. Phase 3 has a
// near-identical helper (financial-model.ts) for non-binding what-if
// projections; this module is the single source of truth for what the
// practitioner is actually asked to pay.
//
// Numerics live in schema-types.ts so changes flow through Phase 1.

import {
  classifyDiscountTier,
  EXPEDITED_SURCHARGE_PERCENT,
  MIN_ORDER_VALUE_CENTS,
  MOQ_PER_SKU,
  type DiscountTierId,
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

export interface ProductionQuote {
  line_items: QuoteLineResult[];
  total_units: number;
  applied_discount_tier: DiscountTierId;
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

  const totalUnits = input.items.reduce((acc, i) => acc + i.quantity, 0);
  const tier = classifyDiscountTier(totalUnits);
  if (!tier) {
    throw new Error(`Total order ${totalUnits} units does not meet any discount tier.`);
  }

  const lineItems: QuoteLineResult[] = input.items.map((item) => {
    const unitCost = Math.round(item.base_msrp_cents * (1 - tier.percent / 100));
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
    ? Math.round(subtotalCents * EXPEDITED_SURCHARGE_PERCENT / 100)
    : 0;
  const totalCents = subtotalCents + expeditedSurchargeCents;
  const depositCents = Math.round(totalCents * 0.5);
  const finalPaymentCents = totalCents - depositCents;

  return {
    line_items: lineItems,
    total_units: totalUnits,
    applied_discount_tier: tier.tier,
    applied_discount_percent: tier.percent,
    subtotal_cents: subtotalCents,
    expedited_surcharge_cents: expeditedSurchargeCents,
    total_cents: totalCents,
    deposit_cents: depositCents,
    final_payment_cents: finalPaymentCents,
    meets_minimum_order_value: totalCents >= MIN_ORDER_VALUE_CENTS,
    minimum_order_value_cents: MIN_ORDER_VALUE_CENTS,
  };
}
