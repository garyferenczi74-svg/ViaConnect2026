/**
 * Type surface for the Marshall Rebuttal Drafter (Prompt #123).
 * Mirrors the migration in
 * supabase/migrations/20260425400000_prompt_123_marshall_rebuttal_drafter.sql.
 */

export type AppealClaimType =
  | "dispute_attribution"
  | "dispute_interpretation"
  | "already_remediated"
  | "other";

export type AppealSubClaimType =
  | "identity_mismatch"
  | "policy_disagreement"
  | "evidence_insufficient"
  | "already_cured"
  | "context_missing"
  | "good_faith_misinterpretation"
  | "procedural_objection"
  | "other";

export type AppealRecommendation =
  | "uphold"
  | "reverse"
  | "partial"
  | "request_more_info"
  | "manual_review"
  | "escalate";

export type AppealDecisionKind =
  | "approved_as_drafted"
  | "modified"
  | "reviewed_manually"
  | "requested_more_info"
  | "escalated";

export type AppealModificationReasonCode =
  | "marshall_missed_key_evidence"
  | "marshall_misapplied_rule"
  | "marshall_tone_inappropriate"
  | "jurisdictional_nuance"
  | "practitioner_relationship_context"
  | "legal_counsel_input"
  | "factual_error_in_template"
  | "pattern_requires_different_handling"
  | "other_with_note";

export type DriftLabel =
  | "none"
  | "benign"
  | "substantive_disclosure_change"
  | "substantive_claim_addition"
  | "substantive_superlative_addition"
  | "substantive_sku_change"
  | "substantive_other";

export type GoodFaithSignal = "good_faith" | "neutral" | "bad_faith";

export interface DriftReport {
  has_receipt: boolean;
  receipt_id: string | null;
  receipt_issued_at: string | null;
  receipt_expired: boolean;
  jaccard_similarity: number | null;
  drift_label: DriftLabel;
  additions_excerpt: string[];
  removals_excerpt: string[];
  good_faith_signal: GoodFaithSignal;
  recommendation_adjustment: string;
}

export interface AppealAnalysisRow {
  id: string;
  appeal_id: string;
  claim_type: AppealClaimType;
  sub_claim_type: AppealSubClaimType;
  recommendation: AppealRecommendation;
  confidence: number;
  rationale: Array<{ code: string; description: string }>;
  drift_report: DriftReport;
  pattern_report: Record<string, unknown> | null;
  suggested_template_id: string | null;
  requires_dual_approval: boolean;
  dual_approvers: string[] | null;
  analyzer_version: string;
  created_at: string;
}

export interface RebuttalTemplateRow {
  id: string;
  template_code: string;
  disposition: "uphold" | "reverse" | "partial" | "request_more_info" | "escalation_notice";
  claim_type: AppealClaimType | "any";
  jurisdiction: "US" | "CA" | "EU" | "UK" | "AU" | "generic";
  language: string;
  version: number;
  body: string;
  required_slots: string[];
  active: boolean;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
}

export interface AppealDraftRow {
  id: string;
  appeal_id: string;
  analysis_id: string;
  template_id: string;
  template_version: number;
  version: number;
  draft_text: string;
  augmentation_used: boolean;
  self_check_passed: boolean;
  self_check_findings: Array<{ ruleId: string; severity: string; message: string }> | null;
  generated_at: string;
  generated_by: string;
  superseded_by: string | null;
}

export interface AppealDecisionRow {
  id: string;
  appeal_id: string;
  analysis_id: string;
  final_draft_id: string | null;
  decision_kind: AppealDecisionKind;
  modification_reason_code: AppealModificationReasonCode | null;
  modification_note: string | null;
  diff_summary: { kind: "minor" | "substantive"; chars_changed: number } | null;
  decided_by: string;
  decided_at: string;
  second_approver: string | null;
  second_approver_at: string | null;
  second_approver_note: string | null;
  final_response_sha256: string | null;
  sent_at: string | null;
}

/**
 * Slot vocabulary per spec section 6.2. Standardized across templates so
 * the deterministic slot filler can populate from structured analyzer data.
 */
export const TEMPLATE_SLOT_NAMES = [
  "practitioner_name",
  "practitioner_display_name",
  "notice_id",
  "finding_id",
  "rule_id",
  "rule_description",
  "citation",
  "evidence_reference",
  "evidence_summary",
  "remediation_action",
  "appeal_outcome",
  "receipt_id",
  "receipt_issued_at",
  "drift_description",
  "strike_count_current",
  "strike_count_window_days",
  "sla_original_due",
  "sla_new_due",
  "signed_by",
  "signed_title",
] as const;

export type TemplateSlotName = (typeof TEMPLATE_SLOT_NAMES)[number];

export const ANALYZER_VERSION = "1.0.0";
export const SELF_CHECK_RECURSION_CAP = 2;
export const STEVE_TITLE = "Compliance Officer, FarmCeutica Wellness LLC";
