// =============================================================================
// Body Scan entitlement check (Prompt #169a, spec sections 3 + 10).
//
// Resolves a consumer's body-scan entitlement by REUSING the existing web
// membership system (the `memberships` table). It does NOT introduce a new
// billing source. The canonical "is this consumer premium" signal is an
// active membership row whose effective tier is above `free`, surfaced via
// getActiveMembership() in src/lib/pricing/membership-manager.ts.
//
// The three-point server-side model (consumed by the body-scan finalize path):
//   1. premium                 => 'premium', record subscription id on the scan
//   2. not premium             => claim the one-time free teaser; if already
//                                 used, reject the finalize ('premium required')
//   3. practitioner_managed    => bypass the consumer premium check entirely
//
// The decision logic is split into a pure function (decideBodyScanEntitlement)
// so it can be unit-tested with real behavior, and a thin server wrapper
// (resolveBodyScanEntitlement) that gathers the membership + practitioner
// signals from Supabase.
// =============================================================================

import { getActiveMembership } from '@/lib/pricing/membership-manager';
import type { PricingSupabaseClient } from '@/lib/pricing/supabase-types';

// The premium tier slug stored at scan time. Mirrors the DB CHECK constraint
// premium_status_at_scan IN ('free_teaser','premium','practitioner_managed').
export type BodyScanPremiumStatus = 'free_teaser' | 'premium' | 'practitioner_managed';

// The minimal membership shape the decision needs. Kept structurally compatible
// with the row returned by getActiveMembership (memberships table) so callers
// can pass that row straight through.
export interface MembershipSignal {
  status: string | null;
  tier: string | null;
  tier_id: string | null;
  stripe_subscription_id: string | null;
}

export interface BodyScanEntitlementInput {
  // Active membership row (or null when the consumer has none). When provided
  // by the server wrapper this is the result of getActiveMembership.
  membership: MembershipSignal | null;
  // True when the scan is being finalized under an active practitioner
  // relationship (practitioner-managed context). When true, the consumer
  // premium check is bypassed.
  practitionerManaged: boolean;
}

export interface BodyScanEntitlement {
  // True when the consumer holds an active premium (paid) membership.
  premium: boolean;
  // The Stripe subscription id backing the premium membership, when present.
  subscriptionId: string | null;
  // True when a practitioner-managed context applies (bypasses premium check).
  practitionerManaged: boolean;
  // The premium status slug to stamp on the scan row IF the scan is allowed to
  // finalize without a free-teaser claim:
  //   'practitioner_managed' when practitionerManaged
  //   'premium'              when premium
  //   null                   when the caller must attempt a free-teaser claim
  //                          (non-premium consumer) before finalizing
  statusForScan: Extract<BodyScanPremiumStatus, 'premium' | 'practitioner_managed'> | null;
}

// Membership statuses that count as an active entitlement. Matches the set used
// across the web membership system (getActiveMembership, buildUserPricingContext).
const ACTIVE_MEMBERSHIP_STATUSES = new Set(['active', 'trialing', 'gift_active']);

// The single non-premium tier. Everything above 'free' is a paid/premium tier
// (gold, platinum, platinum_family).
const FREE_TIER = 'free';

function effectiveTier(membership: MembershipSignal): string {
  // Prefer the canonical tier_id; fall back to the legacy `tier` column.
  return membership.tier_id ?? membership.tier ?? FREE_TIER;
}

function isPremiumMembership(membership: MembershipSignal | null): boolean {
  if (!membership) return false;
  if (!membership.status || !ACTIVE_MEMBERSHIP_STATUSES.has(membership.status)) return false;
  return effectiveTier(membership) !== FREE_TIER;
}

/**
 * Pure entitlement decision. No I/O. Given the membership signal and whether a
 * practitioner-managed context applies, returns the entitlement the body-scan
 * finalize path needs to decide how to stamp the scan and whether to require a
 * free-teaser claim.
 *
 * Precedence: practitioner-managed bypasses the consumer premium check.
 */
export function decideBodyScanEntitlement(
  input: BodyScanEntitlementInput,
): BodyScanEntitlement {
  const premium = isPremiumMembership(input.membership);
  const subscriptionId = premium ? input.membership?.stripe_subscription_id ?? null : null;

  if (input.practitionerManaged) {
    return {
      premium,
      subscriptionId,
      practitionerManaged: true,
      statusForScan: 'practitioner_managed',
    };
  }

  if (premium) {
    return {
      premium: true,
      subscriptionId,
      practitionerManaged: false,
      statusForScan: 'premium',
    };
  }

  // Non-premium consumer: the caller must attempt the one-time free-teaser
  // claim before finalizing.
  return {
    premium: false,
    subscriptionId: null,
    practitionerManaged: false,
    statusForScan: null,
  };
}

/**
 * Server-side entitlement resolver. Reuses the web membership system
 * (getActiveMembership against the `memberships` table) for the premium
 * signal, then applies the pure decision.
 *
 * practitionerManaged is supplied by the caller, which knows the scan context
 * (a practitioner finalizing a scan on behalf of a managed patient). This
 * function does not infer it; the caller owns that determination because the
 * relationship check is context-specific (patient_practitioner_relationships
 * with status = 'active').
 */
export async function resolveBodyScanEntitlement(
  client: PricingSupabaseClient,
  userId: string,
  options: { practitionerManaged?: boolean } = {},
): Promise<BodyScanEntitlement> {
  const membership = (await getActiveMembership(client, userId)) as MembershipSignal | null;
  return decideBodyScanEntitlement({
    membership,
    practitionerManaged: Boolean(options.practitionerManaged),
  });
}
