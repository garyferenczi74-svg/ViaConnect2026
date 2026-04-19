// Prompt #91 Phase 3: Wholesale pricing engine.
//
// Pure-function pricing math + a small DB-backed context builder. Mirrors
// the consumer discount-engine split: deterministic computeWholesalePrice
// for tests, buildWholesaleContext for runtime resolution against Supabase.
//
// Wholesale eligibility requires:
//   1. Practitioner has an `active` practitioners row.
//   2. Practitioner has an `active` or `trialing` subscription on either
//      tier (standard or white_label).
//   3. Practitioner holds a `certified` Foundation certification (Level 1).

import type { PricingSupabaseClient } from './supabase-types';
import type { PractitionerTierId } from '@/lib/practitioner/taxonomy';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WholesalePricingContext {
  practitionerId: string;
  subscriptionTierId: PractitionerTierId;
  wholesaleDiscountPercent: number;
  isActivePractitioner: boolean;
  hasRequiredCertification: boolean;
}

export interface WholesalePrice {
  originalMsrpCents: number;
  wholesaleCents: number;
  savingsCents: number;
  discountPercent: number;
}

export interface WholesaleMOQResult {
  meetsMoq: boolean;
  shortfallCents: number;
  minimumCents: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Minimum wholesale order, $500 expressed in cents. */
export const MIN_WHOLESALE_ORDER_CENTS = 50000;

/** Default wholesale discount per Prompt #91 spec. */
export const DEFAULT_WHOLESALE_DISCOUNT_PERCENT = 50;

// ---------------------------------------------------------------------------
// Pure functions
// ---------------------------------------------------------------------------

export function calculateWholesalePrice(
  msrpCents: number,
  context: WholesalePricingContext,
): WholesalePrice {
  if (
    msrpCents <= 0 ||
    !context.isActivePractitioner ||
    !context.hasRequiredCertification
  ) {
    return {
      originalMsrpCents: msrpCents,
      wholesaleCents: msrpCents,
      savingsCents: 0,
      discountPercent: 0,
    };
  }

  const discount = clampPercent(context.wholesaleDiscountPercent);
  const savings = Math.round(msrpCents * (discount / 100));
  return {
    originalMsrpCents: msrpCents,
    wholesaleCents: msrpCents - savings,
    savingsCents: savings,
    discountPercent: discount,
  };
}

export function validateWholesaleMOQ(
  cartWholesaleTotalCents: number,
): WholesaleMOQResult {
  return {
    meetsMoq: cartWholesaleTotalCents >= MIN_WHOLESALE_ORDER_CENTS,
    shortfallCents: Math.max(
      0,
      MIN_WHOLESALE_ORDER_CENTS - cartWholesaleTotalCents,
    ),
    minimumCents: MIN_WHOLESALE_ORDER_CENTS,
  };
}

function clampPercent(p: number): number {
  return Math.max(0, Math.min(100, p));
}

// ---------------------------------------------------------------------------
// DB-backed context builder
// ---------------------------------------------------------------------------

/**
 * Resolve a user_id to its WholesalePricingContext. Returns null if the user
 * is not a registered practitioner with an active subscription. Foundation
 * certification is the gate for wholesale eligibility per spec.
 */
export async function buildWholesaleContext(
  client: PricingSupabaseClient,
  userId: string,
): Promise<WholesalePricingContext | null> {
  const { data: practitioner } = await (client as any)
    .from('practitioners')
    .select('id, account_status')
    .eq('user_id', userId)
    .eq('account_status', 'active')
    .maybeSingle();

  if (!practitioner) return null;

  const [subscriptionResult, certificationResult, tierResult] = await Promise.all([
    (client as any)
      .from('practitioner_subscriptions')
      .select('tier_id, status')
      .eq('practitioner_id', practitioner.id)
      .in('status', ['active', 'trialing'])
      .order('current_period_end', { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle(),
    (client as any)
      .from('practitioner_certifications')
      .select('status')
      .eq('practitioner_id', practitioner.id)
      .eq('certification_level_id', 'foundation')
      .eq('status', 'certified')
      .maybeSingle(),
    (client as any)
      .from('practitioner_tiers')
      .select('id, wholesale_discount_percent')
      .eq('is_active', true),
  ]);

  const subscription = subscriptionResult.data as
    | { tier_id: string; status: string }
    | null;
  if (!subscription) return null;

  const certification = certificationResult.data as { status: string } | null;
  const tiers = (tierResult.data ?? []) as Array<{
    id: string;
    wholesale_discount_percent: number | null;
  }>;
  const tierRow = tiers.find((t) => t.id === subscription.tier_id);

  return {
    practitionerId: practitioner.id as string,
    subscriptionTierId: subscription.tier_id as PractitionerTierId,
    wholesaleDiscountPercent:
      tierRow?.wholesale_discount_percent ?? DEFAULT_WHOLESALE_DISCOUNT_PERCENT,
    isActivePractitioner: true,
    hasRequiredCertification: certification?.status === 'certified',
  };
}
