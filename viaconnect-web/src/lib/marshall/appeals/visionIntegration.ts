// Prompt #124 P5: Appeal-analyzer vision integration stub.
//
// When a practitioner appeals a Marshall finding by claiming their product
// photo proves authenticity, the #123 Rebuttal Drafter analyzer will call
// this module with the uploaded photo bytes. The analyzer uses the
// returned Determination to decide its recommendation:
//
//   authentic (confidence >= 0.85)  → analyzer recommends reverse
//   counterfeit_suspected           → analyzer recommends uphold
//   inconclusive / insufficient     → analyzer defers to Steve
//
// #123 has not shipped yet (tracked in project_prompt_124_decisions
// memory as unshipped). This module is the stable interface the analyzer
// will import; its body runs through the P5 orchestrator exactly the same
// way Hounddog does.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { VisionConfigSnapshot } from '@/lib/marshall/vision/types';
import {
  runVisionEvaluation,
  type RunVisionResult,
} from '@/lib/marshall/vision/orchestrator';
import { canEvaluate } from '@/lib/marshall/vision/config';

export type AppealRecommendation =
  | 'reverse'
  | 'uphold'
  | 'defer_to_steve';

export interface EvaluateAppealEvidenceInput {
  supabase: SupabaseClient;
  /** Appeal submission ID (populates sourceReference for audit cross-ref). */
  appealId: string;
  /** Practitioner ID; bound to findings for the escalation router. */
  practitionerId: string;
  /** The evidence photo bytes from the practitioner. */
  imageBytes: Uint8Array;
  declaredContentType?: string;
  /** The SKU the practitioner claims the product is. */
  claimedSku: string;
  config: VisionConfigSnapshot;
}

export interface EvaluateAppealEvidenceResult {
  evaluation: RunVisionResult;
  recommendation: AppealRecommendation;
  humanReviewRequired: boolean;
  rationale: string;
}

/**
 * Evaluate practitioner-supplied appeal evidence and map the determination
 * to an analyzer recommendation per §16.5.
 */
export async function evaluateAppealEvidence(
  input: EvaluateAppealEvidenceInput,
): Promise<EvaluateAppealEvidenceResult> {
  // Kill-switch: if practitioner_appeal source is disabled, defer entirely.
  if (!canEvaluate(input.config, 'practitioner_appeal')) {
    // Short-circuit with a "defer to Steve" recommendation; no eval runs.
    return {
      evaluation: {
        status: input.config.mode === 'off' ? 'skipped_mode_off' : 'skipped_source_disabled',
        evaluationId: 'skipped',
        phiRedacted: false,
        corpusWasEmpty: false,
        durationMs: 0,
      },
      recommendation: 'defer_to_steve',
      humanReviewRequired: true,
      rationale: 'Vision evaluation for practitioner appeals is not currently enabled. Steve will review the evidence manually.',
    };
  }

  const evaluation = await runVisionEvaluation({
    supabase: input.supabase,
    source: 'practitioner_appeal',
    sourceReference: {
      appeal_id: input.appealId,
      practitioner_id: input.practitionerId,
      claimed_sku: input.claimedSku,
    },
    imageBytes: input.imageBytes,
    declaredContentType: input.declaredContentType,
    config: input.config,
    hintSku: input.claimedSku,
    userTakenPhoto: true, // appeal evidence is by definition user-taken
  });

  return mapToRecommendation(evaluation);
}

/** Pure function — map a RunVisionResult to an AppealRecommendation. Exposed for tests. */
export function mapToRecommendation(result: RunVisionResult): EvaluateAppealEvidenceResult {
  const d = result.determination;
  if (!d) {
    return {
      evaluation: result,
      recommendation: 'defer_to_steve',
      humanReviewRequired: true,
      rationale: 'Vision evaluation did not complete (pipeline skipped or errored). Defer to Steve.',
    };
  }
  if (d.verdict === 'authentic' && d.confidence >= 0.85) {
    return {
      evaluation: result,
      recommendation: 'reverse',
      humanReviewRequired: d.humanReviewRequired,
      rationale: `Vision confirmed authenticity at confidence ${d.confidence.toFixed(2)}; evidence supports reversing the Marshall finding.`,
    };
  }
  if (d.verdict === 'counterfeit_suspected') {
    return {
      evaluation: result,
      recommendation: 'uphold',
      humanReviewRequired: true,
      rationale: `Vision flagged the evidence itself as counterfeit at confidence ${d.confidence.toFixed(2)}. Uphold with vision citations included.`,
    };
  }
  return {
    evaluation: result,
    recommendation: 'defer_to_steve',
    humanReviewRequired: true,
    rationale: `Vision verdict "${d.verdict}" at confidence ${d.confidence.toFixed(2)} is not sufficient for an automated recommendation. Steve to decide.`,
  };
}
