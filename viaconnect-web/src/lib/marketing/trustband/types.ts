/**
 * Type surface for the homepage trust band lifecycle (Prompt #138c).
 * Mirrors the migration in
 * supabase/migrations/20260425100000_prompt_138c_trust_band.sql.
 */

export type TrustBandSurface = "regulatory_paragraph" | "clinician_card" | "trust_chip" | "testimonial";

export type TrustChipCategory = "credentials" | "compliance" | "scale" | "research" | "other";

export type EndorserRole = "practitioner" | "consumer" | "clinician" | "other";

export type EndorserMaterialConnection =
  | "none"
  | "payment_received"
  | "free_product"
  | "employment"
  | "affiliation"
  | "other_disclosed";

export type TestimonialTypicality = "typical" | "atypical_with_disclosure";

export type TrustBandEventKind =
  | "drafted"
  | "substantiation_linked"
  | "precheck_completed"
  | "steve_approved"
  | "steve_revoked"
  | "legal_reviewed"
  | "activated"
  | "deactivated"
  | "consent_revoked"
  | "archived"
  | "scale_below_threshold";

export interface RegulatoryParagraphRow {
  id: string;
  paragraph_text: string;
  frameworks_named: string[];
  substantiation_refs: string[];
  marshall_precheck_session_id: string | null;
  marshall_precheck_passed: boolean;
  steve_approval_at: string | null;
  steve_approval_by: string | null;
  steve_approval_note: string | null;
  legal_counsel_review_at: string | null;
  legal_counsel_review_by: string | null;
  active: boolean;
  archived: boolean;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClinicianCardRow {
  id: string;
  clinician_display_name: string;
  credential_line: string;
  role_line: string;
  descriptor_sentence: string;
  photo_storage_key: string | null;
  photo_license_storage_key: string | null;
  clinician_consent_storage_key: string | null;
  clinician_consent_received_at: string | null;
  clinician_consent_scope: string | null;
  marshall_precheck_session_id: string | null;
  marshall_precheck_passed: boolean;
  steve_approval_at: string | null;
  steve_approval_by: string | null;
  active: boolean;
  archived: boolean;
  archived_at: string | null;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface TrustChipRow {
  id: string;
  icon_name: string;
  chip_text: string;
  category: TrustChipCategory;
  substantiation_ref: string | null;
  live_data_source: string | null;
  current_measured_value: number | null;
  claimed_threshold: number | null;
  marshall_precheck_session_id: string | null;
  marshall_precheck_passed: boolean;
  steve_approval_at: string | null;
  steve_approval_by: string | null;
  active: boolean;
  archived: boolean;
  archived_at: string | null;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface TestimonialRow {
  id: string;
  endorser_identity: string;
  endorser_role: EndorserRole;
  endorser_material_connection: EndorserMaterialConnection;
  endorser_connection_disclosure_text: string;
  endorser_written_consent_storage_key: string;
  endorser_consent_received_at: string;
  endorser_consent_revoked_at: string | null;
  endorser_photo_storage_key: string | null;
  endorser_photo_consent_storage_key: string | null;
  testimonial_text: string;
  testimonial_date_of_statement: string;
  claims_substantiation_refs: string[];
  typicality_status: TestimonialTypicality;
  typicality_disclosure_text: string | null;
  marshall_precheck_session_id: string | null;
  marshall_precheck_passed: boolean;
  steve_approval_at: string | null;
  steve_approval_by: string | null;
  legal_counsel_review_at: string | null;
  legal_counsel_review_by: string | null;
  active: boolean;
  archived: boolean;
  archived_at: string | null;
  display_order: number;
  created_at: string;
  updated_at: string;
}

/**
 * Trust chip text budget per spec section 4.3 — six words max.
 * Enforced at the database level via the chip_word_count CHECK constraint.
 */
export const TRUST_CHIP_WORD_BUDGET = 6;

/**
 * Clinician card descriptor word budget per spec section 4.2 — 15-25 words.
 */
export const CLINICIAN_DESCRIPTOR_WORD_RANGE = { min: 15, max: 25 } as const;

/**
 * Consent revocation deactivation window per spec section 6.6 — 24 hours.
 */
export const CONSENT_REVOCATION_DEACTIVATION_HOURS = 24;
