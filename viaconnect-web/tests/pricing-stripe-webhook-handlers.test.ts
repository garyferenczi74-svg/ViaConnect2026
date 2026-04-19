import { describe, it, expect } from 'vitest';
import type Stripe from 'stripe';
import {
  mapSubscriptionToMembershipRow,
  mapCheckoutSessionCompletion,
} from '@/lib/pricing/stripe-webhook-handlers';

const NOW = Math.floor(Date.now() / 1000);
const HOUR = 3600;

function subStub(overrides: Partial<Stripe.Subscription>): Stripe.Subscription {
  return {
    id: 'sub_test_123',
    status: 'active',
    customer: 'cus_abc',
    cancel_at_period_end: false,
    current_period_start: NOW - HOUR,
    current_period_end: NOW + HOUR * 24 * 30,
    canceled_at: null,
    metadata: {
      user_id: 'user_abc',
      tier_id: 'gold',
      billing_cycle: 'monthly',
    },
    ...overrides,
  } as unknown as Stripe.Subscription;
}

function sessionStub(overrides: Partial<Stripe.Checkout.Session>): Stripe.Checkout.Session {
  return {
    id: 'cs_test',
    customer: 'cus_abc',
    payment_intent: 'pi_abc',
    subscription: null,
    metadata: {
      user_id: 'user_abc',
      product_type: 'genex360',
      genex360_product_id: 'genex_m',
    },
    ...overrides,
  } as unknown as Stripe.Checkout.Session;
}

describe('mapSubscriptionToMembershipRow', () => {
  it('maps a gold monthly active subscription', () => {
    const row = mapSubscriptionToMembershipRow(subStub({}));
    expect(row.user_id).toBe('user_abc');
    expect(row.tier_id).toBe('gold');
    expect(row.tier).toBe('gold'); // legacy column dual-write
    expect(row.billing_cycle).toBe('monthly');
    expect(row.status).toBe('active');
    expect(row.stripe_subscription_id).toBe('sub_test_123');
    expect(row.stripe_customer_id).toBe('cus_abc');
    expect(row.payment_method).toBe('stripe');
    expect(row.is_annual_prepay).toBe(false);
    expect(row.cancel_at_period_end).toBe(false);
    expect(row.canceled_at).toBeNull();
    expect(row.current_period_end).not.toBeNull();
    expect(row.expires_at).toBe(row.current_period_end); // legacy mirror
  });

  it('sets is_annual_prepay=true for annual cycle', () => {
    const row = mapSubscriptionToMembershipRow(subStub({
      metadata: { user_id: 'u', tier_id: 'platinum', billing_cycle: 'annual' },
    }));
    expect(row.is_annual_prepay).toBe(true);
    expect(row.billing_cycle).toBe('annual');
    expect(row.tier_id).toBe('platinum');
  });

  it('maps past_due', () => {
    const row = mapSubscriptionToMembershipRow(subStub({ status: 'past_due' }));
    expect(row.status).toBe('past_due');
  });

  it('maps canceled with canceled_at timestamp', () => {
    const row = mapSubscriptionToMembershipRow(subStub({
      status: 'canceled',
      canceled_at: NOW,
    }));
    expect(row.status).toBe('canceled');
    expect(row.canceled_at).not.toBeNull();
  });

  it('maps paused', () => {
    const row = mapSubscriptionToMembershipRow(subStub({ status: 'paused' }));
    expect(row.status).toBe('paused');
  });

  it('treats unpaid as past_due', () => {
    const row = mapSubscriptionToMembershipRow(subStub({ status: 'unpaid' }));
    expect(row.status).toBe('past_due');
  });

  it('extracts family add-on counts from metadata', () => {
    const row = mapSubscriptionToMembershipRow(subStub({
      metadata: {
        user_id: 'u',
        tier_id: 'platinum_family',
        billing_cycle: 'monthly',
        additional_adults: '2',
        additional_children_chunks: '1',
      },
    }));
    expect(row.tier_id).toBe('platinum_family');
    expect(row.additional_adults).toBe(2);
    expect(row.additional_children_chunks).toBe(1);
  });

  it('rejects invalid tier_id metadata and sets tier_id=null', () => {
    const row = mapSubscriptionToMembershipRow(subStub({
      metadata: { user_id: 'u', tier_id: 'gold-plus', billing_cycle: 'monthly' },
    }));
    expect(row.tier_id).toBeNull();
    expect(row.tier).toBe('free'); // legacy column falls back
  });

  it('rejects invalid billing_cycle and sets null', () => {
    const row = mapSubscriptionToMembershipRow(subStub({
      metadata: { user_id: 'u', tier_id: 'gold', billing_cycle: 'quarterly' },
    }));
    expect(row.billing_cycle).toBeNull();
    expect(row.is_annual_prepay).toBe(false);
  });

  it('handles customer as expanded object', () => {
    const row = mapSubscriptionToMembershipRow(subStub({
      customer: { id: 'cus_xyz' } as unknown as Stripe.Customer,
    }));
    expect(row.stripe_customer_id).toBe('cus_xyz');
  });

  it('sets cancel_at_period_end from subscription', () => {
    const row = mapSubscriptionToMembershipRow(subStub({ cancel_at_period_end: true }));
    expect(row.cancel_at_period_end).toBe(true);
  });
});

describe('mapCheckoutSessionCompletion', () => {
  it('maps a GeneX360 checkout session', () => {
    const intent = mapCheckoutSessionCompletion(sessionStub({}));
    expect(intent).not.toBeNull();
    expect(intent?.userId).toBe('user_abc');
    expect(intent?.productType).toBe('genex360');
    expect(intent?.stripePaymentIntentId).toBe('pi_abc');
    expect(intent?.metadata.genex360_product_id).toBe('genex_m');
  });

  it('returns null when user_id missing', () => {
    const intent = mapCheckoutSessionCompletion(sessionStub({
      metadata: { product_type: 'genex360' },
    }));
    expect(intent).toBeNull();
  });

  it('returns null when product_type missing', () => {
    const intent = mapCheckoutSessionCompletion(sessionStub({
      metadata: { user_id: 'u' },
    }));
    expect(intent).toBeNull();
  });

  it('returns null for unknown product_type', () => {
    const intent = mapCheckoutSessionCompletion(sessionStub({
      metadata: { user_id: 'u', product_type: 'widget' },
    }));
    expect(intent).toBeNull();
  });

  it('extracts subscription id for membership sessions', () => {
    const intent = mapCheckoutSessionCompletion(sessionStub({
      subscription: 'sub_abc',
      metadata: { user_id: 'u', product_type: 'membership', tier_id: 'gold' },
    }));
    expect(intent?.productType).toBe('membership');
    expect(intent?.stripeSubscriptionId).toBe('sub_abc');
  });

  it('handles expanded subscription object', () => {
    const intent = mapCheckoutSessionCompletion(sessionStub({
      subscription: { id: 'sub_exp' } as unknown as Stripe.Subscription,
      metadata: { user_id: 'u', product_type: 'membership_family', tier_id: 'platinum_family' },
    }));
    expect(intent?.stripeSubscriptionId).toBe('sub_exp');
    expect(intent?.productType).toBe('membership_family');
  });
});

describe('PayPal stub', () => {
  it('throws NotImplementedError for every order helper', async () => {
    const { PayPalNotImplementedError, createMembershipPayPalOrder, createGeneX360PayPalOrder } =
      await import('@/lib/pricing/paypal-checkout-stub');

    await expect(
      createMembershipPayPalOrder({ userId: 'u', tierId: 'gold', billingCycle: 'monthly' }),
    ).rejects.toBeInstanceOf(PayPalNotImplementedError);

    await expect(
      createGeneX360PayPalOrder({ userId: 'u', productId: 'genex_m' }),
    ).rejects.toBeInstanceOf(PayPalNotImplementedError);
  });
});
