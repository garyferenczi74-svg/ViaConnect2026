/**
 * Prompt 221 / 221A: promotion guards (TS mirror of promote_kb_item rules).
 * Sequence: Marshall, then Lex where applicable, then Jeffery (separate step).
 * Live DB writes go through SECURITY DEFINER RPCs only.
 * Retrievable only when gate live AND jeffery_verdict approved (fail-closed).
 */

import type { KbGateProfile } from "./collections";
import { needsHumanReview } from "./grades";
import { isKbItemRetrievable } from "@/lib/jeffery/reviews/runReview";

export type KbGateStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "lex_review"
  | "lex_approved";

export type JefferyVerdictStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "needs_human";

export interface PromoteInput {
  currentStatus: KbGateStatus;
  targetStatus: KbGateStatus;
  gateProfile: KbGateProfile;
  synthesisType?: string | null;
  extractionConfidence?: number | null;
  hasLexApprovedDecision: boolean;
  reviewQueueOpen?: boolean;
}

export interface PromoteGuardResult {
  ok: boolean;
  reason?: string;
}

const LIVE_STATUSES: KbGateStatus[] = ["approved", "lex_approved"];

export function isLiveGateStatus(status: KbGateStatus): boolean {
  return LIVE_STATUSES.includes(status);
}

/**
 * Pure guard: whether a Marshall/Lex promotion is allowed.
 * Does NOT set Jeffery approved; after promote, jeffery_verdict stays pending
 * until record_jeffery_review (221A fail-closed).
 */
export function canPromoteKbItem(input: PromoteInput): PromoteGuardResult {
  const {
    targetStatus,
    gateProfile,
    synthesisType,
    extractionConfidence,
    hasLexApprovedDecision,
    reviewQueueOpen,
  } = input;

  if (targetStatus === "pending") {
    return { ok: false, reason: "cannot_promote_to_pending" };
  }

  if (needsHumanReview(extractionConfidence) && isLiveGateStatus(targetStatus)) {
    return { ok: false, reason: "low_confidence_requires_review" };
  }

  if (reviewQueueOpen && isLiveGateStatus(targetStatus)) {
    return { ok: false, reason: "review_queue_open" };
  }

  const requiresLex =
    gateProfile === "lex_lane" ||
    synthesisType === "sku_competitive_comparison";

  if (targetStatus === "lex_approved") {
    if (!requiresLex) {
      return { ok: false, reason: "lex_approved_only_for_lex_lane" };
    }
    if (!hasLexApprovedDecision) {
      return { ok: false, reason: "lex_decision_required" };
    }
  }

  if (
    requiresLex &&
    targetStatus === "approved" &&
    synthesisType === "sku_competitive_comparison"
  ) {
    return { ok: false, reason: "c3_must_use_lex_approved" };
  }

  return { ok: true };
}

/**
 * Consumer/agent retrieval eligibility (221A hard-block).
 * Marshall/Lex gate alone is insufficient.
 */
export function canRetrieveKbItem(opts: {
  gateStatus: string;
  jefferyVerdict: string | null | undefined;
}): boolean {
  return isKbItemRetrievable(opts);
}
