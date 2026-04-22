// Prompt #111 — Currency-matched refund orchestrator.
// Rule (§3.4, §7.3, §18): refund currency ALWAYS matches original purchase
// currency. No retroactive USD reconversion. USD-equivalent captured at
// refund time for reporting.

import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { convertToUsdCents } from "./currency-math";
import { logInternationalAudit } from "./audit-logger";
import type { CurrencyCode } from "./types";

export interface RefundInput {
  orderId: string;
  stripePaymentIntentId: string;
  refundAmountCents: number;
  originalCurrency: CurrencyCode;
  refundReason?: string;
  refundedByUserId?: string;
}

export interface RefundResult {
  refundId: string;
  stripeRefundId: string;
  usdEquivalentCentsAtRefund: number;
  fxRateAtRefund: number;
}

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Prompt #111 refund: STRIPE_SECRET_KEY not configured");
  return new Stripe(key, { apiVersion: "2024-09-30.acacia" });
}

export async function refundInOriginalCurrency(input: RefundInput): Promise<RefundResult> {
  const stripe = getStripe();
  const admin = createAdminClient();

  const refund = await stripe.refunds.create({
    payment_intent: input.stripePaymentIntentId,
    amount: input.refundAmountCents,
    reason: "requested_by_customer",
    metadata: {
      order_id: input.orderId,
      prompt_111: "currency_matched",
      original_currency: input.originalCurrency,
    },
  });

  const rateDate = new Date().toISOString().slice(0, 10);
  const usdEquivalent = await convertToUsdCents(
    input.refundAmountCents,
    input.originalCurrency,
    rateDate,
  );
  const fxRateAtRefund =
    input.originalCurrency === "USD"
      ? 1
      : input.refundAmountCents === 0
      ? 1
      : input.refundAmountCents / usdEquivalent;

  const { data: row, error } = await admin
    .from("international_refunds")
    .insert({
      order_id: input.orderId,
      original_purchase_currency: input.originalCurrency,
      refund_amount_cents: input.refundAmountCents,
      stripe_refund_id: refund.id,
      usd_equivalent_cents_at_refund: usdEquivalent,
      fx_rate_at_refund: fxRateAtRefund,
      refund_reason: input.refundReason ?? null,
      refunded_by_user_id: input.refundedByUserId ?? null,
      status: refund.status === "succeeded" ? "completed" : "processing",
    })
    .select("refund_id")
    .single();

  if (error || !row) {
    throw new Error(`Prompt #111 refund insert failed: ${error?.message ?? "unknown"}`);
  }

  await logInternationalAudit({
    actor_user_id: input.refundedByUserId ?? null,
    action_category: "refund",
    action_verb: "refund.processed",
    target_table: "international_refunds",
    target_id: (row as { refund_id: string }).refund_id,
    currency_code: input.originalCurrency,
    after_state_json: {
      order_id: input.orderId,
      stripe_refund_id: refund.id,
      refund_amount_cents: input.refundAmountCents,
      currency: input.originalCurrency,
    },
  });

  return {
    refundId: (row as { refund_id: string }).refund_id,
    stripeRefundId: refund.id,
    usdEquivalentCentsAtRefund: usdEquivalent,
    fxRateAtRefund,
  };
}
