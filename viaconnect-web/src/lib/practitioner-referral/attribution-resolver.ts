// Prompt #98 Phase 2: Pure attribution resolver.
//
// Pure-function core that takes pre-fetched signals (clicks +
// practitioner records) and returns an attribution decision. The DB
// wrapper (Phase 2 API route) loads the signals, calls this, and
// persists the result. Keeping the math out of the route lets us
// unit-test every code path without a Supabase client.
//
// Algorithm:
//   1. Validate cookie + visitor_uuid present.
//   2. Filter candidate clicks to those tied to active codes.
//   3. Pick the earliest click as the winner (first-click wins).
//   4. Verify the click is within the 90-day attribution window.
//   5. Resolve the winning referrer's signals.
//   6. Detect trivial self-referral (same practitioner_id).
//   7. Run multi-signal self-referral detection (name fuzzy, address,
//      phone, payment fingerprint - last is deferred to Phase 5).
//   8. Propose 'pending_verification' on a clean attribution or
//      'blocked_self_referral' when blocking_count >= 1.

import {
  ATTRIBUTION_WINDOW_DAYS_DEFAULT,
  levenshteinRatio,
  normalizeAddressParts,
  normalizePhone,
  normalizePracticeName,
  type AttributionStatus,
  type FraudFlagType,
} from './schema-types';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface ClickRecord {
  id: string;
  referral_code_id: string;
  referring_practitioner_id: string;
  code_is_active: boolean;
  clicked_at: string;        // ISO timestamp
}

export interface PractitionerSignals {
  practitioner_id: string;
  user_id: string;
  practice_name: string | null;
  practice_street_address: string | null;
  practice_city: string | null;
  practice_state: string | null;
  practice_postal_code: string | null;
  practice_phone: string | null;
}

export interface SelfReferralSignals {
  blocking_count: number;
  primary_flag_type: FraudFlagType;
  same_user_id: boolean;
  name_similarity: number;
  address_match: boolean;
  phone_match: boolean;
  payment_fingerprint_match: boolean;
}

export interface ResolverInput {
  now: Date;
  visitor_uuid: string | null;
  cookie_code_slug: string | null;
  candidate_clicks: ClickRecord[];
  referrer_signals_lookup: (practitionerId: string) => Promise<PractitionerSignals | null>;
  referred_signals: PractitionerSignals;
  attribution_window_days?: number;
}

export interface ResolverResult {
  attributed: boolean;
  reason?: string;
  winning_click_id?: string;
  referral_code_id?: string;
  referring_practitioner_id?: string;
  days_from_first_click_to_signup?: number;
  proposed_status?: AttributionStatus;
  self_referral_signals?: SelfReferralSignals;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function isWithinAttributionWindow(
  clickedAtIso: string,
  now: Date,
  windowDays: number = ATTRIBUTION_WINDOW_DAYS_DEFAULT,
): boolean {
  const clickedMs = new Date(clickedAtIso).getTime();
  const elapsedDays = Math.floor((now.getTime() - clickedMs) / 86_400_000);
  return elapsedDays >= 0 && elapsedDays <= windowDays;
}

/**
 * First-click wins across active codes. Returns the earliest click
 * tied to an active code, or null when no eligible click exists.
 */
export function pickFirstClickWinner(clicks: ClickRecord[]): ClickRecord | null {
  const eligible = clicks.filter((c) => c.code_is_active);
  if (eligible.length === 0) return null;
  return [...eligible].sort((a, b) => a.clicked_at.localeCompare(b.clicked_at))[0];
}

const SELF_REFERRAL_NAME_THRESHOLD = 0.85;

/**
 * Pure multi-signal self-referral detector. Phase 5 will extend this
 * with a Stripe-backed payment fingerprint check; for Phase 2 we
 * always return false for that signal.
 */
export function detectSelfReferralSignalsPure(
  referrer: PractitionerSignals,
  referred: PractitionerSignals,
): SelfReferralSignals {
  const same_user_id = referrer.user_id === referred.user_id && referrer.user_id !== '';

  const name_similarity = levenshteinRatio(
    normalizePracticeName(referrer.practice_name),
    normalizePracticeName(referred.practice_name),
  );

  const refAddress = normalizeAddressParts({
    street: referrer.practice_street_address,
    city: referrer.practice_city,
    state: referrer.practice_state,
    postal_code: referrer.practice_postal_code,
  });
  const newAddress = normalizeAddressParts({
    street: referred.practice_street_address,
    city: referred.practice_city,
    state: referred.practice_state,
    postal_code: referred.practice_postal_code,
  });
  const address_match = refAddress.length > 0 && refAddress === newAddress;

  // Compare last 10 digits to handle US numbers entered with or without
  // a +1 country code (e.g. "+1 716 555 0100" vs "(716) 555-0100").
  const refPhoneTail = normalizePhone(referrer.practice_phone).slice(-10);
  const newPhoneTail = normalizePhone(referred.practice_phone).slice(-10);
  const phone_match = refPhoneTail.length === 10 && refPhoneTail === newPhoneTail;

  // Phase 5 will replace this with a Stripe customer-payment-method
  // fingerprint comparison.
  const payment_fingerprint_match = false;

  let blocking_count = 0;
  let primary_flag_type: FraudFlagType = 'self_referral_name_match';

  if (same_user_id) {
    blocking_count++;
    primary_flag_type = 'self_referral_name_match';
  }
  if (name_similarity > SELF_REFERRAL_NAME_THRESHOLD) {
    blocking_count++;
    primary_flag_type = 'self_referral_name_match';
  }
  if (address_match) {
    blocking_count++;
    if (primary_flag_type === 'self_referral_name_match' && !same_user_id && name_similarity <= SELF_REFERRAL_NAME_THRESHOLD) {
      primary_flag_type = 'self_referral_address_match';
    }
  }
  if (phone_match) {
    blocking_count++;
    if (primary_flag_type === 'self_referral_name_match' && !same_user_id && name_similarity <= SELF_REFERRAL_NAME_THRESHOLD && !address_match) {
      primary_flag_type = 'self_referral_phone_match';
    }
  }
  if (payment_fingerprint_match) {
    blocking_count++;
  }

  return {
    blocking_count,
    primary_flag_type,
    same_user_id,
    name_similarity,
    address_match,
    phone_match,
    payment_fingerprint_match,
  };
}

// ---------------------------------------------------------------------------
// Resolver
// ---------------------------------------------------------------------------

export async function resolveAttributionFromSignals(input: ResolverInput): Promise<ResolverResult> {
  if (!input.visitor_uuid || !input.cookie_code_slug) {
    return { attributed: false, reason: 'no_cookie_or_visitor_uuid' };
  }

  if (input.candidate_clicks.length === 0) {
    return { attributed: false, reason: 'no_click_for_visitor' };
  }

  const winner = pickFirstClickWinner(input.candidate_clicks);
  if (!winner) {
    return { attributed: false, reason: 'no_active_code_in_clicks' };
  }

  const windowDays = input.attribution_window_days ?? ATTRIBUTION_WINDOW_DAYS_DEFAULT;
  if (!isWithinAttributionWindow(winner.clicked_at, input.now, windowDays)) {
    return { attributed: false, reason: 'attribution_window_expired' };
  }

  // Trivial same-practitioner self-referral.
  if (winner.referring_practitioner_id === input.referred_signals.practitioner_id) {
    return { attributed: false, reason: 'self_referral_same_practitioner' };
  }

  const referrer = await input.referrer_signals_lookup(winner.referring_practitioner_id);
  if (!referrer) {
    return { attributed: false, reason: 'referrer_practitioner_not_found' };
  }

  // Trivial again after the lookup (defensive).
  if (referrer.practitioner_id === input.referred_signals.practitioner_id) {
    return { attributed: false, reason: 'self_referral_same_practitioner' };
  }

  const selfRef = detectSelfReferralSignalsPure(referrer, input.referred_signals);
  const blocked = selfRef.blocking_count > 0;

  const days_from_first_click_to_signup = Math.floor(
    (input.now.getTime() - new Date(winner.clicked_at).getTime()) / 86_400_000,
  );

  return {
    attributed: !blocked,
    reason: blocked ? 'self_referral_blocked' : undefined,
    winning_click_id: winner.id,
    referral_code_id: winner.referral_code_id,
    referring_practitioner_id: winner.referring_practitioner_id,
    days_from_first_click_to_signup,
    proposed_status: blocked ? 'blocked_self_referral' : 'pending_verification',
    self_referral_signals: selfRef,
  };
}
