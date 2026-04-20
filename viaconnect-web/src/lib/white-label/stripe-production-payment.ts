// Prompt #96 Phase 5: White-label production-order Stripe payments.
//
// Two payment intents per order:
//   deposit  50% of total, captured at proof approval
//   final    50% of total, captured at shipment-ready
//
// We rely on the Stripe singleton from src/lib/pricing/stripe.ts (Phase
// 3 of an earlier prompt) and the existing webhook route. Webhook
// dispatch for white-label intents is added in
// src/lib/pricing/stripe-webhook-handlers (extension below).

import type Stripe from 'stripe';
import { getStripe } from '@/lib/pricing/stripe';
import type { SupabaseClient } from '@supabase/supabase-js';

export type WhiteLabelPaymentType = 'deposit' | 'final';

export interface CreatePaymentIntentInput {
  productionOrderId: string;
  paymentType: WhiteLabelPaymentType;
  supabase: SupabaseClient | unknown;
}

export interface CreatePaymentIntentResult {
  client_secret: string;
  payment_intent_id: string;
  amount_cents: number;
}

/**
 * Creates a Stripe PaymentIntent for the deposit or final payment of a
 * white-label production order. Records the PaymentIntent id back onto
 * the order so the webhook can correlate without scanning every PI.
 */
export async function createWhiteLabelPaymentIntent(
  input: CreatePaymentIntentInput,
): Promise<CreatePaymentIntentResult> {
  const sb = input.supabase as any;

  const { data: order, error } = await sb
    .from('white_label_production_orders')
    .select(`
      id, order_number, practitioner_id, status,
      total_cents, deposit_amount_cents, final_payment_amount_cents,
      stripe_deposit_payment_intent_id, stripe_final_payment_intent_id
    `)
    .eq('id', input.productionOrderId)
    .maybeSingle();
  if (error || !order) throw new Error(`Order ${input.productionOrderId} not found`);

  if (input.paymentType === 'deposit' && order.status !== 'labels_approved_pending_deposit') {
    throw new Error(`Order is in status ${order.status}; deposit can only be charged at labels_approved_pending_deposit.`);
  }
  if (input.paymentType === 'final' && order.status !== 'final_payment_pending') {
    throw new Error(`Order is in status ${order.status}; final payment can only be charged at final_payment_pending.`);
  }

  // Reuse an existing PaymentIntent if one was already created (idempotency).
  const existingPiId = input.paymentType === 'deposit'
    ? order.stripe_deposit_payment_intent_id
    : order.stripe_final_payment_intent_id;

  const amountCents = input.paymentType === 'deposit'
    ? order.deposit_amount_cents
    : order.final_payment_amount_cents;

  const stripe = getStripe();

  if (existingPiId) {
    const existing = await stripe.paymentIntents.retrieve(existingPiId);
    if (existing.status !== 'canceled') {
      return {
        client_secret: existing.client_secret ?? '',
        payment_intent_id: existing.id,
        amount_cents: amountCents,
      };
    }
  }

  // Look up the practitioner's Stripe customer id (set by an earlier prompt's
  // subscription flow). White-label PaymentIntents do not create a new
  // customer; they re-use the practitioner's existing one when present.
  const { data: subscription } = await sb
    .from('practitioner_subscriptions')
    .select('stripe_customer_id')
    .eq('practitioner_id', order.practitioner_id)
    .neq('stripe_customer_id', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const intent: Stripe.PaymentIntentCreateParams = {
    amount: amountCents,
    currency: 'usd',
    description: `Production order ${order.order_number} - ${input.paymentType === 'deposit' ? '50% deposit' : '50% final payment'}`,
    capture_method: 'automatic',
    metadata: {
      production_order_id: input.productionOrderId,
      payment_type: input.paymentType,
      practitioner_id: order.practitioner_id,
    },
    automatic_payment_methods: { enabled: true },
  };
  if (subscription?.stripe_customer_id) {
    intent.customer = subscription.stripe_customer_id;
  }

  const created = await stripe.paymentIntents.create(intent);

  // Persist the PI id onto the order.
  const updateField = input.paymentType === 'deposit'
    ? 'stripe_deposit_payment_intent_id'
    : 'stripe_final_payment_intent_id';
  await sb
    .from('white_label_production_orders')
    .update({ [updateField]: created.id, updated_at: new Date().toISOString() })
    .eq('id', input.productionOrderId);

  return {
    client_secret: created.client_secret ?? '',
    payment_intent_id: created.id,
    amount_cents: amountCents,
  };
}

/**
 * Webhook side: when a payment_intent.succeeded fires for a white-label
 * production order, advance the order status. Called from the existing
 * /api/webhooks/stripe route.
 */
export async function handleWhiteLabelPaymentSucceeded(
  paymentIntent: Stripe.PaymentIntent,
  supabase: SupabaseClient,
): Promise<{ matched: boolean; order_id?: string; new_status?: string; outcome?: string }> {
  const productionOrderId = paymentIntent.metadata?.production_order_id;
  const paymentType = paymentIntent.metadata?.payment_type as WhiteLabelPaymentType | undefined;
  if (!productionOrderId || !paymentType) return { matched: false };

  const sb = supabase as any;
  const { data: order } = await sb
    .from('white_label_production_orders')
    .select('id, status, deposit_paid_at, final_payment_paid_at, stripe_deposit_payment_intent_id, stripe_final_payment_intent_id')
    .eq('id', productionOrderId)
    .maybeSingle();
  if (!order) return { matched: true, outcome: 'order_not_found' };

  // Idempotency: if this PaymentIntent already corresponds to a recorded
  // payment timestamp, treat the second event as a no-op replay.
  if (paymentType === 'deposit'
      && order.stripe_deposit_payment_intent_id === paymentIntent.id
      && order.deposit_paid_at) {
    console.log(`[wl-webhook] dedupe: deposit ${paymentIntent.id} already recorded for order ${productionOrderId}`);
    return { matched: true, order_id: productionOrderId, outcome: 'duplicate_replay' };
  }
  if (paymentType === 'final'
      && order.stripe_final_payment_intent_id === paymentIntent.id
      && order.final_payment_paid_at) {
    console.log(`[wl-webhook] dedupe: final ${paymentIntent.id} already recorded for order ${productionOrderId}`);
    return { matched: true, order_id: productionOrderId, outcome: 'duplicate_replay' };
  }

  // Status guard: refuse to advance from a wrong pre-state. A canceled,
  // shipped, or delivered order receiving a stale payment success event
  // is logged but never silently transitioned.
  const expectedStatus = paymentType === 'deposit'
    ? 'labels_approved_pending_deposit'
    : 'final_payment_pending';
  if (order.status !== expectedStatus) {
    console.warn(
      `[wl-webhook] status_mismatch: order ${productionOrderId} is in ${order.status}, ` +
      `cannot accept ${paymentType} PI ${paymentIntent.id}. ` +
      `Investigate: late event or already-advanced order.`,
    );
    return { matched: true, order_id: productionOrderId, outcome: 'status_mismatch' };
  }

  const now = new Date().toISOString();
  const update: Record<string, unknown> = { updated_at: now };
  if (paymentType === 'deposit') {
    update.status = 'deposit_paid';
    update.deposit_paid_at = now;
  } else {
    update.status = 'shipped';
    update.final_payment_paid_at = now;
    update.shipped_at = now;
  }

  await sb
    .from('white_label_production_orders')
    .update(update)
    .eq('id', productionOrderId);

  return { matched: true, order_id: productionOrderId, new_status: update.status as string, outcome: 'advanced' };
}
