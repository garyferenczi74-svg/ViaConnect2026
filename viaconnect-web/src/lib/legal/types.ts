// Prompt #104 Phase 1: Legal-ops shared type model.
//
// Mirrors the SQL enums in 20260423000020_legal_investigation_tables.sql
// + 20260423000030_legal_enforcement_tables.sql + counsel/settlement
// migrations. Pure TypeScript so the state machine + classifiers can
// be unit-tested without a live DB.

// ---------------------------------------------------------------------------
// Case lifecycle
// ---------------------------------------------------------------------------

export const LEGAL_CASE_STATES = [
  'intake',
  'triage_ai',
  'pending_human_triage',
  'pending_medical_director_review',
  'classified',
  'active_enforcement',
  'resolved_successful',
  'resolved_unsuccessful',
  'escalated_to_outside_counsel',
  'escalated_to_litigation',
  'closed_no_action',
  'archived',
] as const;
export type LegalCaseState = (typeof LEGAL_CASE_STATES)[number];

export const TERMINAL_LEGAL_STATES: ReadonlySet<LegalCaseState> = new Set([
  'resolved_successful',
  'closed_no_action',
  'archived',
]);

// ---------------------------------------------------------------------------
// Bucket taxonomy (4 + unclassified)
// ---------------------------------------------------------------------------

export const LEGAL_CASE_BUCKETS = [
  'unclassified',
  'map_only',
  'gray_market_no_differences',
  'gray_market_material_differences',
  'counterfeit',
] as const;
export type LegalCaseBucket = (typeof LEGAL_CASE_BUCKETS)[number];

export const ENFORCEABLE_BUCKETS: ReadonlySet<LegalCaseBucket> = new Set([
  'gray_market_material_differences',
  'counterfeit',
]);

// ---------------------------------------------------------------------------
// Priority + roles
// ---------------------------------------------------------------------------

export const LEGAL_CASE_PRIORITIES = ['p1_critical', 'p2_high', 'p3_normal', 'p4_low'] as const;
export type LegalCasePriority = (typeof LEGAL_CASE_PRIORITIES)[number];

// profiles.role values that may participate in legal ops. The DB
// constraint extension lives in migration 20260423000010.
export const LEGAL_OPS_ROLES = [
  'admin',
  'compliance_officer',     // Steve Rica (also legal_ops)
  'legal_ops',              // legal-ops dedicated role
  'cfo',                    // Domenic Romeo
  'ceo',                    // Gary Ferenczi
  'medical_director',       // Dr. Fadi Dagher
] as const;
export type LegalOpsRole = (typeof LEGAL_OPS_ROLES)[number];

// ---------------------------------------------------------------------------
// Evidence
// ---------------------------------------------------------------------------

export const EVIDENCE_ARTIFACT_TYPES = [
  'page_screenshot',
  'html_snapshot',
  'pricing_capture',
  'whois_lookup',
  'marketplace_seller_profile',
  'trademark_usage_capture',
  'test_purchase_receipt',
  'product_photograph',
  'lab_report',
  'customer_complaint',
  'platform_decision_doc',
  'counterparty_correspondence',
  'other',
] as const;
export type EvidenceArtifactType = (typeof EVIDENCE_ARTIFACT_TYPES)[number];

// ---------------------------------------------------------------------------
// Counterparties
// ---------------------------------------------------------------------------

export const COUNTERPARTY_TYPES = [
  'individual', 'sole_proprietor', 'llc', 'corp', 'foreign_entity', 'unknown',
] as const;
export type CounterpartyType = (typeof COUNTERPARTY_TYPES)[number];

// ---------------------------------------------------------------------------
// Enforcement actions
// ---------------------------------------------------------------------------

export const ENFORCEMENT_ACTION_TYPES = [
  'cease_and_desist_letter',
  'dmca_takedown',
  'marketplace_ip_complaint',
  'marketplace_tos_complaint',
  'refusal_to_sell',
  'wholesale_account_suspension',
  'customs_referral',
  'information_request',
  'follow_up',
] as const;
export type EnforcementActionType = (typeof ENFORCEMENT_ACTION_TYPES)[number];

export const ENFORCEMENT_ACTION_STATUSES = [
  'draft',
  'pending_approval',
  'approved_awaiting_send',
  'sent',
  'acknowledged',
  'response_received',
  'complied',
  'disputed',
  'counter_notice_received',
  'escalated',
  'withdrawn',
] as const;
export type EnforcementActionStatus = (typeof ENFORCEMENT_ACTION_STATUSES)[number];

// ---------------------------------------------------------------------------
// Counsel + settlements
// ---------------------------------------------------------------------------

export const COUNSEL_ENGAGEMENT_STATUSES = [
  'proposed',
  'pending_cfo_approval',
  'pending_ceo_approval',
  'approved',
  'active',
  'completed',
  'withdrawn',
  'rejected',
] as const;
export type CounselEngagementStatus = (typeof COUNSEL_ENGAGEMENT_STATUSES)[number];

export const SETTLEMENT_RELEASE_SCOPES = [
  'specific_claim', 'all_claims', 'global_release',
] as const;
export type SettlementReleaseScope = (typeof SETTLEMENT_RELEASE_SCOPES)[number];

export const SETTLEMENT_APPROVAL_TIERS = [
  'compliance_only',
  'compliance_plus_cfo',
  'compliance_plus_cfo_plus_ceo',
] as const;
export type SettlementApprovalTier = (typeof SETTLEMENT_APPROVAL_TIERS)[number];

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

export const TEMPLATE_FAMILIES = [
  'cd_counterfeit',
  'cd_material_differences',
  'cd_distribution_breach',
  'cd_map_policy_breach',
  'dmca_takedown_amazon',
  'dmca_takedown_etsy',
  'dmca_takedown_ebay',
  'marketplace_complaint_amazon_brand_registry',
  'marketplace_complaint_etsy_ip',
  'marketplace_complaint_ebay_vero',
  'marketplace_complaint_tiktok_ip_protection',
  'marketplace_complaint_shopify_dmca',
  'marketplace_complaint_walmart_ip',
] as const;
export type TemplateFamily = (typeof TEMPLATE_FAMILIES)[number];

export const TEMPLATE_STATUSES = ['draft', 'active', 'retired'] as const;
export type TemplateStatus = (typeof TEMPLATE_STATUSES)[number];
