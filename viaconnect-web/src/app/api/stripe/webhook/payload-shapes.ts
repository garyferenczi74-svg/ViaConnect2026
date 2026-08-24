/**
 * src/app/api/stripe/webhook/payload-shapes.ts
 *
 * Prompt 210d P0-3: pure payload builders for the stripe webhook's two
 * checkout.session.completed write branches, extracted UNCHANGED from the
 * inline literals in route.ts so the shape test
 * (src/app/api/stripe/__tests__/webhook-shapes.test.ts) can lock the payload
 * keys against the live schema snapshot and the P0-3 migrations without
 * importing the route module (Next.js route files may only export route
 * fields, so helpers cannot be exported from route.ts).
 *
 * Key sets and value shaping are identical to the pre-210d inline objects.
 * No I/O, no Stripe or Supabase imports beyond the Json type, zero any.
 * Rules: no em dashes, no en dashes, no emojis.
 */

import type { Json } from "@/lib/supabase/types";

export interface OrderInsertInput {
  userId: string;
  /** Checkout session id (session.id). */
  sessionId: string;
  /** session.amount_total in cents, or null. */
  amountTotal: number | null;
  /** session.metadata?.product_type */
  productType: string | undefined;
}

/** One-time payment branch: the public.orders insert payload. */
export function buildOrderInsertPayload(input: OrderInsertInput) {
  return {
    user_id: input.userId,
    status: "pending",
    total: (input.amountTotal ?? 0) / 100,
    items: {
      type: "genex_kit",
      session_id: input.sessionId,
      product_type: input.productType ?? "genex_kit",
    } as unknown as Json,
  };
}

export interface SubscriptionUpsertInput {
  userId: string;
  /** Raw session.customer: a string id, an expanded object, or null. */
  customer: unknown;
  subscriptionId: string;
  /** Stripe subscription status string. */
  status: string;
  cancelAtPeriodEnd: boolean;
  /** items[0]?.price?.unit_amount from the retrieved subscription. */
  unitAmount: number | null | undefined;
  /** items[0]?.price?.id from the retrieved subscription. */
  priceId: string | undefined;
  /** ISO timestamp or null (getSubscriptionPeriod output). */
  periodStart: string | null;
  periodEnd: string | null;
}

/** Subscription branch: the public.subscriptions upsert payload. */
export function buildSubscriptionUpsertPayload(input: SubscriptionUpsertInput) {
  // Determine plan from price amount (thresholds unchanged from pre-210d).
  const amount = input.unitAmount ?? 0;
  const plan =
    amount <= 888
      ? "gold"
      : amount <= 2888
        ? "platinum"
        : "practitioner";

  return {
    user_id: input.userId,
    stripe_customer_id:
      (typeof input.customer === "string"
        ? input.customer
        : ((input.customer as Record<string, unknown> | null | undefined)?.id as
            | string
            | undefined)) ?? "",
    stripe_subscription_id: input.subscriptionId,
    plan_id: input.priceId ?? plan,
    plan: plan as "gold" | "platinum" | "practitioner",
    status: input.status as
      | "active"
      | "canceled"
      | "past_due"
      | "trialing"
      | "incomplete",
    current_period_start: input.periodStart,
    current_period_end: input.periodEnd,
    cancel_at_period_end: input.cancelAtPeriodEnd,
  };
}
