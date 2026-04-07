// ---------------------------------------------------------------------------
// Stripe Payment Service — ViaConnect
// ---------------------------------------------------------------------------

import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  // Cast: this code targets the 2024-04-10 API but the installed @types/stripe
  // expects 2026-02-25.clover. The runtime call still honors the explicit string.
  apiVersion: '2024-04-10' as any,
});

// ---- Subscription tier → Stripe Price ID map ------------------------------

const SUBSCRIPTION_PRICE_MAP: Record<string, string> = {
  gold: process.env.STRIPE_PRICE_GOLD!,
  platinum: process.env.STRIPE_PRICE_PLATINUM!,
  practitioner: process.env.STRIPE_PRICE_PRACTITIONER!,
};

// ---- Panel price map (in cents) -------------------------------------------

const PANEL_PRICE_MAP: Record<string, number> = {
  'GENEX-M': 28888,
  PeptideIQ: 38888,
  CannabisIQ: 38888,
  'GeneX360-Complete': 98888,
};

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://viaconnect.app';

// ---- Subscription checkout -------------------------------------------------

export async function createSubscriptionCheckout(
  userId: string,
  email: string,
  tier: 'gold' | 'platinum' | 'practitioner',
): Promise<{ url: string; sessionId: string }> {
  const priceId = SUBSCRIPTION_PRICE_MAP[tier];
  if (!priceId) {
    throw new Error(`Unknown subscription tier: ${tier}`);
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer_email: email,
    line_items: [{ price: priceId, quantity: 1 }],
    metadata: { userId, tier },
    success_url: `${APP_URL}/dashboard?subscription=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${APP_URL}/pricing?subscription=cancelled`,
  });

  return { url: session.url!, sessionId: session.id };
}

// ---- Panel checkout --------------------------------------------------------

export async function createPanelCheckout(
  userId: string,
  panelType: string,
  patientId?: string,
): Promise<{ url: string }> {
  const unitAmount = PANEL_PRICE_MAP[panelType];
  if (!unitAmount) {
    throw new Error(`Unknown panel type: ${panelType}`);
  }

  const metadata: Record<string, string> = {
    userId,
    panelType,
    orderType: 'panel',
  };
  if (patientId) {
    metadata.patientId = patientId;
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: `GeneX360 Panel — ${panelType}`,
            description: `Genetic testing panel: ${panelType}`,
          },
          unit_amount: unitAmount,
        },
        quantity: 1,
      },
    ],
    metadata,
    success_url: `${APP_URL}/dashboard?panel=ordered&type=${panelType}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${APP_URL}/panels?order=cancelled`,
  });

  return { url: session.url! };
}

// ---- Customer billing portal -----------------------------------------------

export async function createCustomerPortal(
  customerId: string,
): Promise<{ url: string }> {
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${APP_URL}/dashboard/settings`,
  });

  return { url: session.url };
}

// ---- Webhook handler -------------------------------------------------------

export interface WebhookResult {
  handled: boolean;
  action?: string;
  userId?: string;
  details?: Record<string, unknown>;
}

export async function handleWebhookEvent(
  event: Stripe.Event,
): Promise<WebhookResult> {
  switch (event.type) {
    // ---- Checkout completed (panel orders) --------------------------------
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const meta = session.metadata ?? {};

      if (meta.orderType === 'panel') {
        return {
          handled: true,
          action: 'panel_ordered',
          userId: meta.userId,
          details: {
            panelType: meta.panelType,
            patientId: meta.patientId ?? null,
            amountTotal: session.amount_total,
            paymentStatus: session.payment_status,
          },
        };
      }

      // Subscription checkout completed
      if (meta.tier) {
        return {
          handled: true,
          action: 'subscription_checkout_completed',
          userId: meta.userId,
          details: {
            tier: meta.tier,
            subscriptionId:
              typeof session.subscription === 'string'
                ? session.subscription
                : (session.subscription as Stripe.Subscription)?.id ?? null,
          },
        };
      }

      return { handled: false };
    }

    // ---- Subscription lifecycle -------------------------------------------
    case 'customer.subscription.created': {
      const sub = event.data.object as Stripe.Subscription;
      return {
        handled: true,
        action: 'subscription_created',
        details: {
          subscriptionId: sub.id,
          customerId: sub.customer as string,
          status: sub.status,
          // current_period_end was removed from Subscription's typed surface in
          // newer Stripe SDKs but is still present at runtime. Cast through any.
          currentPeriodEnd: (sub as any).current_period_end,
        },
      };
    }

    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription;
      return {
        handled: true,
        action: 'subscription_updated',
        details: {
          subscriptionId: sub.id,
          customerId: sub.customer as string,
          status: sub.status,
          cancelAtPeriodEnd: sub.cancel_at_period_end,
        },
      };
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      return {
        handled: true,
        action: 'subscription_deleted',
        details: {
          subscriptionId: sub.id,
          customerId: sub.customer as string,
        },
      };
    }

    // ---- Invoice payment succeeded (gamification trigger) -----------------
    case 'invoice.payment_succeeded': {
      const invoice = event.data.object as Stripe.Invoice;
      return {
        handled: true,
        action: 'invoice_payment_succeeded',
        details: {
          invoiceId: invoice.id,
          customerId: invoice.customer as string,
          amountPaid: invoice.amount_paid,
          // invoice.subscription was removed from typed Invoice surface but
          // is still present at runtime in webhook payloads.
          subscriptionId: (invoice as any).subscription as string | null,
          gamificationTrigger: true,
        },
      };
    }

    default:
      return { handled: false };
  }
}
