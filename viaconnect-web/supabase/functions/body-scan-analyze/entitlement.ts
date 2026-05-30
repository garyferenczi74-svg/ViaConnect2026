// =============================================================================
// body-scan-analyze/entitlement.ts
//
// Prompt #169a: Server-side body scan premium gating (spec sections 3 + 10).
//
// Deno-side mirror of the entitlement decision in
// src/lib/body-tracker/entitlement-check.ts. Deno edge functions cannot import
// from the Next.js side, so the pure decision is duplicated here. Keep the two
// in sync.
//
// The premium signal reuses the web membership system: an active row in the
// `memberships` table whose effective tier is above 'free'. This module does
// NOT introduce a new billing source.
//
// The three-point model consumed by the finalize path:
//   premium               => stamp 'premium' + subscription id
//   not premium           => claim the one-time free teaser via
//                            fn_claim_free_body_scan_teaser; if already used,
//                            reject the finalize and DO NOT mark complete
//   practitioner_managed  => bypass the consumer premium check entirely
//
// SECURITY (Prompt #169a review fix): practitioner_managed is NEVER read as a
// trusted client boolean. It is DETERMINED SERVER-SIDE by verifyPractitionerManaged
// (below), which confirms an active practitioner relationship exists between the
// authenticated caller and the supplied patient. Absent a verified relationship
// the request falls through to the normal consumer premium/teaser logic.
// =============================================================================

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { withTimeout } from '../_shared/with-timeout.ts';
import { safeLog } from '../_shared/safe-log.ts';

export type BodyScanPremiumStatus = 'free_teaser' | 'premium' | 'practitioner_managed';

// Minimal membership shape the decision needs. Structurally compatible with the
// memberships row.
export interface MembershipSignal {
  status: string | null;
  tier: string | null;
  tier_id: string | null;
  stripe_subscription_id: string | null;
}

export interface BodyScanEntitlement {
  premium: boolean;
  subscriptionId: string | null;
  practitionerManaged: boolean;
  // 'premium' | 'practitioner_managed' when the scan may finalize without a
  // teaser claim; null when the caller must attempt a free-teaser claim first.
  statusForScan: Exclude<BodyScanPremiumStatus, 'free_teaser'> | null;
}

// Active statuses that count as an entitlement. Matches getActiveMembership /
// buildUserPricingContext on the web side.
const ACTIVE_MEMBERSHIP_STATUSES = new Set(['active', 'trialing', 'gift_active']);
const FREE_TIER = 'free';

// Membership query timeout. Spec section 10 calls for an 8s query timeout.
const MEMBERSHIP_QUERY_TIMEOUT_MS = 8_000;

function effectiveTier(m: MembershipSignal): string {
  return m.tier_id ?? m.tier ?? FREE_TIER;
}

function isPremiumMembership(m: MembershipSignal | null): boolean {
  if (!m) return false;
  if (!m.status || !ACTIVE_MEMBERSHIP_STATUSES.has(m.status)) return false;
  return effectiveTier(m) !== FREE_TIER;
}

/**
 * Pure entitlement decision. Mirrors decideBodyScanEntitlement in
 * src/lib/body-tracker/entitlement-check.ts. Practitioner-managed bypasses the
 * consumer premium check.
 */
export function decideBodyScanEntitlement(
  membership: MembershipSignal | null,
  practitionerManaged: boolean,
): BodyScanEntitlement {
  const premium = isPremiumMembership(membership);
  const subscriptionId = premium ? membership?.stripe_subscription_id ?? null : null;

  if (practitionerManaged) {
    return { premium, subscriptionId, practitionerManaged: true, statusForScan: 'practitioner_managed' };
  }
  if (premium) {
    return { premium: true, subscriptionId, practitionerManaged: false, statusForScan: 'premium' };
  }
  return { premium: false, subscriptionId: null, practitionerManaged: false, statusForScan: null };
}

/**
 * Reads the active membership row for a user (reusing the web membership
 * statuses) and resolves the entitlement. On a query timeout or error the
 * membership is treated as absent (non-premium), which routes a consumer into
 * the free-teaser claim path rather than silently granting premium. The
 * practitioner-managed flag is decided by the caller.
 */
export async function resolveBodyScanEntitlement(
  sa: SupabaseClient,
  userId: string,
  practitionerManaged: boolean,
): Promise<BodyScanEntitlement> {
  let membership: MembershipSignal | null = null;
  try {
    const { data, error } = await withTimeout(
      sa
        .from('memberships')
        .select('status, tier, tier_id, stripe_subscription_id')
        .eq('user_id', userId)
        .in('status', ['active', 'trialing', 'gift_active'])
        .order('current_period_end', { ascending: false, nullsFirst: false })
        .limit(1)
        .maybeSingle(),
      MEMBERSHIP_QUERY_TIMEOUT_MS,
      'edge-function.body-scan-analyze.membership-lookup',
    );
    if (error) {
      safeLog.warn('body-scan-analyze', 'entitlement membership lookup error', {
        user_id: userId,
        stage: 'resolveEntitlement',
        error: error.message,
      });
    } else {
      membership = (data as MembershipSignal | null) ?? null;
    }
  } catch (e) {
    // Fail closed on the premium grant: treat as non-premium so the user falls
    // back to the free-teaser claim path rather than getting premium for free.
    safeLog.warn('body-scan-analyze', 'entitlement membership lookup exception', {
      user_id: userId,
      stage: 'resolveEntitlement',
      error: String(e),
    });
  }
  return decideBodyScanEntitlement(membership, practitionerManaged);
}

/**
 * Atomically claims the one-time free body scan teaser via
 * fn_claim_free_body_scan_teaser. Returns true if this call won the claim,
 * false if the teaser was already used (or on error/timeout, which is treated
 * as "not claimed" so the finalize is rejected rather than granted for free).
 */
export async function claimFreeBodyScanTeaser(
  sa: SupabaseClient,
  userId: string,
): Promise<boolean> {
  try {
    const { data, error } = await withTimeout(
      sa.rpc('fn_claim_free_body_scan_teaser', { p_user_id: userId }),
      MEMBERSHIP_QUERY_TIMEOUT_MS,
      'edge-function.body-scan-analyze.claim-free-teaser',
    );
    if (error) {
      safeLog.warn('body-scan-analyze', 'claim free teaser error', {
        user_id: userId,
        stage: 'claimFreeTeaser',
        error: error.message,
      });
      return false;
    }
    return data === true;
  } catch (e) {
    safeLog.warn('body-scan-analyze', 'claim free teaser exception', {
      user_id: userId,
      stage: 'claimFreeTeaser',
      error: String(e),
    });
    return false;
  }
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
