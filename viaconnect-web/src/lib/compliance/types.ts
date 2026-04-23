// Prompt #113 — Regulatory compliance type surface.

export type JurisdictionCode = "US" | "CA";

export type KelseyVerdictType = "APPROVED" | "CONDITIONAL" | "BLOCKED" | "ESCALATE";

export type ClaimType =
  | "structure_function"
  | "health"
  | "dietary_guidance"
  | "nutrient_content"
  | "disease"
  | "superiority";

export type ClaimStatus = "approved" | "pending" | "rejected" | "retired" | "conditional";

export type SubstantiationTier =
  | "tier_1_monograph"
  | "tier_2_meta"
  | "tier_3_rct"
  | "tier_4_observational"
  | "tier_5_mechanistic";

export type PeptideComplianceClass =
  | "research_use_only"
  | "compounded_503a"
  | "compounded_503b"
  | "otc_supplement"
  | "rx_only"
  | "not_approved";

export type SubjectType =
  | "protocol"
  | "social_post"
  | "claim"
  | "video_script"
  | "marketing_copy"
  | "alert"
  | "cache_probe";

export interface DetectorFlag {
  rule: string;
  match: string;
  position: number;
  severity: number;
  variant_group?: string;
}

export interface DetectorResult {
  flagged: boolean;
  flags: DetectorFlag[];
  total_score: number;
  requires_stage2: boolean;
}

export interface KelseyCitation {
  title: string;
  url?: string;
  doi?: string;
  loe?: "A" | "B" | "C" | "D";
}

export interface KelseyVerdict {
  verdict: KelseyVerdictType;
  rationale: string;
  rule_references: string[];
  suggested_rewrite?: string;
  confidence: number;
  citations: KelseyCitation[];
  stage_1_flags: DetectorFlag[];
  review_id: string;
}

export interface KelseyReviewRequest {
  text: string;
  jurisdiction: JurisdictionCode;
  subject_type: SubjectType;
  subject_id?: string;
  ingredient_scope?: string[];
  sku_scope?: string[];
  context?: string;
}
