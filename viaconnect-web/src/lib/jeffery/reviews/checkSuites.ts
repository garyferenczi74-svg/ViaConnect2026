/**
 * Prompt 221A: programmatic check suites per artifact class.
 * Deterministic first; AI-assisted evaluation is a separate path (budgeted).
 */

import type { ReviewCheck } from "./types";
import { needsHumanReview, mayCiteAsEvidence, type EvidenceGrade } from "@/lib/kb/grades";

export interface KbPromotionReviewContext {
  gateStatus: string;
  gateProfile: string;
  extractionConfidence: number | null;
  contentHash: string | null;
  title: string | null;
  summary: string | null;
  sourceUrls: string[];
  evidenceGrade: string | null;
  payloadType: string;
  provenance: Record<string, unknown> | null;
  hasLexDecisionIfRequired: boolean;
  synthesisType?: string | null;
  requiredFieldsPresent: boolean;
  unknownsHonest: boolean;
  dedupeCleared: boolean;
  collectionSlug: string;
}

export function runKbPromotionChecks(
  ctx: KbPromotionReviewContext
): ReviewCheck[] {
  const checks: ReviewCheck[] = [];

  const marshallOk =
    ctx.gateStatus === "approved" || ctx.gateStatus === "lex_approved";
  checks.push({
    name: "marshall_gate_complete",
    result: marshallOk ? "pass" : "fail",
    detail: marshallOk
      ? `gate_status=${ctx.gateStatus}`
      : `expected approved or lex_approved, got ${ctx.gateStatus}`,
  });

  const needsLex =
    ctx.gateProfile === "lex_lane" ||
    ctx.synthesisType === "sku_competitive_comparison";
  if (needsLex) {
    checks.push({
      name: "lex_lane_before_jeffery",
      result:
        ctx.gateStatus === "lex_approved" && ctx.hasLexDecisionIfRequired
          ? "pass"
          : "fail",
      detail: needsLex
        ? `lex_approved=${ctx.gateStatus === "lex_approved"} decision=${ctx.hasLexDecisionIfRequired}`
        : "n/a",
    });
  }

  checks.push({
    name: "charter_conformance_payload_type",
    result: ctx.payloadType ? "pass" : "fail",
    detail: `payload_type=${ctx.payloadType || "missing"} collection=${ctx.collectionSlug}`,
  });

  checks.push({
    name: "completeness_required_or_unknown",
    result: ctx.requiredFieldsPresent && ctx.unknownsHonest ? "pass" : "fail",
    detail: ctx.requiredFieldsPresent
      ? ctx.unknownsHonest
        ? "required fields present or UNKNOWN"
        : "UNKNOWN discipline violated (guessed fields)"
      : "required fields missing without UNKNOWN",
  });

  const hasProv =
    Boolean(ctx.provenance) && Object.keys(ctx.provenance ?? {}).length > 0;
  checks.push({
    name: "provenance_integrity",
    result: hasProv ? "pass" : "fail",
    detail: hasProv ? "provenance present" : "provenance empty",
  });

  const graded =
    ctx.payloadType === "study" || ctx.payloadType === "association";
  if (graded) {
    const g = ctx.evidenceGrade as EvidenceGrade | null;
    const ok = Boolean(g) && mayCiteAsEvidence(g);
    checks.push({
      name: "evidence_citation_compliance",
      result: g === "E" ? "warn" : ok || g === "D" ? "pass" : "fail",
      detail: `grade=${ctx.evidenceGrade ?? "null"} (E is awareness only)`,
    });
  }

  checks.push({
    name: "content_hash_present",
    result: ctx.contentHash && ctx.contentHash.length === 64 ? "pass" : "fail",
    detail: ctx.contentHash ? `hash_len=${ctx.contentHash.length}` : "missing",
  });

  checks.push({
    name: "extraction_confidence",
    result: needsHumanReview(ctx.extractionConfidence) ? "fail" : "pass",
    detail: `confidence=${ctx.extractionConfidence ?? "null"} threshold=70`,
  });

  checks.push({
    name: "dedupe_cleared",
    result: ctx.dedupeCleared ? "pass" : "fail",
    detail: ctx.dedupeCleared ? "no open near-dupe queue" : "near-dupe open",
  });

  const titleOk = Boolean(ctx.title?.trim());
  const summaryOk = Boolean(ctx.summary?.trim());
  checks.push({
    name: "title_summary_present",
    result: titleOk && summaryOk ? "pass" : "fail",
    detail: `title=${titleOk} summary=${summaryOk}`,
  });

  return checks;
}

export interface SynthesisReviewContext {
  methodologyPresent: boolean;
  methodologyHasSignals: boolean;
  methodologyHasWindow: boolean;
  methodologyHasWeighting: boolean;
  inputsExpired: boolean;
  synthesisType: string;
  hasLexDecision: boolean;
  marshallGateStatus: string;
}

export function runSynthesisChecks(ctx: SynthesisReviewContext): ReviewCheck[] {
  const checks: ReviewCheck[] = [];

  checks.push({
    name: "methodology_completeness",
    result:
      ctx.methodologyPresent &&
      ctx.methodologyHasSignals &&
      ctx.methodologyHasWindow &&
      ctx.methodologyHasWeighting
        ? "pass"
        : "fail",
    detail: `signals=${ctx.methodologyHasSignals} window=${ctx.methodologyHasWindow} weighting=${ctx.methodologyHasWeighting}`,
  });

  checks.push({
    name: "input_freshness",
    result: ctx.inputsExpired ? "fail" : "pass",
    detail: ctx.inputsExpired ? "one or more inputs past valid_until" : "inputs fresh",
  });

  if (ctx.synthesisType === "sku_competitive_comparison") {
    checks.push({
      name: "lex_before_jeffery",
      result:
        ctx.marshallGateStatus === "lex_approved" && ctx.hasLexDecision
          ? "pass"
          : "fail",
      detail: `gate=${ctx.marshallGateStatus} lex_decision=${ctx.hasLexDecision}`,
    });
  }

  return checks;
}

export interface DigestCompileReviewContext {
  structurallyValid: boolean;
  withinStalenessBounds: boolean;
  provenancePresent: boolean;
  consecutiveFailureCount: number;
}

export function runDigestCompileChecks(
  ctx: DigestCompileReviewContext
): ReviewCheck[] {
  return [
    {
      name: "structural_validity",
      result: ctx.structurallyValid ? "pass" : "fail",
      detail: ctx.structurallyValid ? "ok" : "invalid structure",
    },
    {
      name: "staleness_bounds",
      result: ctx.withinStalenessBounds ? "pass" : "fail",
      detail: ctx.withinStalenessBounds
        ? "within 219h targets"
        : "stale vs freshness targets",
    },
    {
      name: "provenance_present",
      result: ctx.provenancePresent ? "pass" : "fail",
      detail: ctx.provenancePresent ? "ok" : "missing provenance",
    },
    {
      name: "consecutive_failure_budget",
      result: ctx.consecutiveFailureCount >= 2 ? "fail" : "pass",
      detail: `consecutive_failures=${ctx.consecutiveFailureCount}`,
    },
  ];
}

export interface CompletionReportReviewContext {
  acceptanceCriteriaMapped: boolean;
  artifactEvidencePresent: boolean;
  guardrailAttestationsPresent: boolean;
  gaps: string[];
}

export function runCompletionReportChecks(
  ctx: CompletionReportReviewContext
): ReviewCheck[] {
  return [
    {
      name: "acceptance_criteria_mapped",
      result: ctx.acceptanceCriteriaMapped ? "pass" : "fail",
      detail: ctx.acceptanceCriteriaMapped
        ? "criteria mapped to evidence"
        : "missing criteria-to-evidence map",
    },
    {
      name: "artifact_not_dashboard_only",
      result: ctx.artifactEvidencePresent ? "pass" : "fail",
      detail: ctx.artifactEvidencePresent
        ? "row-level artifacts present"
        : "dashboard-only or missing artifacts (219l)",
    },
    {
      name: "guardrail_attestations",
      result: ctx.guardrailAttestationsPresent ? "pass" : "fail",
      detail: ctx.guardrailAttestationsPresent
        ? "attestations present"
        : "guardrail attestations missing",
    },
    {
      name: "gaps_listed",
      result: ctx.gaps.length === 0 ? "pass" : "warn",
      detail:
        ctx.gaps.length === 0 ? "no gaps" : `gaps: ${ctx.gaps.join("; ")}`,
    },
  ];
}

export interface ConfigChangeReviewContext {
  formValid: boolean;
  impactProjectionPresent: boolean;
  changeClass: string;
}

export function runConfigChangeChecks(
  ctx: ConfigChangeReviewContext
): ReviewCheck[] {
  return [
    {
      name: "form_valid",
      result: ctx.formValid ? "pass" : "fail",
      detail: ctx.formValid ? "form ok" : "invalid form",
    },
    {
      name: "impact_projection",
      result: ctx.impactProjectionPresent ? "pass" : "fail",
      detail: ctx.impactProjectionPresent
        ? "projection present"
        : "missing budget/impact projection",
    },
    {
      name: "gary_decision_required",
      result: "warn",
      detail: `class=${ctx.changeClass}; Jeffery never decides; needs_human fixed`,
    },
  ];
}

export interface AgentKpiPassContext {
  breaches: Array<{ agent: string; kpi: string; detail: string }>;
}

export function runAgentKpiPassChecks(ctx: AgentKpiPassContext): ReviewCheck[] {
  if (ctx.breaches.length === 0) {
    return [
      {
        name: "charter_kpis",
        result: "pass",
        detail: "no KPI breaches",
      },
    ];
  }
  return ctx.breaches.map((b) => ({
    name: `kpi_breach_${b.agent}_${b.kpi}`,
    result: "fail" as const,
    detail: b.detail,
  }));
}
