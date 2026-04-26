/**
 * Top-level appeal analyzer (Prompt #123 §4 + §4.4).
 *
 * Reads the appeal + parent notice + finding + evidence + practitioner state,
 * runs the drift analyzer, and applies the deterministic disposition table
 * to produce a recommendation + confidence. Output is persisted as an
 * appeal_analyses row by the caller.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AppealClaimType,
  AppealSubClaimType,
  AppealRecommendation,
  AppealAnalysisRow,
  DriftReport,
} from "./types";
import { ANALYZER_VERSION } from "./types";
import { analyzeDrift } from "./drift";
import { resolveDualApproval } from "./router";

export interface AppealContext {
  appeal_id: string;
  notice_id: string;
  finding_id: string | null;
  practitioner_id: string;
  practitioner_strike_count: number;
  finding_severity: string;
  evidence_integrity: "high" | "medium" | "low";
  handle_verified: boolean;
  remediation_verifiable: boolean;
  triggers_external_referral: boolean;
  triggers_clinical_review: boolean;
  /** Practitioner's appeal text. */
  rebuttal_text: string;
  /** Original published content captured by Hounddog. */
  published_text: string | null;
  claim_type: AppealClaimType;
}

export interface AnalyzerOutput {
  sub_claim_type: AppealSubClaimType;
  recommendation: AppealRecommendation;
  confidence: number;
  rationale: AppealAnalysisRow["rationale"];
  drift_report: DriftReport;
  requires_dual_approval: boolean;
  dual_approvers: string[];
  analyzer_version: string;
}

const EMPTY_DRIFT: DriftReport = {
  has_receipt: false,
  receipt_id: null,
  receipt_issued_at: null,
  receipt_expired: false,
  jaccard_similarity: null,
  drift_label: "none",
  additions_excerpt: [],
  removals_excerpt: [],
  good_faith_signal: "neutral",
  recommendation_adjustment: "no receipt; cannot assess drift",
};

export async function runAnalyzer(
  client: SupabaseClient,
  ctx: AppealContext,
): Promise<AnalyzerOutput> {
  const drift =
    ctx.published_text && ctx.published_text.length > 0
      ? await analyzeDrift(client, {
          practitionerId: ctx.practitioner_id,
          publishedText: ctx.published_text,
          findingId: ctx.finding_id ?? undefined,
        })
      : EMPTY_DRIFT;

  const subClaimType = inferSubClaim(ctx);
  const decision = pickDisposition(ctx, drift);
  const dualApproval = resolveDualApproval({
    recommendation: decision.recommendation,
    practitionerStrikeCount: ctx.practitioner_strike_count,
    findingSeverity: ctx.finding_severity,
    triggersExternalReferral: ctx.triggers_external_referral,
    triggersClinicalReview: ctx.triggers_clinical_review,
  });

  return {
    sub_claim_type: subClaimType,
    recommendation: decision.recommendation,
    confidence: decision.confidence,
    rationale: decision.rationale,
    drift_report: drift,
    requires_dual_approval: dualApproval.required,
    dual_approvers: dualApproval.approvers,
    analyzer_version: ANALYZER_VERSION,
  };
}

function inferSubClaim(ctx: AppealContext): AppealSubClaimType {
  const lc = ctx.rebuttal_text.toLowerCase();
  if (ctx.claim_type === "dispute_attribution") {
    return ctx.handle_verified ? "policy_disagreement" : "identity_mismatch";
  }
  if (ctx.claim_type === "dispute_interpretation") {
    if (lc.includes("evidence") || lc.includes("proof")) return "evidence_insufficient";
    if (lc.includes("context") || lc.includes("misunderstand")) return "context_missing";
    if (lc.includes("good faith") || lc.includes("did not know") || lc.includes("didn't know")) {
      return "good_faith_misinterpretation";
    }
    if (lc.includes("procedure") || lc.includes("notice")) return "procedural_objection";
    return "policy_disagreement";
  }
  if (ctx.claim_type === "already_remediated") return "already_cured";
  return "other";
}

interface DispositionResult {
  recommendation: AppealRecommendation;
  confidence: number;
  rationale: AppealAnalysisRow["rationale"];
}

function pickDisposition(ctx: AppealContext, drift: DriftReport): DispositionResult {
  const rationale: AppealAnalysisRow["rationale"] = [];

  if (ctx.evidence_integrity === "low") {
    rationale.push({ code: "EVIDENCE_LOW", description: "Evidence integrity flag prevents automated decision." });
    return { recommendation: "manual_review", confidence: 0.95, rationale };
  }

  if (ctx.claim_type === "dispute_attribution") {
    if (!ctx.handle_verified) {
      rationale.push({ code: "ATTR_UNVERIFIED", description: "Practitioner handle is not verified; finding cannot be attributed with confidence." });
      return { recommendation: "reverse", confidence: 0.92, rationale };
    }
    rationale.push({ code: "ATTR_VERIFIED", description: "Practitioner handle is verified; attribution holds." });
    return { recommendation: "uphold", confidence: 0.9, rationale };
  }

  if (ctx.claim_type === "dispute_interpretation") {
    if (drift.drift_label === "none") {
      rationale.push({ code: "DRIFT_NONE", description: "Published content matches cleared receipt; uphold the finding." });
      return { recommendation: "uphold", confidence: 0.88, rationale };
    }
    if (drift.drift_label === "benign") {
      rationale.push({ code: "DRIFT_BENIGN", description: "Cosmetic edits only; uphold with softened tone." });
      return { recommendation: "uphold", confidence: 0.82, rationale };
    }
    if (drift.drift_label.startsWith("substantive_")) {
      rationale.push({
        code: "DRIFT_SUBSTANTIVE",
        description: `Substantive drift from cleared content (${drift.drift_label}); uphold and note drift.`,
      });
      return { recommendation: "uphold", confidence: 0.9, rationale };
    }
    rationale.push({ code: "DRIFT_UNKNOWN", description: "No receipt; uphold based on rule applicability." });
    return { recommendation: "uphold", confidence: 0.75, rationale };
  }

  if (ctx.claim_type === "already_remediated") {
    if (ctx.remediation_verifiable) {
      rationale.push({ code: "REMEDIATION_VERIFIED", description: "Remediation independently verifiable; reverse the finding." });
      return { recommendation: "reverse", confidence: 0.9, rationale };
    }
    if (drift.drift_label.startsWith("substantive_")) {
      rationale.push({
        code: "REMEDIATION_DRIFT",
        description: "Drift report contradicts the remediation claim; request additional evidence.",
      });
      return { recommendation: "request_more_info", confidence: 0.85, rationale };
    }
    rationale.push({ code: "REMEDIATION_UNVERIFIABLE", description: "Remediation claim cannot be independently verified; request more info." });
    return { recommendation: "request_more_info", confidence: 0.78, rationale };
  }

  rationale.push({ code: "FALLBACK", description: "Unrecognized claim type; route to manual review." });
  return { recommendation: "manual_review", confidence: 0.7, rationale };
}
