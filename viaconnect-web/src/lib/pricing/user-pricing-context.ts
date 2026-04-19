// Prompt #90 Phase 2: User pricing context builder.
// Gathers all inputs needed by downstream calculators into a single
// UserPricingContext snapshot. Five parallel reads against Supabase.

import type { TierId, UserPricingContext } from '@/types/pricing';
import { tierIdToLevel } from '@/types/pricing';
import type { PricingSupabaseClient } from './supabase-types';

export async function buildUserPricingContext(
  client: PricingSupabaseClient,
  userId: string,
): Promise<UserPricingContext> {
  const [membershipResult, genex360Result, protocolResult, familyResult, giftMembershipsResult] =
    await Promise.all([
      client
        .from('memberships')
        .select('tier_id, tier, billing_cycle, status, is_annual_prepay, current_period_end, expires_at')
        .eq('user_id', userId)
        .in('status', ['active', 'trialing', 'gift_active'])
        .order('current_period_end', { ascending: false, nullsFirst: false })
        .limit(1)
        .maybeSingle(),
      client
        .from('genex360_purchases')
        .select('product_id, lifecycle_status, test_results_delivered_at')
        .eq('user_id', userId)
        .eq('payment_status', 'paid'),
      client
        .from('user_protocols')
        .select('id')
        .eq('user_id', userId)
        .eq('is_active', true)
        .limit(1),
      client
        .from('family_members')
        .select('member_type, is_active')
        .eq('primary_user_id', userId)
        .eq('is_active', true),
      client
        .from('memberships')
        .select('tier_id, tier, current_period_end, expires_at, gift_source_id')
        .eq('user_id', userId)
        .eq('status', 'gift_active'),
    ]);

  const membership = membershipResult.data as {
    tier_id: string | null;
    tier: string | null;
    billing_cycle: string | null;
    status: string | null;
    is_annual_prepay: boolean | null;
    current_period_end: string | null;
    expires_at: string | null;
  } | null;

  const genex360Purchases = (genex360Result.data ?? []) as Array<{
    product_id: string;
    lifecycle_status: string;
    test_results_delivered_at: string | null;
  }>;

  const hasActiveProtocol = ((protocolResult.data ?? []) as Array<unknown>).length > 0;

  const familyMembers = (familyResult.data ?? []) as Array<{
    member_type: string;
    is_active: boolean;
  }>;

  const giftMemberships = (giftMembershipsResult.data ?? []) as Array<{
    tier_id: string | null;
    tier: string | null;
    current_period_end: string | null;
    expires_at: string | null;
    gift_source_id: string | null;
  }>;

  const currentTier: TierId = ((membership?.tier_id ?? membership?.tier ?? 'free') as TierId);
  const level = tierIdToLevel(currentTier);

  const ownsAnyGeneX360 = genex360Purchases.length > 0;
  const ownsGeneX360Complete = genex360Purchases.some(
    (p) => p.product_id === 'genex360_complete' && p.test_results_delivered_at !== null,
  );

  const adults = familyMembers.filter((m) => m.member_type === 'adult').length;
  const children = familyMembers.filter((m) => m.member_type === 'child').length;

  const hasActiveMembership =
    membership?.status === 'active' ||
    membership?.status === 'gift_active' ||
    membership?.status === 'trialing';

  const hasActiveSubscription =
    membership?.billing_cycle === 'monthly' || membership?.billing_cycle === 'annual';

  return {
    userId,
    currentTier,
    tierLevel: level,
    hasActiveMembership: Boolean(hasActiveMembership),
    hasActiveSubscription: Boolean(hasActiveSubscription),
    isAnnualPrepay: Boolean(membership?.is_annual_prepay),
    ownsAnyGeneX360,
    ownsGeneX360Complete,
    hasActiveProtocol,
    activeFamilyMemberCount: { adults, children },
    giftMemberships: giftMemberships.map((g) => ({
      tierId: ((g.tier_id ?? g.tier) ?? 'gold') as TierId,
      endsAt: new Date(g.current_period_end ?? g.expires_at ?? Date.now()),
      source: 'genex360' as const,
    })),
  };
}
