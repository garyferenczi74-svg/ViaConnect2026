// Checkout session creators for all purchasable products.
// Each helper returns a Stripe Checkout session object (or the hosted URL).

import type Stripe from 'stripe';
import { getStripe, getSiteOrigin } from './stripe';
import type { BillingCycle, TierId, GeneX360ProductId } from '@/types/pricing';
import { computeFamilyPricing } from './family-pricing';
import type { MembershipTier } from '@/types/pricing';
import type { PricingSupabaseClient } from './supabase-types';

export interface CheckoutResult {
  sessionId: string;
  url: string | null;
}

async function getOrCreateStripeCustomer(
  stripe: Stripe,
  client: PricingSupabaseClient,
  userId: string,
  email: string | null,
): Promise<string> {
  const { data: membership } = await client
    .from('memberships')
    .select('stripe_customer_id')
    .eq('user_id', userId)
    .not('stripe_customer_id', 'is', null)
    .limit(1)
    .maybeSingle();
  const existing = (membership as { stripe_customer_id: string | null } | null)?.stripe_customer_id;
  if (existing) return existing;

  const customer = await stripe.customers.create({
    email: email ?? undefined,
    metadata: { user_id: userId },
  });
  return customer.id;
}

// ---------- Membership subscription ----------

export async function createMembershipCheckoutSession(args: {
  client: PricingSupabaseClient;
  userId: string;
  email: string | null;
  tierId: TierId;
  billingCycle: BillingCycle;
  successPath?: string;
  cancelPath?: string;
}): Promise<CheckoutResult> {
  if (args.tierId === 'free') {
    throw new Error('Free tier does not require a Stripe checkout');
  }
  if (args.billingCycle === 'gift') {
    throw new Error('Gift memberships are auto-created by GeneX360 purchases, not via checkout');
  }

  const stripe = getStripe();

  const { data: tier, error: tierErr } = await args.client
    .from('membership_tiers')
    .select('*')
    .eq('id', args.tierId)
    .single();
  if (tierErr || !tier) throw new Error(`Tier ${args.tierId} not found`);

  const priceId =
    args.billingCycle === 'monthly'
      ? (tier as { stripe_monthly_price_id: string | null }).stripe_monthly_price_id
      : (tier as { stripe_annual_price_id: string | null }).stripe_annual_price_id;
  if (!priceId) {
    throw new Error(
      `Stripe ${args.billingCycle} price id not configured for tier ${args.tierId}; run scripts/stripe/configure-products`,
    );
  }

  const customerId = await getOrCreateStripeCustomer(stripe, args.client, args.userId, args.email);
  const origin = getSiteOrigin();

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin}${args.successPath ?? '/dashboard?checkout=success'}`,
    cancel_url: `${origin}${args.cancelPath ?? '/pricing?checkout=canceled'}`,
    subscription_data: {
      metadata: {
        user_id: args.userId,
        tier_id: args.tierId,
        billing_cycle: args.billingCycle,
      },
    },
    metadata: {
      user_id: args.userId,
      tier_id: args.tierId,
      billing_cycle: args.billingCycle,
      product_type: 'membership',
    },
    allow_promotion_codes: true,
  });

  return { sessionId: session.id, url: session.url };
}

// ---------- Family membership with add-ons ----------

export async function createFamilyMembershipCheckoutSession(args: {
  client: PricingSupabaseClient;
  userId: string;
  email: string | null;
  totalAdults: number;
  totalChildren: number;
  billingCycle: 'monthly' | 'annual';
  successPath?: string;
  cancelPath?: string;
}): Promise<CheckoutResult> {
  const stripe = getStripe();

  const { data: tier, error: tierErr } = await args.client
    .from('membership_tiers')
    .select('*')
    .eq('id', 'platinum_family')
    .single();
  if (tierErr || !tier) throw new Error('Platinum+ Family tier not found');
  const familyTier = tier as MembershipTier;

  const basePriceId =
    args.billingCycle === 'monthly'
      ? familyTier.stripe_monthly_price_id
      : familyTier.stripe_annual_price_id;
  if (!basePriceId) {
    throw new Error('Platinum+ Family Stripe price id not configured');
  }

  const breakdown = computeFamilyPricing(
    {
      totalAdults: args.totalAdults,
      totalChildren: args.totalChildren,
      billingCycle: args.billingCycle,
    },
    familyTier,
  );

  // Use a single-line base subscription plus a one-time add-on charge for the
  // extras. Stripe requires price-object references for subscription items; to
  // avoid creating per-customer prices we attach add-ons as price_data items in
  // the checkout session metadata and settle via the subscription_data hook.
  // For simplicity in Phase 4, we encode the expected add-on cost into metadata
  // and let the webhook reconcile via additional_adults / additional_children_chunks.
  const customerId = await getOrCreateStripeCustomer(stripe, args.client, args.userId, args.email);
  const origin = getSiteOrigin();

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price: basePriceId, quantity: 1 }],
    success_url: `${origin}${args.successPath ?? '/dashboard?checkout=success'}`,
    cancel_url: `${origin}${args.cancelPath ?? '/pricing?checkout=canceled'}`,
    subscription_data: {
      metadata: {
        user_id: args.userId,
        tier_id: 'platinum_family',
        billing_cycle: args.billingCycle,
        total_adults: String(args.totalAdults),
        total_children: String(args.totalChildren),
        additional_adults: String(breakdown.additionalAdultCount),
        additional_children_chunks: String(breakdown.additionalChildrenChunks),
        additional_cost_cents: String(
          breakdown.additionalAdultCostCents + breakdown.additionalChildrenCostCents,
        ),
      },
    },
    metadata: {
      user_id: args.userId,
      tier_id: 'platinum_family',
      billing_cycle: args.billingCycle,
      product_type: 'membership_family',
    },
    allow_promotion_codes: true,
  });

  return { sessionId: session.id, url: session.url };
}

// ---------- GeneX360 one-time purchase ----------

export async function createGeneX360CheckoutSession(args: {
  client: PricingSupabaseClient;
  userId: string;
  email: string | null;
  productId: GeneX360ProductId;
  familyMemberId?: string | null;
  successPath?: string;
  cancelPath?: string;
}): Promise<CheckoutResult> {
  const stripe = getStripe();

  const { data: product, error } = await args.client
    .from('genex360_products')
    .select('*')
    .eq('id', args.productId)
    .single();
  if (error || !product) throw new Error(`GeneX360 product ${args.productId} not found`);
  const priceId = (product as { stripe_price_id: string | null }).stripe_price_id;
  if (!priceId) {
    throw new Error(`Stripe price id not configured for ${args.productId}`);
  }

  const customerId = await getOrCreateStripeCustomer(stripe, args.client, args.userId, args.email);
  const origin = getSiteOrigin();

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin}${args.successPath ?? '/genetics?checkout=success'}`,
    cancel_url: `${origin}${args.cancelPath ?? '/pricing?checkout=canceled'}`,
    metadata: {
      user_id: args.userId,
      product_type: 'genex360',
      genex360_product_id: args.productId,
      family_member_id: args.familyMemberId ?? '',
    },
    allow_promotion_codes: true,
  });

  return { sessionId: session.id, url: session.url };
}

// ---------- Outcome stack checkout ----------

export async function createOutcomeStackCheckoutSession(args: {
  client: PricingSupabaseClient;
  userId: string;
  email: string | null;
  stackId: string;
  isSubscription: boolean;
  successPath?: string;
  cancelPath?: string;
}): Promise<CheckoutResult> {
  const stripe = getStripe();

  const { data: stack, error } = await args.client
    .from('outcome_stacks')
    .select('*')
    .eq('id', args.stackId)
    .single();
  if (error || !stack) throw new Error(`Outcome stack ${args.stackId} not found`);

  const priceId = (stack as { stripe_price_id: string | null }).stripe_price_id;
  if (!priceId) {
    throw new Error(
      `Stripe price id not configured for stack ${args.stackId}; run scripts/stripe/configure-products`,
    );
  }

  const customerId = await getOrCreateStripeCustomer(stripe, args.client, args.userId, args.email);
  const origin = getSiteOrigin();

  const session = await stripe.checkout.sessions.create({
    mode: args.isSubscription ? 'subscription' : 'payment',
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin}${args.successPath ?? '/shop?checkout=success'}`,
    cancel_url: `${origin}${args.cancelPath ?? '/shop/stacks?checkout=canceled'}`,
    metadata: {
      user_id: args.userId,
      product_type: 'outcome_stack',
      stack_id: args.stackId,
      is_subscription: String(args.isSubscription),
    },
    allow_promotion_codes: true,
  });

  return { sessionId: session.id, url: session.url };
}
