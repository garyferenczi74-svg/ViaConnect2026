// Prompt #96 Phase 3: White-label financial modeling.
//
// Pure-function projection used by the practitioner-facing financial
// model tool to evaluate "if I order N units of these SKUs at this
// retail price, what is my deposit, my final payment, my unit margin,
// and my total projected gross profit?"
//
// Reuses the Phase 1 discount-tier classifier and Phase 1 spec defaults.

import {
  classifyDiscountTier,
  EXPEDITED_SURCHARGE_PERCENT,
  MIN_ORDER_VALUE_CENTS,
  MOQ_PER_SKU,
  type DiscountTierId,
} from './schema-types';

export interface ModelLineItem {
  labelDesignId: string;
  productCatalogId: string;
  quantity: number;
  baseMsrpCents: number;
  projectedRetailPriceCents: number | null;
}

export interface ModelLineResult {
  label_design_id: string;
  product_catalog_id: string;
  quantity: number;
  base_msrp_cents: number;
  unit_cost_cents: number;
  line_subtotal_cents: number;
  projected_unit_margin_cents: number | null;
  projected_line_revenue_cents: number | null;
  projected_line_margin_cents: number | null;
}

export interface ProductionModel {
  line_items: ModelLineResult[];
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
  projected_total_revenue_cents: number | null;
  projected_total_margin_cents: number | null;
}

export interface ModelInput {
  items: ModelLineItem[];
  timeline: 'standard' | 'expedited';
}

export function modelProductionRun(input: ModelInput): ProductionModel {
  for (const item of input.items) {
    if (item.quantity < MOQ_PER_SKU) {
      throw new Error(
        `Line for ${item.productCatalogId}: ${item.quantity} units is below the ${MOQ_PER_SKU}-unit MOQ.`,
      );
    }
  }

  const totalUnits = input.items.reduce((acc, i) => acc + i.quantity, 0);
  const tier = classifyDiscountTier(totalUnits);
  if (!tier) {
    throw new Error(
      `Total order ${totalUnits} units does not meet any discount tier (minimum ${MOQ_PER_SKU}).`,
    );
  }

  const lineItems: ModelLineResult[] = input.items.map((item) => {
    const unitCost = Math.round(item.baseMsrpCents * (1 - tier.percent / 100));
    const lineSubtotal = unitCost * item.quantity;
    const retail = item.projectedRetailPriceCents;
    const unitMargin = retail != null ? retail - unitCost : null;
    const lineRevenue = retail != null ? retail * item.quantity : null;
    const lineMargin = unitMargin != null ? unitMargin * item.quantity : null;
    return {
      label_design_id: item.labelDesignId,
      product_catalog_id: item.productCatalogId,
      quantity: item.quantity,
      base_msrp_cents: item.baseMsrpCents,
      unit_cost_cents: unitCost,
      line_subtotal_cents: lineSubtotal,
      projected_unit_margin_cents: unitMargin,
      projected_line_revenue_cents: lineRevenue,
      projected_line_margin_cents: lineMargin,
    };
  });

  const subtotal = lineItems.reduce((s, l) => s + l.line_subtotal_cents, 0);
  const expeditedSurcharge = input.timeline === 'expedited'
    ? Math.round(subtotal * EXPEDITED_SURCHARGE_PERCENT / 100)
    : 0;
  const total = subtotal + expeditedSurcharge;
  const deposit = Math.round(total * 0.5);
  const finalPayment = total - deposit;

  // Projected revenue / margin: null if ANY line lacks a retail price.
  const allRevenue = lineItems.every((l) => l.projected_line_revenue_cents != null);
  const projectedTotalRevenue = allRevenue
    ? lineItems.reduce((s, l) => s + (l.projected_line_revenue_cents ?? 0), 0)
    : null;
  const projectedTotalMargin = allRevenue
    ? lineItems.reduce((s, l) => s + (l.projected_line_margin_cents ?? 0), 0)
    : null;

  return {
    line_items: lineItems,
    total_units: totalUnits,
    applied_discount_tier: tier.tier,
    applied_discount_percent: tier.percent,
    subtotal_cents: subtotal,
    expedited_surcharge_cents: expeditedSurcharge,
    total_cents: total,
    deposit_cents: deposit,
    final_payment_cents: finalPayment,
    meets_minimum_order_value: total >= MIN_ORDER_VALUE_CENTS,
    minimum_order_value_cents: MIN_ORDER_VALUE_CENTS,
    projected_total_revenue_cents: projectedTotalRevenue,
    projected_total_margin_cents: projectedTotalMargin,
  };
}
