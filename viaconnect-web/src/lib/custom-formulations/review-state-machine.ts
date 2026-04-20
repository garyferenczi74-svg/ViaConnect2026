// Prompt #97 Phase 4: dual-review state machine (pure).
//
// Medical (Fadi) and regulatory (Steve) reviews run in parallel once a
// formulation reaches ready_for_review. Either rejection or revision is
// terminal for the current version; both approvals advance to
// approved_pending_development_fee.
//
// Pure function: given the current formulation status + incoming decisions
// from each reviewer, compute the next status. 90%+ test coverage required.

import type { FormulationStatus, ReviewDecision } from '@/types/custom-formulations';

export interface ReviewState {
  formulationStatus: FormulationStatus;
  medical: ReviewDecision | null;
  regulatory: ReviewDecision | null;
}

export type ReviewTransition =
  | {
      kind: 'advance';
      next: FormulationStatus;
      reason: string;
    }
  | { kind: 'stay'; reason: string }
  | { kind: 'error'; reason: string };

/** Pure: compute the next status given current state + a new review
 *  decision. Returns 'stay' if neither advances nor terminates (e.g., one
 *  approval recorded, other still pending). */
export function applyReviewDecision(
  state: ReviewState,
  who: 'medical' | 'regulatory',
  decision: ReviewDecision,
): ReviewTransition {
  // Only valid from ready_for_review / under_medical_review / under_regulatory_review.
  const VALID_ENTRY: FormulationStatus[] = [
    'ready_for_review',
    'under_medical_review',
    'under_regulatory_review',
  ];
  if (!VALID_ENTRY.includes(state.formulationStatus)) {
    return {
      kind: 'error',
      reason: `Cannot record ${who} review in status ${state.formulationStatus}`,
    };
  }

  // Rejection is terminal immediately, regardless of other reviewer.
  if (decision === 'rejected') {
    return { kind: 'advance', next: 'rejected', reason: `${who} rejected` };
  }

  // Revision is terminal for this version immediately.
  if (decision === 'revision_requested') {
    return { kind: 'advance', next: 'revision_requested', reason: `${who} requested revision` };
  }

  // Approval: merge with the other reviewer's prior decision (if any).
  const other = who === 'medical' ? state.regulatory : state.medical;

  if (other === 'approved') {
    return {
      kind: 'advance',
      next: 'approved_pending_development_fee',
      reason: 'Both reviewers approved',
    };
  }

  if (other === null) {
    // First reviewer has approved; move the formulation into "under X review"
    // so the UI reflects pending counterpart.
    const nextStatus: FormulationStatus =
      who === 'medical' ? 'under_regulatory_review' : 'under_medical_review';
    return {
      kind: 'advance',
      next: nextStatus,
      reason: `${who} approved; waiting on ${who === 'medical' ? 'regulatory' : 'medical'}`,
    };
  }

  // The only remaining possibility is the other reviewer has already
  // rejected or requested revision — but those transitions would have
  // moved the formulation out of VALID_ENTRY. Treat as a programmer error.
  return {
    kind: 'error',
    reason: `Inconsistent state: counterpart decision is ${other} while status is ${state.formulationStatus}`,
  };
}

/** Pure: given the final aggregate of both reviews, determine if the
 *  formulation should transition to approved_pending_development_fee.
 *  Useful when both reviewers land on the same day and a single tally pass
 *  decides everything. */
export function finalApprovalStatus(
  medical: ReviewDecision | null,
  regulatory: ReviewDecision | null,
): FormulationStatus {
  if (medical === 'rejected' || regulatory === 'rejected') return 'rejected';
  if (medical === 'revision_requested' || regulatory === 'revision_requested') {
    return 'revision_requested';
  }
  if (medical === 'approved' && regulatory === 'approved') {
    return 'approved_pending_development_fee';
  }
  if (medical === 'approved' && regulatory === null) return 'under_regulatory_review';
  if (medical === null && regulatory === 'approved') return 'under_medical_review';
  return 'ready_for_review';
}

/** Pure: once both reviews approve, the formulation sits in
 *  approved_pending_development_fee until the Stripe PaymentIntent is
 *  captured. That capture transitions to approved_production_ready. */
export function applyDevelopmentFeeCaptured(
  current: FormulationStatus,
): FormulationStatus | null {
  if (current !== 'approved_pending_development_fee') return null;
  return 'approved_production_ready';
}
