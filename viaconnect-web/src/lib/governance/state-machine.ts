// Prompt #95 Phase 4: proposal approval state machine.
//
// Pure: no DB, no side effects. Returns the new status or an error string
// describing why the transition is not permitted. 90%+ test coverage is the
// bar for this module because governance integrity depends on correctness.

import type { ProposalStatus } from '@/types/governance';

export type ProposalAction =
  | 'submit'
  | 'record_approval'
  | 'record_rejection'
  | 'record_abstention'
  | 'all_required_approved'
  | 'activate'
  | 'rollback'
  | 'withdraw'
  | 'expire';

/** Transitions allowed from each state. Terminal states (rejected, rolled_back,
 *  withdrawn, expired) have no outgoing actions.
 *
 *  `activating` is a transient status set by the atomic claim RPC
 *  `claim_pending_proposal_activations`. Only the activator Edge Function
 *  should see rows in this state, and it must transition them to
 *  `activated` (or back to `approved_pending_activation` on failure)
 *  within the same invocation. */
const VALID: Record<ProposalStatus, ProposalAction[]> = {
  draft: ['submit', 'withdraw'],
  submitted_for_approval: [
    'record_approval',
    'record_rejection',
    'record_abstention',
    'all_required_approved',
    'withdraw',
    'expire',
  ],
  under_review: [
    'record_approval',
    'record_rejection',
    'record_abstention',
    'all_required_approved',
    'withdraw',
    'expire',
  ],
  approved_pending_activation: ['activate', 'withdraw'],
  activating: ['activate', 'withdraw'],
  activated: ['rollback'],
  rolled_back: [],
  rejected: [],
  withdrawn: [],
  expired: [],
};

/** Pure: true iff `action` is permitted from `currentStatus`. */
export function canTransition(currentStatus: ProposalStatus, action: ProposalAction): boolean {
  return (VALID[currentStatus] ?? []).includes(action);
}

export interface TransitionResult {
  ok: boolean;
  nextStatus?: ProposalStatus;
  error?: string;
}

/** Pure: given current status + action, return the next status. Encodes the
 *  domain-specific mapping (e.g., record_approval keeps state in under_review
 *  until all_required_approved fires). */
export function applyTransition(
  currentStatus: ProposalStatus,
  action: ProposalAction,
): TransitionResult {
  if (!canTransition(currentStatus, action)) {
    return { ok: false, error: `Cannot ${action} while status is ${currentStatus}` };
  }

  switch (action) {
    case 'submit':
      return { ok: true, nextStatus: 'submitted_for_approval' };

    case 'record_approval':
    case 'record_abstention':
      // Individual approvals / abstentions keep us in under_review; the
      // full-tally transition fires via `all_required_approved`.
      return {
        ok: true,
        nextStatus: currentStatus === 'submitted_for_approval' ? 'under_review' : currentStatus,
      };

    case 'record_rejection':
      // Any single required rejection terminates immediately.
      return { ok: true, nextStatus: 'rejected' };

    case 'all_required_approved':
      return { ok: true, nextStatus: 'approved_pending_activation' };

    case 'activate':
      return { ok: true, nextStatus: 'activated' };

    case 'rollback':
      return { ok: true, nextStatus: 'rolled_back' };

    case 'withdraw':
      return { ok: true, nextStatus: 'withdrawn' };

    case 'expire':
      return { ok: true, nextStatus: 'expired' };

    default:
      return { ok: false, error: `Unhandled action: ${action as string}` };
  }
}

/** Pure: return every action that's valid from the given status. */
export function permittedActions(currentStatus: ProposalStatus): ProposalAction[] {
  return VALID[currentStatus] ?? [];
}

/** Pure: terminal statuses cannot transition. */
export function isTerminal(status: ProposalStatus): boolean {
  return permittedActions(status).length === 0;
}
