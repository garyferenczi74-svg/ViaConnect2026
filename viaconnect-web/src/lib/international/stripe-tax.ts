// Prompt #111 — Stripe Tax client wrapper.
// §3.3: tax math is Stripe Tax only; no fallback estimation. If the call
// fails, the caller MUST halt checkout with a clear error — do not estimate.

import Stripe from "stripe";
import type { CurrencyCode } from "./types";

export interface TaxLineItem {
  sku: string;
  amount: number; // in minor units (cents)
  quantity: number;
  tax_code: string;
}

export interface TaxCalcInput {
  currency: CurrencyCode;
  customerAddress: {
    country: string;
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postal_code?: string;
  };
  lineItems: TaxLineItem[];
  shippingCostCents: number;
  shippingTaxCode: string;
  customerVatId?: {
    type: "eu_vat" | "gb_vat" | "au_abn";
    value: string;
  };
}

export interface TaxCalcResult {
  calculationId: string;
  amountTotalCents: number;
  taxAmountExclusiveCents: number;
  taxAmountInclusiveCents: number;
  perLineItem: Array<{ sku: string; amount_tax_cents: number }>;
}

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("Prompt #111 Stripe Tax: STRIPE_SECRET_KEY not configured. Checkout MUST halt.");
  }
  return new Stripe(key, { apiVersion: "2024-09-30.acacia" });
}

export async function calculateStripeTax(input: TaxCalcInput): Promise<TaxCalcResult> {
  const stripe = getStripe();
  // Stripe Tax calculate lives under the tax resource. Types are loose; we
  // cast so this compiles across minor API version bumps.
  const params: Record<string, unknown> = {
    currency: input.currency.toLowerCase(),
    customer_details: {
      address: input.customerAddress,
      address_source: "shipping",
      ...(input.customerVatId
        ? { tax_ids: [{ type: input.customerVatId.type, value: input.customerVatId.value }] }
        : {}),
    },
    line_items: input.lineItems.map((li) => ({
      amount: li.amount,
      reference: li.sku,
      quantity: li.quantity,
      tax_code: li.tax_code,
    })),
    shipping_cost: input.shippingCostCents > 0
      ? { amount: input.shippingCostCents, tax_code: input.shippingTaxCode }
      : undefined,
    expand: ["line_items.data.tax_breakdown"],
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const calc: any = await (stripe as any).tax.calculations.create(params);
  if (!calc || !calc.id) {
    throw new Error("Prompt #111 Stripe Tax: calculation response missing id. Halt checkout.");
  }

  const perLineItem =
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (calc.line_items?.data ?? []).map((li: any) => ({
      sku: String(li.reference ?? ""),
      amount_tax_cents: Number(li.amount_tax ?? 0),
    }));

  return {
    calculationId: String(calc.id),
    amountTotalCents: Number(calc.amount_total ?? 0),
    taxAmountExclusiveCents: Number(calc.tax_amount_exclusive ?? 0),
    taxAmountInclusiveCents: Number(calc.tax_amount_inclusive ?? 0),
    perLineItem,
  };
}
