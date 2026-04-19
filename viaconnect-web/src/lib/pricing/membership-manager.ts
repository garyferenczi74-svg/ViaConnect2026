// Prompt #90 Phase 2: Membership state manager.
// Thin DB helpers on top of the `memberships` table. No caching; each
// caller is responsible for passing the Supabase client. Dual-writes
// the legacy `tier` + `expires_at` columns for backward compatibility.

import type { BillingCycle, MembershipStatus, TierId } from '@/types/pricing';
import type { PricingSupabaseClient } from './supabase-types';

export async function getActiveMembership(client: PricingSupabaseClient, userId: string) {
  const { data } = await client
    .from('memberships')
    .select('*, membership_tiers(*)')
    .eq('user_id', userId)
    .in('status', ['active', 'trialing', 'gift_active'])
    .order('current_period_end', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

export async function getEffectiveTierForUser(
  client: PricingSupabaseClient,
  userId: string,
): Promise<TierId> {
  const { data } = await client
    .from('memberships')
    .select('tier_id, membership_tiers!inner(tier_level)')
    .eq('user_id', userId)
    .in('status', ['active', 'trialing', 'gift_active']);
  if (!data || data.length === 0) return 'free';

  const rows = data as Array<{ tier_id: string | null; membership_tiers: { tier_level: number } | null }>;
  const sorted = [...rows].sort((a, b) => {
    const la = a.membership_tiers?.tier_level ?? -1;
    const lb = b.membership_tiers?.tier_level ?? -1;
    return lb - la;
  });
  const top = sorted[0];
  return (top.tier_id ?? 'free') as TierId;
}

export async function createMembership(
  client: PricingSupabaseClient,
  params: {
    userId: string;
    tierId: TierId;
    billingCycle: BillingCycle;
    stripeSubscriptionId?: string | null;
    paypalSubscriptionId?: string | null;
    stripeCustomerId?: string | null;
    isAnnualPrepay?: boolean;
  },
) {
  const now = new Date();
  const periodEnd = new Date(now);
  if (params.billingCycle === 'monthly') periodEnd.setMonth(periodEnd.getMonth() + 1);
  else if (params.billingCycle === 'annual') periodEnd.setFullYear(periodEnd.getFullYear() + 1);

  const paymentMethod = params.stripeSubscriptionId
    ? 'stripe'
    : params.paypalSubscriptionId
      ? 'paypal'
      : 'complimentary';

  const { data, error } = await client
    .from('memberships')
    .insert({
      user_id: params.userId,
      tier: params.tierId,
      tier_id: params.tierId,
      billing_cycle: params.billingCycle,
      started_at: now.toISOString(),
      current_period_start: now.toISOString(),
      current_period_end: periodEnd.toISOString(),
      expires_at: periodEnd.toISOString(),
      status: 'active',
      stripe_subscription_id: params.stripeSubscriptionId ?? null,
      paypal_subscription_id: params.paypalSubscriptionId ?? null,
      stripe_customer_id: params.stripeCustomerId ?? null,
      payment_method: paymentMethod,
      is_annual_prepay: params.isAnnualPrepay ?? params.billingCycle === 'annual',
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create membership: ${error.message}`);
  return data;
}

export async function updateMembershipStatus(
  client: PricingSupabaseClient,
  params: {
    membershipId: string;
    newStatus: MembershipStatus;
    cancelAtPeriodEnd?: boolean;
  },
) {
  const updates: Record<string, unknown> = {
    status: params.newStatus,
    updated_at: new Date().toISOString(),
  };
  if (params.newStatus === 'canceled') {
    updates.canceled_at = new Date().toISOString();
  }
  if (params.cancelAtPeriodEnd !== undefined) {
    updates.cancel_at_period_end = params.cancelAtPeriodEnd;
  }
  const { error } = await client
    .from('memberships')
    .update(updates)
    .eq('id', params.membershipId);
  if (error) throw new Error(`Failed to update membership: ${error.message}`);
}
