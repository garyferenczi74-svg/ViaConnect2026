// Prompt #95 Phase 4: pure approval tally.
//
// Given the complete list of approval rows attached to a proposal, returns
// whether we should (a) remain waiting, (b) transition to rejected (any
// required approver rejected), or (c) transition to approved. Advisory
// approvers never block or approve; their comments are recorded but don't
// affect state.

export type TallyInput = Array<{
  is_required: boolean;
  is_advisory: boolean;
  decision: 'approved' | 'rejected' | 'abstain' | null;
}>;

export type TallyOutcome =
  | { kind: 'waiting'; pendingRequired: number }
  | { kind: 'rejected'; rejectedBy: number }
  | { kind: 'approved'; approvedBy: number }
  | { kind: 'stalled_on_abstention'; abstentions: number };

/** Pure: compute the next workflow outcome for a proposal given its
 *  approval rows. */
export function tallyApprovals(approvals: TallyInput): TallyOutcome {
  const required = approvals.filter((a) => a.is_required && !a.is_advisory);

  // A proposal with zero required approvers should never auto-approve;
  // the submit endpoint surfaces this as "missing_required_roles" so an
  // admin can fix the assignments before decisions are possible.
  if (required.length === 0) {
    return { kind: 'waiting', pendingRequired: 0 };
  }

  // Short-circuit on any required rejection.
  const rejections = required.filter((a) => a.decision === 'rejected');
  if (rejections.length > 0) {
    return { kind: 'rejected', rejectedBy: rejections.length };
  }

  // If any required approver hasn't decided yet, wait.
  const undecided = required.filter((a) => a.decision === null);
  if (undecided.length > 0) {
    return { kind: 'waiting', pendingRequired: undecided.length };
  }

  // All required have decided. If any abstained AND none approved, the
  // proposal is stalled. (Unusual edge case.)
  const approved = required.filter((a) => a.decision === 'approved');
  const abstained = required.filter((a) => a.decision === 'abstain');

  if (approved.length === 0 && abstained.length > 0) {
    return { kind: 'stalled_on_abstention', abstentions: abstained.length };
  }

  // Normal case: at least one required approved, none rejected, none
  // still undecided, treat as approved.
  return { kind: 'approved', approvedBy: approved.length };
}
