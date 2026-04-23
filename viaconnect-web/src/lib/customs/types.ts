// Prompt #114 P1: Customs shared type model.
//
// Mirrors the SQL enums in 20260424000200_prompt_114_customs_schema.sql.
// Pure TypeScript so the state machines, business-day math, and MSRP
// lookup can be unit-tested without a live DB, following the
// src/lib/legal/types.ts convention from #104.

// ---------------------------------------------------------------------------
// Recordation lifecycle
// ---------------------------------------------------------------------------

export const CUSTOMS_RECORDATION_TYPES = ['trademark', 'copyright'] as const;
export type CustomsRecordationType = (typeof CUSTOMS_RECORDATION_TYPES)[number];

export const CUSTOMS_RECORDATION_STATUSES = [
  'draft',
  'pending_fee',
  'under_review',
  'active',
  'grace_period',
  'expired',
  'withdrawn',
] as const;
export type CustomsRecordationStatus = (typeof CUSTOMS_RECORDATION_STATUSES)[number];

export const ACTIVE_RECORDATION_STATUSES: ReadonlySet<CustomsRecordationStatus> = new Set([
  'pending_fee',
  'under_review',
  'active',
  'grace_period',
]);

export const TERMINAL_RECORDATION_STATUSES: ReadonlySet<CustomsRecordationStatus> = new Set([
  'expired',
  'withdrawn',
]);

// ---------------------------------------------------------------------------
// Detention lifecycle (7 US federal business-day clock under 19 C.F.R. § 133.21)
// ---------------------------------------------------------------------------

export const CUSTOMS_DETENTION_STATUSES = [
  'notice_received',
  'response_required',
  'importer_responded',
  'rightsholder_assist',
  'sample_provided',
  'closed_released',
  'escalated_seizure',
] as const;
export type CustomsDetentionStatus = (typeof CUSTOMS_DETENTION_STATUSES)[number];

export const OPEN_DETENTION_STATUSES: ReadonlySet<CustomsDetentionStatus> = new Set([
  'notice_received',
  'response_required',
  'importer_responded',
  'rightsholder_assist',
  'sample_provided',
]);

export const CUSTOMS_DETERMINATIONS = [
  'authentic',
  'not_authentic',
  'unable_to_determine',
] as const;
export type CustomsDetermination = (typeof CUSTOMS_DETERMINATIONS)[number];

// ---------------------------------------------------------------------------
// Seizure lifecycle (30 US federal business-day CBP disclosure clock)
// ---------------------------------------------------------------------------

export const CUSTOMS_SEIZURE_STATUSES = [
  'seized',
  'forfeiture_initiated',
  'awaiting_disclosure',
  'disclosure_received',
  'destroyed',
  'donated',
  'mark_obliterated',
  'released_unusual',
] as const;
export type CustomsSeizureStatus = (typeof CUSTOMS_SEIZURE_STATUSES)[number];

// ---------------------------------------------------------------------------
// Training
// ---------------------------------------------------------------------------

export const CUSTOMS_TRAINING_FORMATS = [
  'in_person',
  'virtual_webinar',
  'recorded_module',
] as const;
export type CustomsTrainingFormat = (typeof CUSTOMS_TRAINING_FORMATS)[number];

export const CUSTOMS_TRAINING_STATUSES = [
  'requested',
  'vetting',
  'scheduled',
  'delivered',
  'declined',
] as const;
export type CustomsTrainingStatus = (typeof CUSTOMS_TRAINING_STATUSES)[number];

// ---------------------------------------------------------------------------
// Customs activity types (scoped to customs events only; does NOT extend
// the #104 legal_case_bucket enum)
// ---------------------------------------------------------------------------

export const CUSTOMS_CASE_ACTIVITY_TYPES = [
  'customs_detention',
  'customs_seizure',
  'iprs_unauthorized',
  'e_allegation',
  'moiety_claim',
] as const;
export type CustomsCaseActivityType = (typeof CUSTOMS_CASE_ACTIVITY_TYPES)[number];

// ---------------------------------------------------------------------------
// Authentication guides
// ---------------------------------------------------------------------------

export const CUSTOMS_GUIDE_STATUSES = [
  'draft',
  'counsel_review',
  'submitted_to_cbp',
  'acknowledged',
  'retired',
] as const;
export type CustomsGuideStatus = (typeof CUSTOMS_GUIDE_STATUSES)[number];

export const CUSTOMS_GUIDE_SECTION_TYPES = [
  'brand_intro',
  'mark_specimen',
  'genuine_characteristics',
  'packaging_features',
  'authorized_distribution',
  'known_variants',
  'contact_points',
] as const;
export type CustomsGuideSectionType = (typeof CUSTOMS_GUIDE_SECTION_TYPES)[number];

export const GUIDE_SECTION_DISPLAY_ORDER: readonly CustomsGuideSectionType[] = [
  'brand_intro',
  'mark_specimen',
  'genuine_characteristics',
  'packaging_features',
  'authorized_distribution',
  'known_variants',
  'contact_points',
];

// ---------------------------------------------------------------------------
// IPRS monitoring
// ---------------------------------------------------------------------------

export const CUSTOMS_IPRS_RESULT_STATUSES = [
  'new',
  'requires_review',
  'confirmed_unauthorized',
  'confirmed_authorized',
  'dismissed',
  'case_opened',
] as const;
export type CustomsIprsResultStatus = (typeof CUSTOMS_IPRS_RESULT_STATUSES)[number];

// ---------------------------------------------------------------------------
// e-Allegations (named default; Gary locked posture 2026-04-23)
// ---------------------------------------------------------------------------

export const CUSTOMS_E_ALLEGATION_POSTURES = ['named', 'anonymous'] as const;
export type CustomsEAllegationPosture = (typeof CUSTOMS_E_ALLEGATION_POSTURES)[number];

export const CUSTOMS_E_ALLEGATION_STATUSES = [
  'draft',
  'counsel_review',
  'submitted',
  'acknowledged',
  'closed',
] as const;
export type CustomsEAllegationStatus = (typeof CUSTOMS_E_ALLEGATION_STATUSES)[number];

// ---------------------------------------------------------------------------
// Moiety (19 U.S.C. § 1619) — narrow access (admin + ceo + cfo only per Q6)
// ---------------------------------------------------------------------------

export const CUSTOMS_MOIETY_CLAIM_STATUSES = [
  'forecast',
  'filed',
  'awarded',
  'denied',
  'withdrawn',
] as const;
export type CustomsMoietyClaimStatus = (typeof CUSTOMS_MOIETY_CLAIM_STATUSES)[number];

export const MOIETY_DEFAULT_PERCENTAGE = 25.0;
export const MOIETY_CAP_CENTS = 25_000_000; // $250,000 hard cap

// ---------------------------------------------------------------------------
// Fees
// ---------------------------------------------------------------------------

export const CUSTOMS_FEE_TYPES = [
  'recordation_initial',
  'recordation_renewal',
  'other',
] as const;
export type CustomsFeeType = (typeof CUSTOMS_FEE_TYPES)[number];

export const RECORDATION_INITIAL_FEE_PER_IC_CENTS = 19_000; // $190 per IC
export const RECORDATION_RENEWAL_FEE_PER_IC_CENTS = 8_000;  // $80 per IC
export const CEO_APPROVAL_FEE_THRESHOLD_CENTS = 100_000;    // $1,000 (Q5 locked 2026-04-23)

// ---------------------------------------------------------------------------
// Counsel reviews
// ---------------------------------------------------------------------------

export const CUSTOMS_COUNSEL_REVIEW_KINDS = [
  'authentication_determination',
  'e_allegation',
  'recordation',
  'authentication_guide',
  'moiety_claim',
  'training_deck',
] as const;
export type CustomsCounselReviewKind = (typeof CUSTOMS_COUNSEL_REVIEW_KINDS)[number];

export const CUSTOMS_COUNSEL_REVIEW_STATUSES = [
  'pending',
  'approved',
  'rejected',
  'changes_requested',
] as const;
export type CustomsCounselReviewStatus = (typeof CUSTOMS_COUNSEL_REVIEW_STATUSES)[number];

// ---------------------------------------------------------------------------
// SLA thresholds (US federal business days)
// ---------------------------------------------------------------------------

export const DETENTION_RESPONSE_BD = 7;           // 19 C.F.R. § 133.21(b)(2)(i)
export const DETENTION_MAX_CALENDAR_DAYS = 30;    // 19 C.F.R. § 133.21(b)(4)
export const SEIZURE_DISCLOSURE_BD = 30;          // 19 C.F.R. § 133.21(e)
export const RECORDATION_RENEWAL_ALERT_DAYS = [120, 60, 30] as const;
export const RECORDATION_GRACE_DAYS = 90;

// ---------------------------------------------------------------------------
// UI countdown thresholds
// ---------------------------------------------------------------------------

export type CountdownState = 'healthy' | 'caution' | 'critical' | 'grace' | 'missed';

export function detentionCountdownState(businessDaysRemaining: number): CountdownState {
  if (businessDaysRemaining < 0) return 'missed';
  if (businessDaysRemaining === 0) return 'critical';
  if (businessDaysRemaining <= 2) return 'critical';
  if (businessDaysRemaining <= 6) return 'caution';
  return 'healthy';
}

export function recordationRenewalCountdownState(daysToExpiration: number): CountdownState {
  if (daysToExpiration < 0) {
    if (daysToExpiration >= -RECORDATION_GRACE_DAYS) return 'grace';
    return 'missed';
  }
  if (daysToExpiration <= 30) return 'critical';
  if (daysToExpiration <= 60) return 'caution';
  return 'healthy';
}

// ---------------------------------------------------------------------------
// Marshall AI disclaimer (kept in sync with SQL DOMAIN marshall_ai_disclaimer)
// ---------------------------------------------------------------------------

export const MARSHALL_AI_DISCLAIMER_TEXT =
  'Claude-drafted by Marshall. Requires licensed IP counsel review before submission to CBP. FarmCeutica Wellness LLC makes no legal representation via this document.';
