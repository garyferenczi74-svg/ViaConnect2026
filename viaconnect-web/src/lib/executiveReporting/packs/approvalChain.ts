// Prompt #105 — CFO → CEO typed-confirmation approval chain.

import { canTransitionPack } from './stateMachine';
import type { PackState } from '../types';

export type ApprovalError =
  | 'PACK_NOT_IN_CFO_REVIEW'
  | 'PACK_NOT_IN_PENDING_CEO_APPROVAL'
  | 'CFO_APPROVAL_MISSING'
  | 'CEO_CONFIRMATION_TEXT_MISMATCH'
  | 'MISSING_CEO_ROLE';

/** Typed-confirmation phrase the CEO must enter to issue a pack. */
export const CEO_ISSUE_CONFIRMATION_PHRASE = 'ISSUE PACK';

export function validateCEOIssueConfirmation(typed: string): boolean {
  return typed === CEO_ISSUE_CONFIRMATION_PHRASE;
}

export interface CFOApprovalInput {
  currentState: PackState;
  mdnaSectionsAllCFOApproved: boolean;
}

/** Pure: determine whether CFO can advance the pack to cfo_approved.
 *  Every MD&A-drafted section must first be approved individually
 *  before the pack-level CFO approval. */
export function cfoApprovalPrecheck(input: CFOApprovalInput): ApprovalError | null {
  if (input.currentState !== 'cfo_review') return 'PACK_NOT_IN_CFO_REVIEW';
  if (!input.mdnaSectionsAllCFOApproved) return 'CFO_APPROVAL_MISSING';
  if (!canTransitionPack(input.currentState, 'cfo_approved')) return 'PACK_NOT_IN_CFO_REVIEW';
  return null;
}

export interface CEOIssueInput {
  currentState: PackState;
  cfoApprovedAt: string | null;
  typedConfirmation: string;
  actorHasCEORole: boolean;
}

/** Pure: determine whether CEO can issue the pack. Requires (a) state
 *  is pending_ceo_approval, (b) CFO already approved (timestamp set),
 *  (c) actor holds the CEO role, (d) typed confirmation matches. */
export function ceoIssuePrecheck(input: CEOIssueInput): ApprovalError | null {
  if (input.currentState !== 'pending_ceo_approval') return 'PACK_NOT_IN_PENDING_CEO_APPROVAL';
  if (!input.cfoApprovedAt) return 'CFO_APPROVAL_MISSING';
  if (!input.actorHasCEORole) return 'MISSING_CEO_ROLE';
  if (!validateCEOIssueConfirmation(input.typedConfirmation)) {
    return 'CEO_CONFIRMATION_TEXT_MISMATCH';
  }
  return null;
}
