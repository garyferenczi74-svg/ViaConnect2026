// Prompt 210d P0-9: pure payload builders for the two
// regulatory_kelsey_reviews insert sites in review-server-text.ts.
//
// Extracted so the shape test can assert the payload keys against the LIVE
// Row parsed from docs/integrity/snapshot/live-types.ts at runtime.
// No Supabase imports here; this module must stay side-effect free.
//
// Key mapping applied (docs/integrity/snapshot/column-misses-verified.json,
// table regulatory_kelsey_reviews; full table in
// .superpowers/sdd/task-210d-P0-9-report.md):
//   subject_hash  -> subject_text_hash (live column name)
//   reviewed_by   -> reviewer_model on the fail-closed row (no model ran;
//                    matches the HTTP route's "fail_closed" precedent)
//   model_used    -> reviewer_model on the Stage-2 row
//   (added)       -> subject_text_excerpt, REQUIRED by the live Insert type
//                    (NOT NULL, no default); first 500 chars, route.ts shape
//   stage_1_score, citations, and the Stage-2 row's reviewed_by have no live
//   column; they are preserved inside the stage_2_raw jsonb following the
//   wrapper precedent the HTTP route already writes
//   (route.ts:140, stage_2_raw: { raw_response, citations }).
// All values pass through unchanged.

import type { DetectorFlag, SubjectType } from "./types";
import type { ValidatedKelseyResponse } from "./kelsey/verdict-schema";

// Writer-provenance label for rows persisted by the server-side helper
// (distinguishes them from rows written by the HTTP route).
const SERVER_HELPER_LABEL = "kelsey-server-helper";

const ESCALATE_RATIONALE =
  "Kelsey LLM unavailable or malformed response; fail-closed escalation from server review helper.";

export interface KelseyEscalateRowArgs {
  reviewId: string;
  subjectType: SubjectType;
  subjectId: string | undefined;
  jurisdictionId: string;
  subjectHash: string;
  text: string;
  stage1Flags: DetectorFlag[];
  stage1Score: number;
}

/**
 * Row persisted when the Kelsey LLM is unavailable or returns malformed
 * JSON (fail-closed ESCALATE, review-server-text.ts Stage-2 branch).
 */
export function buildKelseyEscalateRow(args: KelseyEscalateRowArgs) {
  return {
    id: args.reviewId,
    subject_type: args.subjectType,
    subject_id: args.subjectId ?? args.reviewId,
    jurisdiction_id: args.jurisdictionId,
    subject_text_hash: args.subjectHash,
    subject_text_excerpt: args.text.slice(0, 500),
    stage_1_flags: args.stage1Flags,
    verdict: "ESCALATE",
    rationale: ESCALATE_RATIONALE,
    rule_references: [],
    confidence: 0,
    reviewer_model: SERVER_HELPER_LABEL,
    stage_2_raw: { stage_1_score: args.stage1Score },
  };
}

export interface KelseyReviewRowArgs {
  reviewId: string;
  subjectType: SubjectType;
  subjectId: string | undefined;
  jurisdictionId: string;
  subjectHash: string;
  text: string;
  stage1Flags: DetectorFlag[];
  stage1Score: number;
  validated: ValidatedKelseyResponse;
  rawResponse: string;
  modelUsed: string;
}

/**
 * Row persisted for a fresh Stage-2 verdict (cache miss path in
 * review-server-text.ts).
 */
export function buildKelseyReviewRow(args: KelseyReviewRowArgs) {
  return {
    id: args.reviewId,
    subject_type: args.subjectType,
    subject_id: args.subjectId ?? args.reviewId,
    jurisdiction_id: args.jurisdictionId,
    subject_text_hash: args.subjectHash,
    subject_text_excerpt: args.text.slice(0, 500),
    stage_1_flags: args.stage1Flags,
    verdict: args.validated.verdict,
    rationale: args.validated.rationale,
    rule_references: args.validated.rule_references,
    suggested_rewrite: args.validated.suggested_rewrite,
    confidence: args.validated.confidence,
    reviewer_model: args.modelUsed,
    stage_2_raw: {
      raw_response: args.rawResponse,
      citations: args.validated.citations,
      stage_1_score: args.stage1Score,
      reviewed_by: SERVER_HELPER_LABEL,
    },
  };
}
