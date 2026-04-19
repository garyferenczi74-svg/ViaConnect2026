// Prompt #95 Phase 5: DB-backed effective-price resolver.
//
// Every billing integration that prices an EXISTING customer MUST route
// through this helper so grandfathered prices are honored. Usage:
//
//   const r = await resolveEffectivePrice({
//     userId: '...',                            // OR practitionerId
//     pricingDomainId: 'consumer_platinum_monthly',
//     targetObjectId: 'platinum',
//     currentListValueCents: 9900,              // current price from membership_tiers
//   });
//   if (r.isGrandfathered) charge = r.effectiveCents;
//
// The binding table has partial indexes on (user_id, pricing_domain_id,
// status=active) so the lookup is O(1) under normal load.

import { createClient } from '@/lib/supabase/server';
import { resolveEffectivePricePure } from '@/lib/governance/grandfathering';

export interface ResolvePriceInput {
  userId?: string;
  practitionerId?: string;
  pricingDomainId: string;
  targetObjectId: string;
  currentListValueCents?: number | null;
  currentListValuePercent?: number | null;
}

export interface ResolvePriceResult {
  effectiveCents: number | null;
  effectivePercent: number | null;
  isGrandfathered: boolean;
  bindingId?: string;
  bindingExpiresAt?: string | null;
}

export async function resolveEffectivePrice(
  input: ResolvePriceInput,
): Promise<ResolvePriceResult> {
  if (!input.userId && !input.practitionerId) {
    throw new Error('userId or practitionerId is required');
  }

  const supabase = createClient();

  let query = supabase
    .from('customer_price_bindings')
    .select('id, bound_value_cents, bound_value_percent, binding_expires_at, status')
    .eq('pricing_domain_id', input.pricingDomainId)
    .eq('target_object_id', input.targetObjectId)
    .eq('status', 'active')
    .limit(1);

  if (input.userId) {
    query = query.eq('user_id', input.userId);
  } else if (input.practitionerId) {
    query = query.eq('practitioner_id', input.practitionerId);
  }

  const { data } = await query.maybeSingle();
  const binding = data as
    | {
        id: string;
        bound_value_cents: number | null;
        bound_value_percent: number | null;
        binding_expires_at: string | null;
        status: string;
      }
    | null;

  const pure = resolveEffectivePricePure({
    hasActiveBinding: !!binding,
    boundValueCents: binding?.bound_value_cents ?? null,
    boundValuePercent: binding?.bound_value_percent ?? null,
    currentListValueCents: input.currentListValueCents ?? null,
    currentListValuePercent: input.currentListValuePercent ?? null,
    bindingExpiresAt: binding?.binding_expires_at ?? null,
  });

  return {
    ...pure,
    bindingId: pure.isGrandfathered ? binding?.id : undefined,
    bindingExpiresAt: pure.isGrandfathered ? binding?.binding_expires_at ?? null : undefined,
  };
}
