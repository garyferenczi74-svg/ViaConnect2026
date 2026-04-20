// Prompt #103 Phase 3: Brand Identity Compliance Engine shared types.
//
// Used by the pure severity classifier, prompt builder, and Edge
// Function. The DB's brand_compliance_reviews.severity column mirrors
// this union exactly.

export const COMPLIANCE_SEVERITIES = ['clean', 'minor', 'major', 'critical'] as const;
export type ComplianceSeverity = (typeof COMPLIANCE_SEVERITIES)[number];

export const COMPLIANCE_STATUSES = [
  'pending_human_review',
  'approved',
  'rejected',
  'remediation_required',
] as const;
export type ComplianceStatus = (typeof COMPLIANCE_STATUSES)[number];

// Every rule the Claude Vision validator can raise. Stays stable so
// admin UI + analytics can reason about the issue set over time.
export const COMPLIANCE_ISSUE_CODES = [
  'wrong_wordmark',
  'missing_tagline',
  'wrong_tagline',
  'palette_mismatch',
  'wrong_identity_mark',
  'missing_identity_mark',
  'missing_tm_symbol',
  'methylated_on_non_base_or_childrens',
  'dual_delivery_on_base_or_childrens',
  'capacity_or_dose_mismatch',
  'capacity_or_dose_typo',
  'missing_certification_badge',
  'prohibited_emoji',
  'prohibited_dna_helix',
  'prohibited_precision_circle',
  'cross_category_palette_leak',
  'unsubstantiated_claim',
  'viacura_wordmark_on_sproutables',
  'sproutables_wordmark_on_viacura',
  'snp_tagline_on_non_snp',
] as const;
export type ComplianceIssueCode = (typeof COMPLIANCE_ISSUE_CODES)[number];

export interface ComplianceIssue {
  code: ComplianceIssueCode;
  severity: ComplianceSeverity;
  message: string;
  // Optional pixel-space bounding box used by the admin detail page
  // to overlay issue markers on the packaging proof.
  bbox?: { x: number; y: number; w: number; h: number };
}

// Critical codes that force auto-reject (admin cannot approve without
// a new proof round).
export const CRITICAL_ISSUE_CODES = new Set<ComplianceIssueCode>([
  'cross_category_palette_leak',
  'viacura_wordmark_on_sproutables',
  'sproutables_wordmark_on_viacura',
  'snp_tagline_on_non_snp',
  'capacity_or_dose_mismatch',
]);

// Major codes: human review required, remediation expected.
export const MAJOR_ISSUE_CODES = new Set<ComplianceIssueCode>([
  'wrong_wordmark',
  'wrong_tagline',
  'palette_mismatch',
  'wrong_identity_mark',
  'missing_identity_mark',
  'missing_tm_symbol',
  'methylated_on_non_base_or_childrens',
  'dual_delivery_on_base_or_childrens',
  'prohibited_emoji',
  'prohibited_dna_helix',
  'prohibited_precision_circle',
]);
