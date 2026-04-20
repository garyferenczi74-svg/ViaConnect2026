// Prompt #102 Workstream B — dispute validation + escrow rules.

export type DisputeReason =
  | 'refund_was_invalid'
  | 'map_violation_was_not_mine'
  | 'calculation_error'
  | 'other';

export type DisputeStatus =
  | 'pending_review'
  | 'more_info_requested'
  | 'approved'
  | 'partially_approved'
  | 'rejected';

export const DISPUTE_EXPLANATION_MIN_CHARS = 10;
export const DISPUTE_EXPLANATION_MAX_CHARS = 2000;
export const MAX_DISPUTE_SUPPORTING_DOCS = 3;
export const MAX_DISPUTE_DOC_BYTES = 5 * 1024 * 1024;

export type DisputeValidationError =
  | 'EXPLANATION_TOO_SHORT'
  | 'EXPLANATION_TOO_LONG'
  | 'TOO_MANY_DOCS'
  | 'DOC_TOO_LARGE';

export function validateDisputeExplanation(text: string): DisputeValidationError | null {
  if (text.length < DISPUTE_EXPLANATION_MIN_CHARS) return 'EXPLANATION_TOO_SHORT';
  if (text.length > DISPUTE_EXPLANATION_MAX_CHARS) return 'EXPLANATION_TOO_LONG';
  return null;
}

export function validateDisputeDocs(
  files: ReadonlyArray<{ size: number }>,
): DisputeValidationError | null {
  if (files.length > MAX_DISPUTE_SUPPORTING_DOCS) return 'TOO_MANY_DOCS';
  for (const f of files) if (f.size > MAX_DISPUTE_DOC_BYTES) return 'DOC_TOO_LARGE';
  return null;
}

/** Pure: §3.3 + §5.6 — a dispute holds the disputed amount only;
 *  other payouts flow normally. Given the contested line amount and
 *  the reconciliation's net payable, compute (held, remaining). */
export function splitEscrowVsRelease(
  contestedAmountCents: number,
  netPayableCents: number,
): { heldInEscrowCents: number; releasedCents: number } {
  const held = Math.min(Math.abs(contestedAmountCents), Math.max(0, netPayableCents));
  const released = Math.max(0, netPayableCents - held);
  return { heldInEscrowCents: held, releasedCents: released };
}
