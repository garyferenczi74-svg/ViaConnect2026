// Prompt #104 Phase 1: Counterparty identity confidence scoring.
//
// Spec §4.5 identifier hierarchy:
//   tier 1: verified business registration       (highest confidence)
//   tier 2: domain WHOIS (non-private)
//   tier 3: marketplace seller handle + admin confirmation
//   tier 4: bank/payment identity (ex-wholesaler)
//   tier 5: self-identified contact              (lowest)
//
// AI-inferred identity alone is NOT a tier; it never produces a
// counterparty record by itself (spec §3.3). identity_confidence
// scoring caps at 0.49 unless at least one tier-1/2/3 identifier is
// human-verified.

export interface CounterpartyIdentifierBundle {
  verified_business_reg_id: string | null;        // tier 1
  verified_domain: string | null;                  // tier 2 (post WHOIS verification)
  marketplace_handles_admin_confirmed: ReadonlyArray<{
    platform: string;
    handle: string;
    admin_confirmed: boolean;
  }>;
  payment_identity_present: boolean;              // tier 4
  self_identified_only: boolean;                  // tier 5 marker
  ai_inferred_identifier_only: boolean;           // never alone
}

export interface IdentityConfidenceResult {
  confidence: number;                              // 0.00 - 1.00
  highest_tier: 1 | 2 | 3 | 4 | 5 | null;
  human_verified: boolean;
  ai_only_blocked: boolean;
}

export function scoreCounterpartyIdentity(b: CounterpartyIdentifierBundle): IdentityConfidenceResult {
  // AI-only identifier with no human verification: spec §3.3 forbids
  // creating a counterparty record. Surface a blocking signal.
  const tier3Confirmed = b.marketplace_handles_admin_confirmed.some((h) => h.admin_confirmed);
  const humanVerified = !!b.verified_business_reg_id || !!b.verified_domain || tier3Confirmed || b.payment_identity_present;
  if (b.ai_inferred_identifier_only && !humanVerified) {
    return { confidence: 0, highest_tier: null, human_verified: false, ai_only_blocked: true };
  }

  if (b.verified_business_reg_id) {
    return { confidence: 0.95, highest_tier: 1, human_verified: true, ai_only_blocked: false };
  }
  if (b.verified_domain) {
    return { confidence: 0.85, highest_tier: 2, human_verified: true, ai_only_blocked: false };
  }
  if (tier3Confirmed) {
    return { confidence: 0.75, highest_tier: 3, human_verified: true, ai_only_blocked: false };
  }
  if (b.payment_identity_present) {
    return { confidence: 0.60, highest_tier: 4, human_verified: true, ai_only_blocked: false };
  }
  if (b.self_identified_only) {
    // Self-identified, no verification: cap at 0.49 per spec §3.3.
    return { confidence: 0.40, highest_tier: 5, human_verified: false, ai_only_blocked: false };
  }
  return { confidence: 0, highest_tier: null, human_verified: false, ai_only_blocked: false };
}

// Dedup-merge logic: tier-1 OR tier-2 identifier match -> automatic
// merge candidate; tier-3 alone -> admin review required; tier-4/5 or
// AI-similarity -> never automatic.

export interface MergeRecommendation {
  recommendation: 'auto_merge' | 'admin_review_required' | 'do_not_auto_merge';
  reason: string;
}

export function recommendCounterpartyMerge(args: {
  a: CounterpartyIdentifierBundle;
  b: CounterpartyIdentifierBundle;
}): MergeRecommendation {
  const aReg = args.a.verified_business_reg_id;
  const bReg = args.b.verified_business_reg_id;
  if (aReg && bReg && aReg === bReg) {
    return { recommendation: 'auto_merge', reason: 'tier_1_business_reg_match' };
  }
  const aDom = args.a.verified_domain;
  const bDom = args.b.verified_domain;
  if (aDom && bDom && aDom.toLowerCase() === bDom.toLowerCase()) {
    return { recommendation: 'auto_merge', reason: 'tier_2_domain_match' };
  }
  const aHandles = new Set(args.a.marketplace_handles_admin_confirmed.filter((h) => h.admin_confirmed).map((h) => `${h.platform}:${h.handle.toLowerCase()}`));
  const bHandles = args.b.marketplace_handles_admin_confirmed.filter((h) => h.admin_confirmed).map((h) => `${h.platform}:${h.handle.toLowerCase()}`);
  if (bHandles.some((h) => aHandles.has(h))) {
    return { recommendation: 'admin_review_required', reason: 'tier_3_handle_match' };
  }
  return { recommendation: 'do_not_auto_merge', reason: 'no_strong_identifier_overlap' };
}
