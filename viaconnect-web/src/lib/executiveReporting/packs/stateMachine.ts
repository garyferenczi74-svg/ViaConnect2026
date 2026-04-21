// Prompt #105 Workstream B — board pack state machine.
// Enforces the CFO → CEO typed-confirmation approval chain.

import type { PackState } from '../types';

export const ALLOWED_PACK_TRANSITIONS: Record<PackState, readonly PackState[]> = {
  draft: ['mdna_pending', 'archived'],
  mdna_pending: ['mdna_drafted', 'draft'],
  mdna_drafted: ['cfo_review', 'mdna_pending'],
  cfo_review: ['cfo_approved', 'mdna_drafted', 'mdna_pending'],
  cfo_approved: ['pending_ceo_approval', 'cfo_review'],
  pending_ceo_approval: ['issued', 'cfo_review'], // CEO can kick back
  issued: ['erratum_issued', 'archived'],          // immutable-content; only state flips
  erratum_issued: ['archived'],
  archived: [],
};

export function canTransitionPack(from: PackState, to: PackState): boolean {
  return (ALLOWED_PACK_TRANSITIONS[from] as readonly PackState[]).includes(to);
}

/** Pure: terminal-ish states after which no structural edits are allowed
 *  (DB triggers also enforce, this is the client-side short-circuit). */
export function isPackContentFrozen(state: PackState): boolean {
  return state === 'issued' || state === 'erratum_issued' || state === 'archived';
}

/** Pure: can sections still be edited (content or commentary)? */
export function canEditPackSections(state: PackState): boolean {
  return (
    state === 'draft'
    || state === 'mdna_pending'
    || state === 'mdna_drafted'
    || state === 'cfo_review'
  );
}
