// =============================================================================
// Body Scan entitlement check (Prompt #169a, realigned to the #169f TIER MODEL).
//
// Resolves a consumer's body-scan entitlement by REUSING the existing web
// membership system (the `memberships` + `membership_tiers` + `family_members`
// tables). It does NOT introduce a new billing source.
//
// This module is the TypeScript MIRROR of the SQL resolver
// fn_resolve_body_scan_tier_status in migration
// 20260516000150_prompt_169f_tier_scan_enforcement.sql. Under the four-tier Via
// Cura membership model, FormaVision (Body Scan) is Platinum-and-above only.
// The Free tier has NO body scan; a non-entitled user is REJECTED. The old free
// teaser is RETIRED: there is no one-time free scan and no teaser claim.
//
// ENTITLEMENT = effective tier is Platinum or above, via EITHER of two paths
// (mirroring the SQL resolver):
//   (a) the user's OWN active membership (status active/trialing/gift_active, and
//       NOT past its current_period_end) whose membership_tiers.tier_level >= 2
//       (platinum = 2, platinum_family = 3), OR
//   (b) an ACTIVE, ACCEPTED family_members link to a HOLDER whose own active,
//       non-lapsed membership is platinum_family (tier_level 3).
// A practitioner-managed context bypasses the consumer check entirely. Anyone
// else (Free / Gold / no membership / lapsed) is NOT entitled.
//
// STAMP MAPPING (NEW 169f enum values only; the SQL precedence is holder >
// member > own-platinum):
//   * user's OWN membership is tier_level >= 3 (platinum_family) -> 'platinum_plus_family_holder'
//   * user is an entitled platinum_family member (link path)      -> 'platinum_plus_family_member'
//   * user's OWN membership is tier_level >= 2 (platinum)         -> 'platinum'
//   * practitioner-managed                                        -> 'practitioner_managed'
// A trialing platinum membership grants Platinum and maps to 'platinum'; the
// finer trial_self_initiated / trial_practitioner_granted split is DELIBERATELY
// DEFERRED to a later trials task (the enum carries those values for that task,
// but no trial logic is built here).
//
// The decision logic is split into a pure function (decideBodyScanEntitlement)
// so it can be unit-tested with real behavior, and a thin server wrapper
// (resolveBodyScanEntitlement) that gathers the membership + family + practitioner
// signals from Supabase.
// =============================================================================

import { getActiveMembership } from '@/lib/pricing/membership-manager';
import { tierIdToLevel } from '@/types/pricing';
import type { TierId } from '@/types/pricing';
import type { PricingSupabaseClient } from '@/lib/pricing/supabase-types';

// The premium tier slug stamped at scan time. Mirrors the #169f DB CHECK
// constraint body_photo_sessions_premium_status_at_scan_chk_169f. The trial_*
// values exist for a later trials task and are valid enum members; this module
// never emits them (a trial currently resolves to 'platinum').
export type BodyScanPremiumStatus =
  | 'platinum'
  | 'platinum_plus_family_holder'
  | 'platinum_plus_family_member'
  | 'trial_self_initiated'
  | 'trial_practitioner_granted'
  | 'practitioner_managed';

// The minimal membership shape the decision needs. Kept structurally compatible
// with the row returned by getActiveMembership (memberships joined to
// membership_tiers) so callers can pass that row straight through.
export interface MembershipSignal {
  status: string | null;
  tier: string | null;
  tier_id: string | null;
  // The effective tier level (membership_tiers.tier_level). When null, it is
  // derived from tier_id/tier so a row without the nested join still resolves.
  tier_level: number | null;
  // ISO timestamp. A NULL value means non-expiring (complimentary/gift) and stays
  // allowed; a value in the past means the membership has lapsed (FIX 3 in SQL).
  current_period_end: string | null;
  stripe_subscription_id: string | null;
}

export interface BodyScanEntitlementInput {
  // Active membership row for the user (or null when they have none). When
  // provided by the server wrapper this is the result of getActiveMembership.
  membership: MembershipSignal | null;
  // True when the user has an ACTIVE, ACCEPTED family_members link to a holder
  // whose own active, non-lapsed membership is platinum_family (tier_level 3).
  // Mirrors path (b) of the SQL resolver. The server wrapper computes this.
  familyHolderLink: boolean;
  // True when the scan is being finalized under an active practitioner
  // relationship (practitioner-managed context). When true, the consumer
  // entitlement check is bypassed.
  practitionerManaged: boolean;
}

export interface BodyScanEntitlement {
  // True when the consumer is entitled to a Body Scan (Platinum or above via own
  // membership or the family-holder link). Practitioner-managed is reported via
  // practitionerManaged, not here.
  entitled: boolean;
  // The Stripe subscription id backing the user's own entitled membership, when
  // present. Null for a family-member entitlement (the holder owns the sub) or a
  // non-entitled user.
  subscriptionId: string | null;
  // True when a practitioner-managed context applies (bypasses entitlement).
  practitionerManaged: boolean;
  // The premium status slug to stamp on the scan row, mirroring the SQL
  // resolver's precedence (holder > member > own-platinum), or
  // 'practitioner_managed' for a managed scan. Null when the user is NOT entitled
  // (no scan, no teaser claim, the finalize is rejected).
  statusForScan: BodyScanPremiumStatus | null;
}

// Membership statuses that count as an active entitlement. Matches the set used
// across the web membership system (getActiveMembership, buildUserPricingContext)
// and the SQL resolver (status IN ('active','trialing','gift_active')).
const ACTIVE_MEMBERSHIP_STATUSES = new Set(['active', 'trialing', 'gift_active']);

// Tier levels (mirrors src/types/pricing.ts and membership_tiers.tier_level):
//   free = 0, gold = 1, platinum = 2, platinum_family = 3.
const PLATINUM_TIER_LEVEL = 2;
const FAMILY_TIER_LEVEL = 3;

// The effective tier level for a membership: prefer the joined
// membership_tiers.tier_level; fall back to deriving it from tier_id/tier so a
// row without the nested join still resolves. Unknown tiers resolve to free (0).
function effectiveTierLevel(membership: MembershipSignal): number {
  if (typeof membership.tier_level === 'number') return membership.tier_level;
  const id = (membership.tier_id ?? membership.tier ?? 'free') as TierId;
  try {
    return tierIdToLevel(id);
  } catch {
    return 0;
  }
}

// True when the membership is active AND not lapsed (current_period_end is NULL
// or in the future). Mirrors the SQL status + period-end gate.
function isActiveNonLapsed(membership: MembershipSignal | null, asOf: Date): boolean {
  if (!membership) return false;
  if (!membership.status || !ACTIVE_MEMBERSHIP_STATUSES.has(membership.status)) return false;
  if (membership.current_period_end != null) {
    const end = new Date(membership.current_period_end);
    if (!Number.isNaN(end.getTime()) && end.getTime() <= asOf.getTime()) return false;
  }
  return true;
}

/**
 * Pure entitlement decision. No I/O. Given the user's own membership signal,
 * whether they hold an accepted family link to a platinum_family holder, and
 * whether a practitioner-managed context applies, returns the entitlement the
 * body-scan finalize path needs to decide how to stamp the scan.
 *
 * Precedence MIRRORS the SQL resolver fn_resolve_body_scan_tier_status plus the
 * trigger's practitioner override:
 *   practitioner-managed         -> 'practitioner_managed' (bypass)
 *   own tier_level >= 3 (family) -> 'platinum_plus_family_holder'
 *   accepted family-holder link  -> 'platinum_plus_family_member'
 *   own tier_level >= 2 (plat)   -> 'platinum'
 *   otherwise                     -> NOT entitled (statusForScan null; no teaser)
 */
export function decideBodyScanEntitlement(
  input: BodyScanEntitlementInput,
  asOf: Date = new Date(),
): BodyScanEntitlement {
  const ownActive = isActiveNonLapsed(input.membership, asOf);
  const ownLevel = ownActive && input.membership ? effectiveTierLevel(input.membership) : 0;
  const ownSubscriptionId = input.membership?.stripe_subscription_id ?? null;

  // Practitioner-managed bypasses the consumer entitlement check entirely. The
  // entitled flag still reflects the underlying membership truth.
  if (input.practitionerManaged) {
    return {
      entitled: ownLevel >= PLATINUM_TIER_LEVEL || input.familyHolderLink,
      subscriptionId: ownLevel >= PLATINUM_TIER_LEVEL ? ownSubscriptionId : null,
      practitionerManaged: true,
      statusForScan: 'practitioner_managed',
    };
  }

  // Path (a), tier_level 3: own platinum_family membership -> family holder.
  if (ownLevel >= FAMILY_TIER_LEVEL) {
    return {
      entitled: true,
      subscriptionId: ownSubscriptionId,
      practitionerManaged: false,
      statusForScan: 'platinum_plus_family_holder',
    };
  }

  // Path (b): accepted, active family link to a platinum_family holder -> member.
  // The member need not have any membership of their own, so no subscription id.
  if (input.familyHolderLink) {
    return {
      entitled: true,
      subscriptionId: null,
      practitionerManaged: false,
      statusForScan: 'platinum_plus_family_member',
    };
  }

  // Path (a), tier_level 2: own platinum (non-family) membership -> platinum.
  if (ownLevel >= PLATINUM_TIER_LEVEL) {
    return {
      entitled: true,
      subscriptionId: ownSubscriptionId,
      practitionerManaged: false,
      statusForScan: 'platinum',
    };
  }

  // Not entitled: Free / Gold / no membership / lapsed. The caller REJECTS. There
  // is NO free teaser and NO fallback scan.
  return {
    entitled: false,
    subscriptionId: null,
    practitionerManaged: false,
    statusForScan: null,
  };
}

// The shape getActiveMembership returns: the memberships row plus a nested
// membership_tiers join (membership_tiers(*)). Used to read tier_level and the
// period-end without re-querying.
interface ActiveMembershipRow {
  status?: string | null;
  tier?: string | null;
  tier_id?: string | null;
  current_period_end?: string | null;
  stripe_subscription_id?: string | null;
  membership_tiers?: { tier_level?: number | null } | null;
}

// Narrow client surface for the family-link read. The generated Supabase types
// drift from the live schema (same loose-cast pattern used by the body-tracker
// hooks), so the family_members read uses an explicit minimal shape.
interface FamilyLinkReader {
  from: (table: string) => {
    select: (cols: string) => {
      eq: (col: string, val: string) => {
        eq: (col: string, val: boolean) => {
          not: (col: string, op: string, val: null) => {
            limit: (n: number) => Promise<{
              data: Array<{ primary_user_id: string }> | null;
              error: { message: string } | null;
            }>;
          };
        };
      };
    };
  };
}

/**
 * Resolves whether the user has an ACTIVE, ACCEPTED family_members link to a
 * holder whose own active, non-lapsed membership is platinum_family
 * (tier_level 3). Mirrors path (b) of the SQL resolver:
 *
 *   family_members fm
 *   JOIN memberships m       ON m.user_id = fm.primary_user_id
 *   JOIN membership_tiers mt ON mt.id     = m.tier_id
 *   WHERE fm.member_user_id = <user>
 *     AND fm.is_active = true
 *     AND fm.accepted_at IS NOT NULL
 *     AND m.status IN ('active','trialing','gift_active')
 *     AND (m.current_period_end IS NULL OR m.current_period_end > now())
 *     AND mt.tier_level >= 3
 *
 * Supabase JS cannot express the holder-membership join + tier filter in a single
 * member-side query without a relationship, so this resolves in two reads:
 * enumerate the user's accepted active links (the holder ids), then check whether
 * ANY of those holders carries an active, non-lapsed platinum_family membership
 * via getActiveMembership. Fail-closed: on a read error the link is treated as
 * absent (not entitled), matching the SQL "reject on no qualifying row".
 */
async function resolveFamilyHolderLink(
  client: PricingSupabaseClient,
  userId: string,
  asOf: Date = new Date(),
): Promise<boolean> {
  let holderIds: string[] = [];
  try {
    const reader = client as unknown as FamilyLinkReader;
    const { data, error } = await reader
      .from('family_members')
      .select('primary_user_id')
      .eq('member_user_id', userId)
      .eq('is_active', true)
      .not('accepted_at', 'is', null)
      .limit(50);
    if (error || !data) return false;
    holderIds = data
      .map((r) => r.primary_user_id)
      .filter((id): id is string => typeof id === 'string' && id.length > 0);
  } catch {
    return false;
  }
  if (holderIds.length === 0) return false;

  // Check each holder for an active, non-lapsed platinum_family membership.
  for (const holderId of holderIds) {
    try {
      const holderMembership = (await getActiveMembership(client, holderId)) as ActiveMembershipRow | null;
      if (!holderMembership) continue;
      const signal: MembershipSignal = {
        status: holderMembership.status ?? null,
        tier: holderMembership.tier ?? null,
        tier_id: holderMembership.tier_id ?? null,
        tier_level: holderMembership.membership_tiers?.tier_level ?? null,
        current_period_end: holderMembership.current_period_end ?? null,
        stripe_subscription_id: holderMembership.stripe_subscription_id ?? null,
      };
      if (isActiveNonLapsed(signal, asOf) && effectiveTierLevel(signal) >= FAMILY_TIER_LEVEL) {
        return true;
      }
    } catch {
      // Fail-closed on this holder; continue checking the rest.
    }
  }
  return false;
}

/**
 * Server-side entitlement resolver. Reuses the web membership system
 * (getActiveMembership against the `memberships` table, joined to
 * membership_tiers) for the own-membership signal, resolves the family-holder
 * link (path b), then applies the pure decision. Mirrors the SQL resolver
 * fn_resolve_body_scan_tier_status exactly.
 *
 * practitionerManaged is supplied by the caller, which knows the scan context
 * (a practitioner finalizing a scan on behalf of a managed patient). This
 * function does not infer it; the caller owns that determination because the
 * relationship check is context-specific (practitioner_patients status active).
 */
export async function resolveBodyScanEntitlement(
  client: PricingSupabaseClient,
  userId: string,
  options: { practitionerManaged?: boolean } = {},
): Promise<BodyScanEntitlement> {
  const asOf = new Date();
  const row = (await getActiveMembership(client, userId)) as ActiveMembershipRow | null;
  const membership: MembershipSignal | null = row
    ? {
        status: row.status ?? null,
        tier: row.tier ?? null,
        tier_id: row.tier_id ?? null,
        tier_level: row.membership_tiers?.tier_level ?? null,
        current_period_end: row.current_period_end ?? null,
        stripe_subscription_id: row.stripe_subscription_id ?? null,
      }
    : null;

  // Only resolve the family-holder link when the user is not already an own-tier
  // Platinum-or-above holder (matches the SQL precedence: own family-holder and
  // own-platinum are checked from the same membership; the link path only matters
  // for a member who lacks their own qualifying membership).
  const ownLevel = membership && isActiveNonLapsed(membership, asOf)
    ? effectiveTierLevel(membership)
    : 0;
  const familyHolderLink = ownLevel >= FAMILY_TIER_LEVEL
    ? false
    : await resolveFamilyHolderLink(client, userId, asOf);

  return decideBodyScanEntitlement(
    {
      membership,
      familyHolderLink,
      practitionerManaged: Boolean(options.practitionerManaged),
    },
    asOf,
  );
}
