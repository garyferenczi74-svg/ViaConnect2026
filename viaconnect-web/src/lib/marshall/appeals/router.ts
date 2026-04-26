/**
 * Escalation router (Prompt #123 §8 + §16.1).
 *
 * Determines whether a recommendation requires a second approver before the
 * sender will dispatch. Server-enforced: the send route must call
 * resolveDualApproval and refuse to send when requires_dual_approval is true
 * and second_approver is null.
 */

import type { AppealRecommendation } from "./types";

export interface DualApprovalContext {
  recommendation: AppealRecommendation;
  /** Active strike count BEFORE this decision lands. */
  practitionerStrikeCount: number;
  /** Severity of the underlying finding ('P0','P1','P2','P3'). */
  findingSeverity: string;
  /** True when the recommendation triggers an external referral (legal counsel, regulator). */
  triggersExternalReferral: boolean;
  /** True when the underlying finding has clinical implications requiring Dr Fadi review. */
  triggersClinicalReview: boolean;
}

export interface DualApprovalRequirement {
  required: boolean;
  approvers: string[];
  reason: string;
}

export function resolveDualApproval(ctx: DualApprovalContext): DualApprovalRequirement {
  // Spec section 8 escalation ladder. Each row of the ladder is a discrete
  // condition; the first condition that matches sets the requirement.
  if (ctx.recommendation === "uphold" && ctx.practitionerStrikeCount >= 2) {
    return {
      required: true,
      approvers: ["gary"],
      reason: "Upholding this finding triggers a third strike and account suspension; CEO co-sign required.",
    };
  }
  if (ctx.recommendation === "reverse" && ctx.practitionerStrikeCount >= 2) {
    return {
      required: true,
      approvers: ["thomas"],
      reason: "Reversing a finding for a practitioner with two prior strikes; CTO co-sign required.",
    };
  }
  if (ctx.triggersExternalReferral) {
    return {
      required: true,
      approvers: ["gary", "thomas"],
      reason: "Recommendation triggers external referral (legal counsel or regulator); CEO + CTO co-sign required.",
    };
  }
  if (ctx.triggersClinicalReview) {
    return {
      required: true,
      approvers: ["gary", "fadi"],
      reason: "Recommendation has clinical implications; CEO + Medical Director co-sign required.",
    };
  }
  if (ctx.recommendation === "reverse" && ctx.findingSeverity === "P0") {
    return {
      required: true,
      approvers: ["thomas"],
      reason: "Reversing a P0 finding requires CTO co-sign.",
    };
  }
  return { required: false, approvers: [], reason: "Single-approval path." };
}
