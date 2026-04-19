// Pure(ish) mappers from Stripe webhook events to body shapes that should
// be persisted in `memberships` or `genex360_purchases`. Keeping the event
// translation separate from the DB writes lets us unit-test the mapping
// without any Stripe or Supabase dependencies.

import type Stripe from 'stripe';
import type {
  BillingCycle,
  MembershipStatus,
  PaymentMethod,
  TierId,
} from '@/types/pricing';

export interface MembershipUpsertFromStripe {
  user_id: string;
  tier_id: TierId | null;
  tier: string;                    // legacy TEXT column (dual-write)
  billing_cycle: BillingCycle | null;
  status: MembershipStatus;
  current_period_start: string | null;
  current_period_end: string | null;
  expires_at: string | null;       // legacy column (mirrors current_period_end)
  stripe_subscription_id: string;
  stripe_customer_id: string | null;
  payment_method: PaymentMethod;
  cancel_at_period_end: boolean;
  canceled_at: string | null;
  is_annual_prepay: boolean;
  additional_adults: number;
  additional_children_chunks: number;
}

const STATUS_MAP: Record<Stripe.Subscription.Status, MembershipStatus> = {
  active: 'active',
  trialing: 'trialing',
  past_due: 'past_due',
  canceled: 'canceled',
  unpaid: 'past_due',
  incomplete: 'trialing',
  incomplete_expired: 'canceled',
  paused: 'paused',
};

function isoOrNull(unixSeconds: number | null | undefined): string | null {
  if (unixSeconds === null || unixSeconds === undefined) return null;
  return new Date(unixSeconds * 1000).toISOString();
}

/** Subscription -> row shape for memberships table.
 *  Stripe SDK v20 moved current_period_start/end from the Subscription root
 *  onto subscription items. We read from either location to stay resilient. */
export function mapSubscriptionToMembershipRow(
  sub: Stripe.Subscription,
): MembershipUpsertFromStripe {
  const meta = sub.metadata ?? {};
  const tierIdRaw = meta.tier_id ?? null;
  const tierId = isValidTierId(tierIdRaw) ? tierIdRaw : null;

  const billingCycleRaw = meta.billing_cycle ?? null;
  const billingCycle = isValidBillingCycle(billingCycleRaw) ? billingCycleRaw : null;

  const status = STATUS_MAP[sub.status] ?? 'canceled';

  const customerId =
    typeof sub.customer === 'string' ? sub.customer : sub.customer?.id ?? null;

  const additionalAdults = safeInt(meta.additional_adults);
  const additionalChildrenChunks = safeInt(meta.additional_children_chunks);

  const periodStart = extractPeriodUnix(sub, 'current_period_start');
  const periodEndUnix = extractPeriodUnix(sub, 'current_period_end');
  const periodEnd = isoOrNull(periodEndUnix);

  return {
    user_id: meta.user_id ?? '',
    tier_id: tierId,
    tier: tierId ?? 'free',
    billing_cycle: billingCycle,
    status,
    current_period_start: isoOrNull(periodStart),
    current_period_end: periodEnd,
    expires_at: periodEnd,
    stripe_subscription_id: sub.id,
    stripe_customer_id: customerId,
    payment_method: 'stripe',
    cancel_at_period_end: Boolean(sub.cancel_at_period_end),
    canceled_at: isoOrNull(sub.canceled_at),
    is_annual_prepay: billingCycle === 'annual',
    additional_adults: additionalAdults,
    additional_children_chunks: additionalChildrenChunks,
  };
}

/** Checkout Session (completed) -> intent to fulfill. Returns null when the
 *  session is not tied to a known product type or user. */
export interface CheckoutCompletionIntent {
  userId: string;
  productType: 'membership' | 'membership_family' | 'genex360' | 'outcome_stack';
  metadata: Record<string, string>;
  stripeSessionId: string;
  stripeCustomerId: string | null;
  stripePaymentIntentId: string | null;
  stripeSubscriptionId: string | null;
}

export function mapCheckoutSessionCompletion(
  session: Stripe.Checkout.Session,
): CheckoutCompletionIntent | null {
  const meta = session.metadata ?? {};
  const userId = meta.user_id;
  const productType = meta.product_type;
  if (!userId || !productType) return null;
  if (
    productType !== 'membership' &&
    productType !== 'membership_family' &&
    productType !== 'genex360' &&
    productType !== 'outcome_stack'
  ) return null;

  const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id ?? null;
  const piRaw = session.payment_intent;
  const paymentIntentId = typeof piRaw === 'string' ? piRaw : piRaw?.id ?? null;
  const subRaw = session.subscription;
  const subscriptionId = typeof subRaw === 'string' ? subRaw : subRaw?.id ?? null;

  return {
    userId,
    productType,
    metadata: Object.fromEntries(
      Object.entries(meta).filter(([, v]) => typeof v === 'string'),
    ) as Record<string, string>,
    stripeSessionId: session.id,
    stripeCustomerId: customerId,
    stripePaymentIntentId: paymentIntentId,
    stripeSubscriptionId: subscriptionId,
  };
}

function extractPeriodUnix(sub: Stripe.Subscription, key: 'current_period_start' | 'current_period_end'): number | null {
  // Newer API versions: on subscription items (first item)
  const items = (sub as unknown as { items?: { data?: Array<Record<string, unknown>> } }).items?.data;
  if (items && items.length > 0) {
    const v = items[0][key];
    if (typeof v === 'number') return v;
  }
  // Older API versions: on subscription root
  const v = (sub as unknown as Record<string, unknown>)[key];
  if (typeof v === 'number') return v;
  return null;
}

function isValidTierId(v: string | null): v is TierId {
  return v === 'free' || v === 'gold' || v === 'platinum' || v === 'platinum_family';
}
function isValidBillingCycle(v: string | null): v is BillingCycle {
  return v === 'monthly' || v === 'annual' || v === 'gift';
}
function safeInt(v: string | undefined): number {
  if (!v) return 0;
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}
