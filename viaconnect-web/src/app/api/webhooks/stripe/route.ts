// Stripe webhook handler.
//
// Handles subscription lifecycle events and checkout completion. Uses the
// service-role Supabase client because webhooks run without user context.
// Signature verification via Stripe.webhooks.constructEvent.

import { NextRequest, NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { getStripe, getWebhookSecret } from '@/lib/pricing/stripe';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  mapSubscriptionToMembershipRow,
  mapCheckoutSessionCompletion,
} from '@/lib/pricing/stripe-webhook-handlers';

export const runtime = 'nodejs'; // Stripe SDK needs Node APIs
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  const rawBody = await request.text();
  let event: Stripe.Event;

  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(rawBody, signature, getWebhookSecret());
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Signature verification failed';
    return NextResponse.json({ error: `Webhook signature failed: ${msg}` }, { status: 400 });
  }

  try {
    await handleEvent(event);
    return NextResponse.json({ received: true, type: event.type });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Webhook handler failed';
    console.error('[stripe-webhook]', event.type, msg);
    // Return 500 so Stripe retries; log-level tells ops this is a handler bug.
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

async function handleEvent(event: Stripe.Event): Promise<void> {
  const db = createAdminClient();

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const intent = mapCheckoutSessionCompletion(session);
      if (!intent) return;

      // For subscription modes, the corresponding customer.subscription.created
      // event will follow shortly and populate the membership row. For payment
      // modes (GeneX360, one-time outcome stack), we record the purchase now.
      if (intent.productType === 'genex360' && intent.stripePaymentIntentId) {
        const productId = intent.metadata.genex360_product_id;
        if (!productId) return;

        // Look up product price for `price_paid_cents`.
        const { data: product } = await db
          .from('genex360_products')
          .select('price_cents')
          .eq('id', productId)
          .single();
        const priceCents = (product as { price_cents: number } | null)?.price_cents ?? 0;

        await db
          .from('genex360_purchases')
          .insert({
            user_id: intent.userId,
            product_id: productId,
            family_member_id: intent.metadata.family_member_id || null,
            price_paid_cents: priceCents,
            stripe_payment_intent_id: intent.stripePaymentIntentId,
            payment_status: 'paid',
            lifecycle_status: 'purchased',
          } as never);
      }

      // For outcome stacks in payment mode, we could record a shop_orders row
      // here; deferred to Phase 5 to keep the webhook minimal and reliable.
      return;
    }

    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription;
      const row = mapSubscriptionToMembershipRow(subscription);
      if (!row.user_id) return;

      // Upsert by stripe_subscription_id. First look up, then update or insert.
      const { data: existing } = await db
        .from('memberships')
        .select('id')
        .eq('stripe_subscription_id', subscription.id)
        .maybeSingle();

      if (existing) {
        await db
          .from('memberships')
          .update(row as never)
          .eq('id', (existing as { id: string }).id);
      } else {
        await db.from('memberships').insert({
          ...row,
          started_at: row.current_period_start ?? new Date().toISOString(),
        } as never);
      }
      return;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      await db
        .from('memberships')
        .update({
          status: 'canceled',
          canceled_at: new Date().toISOString(),
          cancel_at_period_end: false,
        } as never)
        .eq('stripe_subscription_id', subscription.id);
      return;
    }

    case 'invoice.payment_succeeded': {
      const invoice = event.data.object as Stripe.Invoice;
      const subRaw = (invoice as unknown as { subscription?: string | { id?: string } | null }).subscription;
      const subscriptionId =
        typeof subRaw === 'string' ? subRaw : subRaw?.id ?? null;
      if (!subscriptionId) return;
      // Promote a past_due or trialing membership back to active on successful payment.
      await db
        .from('memberships')
        .update({ status: 'active' } as never)
        .eq('stripe_subscription_id', subscriptionId)
        .in('status', ['past_due', 'trialing']);
      return;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      const subRaw = (invoice as unknown as { subscription?: string | { id?: string } | null }).subscription;
      const subscriptionId =
        typeof subRaw === 'string' ? subRaw : subRaw?.id ?? null;
      if (!subscriptionId) return;
      await db
        .from('memberships')
        .update({ status: 'past_due' } as never)
        .eq('stripe_subscription_id', subscriptionId);
      return;
    }

    default:
      return; // Ignore irrelevant events
  }
}
