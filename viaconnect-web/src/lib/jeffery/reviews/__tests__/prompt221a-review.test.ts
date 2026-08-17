/**
 * Prompt 221A unit proofs (no live DB).
 * Sequence, fail-closed, no-self-review, needs_human, advisory-plus.
 */

import { describe, expect, it } from "vitest";
import {
  runKbPromotionChecks,
  runSynthesisChecks,
  runCompletionReportChecks,
  runConfigChangeChecks,
  runDigestCompileChecks,
} from "../checkSuites";
import {
  buildReviewRecord,
  c3SequenceComplete,
  deriveJefferyVerdict,
  isKbItemRetrievable,
} from "../runReview";
import { canPromoteKbItem, canRetrieveKbItem } from "@/lib/kb/promote";

describe("221A sequence Marshall then Lex then Jeffery", () => {
  it("traces C3 incomplete without Lex or Jeffery", () => {
    const a = c3SequenceComplete({
      marshallGateStatus: "approved",
      hasLexDecision: false,
      jefferyVerdict: null,
    });
    expect(a.complete).toBe(false);
    expect(a.missing).toContain("marshall_lex_approved_gate");
    expect(a.missing).toContain("lex_decision");
    expect(a.missing).toContain("jeffery_approved");
  });

  it("traces C3 complete only when all three pass", () => {
    const ok = c3SequenceComplete({
      marshallGateStatus: "lex_approved",
      hasLexDecision: true,
      jefferyVerdict: "approved",
    });
    expect(ok.complete).toBe(true);
    expect(ok.missing).toHaveLength(0);
  });

  it("standard KB: Marshall promote does not make item retrievable without Jeffery", () => {
    const gate = canPromoteKbItem({
      currentStatus: "pending",
      targetStatus: "approved",
      gateProfile: "standard",
      extractionConfidence: 90,
      hasLexApprovedDecision: false,
    });
    expect(gate.ok).toBe(true);
    expect(
      canRetrieveKbItem({
        gateStatus: "approved",
        jefferyVerdict: "pending",
      })
    ).toBe(false);
    expect(
      isKbItemRetrievable({
        gateStatus: "approved",
        jefferyVerdict: "approved",
      })
    ).toBe(true);
  });

  it("Jeffery-rejected item is not retrievable", () => {
    expect(
      isKbItemRetrievable({
        gateStatus: "approved",
        jefferyVerdict: "rejected",
      })
    ).toBe(false);
  });
});

describe("221A KB promotion check suite", () => {
  it("approves when suite passes after Marshall", () => {
    const checks = runKbPromotionChecks({
      gateStatus: "approved",
      gateProfile: "standard",
      extractionConfidence: 88,
      contentHash: "a".repeat(64),
      title: "Omega-3 RCT summary",
      summary: "Structured summary of outcomes.",
      sourceUrls: ["https://pubmed.ncbi.nlm.nih.gov/1"],
      evidenceGrade: "B",
      payloadType: "study",
      provenance: { discovery_task_id: "t1", handler_version: "221a.1" },
      hasLexDecisionIfRequired: false,
      requiredFieldsPresent: true,
      unknownsHonest: true,
      dedupeCleared: true,
      collectionSlug: "clinical_studies",
    });
    const outcome = deriveJefferyVerdict("kb_promotion", checks, {
      producedByAgent: "hounddog",
    });
    expect(outcome.verdict).toBe("approved");
    expect(outcome.hardBlock).toBe(true);
  });

  it("rejects incomplete provenance fail-closed", () => {
    const checks = runKbPromotionChecks({
      gateStatus: "approved",
      gateProfile: "standard",
      extractionConfidence: 90,
      contentHash: "b".repeat(64),
      title: "Title",
      summary: "Summary",
      sourceUrls: [],
      evidenceGrade: "C",
      payloadType: "study",
      provenance: {},
      hasLexDecisionIfRequired: false,
      requiredFieldsPresent: true,
      unknownsHonest: true,
      dedupeCleared: true,
      collectionSlug: "clinical_studies",
    });
    const outcome = deriveJefferyVerdict("kb_promotion", checks);
    expect(outcome.verdict).toBe("rejected");
    expect(outcome.reasonCodes).toContain("provenance_integrity");
  });
});

describe("221A synthesis + Lex before Jeffery", () => {
  it("fails C3 when Lex missing", () => {
    const checks = runSynthesisChecks({
      methodologyPresent: true,
      methodologyHasSignals: true,
      methodologyHasWindow: true,
      methodologyHasWeighting: true,
      inputsExpired: false,
      synthesisType: "sku_competitive_comparison",
      hasLexDecision: false,
      marshallGateStatus: "approved",
    });
    const outcome = deriveJefferyVerdict("synthesis", checks, {
      producedByAgent: "sherlock",
    });
    expect(outcome.verdict).toBe("rejected");
    expect(outcome.reasonCodes).toContain("lex_before_jeffery");
  });
});

describe("221A no self-review", () => {
  it("Jeffery-produced artifacts never self-approve", () => {
    const checks = runKbPromotionChecks({
      gateStatus: "approved",
      gateProfile: "standard",
      extractionConfidence: 99,
      contentHash: "c".repeat(64),
      title: "Freshness report",
      summary: "Managerial freshness report.",
      sourceUrls: ["internal"],
      evidenceGrade: null,
      payloadType: "education_entry",
      provenance: { source: "jeffery.freshness" },
      hasLexDecisionIfRequired: false,
      requiredFieldsPresent: true,
      unknownsHonest: true,
      dedupeCleared: true,
      collectionSlug: "clinical_studies",
    });
    const outcome = deriveJefferyVerdict("kb_promotion", checks, {
      producedByAgent: "jeffery",
    });
    expect(outcome.verdict).toBe("needs_human");
    expect(outcome.reasonCodes).toContain("no_self_review");
  });
});

describe("221A completion report and config needs_human", () => {
  it("missing evidence routes needs_human with gaps", () => {
    const checks = runCompletionReportChecks({
      acceptanceCriteriaMapped: false,
      artifactEvidencePresent: false,
      guardrailAttestationsPresent: true,
      gaps: ["no row-level excerpts", "missing harness scores"],
    });
    const outcome = deriveJefferyVerdict("completion_report", checks, {
      producedByAgent: "michelangelo",
    });
    expect(outcome.verdict).toBe("needs_human");
    expect(outcome.reasonCodes.length).toBeGreaterThan(0);
    const record = buildReviewRecord(
      {
        artifactType: "completion_report",
        artifactRef: "prompt-221a-drill",
        checks,
        producedByAgent: "michelangelo",
      },
      outcome
    );
    expect(record.verdict).toBe("needs_human");
  });

  it("config_change always needs_human even when form passes", () => {
    const checks = runConfigChangeChecks({
      formValid: true,
      impactProjectionPresent: true,
      changeClass: "allowlist_proposal",
    });
    const outcome = deriveJefferyVerdict("config_change", checks, {
      producedByAgent: "hounddog",
    });
    expect(outcome.verdict).toBe("needs_human");
    expect(outcome.reasonCodes).toContain("gary_decision_required");
  });
});

describe("221A digest advisory-plus", () => {
  it("first failure flags but does not hard-block", () => {
    const checks = runDigestCompileChecks({
      structurallyValid: false,
      withinStalenessBounds: true,
      provenancePresent: true,
      consecutiveFailureCount: 1,
    });
    const outcome = deriveJefferyVerdict("agent_digest_compile", checks, {
      consecutiveCompileFailures: 1,
    });
    expect(outcome.verdict).toBe("needs_human");
    expect(outcome.hardBlock).toBe(false);
    expect(outcome.reasonCodes).toContain("advisory_flag_publish_once");
  });

  it("second consecutive failure hard-blocks", () => {
    const checks = runDigestCompileChecks({
      structurallyValid: false,
      withinStalenessBounds: false,
      provenancePresent: false,
      consecutiveFailureCount: 2,
    });
    const outcome = deriveJefferyVerdict("agent_digest_compile", checks, {
      consecutiveCompileFailures: 2,
    });
    expect(outcome.verdict).toBe("rejected");
    expect(outcome.hardBlock).toBe(true);
    expect(outcome.reasonCodes).toContain("consecutive_compile_failures");
  });
});
