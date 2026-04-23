// Prompt #113 hotfix P0 #2 — server-side Kelsey review helper.
//
// Closes the Arnold coaching leak: every Claude-generated recommendation
// must pass through Stage 1 (deterministic disease-claim detector) and,
// when Stage 1 flags cross the threshold, Stage 2 (Kelsey LLM) before
// being rendered or persisted.
//
// This helper mirrors the orchestration in
// src/app/api/compliance/kelsey/review/route.ts but drops the HTTP auth
// + response shaping so any server-side caller (cron jobs, Arnold
// recommender, edge functions) can invoke it uniformly. The HTTP route
// should migrate to this helper in a follow-up pass to delete duplicate
// logic; leaving it alone for this hotfix to minimize blast radius.
//
// Contract:
//   - Input: raw text, jurisdiction, subject_type, optional subject_id + scope.
//   - Output: { decision, text } where decision is one of the 4 verdicts
//     plus "pass_stage_1" (no Stage 2 needed) and text is either the
//     original text (APPROVED / pass_stage_1), the suggested rewrite
//     (CONDITIONAL), or null (BLOCKED / ESCALATE — caller drops the
//     candidate).
//
// Failure mode: fail-closed. LLM timeout, malformed response, or any
// unexpected error returns ESCALATE + text=null so compliance humans
// review rather than silently passing unvalidated text.

import crypto from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { detectDiseaseClaim } from "./detector";
import { hashSubject, lookupCached } from "./kelsey/cache";
import { callKelseyLLM } from "./kelsey/client";
import { getJurisdictionId } from "./jurisdiction";
import { recordRegulatoryAudit } from "./audit-logger";
import type { JurisdictionCode, KelseyVerdictType, SubjectType } from "./types";

export type ServerReviewDecision =
  | "pass_stage_1"  // Stage 1 found nothing; no LLM call made
  | KelseyVerdictType; // APPROVED / CONDITIONAL / BLOCKED / ESCALATE

export interface ServerReviewInput {
  text: string;
  jurisdiction: JurisdictionCode;
  subject_type: SubjectType;
  subject_id?: string;
  ingredient_scope?: string[];
  sku_scope?: string[];
  // String-serialized context; KelseyLLMInput expects a plain string
  // (see src/lib/compliance/kelsey/client.ts KelseyLLMInput).
  context?: string;
  // User whose action triggered the review (for audit trail). Nullable
  // for cron / bulk jobs without a user attribution.
  acting_user_id?: string;
  // Role label for the audit log `actor_role` column. Defaults to
  // "system" for background jobs.
  actor_role?: string;
}

export interface ServerReviewResult {
  decision: ServerReviewDecision;
  // The text the caller should actually render / persist. null when the
  // caller MUST drop the candidate (BLOCKED or ESCALATE).
  text: string | null;
  // Included for audit callers. Never surface rationale to end users.
  rationale?: string;
  // Fired when Kelsey suggested a rewrite and we used it in place of the
  // original. Lets callers log the sanitization for transparency.
  sanitized: boolean;
  // Always populated so callers can attach it to their own persist step.
  stage_1_score: number;
  stage_1_flag_count: number;
  // For downstream audit chaining. Present only when Stage 2 ran.
  review_id?: string;
}

// Any Stage-1 total_score below this skips the LLM. Mirrors the threshold
// exported from the detector (STAGE2_THRESHOLD = 3.0 at the time of
// writing; imported lazily inside detectDiseaseClaim).
//
// The detector already returns `requires_stage2: true` when the score
// crosses the threshold, so callers don't need to know the exact value.

/**
 * Run the two-stage review on a piece of text. Returns the decision +
 * the text the caller should use (or null to drop).
 *
 * Performance: Stage 1 is <10 ms. Stage 2 only runs when Stage 1 flags
 * cross the threshold. Cache hits skip Stage 2 entirely. Cold path
 * worst case is one Anthropic round-trip (~1-3 s).
 */
export async function reviewServerText(input: ServerReviewInput): Promise<ServerReviewResult> {
  // Stage 1 — always runs. Fast, deterministic.
  const stage1 = await detectDiseaseClaim(input.text);

  if (!stage1.requires_stage2) {
    return {
      decision: "pass_stage_1",
      text: input.text,
      sanitized: false,
      stage_1_score: stage1.total_score,
      stage_1_flag_count: stage1.flags.length,
    };
  }

  const jurisdictionId = await getJurisdictionId(input.jurisdiction);
  if (!jurisdictionId) {
    // Fail-closed: no jurisdiction row means we cannot persist the review.
    // Caller drops the candidate.
    return {
      decision: "ESCALATE",
      text: null,
      sanitized: false,
      rationale: `No regulatory_jurisdictions row for ${input.jurisdiction}`,
      stage_1_score: stage1.total_score,
      stage_1_flag_count: stage1.flags.length,
    };
  }

  // Cache lookup — 90-day TTL keyed by SHA-256(normalize(text)+jurisdiction+scope).
  const subjectHash = hashSubject(input.text, input.jurisdiction, input.ingredient_scope ?? []);
  const cached = await lookupCached(subjectHash, jurisdictionId);

  let verdict: KelseyVerdictType;
  let rationale: string;
  let rewrite: string | null;
  let reviewId: string;

  if (cached) {
    verdict = cached.verdict;
    rationale = cached.rationale;
    rewrite = cached.suggested_rewrite ?? null;
    reviewId = cached.review_id;
  } else {
    // Stage 2 — LLM.
    const llm = await callKelseyLLM({
      text: input.text,
      jurisdiction: input.jurisdiction,
      subject_type: input.subject_type,
      ingredient_scope: input.ingredient_scope,
      sku_scope: input.sku_scope,
      context: input.context,
      stage_1_flags: stage1.flags,
    });

    if (!llm) {
      // LLM unavailable or returned malformed JSON. Fail-closed: ESCALATE.
      const admin = createAdminClient();
      reviewId = crypto.randomUUID();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (admin as any).from("regulatory_kelsey_reviews").insert({
        id: reviewId,
        subject_type: input.subject_type,
        subject_id: input.subject_id ?? reviewId,
        jurisdiction_id: jurisdictionId,
        subject_hash: subjectHash,
        stage_1_flags: stage1.flags,
        stage_1_score: stage1.total_score,
        verdict: "ESCALATE" as KelseyVerdictType,
        rationale: "Kelsey LLM unavailable or malformed response; fail-closed escalation from server review helper.",
        rule_references: [],
        confidence: 0,
        reviewed_by: "kelsey-server-helper",
      });
      return {
        decision: "ESCALATE",
        text: null,
        sanitized: false,
        rationale: "Kelsey LLM unavailable; fail-closed",
        stage_1_score: stage1.total_score,
        stage_1_flag_count: stage1.flags.length,
        review_id: reviewId,
      };
    }

    verdict = llm.validated.verdict;
    rationale = llm.validated.rationale;
    rewrite = llm.validated.suggested_rewrite;

    // Persist the fresh review. Cache is populated via a DB trigger per
    // migration 20260424000170; if not, this insert is still the audit
    // trail.
    const admin = createAdminClient();
    reviewId = crypto.randomUUID();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin as any).from("regulatory_kelsey_reviews").insert({
      id: reviewId,
      subject_type: input.subject_type,
      subject_id: input.subject_id ?? reviewId,
      jurisdiction_id: jurisdictionId,
      subject_hash: subjectHash,
      stage_1_flags: stage1.flags,
      stage_1_score: stage1.total_score,
      verdict,
      rationale,
      rule_references: llm.validated.rule_references,
      suggested_rewrite: rewrite,
      confidence: llm.validated.confidence,
      citations: llm.validated.citations,
      stage_2_raw: llm.raw_response,
      model_used: llm.model_used,
      reviewed_by: "kelsey-server-helper",
    });
  }

  // Audit log every decision so compliance reviewers can trace every
  // coaching message back to a verdict. Match the RegulatoryAuditInsert
  // schema from src/lib/compliance/audit-logger.ts.
  await recordRegulatoryAudit({
    actor_id: input.acting_user_id ?? null,
    actor_role: input.actor_role ?? "system",
    action: "kelsey_review",
    target_type: input.subject_type,
    target_id: input.subject_id ?? reviewId,
    jurisdiction_id: jurisdictionId,
    after_value: {
      verdict,
      stage_1_score: stage1.total_score,
      stage_1_flag_count: stage1.flags.length,
      cached: cached != null,
      review_id: reviewId,
    },
  }).catch((err: unknown) => {
    // Audit failure never blocks the verdict. Log and continue.
    console.warn("[review-server-text] audit log failed:", (err as Error).message);
  });

  // Decision handling.
  switch (verdict) {
    case "APPROVED":
      return {
        decision: "APPROVED",
        text: input.text,
        sanitized: false,
        rationale,
        stage_1_score: stage1.total_score,
        stage_1_flag_count: stage1.flags.length,
        review_id: reviewId,
      };
    case "CONDITIONAL":
      return {
        decision: "CONDITIONAL",
        text: rewrite && rewrite.trim().length > 0 ? rewrite : null,
        sanitized: rewrite != null && rewrite.trim().length > 0,
        rationale,
        stage_1_score: stage1.total_score,
        stage_1_flag_count: stage1.flags.length,
        review_id: reviewId,
      };
    case "BLOCKED":
    case "ESCALATE":
    default:
      return {
        decision: verdict,
        text: null,
        sanitized: false,
        rationale,
        stage_1_score: stage1.total_score,
        stage_1_flag_count: stage1.flags.length,
        review_id: reviewId,
      };
  }
}
