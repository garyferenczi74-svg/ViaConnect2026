/**
 * Type surface for the outcome timeline lifecycle (Prompt #138e).
 * Mirrors the migration in
 * supabase/migrations/20260425200000_prompt_138e_outcome_timeline.sql.
 */

export type PhaseId = "phase_1_30" | "phase_31_60" | "phase_61_90" | "custom";

export type SectionBlockKind = "section_title" | "intro_paragraph";

export type OutcomeTimelineSurface =
  | "variant_set"
  | "phase"
  | "qualifier"
  | "cta"
  | "section_block";

export type OutcomeTimelineEventKind =
  | "drafted"
  | "precheck_completed"
  | "steve_approved"
  | "steve_revoked"
  | "activated"
  | "deactivated"
  | "archived";

export interface OutcomeVariantSetRow {
  id: string;
  variant_set_code: string;
  variant_set_label: string;
  active: boolean;
  archived: boolean;
  archived_at: string | null;
  created_at: string;
}

export interface OutcomePhaseRow {
  id: string;
  variant_set_id: string;
  phase_id: PhaseId;
  phase_title: string;
  phase_subtitle: string;
  phase_body: string;
  marshall_precheck_session_id: string | null;
  marshall_precheck_passed: boolean;
  steve_approval_at: string | null;
  steve_approval_by: string | null;
  steve_approval_note: string | null;
  active: boolean;
  archived: boolean;
  archived_at: string | null;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface OutcomeQualifierRow {
  id: string;
  variant_set_id: string;
  qualifier_text: string;
  marshall_precheck_session_id: string | null;
  marshall_precheck_passed: boolean;
  steve_approval_at: string | null;
  steve_approval_by: string | null;
  active: boolean;
  archived: boolean;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface OutcomeCtaRow {
  id: string;
  variant_set_id: string;
  cta_lead_text: string;
  cta_label: string;
  cta_destination: string;
  marshall_precheck_session_id: string | null;
  marshall_precheck_passed: boolean;
  steve_approval_at: string | null;
  steve_approval_by: string | null;
  active: boolean;
  archived: boolean;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface OutcomeSectionBlockRow {
  id: string;
  variant_set_id: string;
  block_kind: SectionBlockKind;
  block_text: string;
  marshall_precheck_session_id: string | null;
  marshall_precheck_passed: boolean;
  steve_approval_at: string | null;
  steve_approval_by: string | null;
  active: boolean;
  archived: boolean;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Spec section 4.8: Bio Optimization Score may be referenced as a tracking
 * mechanism but bounded at exactly two mentions across timeline copy
 * (one per applicable phase card per spec §4.3 + §4.4). Used by future
 * editor UI for live count enforcement.
 */
export const SCORE_REFERENCE_BUDGET = 2;
