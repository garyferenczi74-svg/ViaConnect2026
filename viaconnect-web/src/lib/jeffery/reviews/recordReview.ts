/**
 * Prompt 221A: persist Jeffery review via record_jeffery_review RPC.
 * Fail-closed callers: on error, treat as not approved (do not ship).
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { safeLog } from "@/lib/utils/safe-log";
import {
  buildReviewRecord,
  deriveJefferyVerdict,
} from "./runReview";
import type {
  JefferyArtifactType,
  JefferyReviewOutcome,
  ReviewCheck,
} from "./types";
import { JEFFERY_REVIEW_HANDLER_VERSION } from "./types";

export interface PersistReviewInput {
  artifactType: JefferyArtifactType;
  artifactRef: string;
  checks: ReviewCheck[];
  producedByAgent?: string | null;
  consecutiveCompileFailures?: number;
  rationaleSummary?: string | null;
}

export interface PersistReviewResult {
  ok: boolean;
  outcome: JefferyReviewOutcome;
  reviewId?: string;
  error?: string;
}

export async function persistJefferyReview(
  input: PersistReviewInput
): Promise<PersistReviewResult> {
  const outcome = deriveJefferyVerdict(input.artifactType, input.checks, {
    producedByAgent: input.producedByAgent,
    consecutiveCompileFailures: input.consecutiveCompileFailures,
  });
  const record = buildReviewRecord(
    {
      artifactType: input.artifactType,
      artifactRef: input.artifactRef,
      checks: input.checks,
      producedByAgent: input.producedByAgent,
      rationaleSummary: input.rationaleSummary,
    },
    outcome
  );

  try {
    const sb = createAdminClient();
    const { data, error } = await sb.rpc("record_jeffery_review", {
      p_artifact_type: record.artifactType,
      p_artifact_ref: record.artifactRef,
      p_review_checks: record.reviewChecks,
      p_verdict: record.verdict,
      p_reviewer_mode: record.reviewerMode,
      p_handler_version: record.handlerVersion || JEFFERY_REVIEW_HANDLER_VERSION,
      p_rationale_summary: record.rationaleSummary,
      p_produced_by_agent: record.producedByAgent,
    });

    if (error) {
      safeLog.warn("jeffery.review", "record rpc failed fail-closed", {
        error: error.message,
        artifactType: input.artifactType,
      });
      return { ok: false, outcome, error: error.message };
    }

    const id =
      data && typeof data === "object" && "id" in data
        ? String((data as { id: string }).id)
        : undefined;
    return { ok: true, outcome, reviewId: id };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    safeLog.warn("jeffery.review", "record threw fail-closed", { error: msg });
    return { ok: false, outcome, error: msg };
  }
}
