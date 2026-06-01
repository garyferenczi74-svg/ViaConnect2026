// =============================================================================
// Platinum trial-state derivation (Prompt #169f, Option C / D), pure + testable.
//
// The READ-ONLY signal the body-scan UI consumes to decide whether to show the
// self-trial CTA and to render a current active trial. This is a UX signal ONLY;
// the SECURITY DEFINER functions fn_claim_self_initiated_platinum_trial /
// fn_grant_practitioner_platinum_trial remain the AUTHORITY at claim/grant time,
// so a stale or optimistic eligibility read here can never bypass the in-database
// one-time / Gold / no-active-trial rules.
//
// "ACTIVE trial" mirrors the SQL resolver + the claim functions exactly:
//   converted_at IS NULL AND cancelled_at IS NULL AND expires_at > now().
//
// "ELIGIBLE to start a self-trial" mirrors fn_claim_self_initiated_platinum_trial's
// preconditions, read-side: the user is an active GOLD member (tier_level === 1)
// AND has no prior self_initiated trial in ANY state (one-time-per-lifetime) AND
// has no currently-active trial of EITHER kind. The function still enforces all
// three authoritatively; this is only what the CTA should reflect.
//
// The decision is split from any I/O so it can be unit-tested with real behavior;
// the hook (src/hooks/body-tracker/useTrialState.ts) supplies the rows.
// =============================================================================

// The trial_source of a platinum_trials row.
export type TrialSource = 'self_initiated' | 'practitioner_granted';

// The minimal platinum_trials shape the derivation needs. Structurally compatible
// with a platinum_trials row read through the browser client.
export interface TrialRow {
  trial_source: string | null;
  expires_at: string | null;
  converted_at: string | null;
  cancelled_at: string | null;
}

// The current active trial, surfaced to the UI.
export interface ActiveTrial {
  source: TrialSource;
  // ISO timestamp the trial expires.
  expiresAt: string;
  // Whole days remaining until expiry, never negative. 0 means it expires within
  // the next 24 hours.
  daysRemaining: number;
}

// The full read-only trial-state signal.
export interface TrialState {
  // The user's current ACTIVE trial, or null when none is active.
  activeTrial: ActiveTrial | null;
  // True when the user has used a self_initiated trial before (any state). Lets
  // the UI explain why the self-trial CTA is absent.
  hasUsedSelfTrial: boolean;
  // True when the user MAY start a self-trial (active Gold, no prior self-trial,
  // no active trial). The claim function still enforces this authoritatively.
  eligibleForSelfTrial: boolean;
}

// True when a trial row is ACTIVE as of `asOf` (mirrors the SQL active predicate).
function isActiveTrial(row: TrialRow, asOf: Date): boolean {
  if (row.converted_at != null) return false;
  if (row.cancelled_at != null) return false;
  if (!row.expires_at) return false;
  const exp = new Date(row.expires_at).getTime();
  if (Number.isNaN(exp)) return false;
  return exp > asOf.getTime();
}

// Whole days from `asOf` to the expiry ISO timestamp, floored at 0.
function daysRemaining(expiresAtIso: string, asOf: Date): number {
  const exp = new Date(expiresAtIso).getTime();
  if (Number.isNaN(exp)) return 0;
  const ms = exp - asOf.getTime();
  if (ms <= 0) return 0;
  return Math.floor(ms / (24 * 60 * 60 * 1000));
}

/**
 * Pure trial-state derivation. Given the user's platinum_trials rows, whether the
 * user is an active GOLD member, and the current time, returns the read-only
 * TrialState signal.
 *
 * Active-trial selection mirrors the SQL resolver (ORDER BY expires_at DESC LIMIT
 * 1 over the active predicate): when more than one row is active, the
 * latest-expiring one wins.
 */
export function deriveTrialState(
  rows: TrialRow[],
  isGoldMember: boolean,
  asOf: Date = new Date(),
): TrialState {
  const active = rows
    .filter((r) => isActiveTrial(r, asOf))
    .sort((a, b) => new Date(b.expires_at as string).getTime() - new Date(a.expires_at as string).getTime());

  const top = active[0];
  let activeTrial: ActiveTrial | null = null;
  if (top && (top.trial_source === 'self_initiated' || top.trial_source === 'practitioner_granted')) {
    const expiresAt = top.expires_at as string;
    activeTrial = {
      source: top.trial_source,
      expiresAt,
      daysRemaining: daysRemaining(expiresAt, asOf),
    };
  }

  const hasUsedSelfTrial = rows.some((r) => r.trial_source === 'self_initiated');

  // Read-side mirror of fn_claim_self_initiated_platinum_trial's preconditions:
  // active Gold + no prior self-trial + no active trial of either kind.
  const eligibleForSelfTrial = isGoldMember && !hasUsedSelfTrial && activeTrial === null;

  return { activeTrial, hasUsedSelfTrial, eligibleForSelfTrial };
}
