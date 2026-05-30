// =============================================================================
// Body Scan age gate + frequency limiter decisions
// (Prompt #169b, spec section 4 age gate + section 3.2.3 frequency limiter).
//
// Pure, I/O-free decision logic for:
//   * the under-18 age gate (section 4) and its practitioner clinical override
//     (section 4.3),
//   * the at-most-one-completed-scan-per-24h frequency limiter (section 3.2.3),
//   * the "slow down" advisory banner that appears at 3+ scan attempts in 7 days.
//
// Extracted from the React components and the edge function so the decisions can
// be unit-tested as REAL behavior. The project's vitest config runs
// node-environment .test.ts only (see vitest.config.ts), so the testable contract
// lives here, not in JSX or Deno.
//
// AUTHORITY: like scan-gate.ts, the CLIENT consumes these for UX only. The
// authoritative enforcement is server-side in the body-scan-analyze edge
// function (supabase/functions/body-scan-analyze/index.ts), which re-derives the
// age from profiles.date_of_birth and re-queries body_photo_sessions before it
// will persist or finalize a scan. The Deno side re-implements the same pure
// decisions (Deno cannot import from the Next.js tree); keep the two in sync.
//
// DOB SOURCE: profiles.date_of_birth (ISO date string 'YYYY-MM-DD' or null),
// confirmed canonical in src/lib/ai/context-loader.ts and the profile page.
// =============================================================================

// The minimum age (inclusive) at which the Body Scan is offered.
export const BODY_SCAN_MIN_AGE = 18;

// Frequency limiter window: at most one completed scan per this many hours.
export const SCAN_FREQUENCY_WINDOW_HOURS = 24;
export const SCAN_FREQUENCY_WINDOW_MS = SCAN_FREQUENCY_WINDOW_HOURS * 60 * 60 * 1000;

// "Slow down" advisory: triggers at this many scan attempts within the window.
export const SLOW_DOWN_ATTEMPT_THRESHOLD = 3;
export const SLOW_DOWN_WINDOW_DAYS = 7;
export const SLOW_DOWN_WINDOW_MS = SLOW_DOWN_WINDOW_DAYS * 24 * 60 * 60 * 1000;

/**
 * Computes whole-years age from a date of birth as of `asOf`.
 *
 * Returns null when the DOB is missing or unparseable (a missing DOB is NOT a
 * zero age; callers must treat null distinctly, e.g. prompt the user to complete
 * their CAQ rather than block them as a minor).
 *
 * Uses calendar-correct birthday math (decrement a year when the current
 * month/day is before the birth month/day) rather than a 365.25-day division, so
 * a user exactly on their 18th birthday reads as 18, not 17.
 *
 * TIMEZONE: profiles.date_of_birth is a date-only calendar value ('YYYY-MM-DD').
 * `new Date('YYYY-MM-DD')` parses as UTC midnight, which in a negative-offset
 * timezone shifts the local calendar day back one (e.g. UTC-6 reads 2008-05-30
 * as 2008-05-29), introducing an off-by-one near birthdays. We therefore parse a
 * pure date-only string by its literal Y/M/D components and compare against
 * asOf's local calendar date. Full timestamps fall back to Date parsing.
 */
export function computeAgeYears(
  dateOfBirth: string | null | undefined,
  asOf: Date = new Date(),
): number | null {
  if (!dateOfBirth) return null;

  let by: number, bm: number, bd: number;
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateOfBirth.trim());
  if (dateOnly) {
    // Literal calendar components; no timezone shift.
    by = Number(dateOnly[1]);
    bm = Number(dateOnly[2]); // 1-12
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
  // Guard against a future DOB producing a negative age.
  return age < 0 ? 0 : age;
}

// The age-gate outcome the dashboard card discriminates on.
//   'allowed'       18+ : show the normal Body Scan entry.
//   'under_age'     under 18 : hide the entry, show the "available at 18" card.
//   'dob_missing'   no DOB on file : prompt the user to complete CAQ Phase 1.
export type AgeGateStatus = 'allowed' | 'under_age' | 'dob_missing';

export interface AgeGateDecision {
  status: AgeGateStatus;
  // Whole-years age when derivable; null when the DOB is missing/invalid.
  ageYears: number | null;
}

/**
 * Age-gate decision (spec section 4) for the consumer self-scan flow.
 *
 *   DOB missing/invalid           -> 'dob_missing' (prompt CAQ Phase 1)
 *   age < BODY_SCAN_MIN_AGE       -> 'under_age'   (hide entry, show wait card)
 *   age >= BODY_SCAN_MIN_AGE      -> 'allowed'
 *
 * The practitioner clinical override (section 4.3) is intentionally NOT modeled
 * here: it is a server-only bypass (see decideAgeGateWithOverride) honored at
 * finalize. The consumer-facing dashboard card never self-grants an override.
 */
export function decideAgeGate(
  dateOfBirth: string | null | undefined,
  asOf: Date = new Date(),
): AgeGateDecision {
  const ageYears = computeAgeYears(dateOfBirth, asOf);
  if (ageYears === null) return { status: 'dob_missing', ageYears: null };
  if (ageYears < BODY_SCAN_MIN_AGE) return { status: 'under_age', ageYears };
  return { status: 'allowed', ageYears };
}

// Server-side age-gate evaluation INCLUDING the practitioner clinical override.
export interface AgeOverrideContext {
  // True only when verifyPractitionerManaged confirmed an active practitioner
  // relationship for this scan subject (server-derived; never a client boolean).
  practitionerManaged: boolean;
  // The clinical_override_reason supplied for this scan, if any. Mandatory when
  // overriding a minor; a blank/whitespace-only reason does NOT override.
  clinicalOverrideReason: string | null | undefined;
}

export interface ServerAgeDecision {
  // True when the scan may proceed past the age gate.
  allowed: boolean;
  // When allowed via the override path (a minor with a verified practitioner +
  // reason), this is the trimmed reason to record on
  // body_photo_sessions.clinical_override_reason. Null otherwise.
  overrideReason: string | null;
  // Whether the override path was the reason this minor was allowed.
  overrodeMinor: boolean;
  ageYears: number | null;
}

/**
 * Server age-gate decision (spec section 4 + 4.3).
 *
 *   18+ (or DOB missing*)              -> allowed, no override
 *   minor + verified practitioner +    -> allowed via override; record reason
 *     non-blank reason
 *   minor + no verified practitioner   -> blocked
 *   minor + practitioner + blank reason-> blocked (reason is mandatory)
 *
 * (*) A missing DOB server-side is treated as NOT-a-minor for this gate: the
 * server cannot prove the user is under 18, and the consumer-side card already
 * steers a no-DOB user to complete their CAQ before a scan is offered. The gate
 * blocks only a PROVEN minor. This mirrors the fail-direction the spec wants:
 * never silently complete a scan for a known minor, but do not hard-block adults
 * whose DOB row has not yet been backfilled.
 */
export function decideAgeGateWithOverride(
  dateOfBirth: string | null | undefined,
  override: AgeOverrideContext,
  asOf: Date = new Date(),
): ServerAgeDecision {
  const ageYears = computeAgeYears(dateOfBirth, asOf);

  // Not a proven minor (adult, or DOB unknown): allowed, no override needed.
  if (ageYears === null || ageYears >= BODY_SCAN_MIN_AGE) {
    return { allowed: true, overrideReason: null, overrodeMinor: false, ageYears };
  }

  // Proven minor: only a verified practitioner WITH a non-blank reason may override.
  const reason = (override.clinicalOverrideReason ?? '').trim();
  if (override.practitionerManaged && reason.length > 0) {
    return { allowed: true, overrideReason: reason, overrodeMinor: true, ageYears };
  }

  return { allowed: false, overrideReason: null, overrodeMinor: false, ageYears };
}

// 24h frequency limiter (spec section 3.2.3).
export interface FrequencyDecision {
  // True when a new completed scan is allowed (no completed scan within the
  // window, or no prior completed scan at all).
  allowed: boolean;
  // Whole milliseconds until the window clears, when blocked; 0 when allowed.
  msUntilAllowed: number;
}

/**
 * Frequency-limiter decision (spec section 3.2.3): at most one COMPLETED scan
 * per 24h per user.
 *
 *   no prior completed scan                 -> allowed
 *   last completed scan >= 24h ago          -> allowed
 *   last completed scan < 24h ago           -> blocked (with time remaining)
 *
 * `lastCompletedAt` is the timestamp of the user's most recent completed scan
 * (null/undefined when none exists). An unparseable timestamp is treated as "no
 * prior scan" (allowed) rather than blocking indefinitely.
 */
export function decideScanFrequency(
  lastCompletedAt: string | Date | null | undefined,
  asOf: Date = new Date(),
): FrequencyDecision {
  if (!lastCompletedAt) return { allowed: true, msUntilAllowed: 0 };
  const last = lastCompletedAt instanceof Date ? lastCompletedAt : new Date(lastCompletedAt);
  if (Number.isNaN(last.getTime())) return { allowed: true, msUntilAllowed: 0 };

  const elapsed = asOf.getTime() - last.getTime();
  if (elapsed >= SCAN_FREQUENCY_WINDOW_MS) return { allowed: true, msUntilAllowed: 0 };
  // A future-dated last scan (clock skew) blocks for the full window from now.
  const remaining = SCAN_FREQUENCY_WINDOW_MS - elapsed;
  return { allowed: false, msUntilAllowed: Math.max(0, remaining) };
}

/**
 * "Slow down" advisory trigger (spec section 3.2.3): true when the user has made
 * SLOW_DOWN_ATTEMPT_THRESHOLD (3) or more scan attempts within the trailing
 * SLOW_DOWN_WINDOW_DAYS (7). Informational only; never blocks.
 *
 * `attemptTimestamps` are the created-at timestamps of recent scan attempts
 * (any status). Unparseable entries are ignored.
 */
export function shouldShowSlowDownBanner(
  attemptTimestamps: Array<string | Date | null | undefined>,
  asOf: Date = new Date(),
): boolean {
  const cutoff = asOf.getTime() - SLOW_DOWN_WINDOW_MS;
  let count = 0;
  for (const ts of attemptTimestamps) {
    if (!ts) continue;
    const d = ts instanceof Date ? ts : new Date(ts);
    const t = d.getTime();
    if (Number.isNaN(t)) continue;
    if (t >= cutoff && t <= asOf.getTime()) count += 1;
  }
  return count >= SLOW_DOWN_ATTEMPT_THRESHOLD;
}
