// =============================================================================
// body-scan-analyze/entitlement.ts
//
// Prompt #169a, realigned to the #169f TIER MODEL.
//
// Deno-side mirror of the entitlement decision in
// src/lib/body-tracker/entitlement-check.ts AND of the SQL resolver
// fn_resolve_body_scan_tier_status (migration 20260516000150). Deno edge
// functions cannot import from the Next.js side, so the pure decision is
// duplicated here. Keep all three in sync.
//
// This edge function runs as the Postgres role service_role. The finalize
// trigger (fn_enforce_body_scan_finalize) TRUSTS a service_role pre-stamp of
// body_photo_sessions.premium_status_at_scan and does NOT re-resolve it, so the
// value this module writes MUST be a valid NEW-enum value resolved by the same
// rules as the SQL resolver. The membership/family signal reuses the web
// membership system (memberships + membership_tiers + family_members); this
// module does NOT introduce a new billing source.
//
// Under #169f, Body Scan is Platinum-and-above only and the free teaser is
// RETIRED. The model consumed by the finalize path:
//   entitled (Platinum or above, own or via family link) => stamp the resolved
//                            tier status (holder > member > own-platinum)
//   practitioner_managed  => bypass the consumer check, stamp
//                            'practitioner_managed'
//   ACTIVE platinum_trials row (169f Option C / D), only when no paid entitlement
//                            outranks it => stamp 'trial_self_initiated' /
//                            'trial_practitioner_granted'
//   not entitled          => REJECT the finalize (402); NO teaser claim, NO
//                            fallback scan, do NOT mark complete
//
// SECURITY (Prompt #169a review fix): practitioner_managed is NEVER read as a
// trusted client boolean. It is DETERMINED SERVER-SIDE by verifyPractitionerManaged
// (below), which confirms an active practitioner relationship exists between the
// authenticated caller and the supplied patient. Absent a verified relationship
// the request falls through to the normal consumer entitlement logic.
// =============================================================================

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { withTimeout } from '../_shared/with-timeout.ts';
import { safeLog } from '../_shared/safe-log.ts';

// The premium tier slug stamped at scan time. Mirrors the #169f DB CHECK
// constraint body_photo_sessions_premium_status_at_scan_chk_169f. The trial_*
// values are emitted by the trial branch (169f Option C / D) when an ACTIVE
// platinum_trials row grants access and no paid entitlement outranks it.
export type BodyScanPremiumStatus =
  | 'platinum'
  | 'platinum_plus_family_holder'
  | 'platinum_plus_family_member'
  | 'trial_self_initiated'
  | 'trial_practitioner_granted'
  | 'practitioner_managed';

// The platinum_trials.trial_source of an ACTIVE trial, or null when there is no
// active trial. Mirrors the SQL resolver's v_trial_source; maps 1:1 to trial_*.
export type ActiveTrialSource = 'self_initiated' | 'practitioner_granted' | null;

// Minimal membership shape the decision needs. Structurally compatible with the
// memberships row joined to membership_tiers.
export interface MembershipSignal {
  status: string | null;
  tier: string | null;
  tier_id: string | null;
  // membership_tiers.tier_level; null when the join is absent (derived from
  // tier_id/tier as a fallback).
  tier_level: number | null;
  // ISO timestamp; null means non-expiring. A past value means lapsed.
  current_period_end: string | null;
  stripe_subscription_id: string | null;
}

export interface BodyScanEntitlement {
  // True when the user is entitled (Platinum or above, own or via family link).
  entitled: boolean;
  subscriptionId: string | null;
  practitionerManaged: boolean;
  // The resolved tier status to stamp when the scan may finalize (mirrors the
  // SQL resolver precedence: holder > member > own-platinum), or
  // 'practitioner_managed'. null when NOT entitled (the caller REJECTS; no teaser).
  statusForScan: BodyScanPremiumStatus | null;
}

// Active statuses that count as an entitlement. Matches getActiveMembership /
// buildUserPricingContext on the web side and the SQL resolver.
const ACTIVE_MEMBERSHIP_STATUSES = new Set(['active', 'trialing', 'gift_active']);

// Tier levels (mirrors src/types/pricing.ts and membership_tiers.tier_level):
//   free = 0, gold = 1, platinum = 2, platinum_family = 3.
const TIER_LEVEL_BY_ID: Record<string, number> = {
  free: 0,
  gold: 1,
  platinum: 2,
  platinum_family: 3,
};
const PLATINUM_TIER_LEVEL = 2;
const FAMILY_TIER_LEVEL = 3;

// Membership query timeout. Spec section 10 calls for an 8s query timeout.
const MEMBERSHIP_QUERY_TIMEOUT_MS = 8_000;

function effectiveTierLevel(m: MembershipSignal): number {
  if (typeof m.tier_level === 'number') return m.tier_level;
  const id = m.tier_id ?? m.tier ?? 'free';
  return TIER_LEVEL_BY_ID[id] ?? 0;
}

function isActiveNonLapsed(m: MembershipSignal | null, asOf: number): boolean {
  if (!m) return false;
  if (!m.status || !ACTIVE_MEMBERSHIP_STATUSES.has(m.status)) return false;
  if (m.current_period_end != null) {
    const end = new Date(m.current_period_end).getTime();
    if (!Number.isNaN(end) && end <= asOf) return false;
  }
  return true;
}

/**
 * Pure entitlement decision. Mirrors decideBodyScanEntitlement in
 * src/lib/body-tracker/entitlement-check.ts and the SQL resolver
 * fn_resolve_body_scan_tier_status. Precedence:
 *   practitioner-managed         -> 'practitioner_managed' (bypass)
 *   own tier_level >= 3 (family) -> 'platinum_plus_family_holder'
 *   accepted family-holder link  -> 'platinum_plus_family_member'
 *   own tier_level >= 2 (plat)   -> 'platinum'
 *   otherwise                     -> NOT entitled (statusForScan null; no teaser)
 */
export function decideBodyScanEntitlement(
  membership: MembershipSignal | null,
  familyHolderLink: boolean,
  practitionerManaged: boolean,
  asOf: number = Date.now(),
): BodyScanEntitlement {
  const ownActive = isActiveNonLapsed(membership, asOf);
  const ownLevel = ownActive && membership ? effectiveTierLevel(membership) : 0;
  const ownSubscriptionId = membership?.stripe_subscription_id ?? null;

  if (practitionerManaged) {
    return {
      entitled: ownLevel >= PLATINUM_TIER_LEVEL || familyHolderLink,
      subscriptionId: ownLevel >= PLATINUM_TIER_LEVEL ? ownSubscriptionId : null,
      practitionerManaged: true,
      statusForScan: 'practitioner_managed',
    };
  }
  if (ownLevel >= FAMILY_TIER_LEVEL) {
    return {
      entitled: true,
      subscriptionId: ownSubscriptionId,
      practitionerManaged: false,
      statusForScan: 'platinum_plus_family_holder',
    };
  }
  if (familyHolderLink) {
    return {
      entitled: true,
      subscriptionId: null,
      practitionerManaged: false,
      statusForScan: 'platinum_plus_family_member',
    };
  }
  if (ownLevel >= PLATINUM_TIER_LEVEL) {
    return {
      entitled: true,
      subscriptionId: ownSubscriptionId,
      practitionerManaged: false,
      statusForScan: 'platinum',
    };
  }
  return { entitled: false, subscriptionId: null, practitionerManaged: false, statusForScan: null };
}

/**
 * Pure trial-fallback. Mirrors applyTrialFallback in
 * src/lib/body-tracker/entitlement-check.ts and the SQL resolver's trial branch:
 * a PAID entitlement (or the practitioner-managed bypass) OUTRANKS a trial, so an
 * already-entitled or practitioner-managed decision is returned unchanged; only a
 * NOT-entitled membership decision is upgraded by an ACTIVE platinum_trials row to
 * 'trial_self_initiated' / 'trial_practitioner_granted'. A trial never carries a
 * subscription id. expires_at > now() is applied at the query in the caller, so a
 * non-null activeTrialSource already means the trial is active.
 */
export function applyTrialFallback(
  membershipDecision: BodyScanEntitlement,
  activeTrialSource: ActiveTrialSource,
): BodyScanEntitlement {
  if (membershipDecision.entitled || membershipDecision.practitionerManaged) {
    return membershipDecision;
  }
  if (activeTrialSource === 'self_initiated') {
    return { entitled: true, subscriptionId: null, practitionerManaged: false, statusForScan: 'trial_self_initiated' };
  }
  if (activeTrialSource === 'practitioner_granted') {
    return { entitled: true, subscriptionId: null, practitionerManaged: false, statusForScan: 'trial_practitioner_granted' };
  }
  return membershipDecision;
}

// Reads a user's active, non-lapsed membership as a MembershipSignal (joined to
// membership_tiers for tier_level), or null. Fail-closed: on error/timeout the
// membership is treated as absent.
async function readMembershipSignal(
  sa: SupabaseClient,
  userId: string,
  stage: string,
): Promise<MembershipSignal | null> {
  try {
    const { data, error } = await withTimeout(
      sa
        .from('memberships')
        .select('status, tier, tier_id, current_period_end, stripe_subscription_id, membership_tiers(tier_level)')
        .eq('user_id', userId)
        .in('status', ['active', 'trialing', 'gift_active'])
        .order('current_period_end', { ascending: false, nullsFirst: false })
        .limit(1)
        .maybeSingle(),
      MEMBERSHIP_QUERY_TIMEOUT_MS,
      `edge-function.body-scan-analyze.${stage}`,
    );
    if (error) {
      safeLog.warn('body-scan-analyze', 'membership lookup error', {
        user_id: userId,
        stage,
        error: error.message,
      });
      return null;
    }
    if (!data) return null;
    const row = data as {
      status: string | null;
      tier: string | null;
      tier_id: string | null;
      current_period_end: string | null;
      stripe_subscription_id: string | null;
      membership_tiers: { tier_level: number | null } | { tier_level: number | null }[] | null;
    };
    // The embedded relationship may come back as an object or a single-element
    // array depending on the cardinality inference; normalize to a level.
    const mt = Array.isArray(row.membership_tiers) ? row.membership_tiers[0] : row.membership_tiers;
    return {
      status: row.status,
      tier: row.tier,
      tier_id: row.tier_id,
      tier_level: mt?.tier_level ?? null,
      current_period_end: row.current_period_end,
      stripe_subscription_id: row.stripe_subscription_id,
    };
  } catch (e) {
    safeLog.warn('body-scan-analyze', 'membership lookup exception', {
      user_id: userId,
      stage,
      error: String(e),
    });
    return null;
  }
}

/**
 * Resolves whether the user has an ACTIVE, ACCEPTED family_members link to a
 * holder whose own active, non-lapsed membership is platinum_family
 * (tier_level 3). Mirrors path (b) of the SQL resolver. Two reads (enumerate the
 * accepted active links, then check each holder's membership) because the
 * member-side query cannot join the holder's membership without a relationship.
 * Fail-closed: on error the link is treated as absent.
 */
async function resolveFamilyHolderLink(
  sa: SupabaseClient,
  userId: string,
  asOf: number,
): Promise<boolean> {
  let holderIds: string[] = [];
  try {
    const { data, error } = await withTimeout(
      sa
        .from('family_members')
        .select('primary_user_id')
        .eq('member_user_id', userId)
        .eq('is_active', true)
        .not('accepted_at', 'is', null)
        .limit(50),
      MEMBERSHIP_QUERY_TIMEOUT_MS,
      'edge-function.body-scan-analyze.family-link-lookup',
    );
    if (error || !data) {
      if (error) {
        safeLog.warn('body-scan-analyze', 'family link lookup error', {
          user_id: userId,
          stage: 'resolveFamilyHolderLink',
          error: error.message,
        });
      }
      return false;
    }
    holderIds = (data as Array<{ primary_user_id: string | null }>)
      .map((r) => r.primary_user_id)
      .filter((id): id is string => typeof id === 'string' && id.length > 0);
  } catch (e) {
    safeLog.warn('body-scan-analyze', 'family link lookup exception', {
      user_id: userId,
      stage: 'resolveFamilyHolderLink',
      error: String(e),
    });
    return false;
  }
  if (holderIds.length === 0) return false;

  for (const holderId of holderIds) {
    const holder = await readMembershipSignal(sa, holderId, 'family-holder-membership-lookup');
    if (holder && isActiveNonLapsed(holder, asOf) && effectiveTierLevel(holder) >= FAMILY_TIER_LEVEL) {
      return true;
    }
  }
  return false;
}

/**
 * Resolves the user's ACTIVE platinum_trials source (169f Option C / D), or null.
 * Mirrors the SQL resolver's trial branch (and resolveActiveTrialSource on the web
 * side):
 *
 *   SELECT trial_source FROM platinum_trials
 *    WHERE user_id = <user>
 *      AND converted_at IS NULL
 *      AND cancelled_at IS NULL
 *      AND expires_at > now()
 *    ORDER BY expires_at DESC
 *    LIMIT 1
 *
 * The edge runs as service_role and can read platinum_trials directly. The active
 * predicate (incl. expires_at > now()) is applied here at QUERY time, exactly as
 * the SQL resolver does. Fail-closed: on a read error/timeout or an unrecognized
 * source the trial is treated as absent (not entitled), so a transient DB issue
 * REJECTS rather than silently granting a trial.
 */
async function resolveActiveTrialSource(
  sa: SupabaseClient,
  userId: string,
  asOf: number,
): Promise<ActiveTrialSource> {
  try {
    const { data, error } = await withTimeout(
      sa
        .from('platinum_trials')
        .select('trial_source')
        .eq('user_id', userId)
        .is('converted_at', null)
        .is('cancelled_at', null)
        .gt('expires_at', new Date(asOf).toISOString())
        .order('expires_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      MEMBERSHIP_QUERY_TIMEOUT_MS,
      'edge-function.body-scan-analyze.trial-lookup',
    );
    if (error) {
      safeLog.warn('body-scan-analyze', 'trial lookup error', {
        user_id: userId,
        stage: 'resolveActiveTrialSource',
        error: error.message,
      });
      return null;
    }
    const source = (data as { trial_source: string | null } | null)?.trial_source ?? null;
    if (source === 'self_initiated' || source === 'practitioner_granted') return source;
    return null;
  } catch (e) {
    safeLog.warn('body-scan-analyze', 'trial lookup exception', {
      user_id: userId,
      stage: 'resolveActiveTrialSource',
      error: String(e),
    });
    return null;
  }
}

/**
 * Reads the user's own active membership (joined to membership_tiers), resolves
 * the family-holder link (path b), applies the pure membership decision, THEN
 * (only when no paid Platinum-or-above entitlement granted access) consults
 * platinum_trials for an ACTIVE trial. Mirrors the SQL resolver
 * fn_resolve_body_scan_tier_status exactly, including its precedence: a PAID
 * entitlement always outranks a trial. On a query timeout or error a signal is
 * treated as absent (not entitled), which REJECTS the finalize rather than
 * silently granting access. The practitioner-managed flag is decided by the caller.
 */
export async function resolveBodyScanEntitlement(
  sa: SupabaseClient,
  userId: string,
  practitionerManaged: boolean,
): Promise<BodyScanEntitlement> {
  const asOf = Date.now();
  const membership = await readMembershipSignal(sa, userId, 'membership-lookup');

  const ownLevel = isActiveNonLapsed(membership, asOf) && membership
    ? effectiveTierLevel(membership)
    : 0;
  const familyHolderLink = ownLevel >= FAMILY_TIER_LEVEL
    ? false
    : await resolveFamilyHolderLink(sa, userId, asOf);

  const membershipDecision = decideBodyScanEntitlement(membership, familyHolderLink, practitionerManaged, asOf);

  // 169f trial branch: only consult platinum_trials when no paid entitlement (or
  // the practitioner-managed bypass) already granted access. Mirrors the SQL
  // resolver reaching its trial branch only after holder / member / own-platinum.
  if (membershipDecision.entitled || membershipDecision.practitionerManaged) {
    return membershipDecision;
  }
  const activeTrialSource = await resolveActiveTrialSource(sa, userId, asOf);
  return applyTrialFallback(membershipDecision, activeTrialSource);
}

/**
 * Server-side verification of a practitioner-managed scan context.
 *
 * SECURITY: the practitioner-managed bypass MUST be derived from the database,
 * never from a client-supplied boolean. A free consumer could otherwise send
 * { practitioner_managed: true } to get unlimited scans without ever burning the
 * teaser or hitting the 402.
 *
 * Returns true ONLY when an active practitioner relationship exists between the
 * authenticated caller (callerUserId, the practitioner acting on behalf) and the
 * supplied patient (patientUserId, the scan subject). Mirrors the canonical
 * practitioner-access pattern used by body-scan-export and the practitioner scan
 * read RLS (20260516000060_prompt_169_practitioner_scan_read_rls.sql), gating on
 * the live practitioner_patients table:
 *
 *   practitioner_patients pp
 *   WHERE pp.practitioner_id = <caller auth uid>
 *     AND pp.patient_id      = <patient id>
 *     AND pp.status          = 'active'
 *
 * In practitioner_patients, practitioner_id IS the practitioner's auth user id
 * directly, so there is NO join through a practitioners table. The Prompt #92
 * patient_practitioner_relationships table was dropped CASCADE in
 * 20260418000160_practitioners_schema_reconciliation.sql.
 *
 * Fail-closed: returns false when no patient id is supplied, when the caller is
 * the patient themselves (a consumer cannot self-grant the practitioner bypass),
 * or when the query errors or times out. A false result routes the request into
 * the normal consumer premium/teaser logic.
 */
export async function verifyPractitionerManaged(
  sa: SupabaseClient,
  callerUserId: string,
  patientUserId: string | null | undefined,
): Promise<boolean> {
  // No patient subject supplied (the ordinary consumer self-scan flow), or the
  // caller is scanning themselves: there is no practitioner-managed context.
  if (!patientUserId || patientUserId === callerUserId) return false;

  try {
    // Match an active practitioner_patients row directly: practitioner_id is the
    // caller's auth uid and patient_id is the supplied patient. A non-null result
    // means an active relationship exists for this caller + patient. Same gate as
    // body-scan-export's practitioner export path.
    const { data, error } = await withTimeout(
      sa
        .from('practitioner_patients')
        .select('status')
        .eq('practitioner_id', callerUserId)
        .eq('patient_id', patientUserId)
        .eq('status', 'active')
        .maybeSingle(),
      MEMBERSHIP_QUERY_TIMEOUT_MS,
      'edge-function.body-scan-analyze.practitioner-verify',
    );
    if (error) {
      safeLog.warn('body-scan-analyze', 'practitioner verify error', {
        user_id: callerUserId,
        patient_user_id: patientUserId,
        stage: 'verifyPractitionerManaged',
        error: error.message,
      });
      return false;
    }
    return data !== null;
  } catch (e) {
    // Fail-closed: an error or timeout must NOT grant the practitioner bypass.
    safeLog.warn('body-scan-analyze', 'practitioner verify exception', {
      user_id: callerUserId,
      patient_user_id: patientUserId,
      stage: 'verifyPractitionerManaged',
      error: String(e),
    });
    return false;
  }
}

// =============================================================================
// Prompt #169b: Age gate (spec section 4) + 24h frequency limiter (section
// 3.2.3), server-side enforcement.
//
// These are the AUTHORITATIVE gates. They run in the finalize path BEFORE the
// scan is persisted / the session is marked complete, alongside the #169a
// entitlement gate. Both reject WITHOUT persisting when they fail.
//
// Deno-side mirror of src/lib/body-tracker/age-frequency-gate.ts (Deno cannot
// import from the Next.js tree). The pure decisions below MUST stay in sync with
// that module; the web unit tests cover the same logic.
// =============================================================================

export const BODY_SCAN_MIN_AGE = 18;
export const SCAN_FREQUENCY_WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * Whole-years age from an ISO date-of-birth string as of `asOf`. Returns null
 * when the DOB is missing or unparseable. Calendar-correct birthday math (NOT a
 * 365.25-day division) so a user on their 18th birthday reads as exactly 18.
 * Mirrors computeAgeYears in the web module.
 *
 * TIMEZONE: a date-only DOB ('YYYY-MM-DD') is parsed by its literal Y/M/D
 * components and compared against asOf's local calendar date, avoiding the
 * UTC-midnight off-by-one that `new Date('YYYY-MM-DD')` causes in a non-UTC
 * timezone. Full timestamps fall back to Date parsing. Kept identical to the web
 * module so the gate decisions match.
 */
export function computeAgeYears(
  dateOfBirth: string | null | undefined,
  asOf: Date = new Date(),
): number | null {
  if (!dateOfBirth) return null;

  let by: number, bm: number, bd: number;
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateOfBirth.trim());
  if (dateOnly) {
    by = Number(dateOnly[1]);
    bm = Number(dateOnly[2]);
    bd = Number(dateOnly[3]);
  } else {
    const birth = new Date(dateOfBirth);
    if (Number.isNaN(birth.getTime())) return null;
    by = birth.getFullYear();
    bm = birth.getMonth() + 1;
    bd = birth.getDate();
  }

  const ay = asOf.getFullYear();
  const am = asOf.getMonth() + 1;
  const ad = asOf.getDate();

  let age = ay - by;
  if (am < bm || (am === bm && ad < bd)) age -= 1;
  return age < 0 ? 0 : age;
}

export interface ServerAgeDecision {
  allowed: boolean;
  // The trimmed override reason to record on body_photo_sessions when a minor is
  // allowed via the practitioner override path; null otherwise.
  overrideReason: string | null;
  overrodeMinor: boolean;
  ageYears: number | null;
}

/**
 * Pure server age-gate decision (spec section 4 + 4.3). Mirrors
 * decideAgeGateWithOverride in the web module.
 *
 *   18+ (or DOB unknown)                         -> allowed, no override
 *   proven minor + verified practitioner + reason-> allowed via override
 *   proven minor otherwise                        -> blocked
 *
 * A DOB that is missing server-side is treated as NOT-a-proven-minor: the server
 * cannot prove the user is under 18, the consumer card already steers a no-DOB
 * user to complete their CAQ, and we never hard-block an adult whose DOB row has
 * not been backfilled. The gate blocks only a PROVEN minor.
 */
export function decideAgeGate(
  dateOfBirth: string | null | undefined,
  practitionerManaged: boolean,
  clinicalOverrideReason: string | null | undefined,
  asOf: Date = new Date(),
): ServerAgeDecision {
  const ageYears = computeAgeYears(dateOfBirth, asOf);
  if (ageYears === null || ageYears >= BODY_SCAN_MIN_AGE) {
    return { allowed: true, overrideReason: null, overrodeMinor: false, ageYears };
  }
  const reason = (clinicalOverrideReason ?? '').trim();
  if (practitionerManaged && reason.length > 0) {
    return { allowed: true, overrideReason: reason, overrodeMinor: true, ageYears };
  }
  return { allowed: false, overrideReason: null, overrodeMinor: false, ageYears };
}

/**
 * Reads the scan subject's date_of_birth from profiles and resolves the age
 * gate. The scan subject is the patient in a practitioner-managed scan, else the
 * caller. Fail-CLOSED for a proven minor is impossible to bypass via a DOB read
 * error: on error/timeout the DOB is treated as unknown, which (per decideAgeGate)
 * does NOT block. This is deliberate: we cannot prove a minor without the DOB,
 * and blocking every adult on a transient DB hiccup is the wrong failure mode.
 * The frequency limiter and the entitlement gate still apply independently.
 */
export async function resolveAgeGate(
  sa: SupabaseClient,
  subjectUserId: string,
  practitionerManaged: boolean,
  clinicalOverrideReason: string | null | undefined,
): Promise<ServerAgeDecision> {
  let dob: string | null = null;
  try {
    const { data, error } = await withTimeout(
      sa
        .from('profiles')
        .select('date_of_birth')
        .eq('id', subjectUserId)
        .maybeSingle(),
      MEMBERSHIP_QUERY_TIMEOUT_MS,
      'edge-function.body-scan-analyze.age-dob-lookup',
    );
    if (error) {
      safeLog.warn('body-scan-analyze', 'age gate dob lookup error', {
        user_id: subjectUserId,
        stage: 'resolveAgeGate',
        error: error.message,
      });
    } else {
      dob = (data as { date_of_birth: string | null } | null)?.date_of_birth ?? null;
    }
  } catch (e) {
    safeLog.warn('body-scan-analyze', 'age gate dob lookup exception', {
      user_id: subjectUserId,
      stage: 'resolveAgeGate',
      error: String(e),
    });
  }
  return decideAgeGate(dob, practitionerManaged, clinicalOverrideReason);
}

export interface FrequencyDecision {
  allowed: boolean;
  msUntilAllowed: number;
}

/**
 * Pure 24h frequency decision (spec section 3.2.3). Mirrors decideScanFrequency
 * in the web module. `lastCompletedAt` is the timestamp of the user's most
 * recent completed scan, or null when none exists.
 */
export function decideScanFrequency(
  lastCompletedAt: string | null | undefined,
  asOf: Date = new Date(),
): FrequencyDecision {
  if (!lastCompletedAt) return { allowed: true, msUntilAllowed: 0 };
  const last = new Date(lastCompletedAt);
  if (Number.isNaN(last.getTime())) return { allowed: true, msUntilAllowed: 0 };
  const elapsed = asOf.getTime() - last.getTime();
  if (elapsed >= SCAN_FREQUENCY_WINDOW_MS) return { allowed: true, msUntilAllowed: 0 };
  return { allowed: false, msUntilAllowed: Math.max(0, SCAN_FREQUENCY_WINDOW_MS - elapsed) };
}

/**
 * Resolves the 24h frequency limiter (spec section 3.2.3) for a user: at most
 * one COMPLETED scan per 24h. Reads the most recent completed body_photo_sessions
 * row for the user and applies decideScanFrequency.
 *
 * "completed" is body_photo_sessions.scan_status = 'complete' (the same status
 * the finalize path sets). Completion time is taken from updated_at when present
 * (the row is stamped 'complete' on finalize), falling back to session_date.
 *
 * Fail-OPEN on a read error/timeout: a transient DB issue must not permanently
 * block a user from scanning. The window is small (24h) and the entitlement +
 * age gates still apply, so the blast radius of a fail-open here is one extra
 * scan, not an entitlement bypass.
 */
export async function resolveScanFrequency(
  sa: SupabaseClient,
  userId: string,
  asOf: Date = new Date(),
): Promise<FrequencyDecision> {
  try {
    const { data, error } = await withTimeout(
      sa
        .from('body_photo_sessions')
        .select('updated_at, session_date')
        .eq('user_id', userId)
        .eq('scan_status', 'complete')
        .order('updated_at', { ascending: false, nullsFirst: false })
        .limit(1)
        .maybeSingle(),
      MEMBERSHIP_QUERY_TIMEOUT_MS,
      'edge-function.body-scan-analyze.frequency-lookup',
    );
    if (error) {
      safeLog.warn('body-scan-analyze', 'frequency lookup error', {
        user_id: userId,
        stage: 'resolveScanFrequency',
        error: error.message,
      });
      return { allowed: true, msUntilAllowed: 0 };
    }
    const row = data as { updated_at: string | null; session_date: string | null } | null;
    const lastCompletedAt = row?.updated_at ?? row?.session_date ?? null;
    return decideScanFrequency(lastCompletedAt, asOf);
  } catch (e) {
    safeLog.warn('body-scan-analyze', 'frequency lookup exception', {
      user_id: userId,
      stage: 'resolveScanFrequency',
      error: String(e),
    });
    return { allowed: true, msUntilAllowed: 0 };
  }
}
