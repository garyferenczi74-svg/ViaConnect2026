// Prompt #94 Phase 3.1: Variable cost model.
//
// Pure helpers. The LTV engine subtracts these from revenue to compute
// contribution margin per customer.
//
// Cost components per spec:
//   * COGS (per-product, from product_catalog.cogs_cents; fallback 35% price)
//   * Shipping ($7.50 domestic / $15.00 international)
//   * Payment processing (2.9% + $0.30 per transaction; matches Stripe)
//   * Helix redemption cost (token discount = real cost; from helix_redemptions)
//   * GeneX360 lab cost ($85 / $145 / $215 by tier; placeholder until vendor
//     invoices are reconciled)
//   * Support cost allocation ($2/customer/month; placeholder, refined from
//     support ticket volume quarterly)

export type ShippingDestination = 'domestic' | 'international';
export type Genex360Tier = 'genex_m' | 'core' | 'complete';

const SHIPPING_DOMESTIC_CENTS = 750;
const SHIPPING_INTERNATIONAL_CENTS = 1500;

const PAYMENT_PROCESSING_PERCENT = 0.029;
const PAYMENT_PROCESSING_FIXED_CENTS = 30;

const COGS_FALLBACK_PERCENT_OF_PRICE = 0.35;

export const SUPPORT_ALLOCATION_PER_CUSTOMER_MONTH_CENTS = 200;

const GENEX360_LAB_COSTS_CENTS: Record<Genex360Tier, number> = {
  genex_m: 8500,
  core: 14500,
  complete: 21500,
};

// ---------------------------------------------------------------------------
// Per-cost helpers
// ---------------------------------------------------------------------------

export function estimateShippingCents(dest: ShippingDestination): number {
  return dest === 'international' ? SHIPPING_INTERNATIONAL_CENTS : SHIPPING_DOMESTIC_CENTS;
}

export function estimatePaymentProcessingCents(orderTotalCents: number): number {
  if (orderTotalCents < 0) return 0;
  return Math.round(orderTotalCents * PAYMENT_PROCESSING_PERCENT) + PAYMENT_PROCESSING_FIXED_CENTS;
}

export function estimateGenex360LabCostCents(tier: Genex360Tier | string): number | null {
  const cost = GENEX360_LAB_COSTS_CENTS[tier as Genex360Tier];
  return cost ?? null;
}

export interface OrderLineItem {
  sku: string;
  quantity: number;
  unitPriceCents: number;
  unitCogsCents: number | null;
}

export function cogsForLineItem(item: OrderLineItem): number {
  if (item.quantity <= 0) return 0;
  const unit = item.unitCogsCents !== null && item.unitCogsCents !== undefined
    ? item.unitCogsCents
    : Math.round(item.unitPriceCents * COGS_FALLBACK_PERCENT_OF_PRICE);
  return unit * item.quantity;
}

// ---------------------------------------------------------------------------
// Composite calculators
// ---------------------------------------------------------------------------

export interface VariableCostBreakdown {
  cogs_cents: number;
  shipping_cents: number;
  payment_processing_cents: number;
  helix_redemption_cents: number;
  genex360_lab_cost_cents: number;
  support_allocation_cents: number;
  total_cents: number;
}

export interface OrderCostInput {
  lineItems: OrderLineItem[];
  orderTotalCents: number;
  shippingDestination: ShippingDestination;
  helixRedemptionDiscountCents: number;
  genex360TierIfPresent: Genex360Tier | null;
}

export function totalVariableCostsForOrder(input: OrderCostInput): VariableCostBreakdown {
  const cogs = input.lineItems.reduce((s, li) => s + cogsForLineItem(li), 0);
  const shipping = estimateShippingCents(input.shippingDestination);
  const payment = estimatePaymentProcessingCents(input.orderTotalCents);
  const helix = Math.max(0, input.helixRedemptionDiscountCents);
  const lab = input.genex360TierIfPresent
    ? (estimateGenex360LabCostCents(input.genex360TierIfPresent) ?? 0)
    : 0;

  return {
    cogs_cents: cogs,
    shipping_cents: shipping,
    payment_processing_cents: payment,
    helix_redemption_cents: helix,
    genex360_lab_cost_cents: lab,
    support_allocation_cents: 0, // applied at customer-month aggregation, not per order
    total_cents: cogs + shipping + payment + helix + lab,
  };
}

export function applySupportAllocationCents(months: number): number {
  if (months <= 0) return 0;
  return SUPPORT_ALLOCATION_PER_CUSTOMER_MONTH_CENTS * months;
}
