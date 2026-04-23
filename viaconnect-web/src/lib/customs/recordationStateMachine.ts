// Prompt #114 P2b: Recordation state machine.
//
// Pure function deciding whether a recordation status transition is valid.
// Mirrors the #104 caseStateMachine.ts pattern. The app uses canTransition()
// to return 409 before the DB layer (which relies on column CHECK + the
// CEO-approval trigger) fires a generic 500.
//
// Lifecycle:
//   draft           -> pending_fee | withdrawn
//   pending_fee     -> under_review | withdrawn
//   under_review    -> active | withdrawn
//   active          -> grace_period | withdrawn
//   grace_period    -> active (renewal filed + fees paid) | expired | withdrawn
//   expired         -> withdrawn (terminal; re-application is a new row)
//   withdrawn       -> (terminal)

import type { CustomsRecordationStatus } from './types';

export const VALID_RECORDATION_TRANSITIONS: ReadonlyMap<
  CustomsRecordationStatus,
  ReadonlySet<CustomsRecordationStatus>
> = new Map([
  ['draft',        new Set<CustomsRecordationStatus>(['pending_fee', 'withdrawn'])],
  ['pending_fee',  new Set<CustomsRecordationStatus>(['under_review', 'withdrawn'])],
  ['under_review', new Set<CustomsRecordationStatus>(['active', 'withdrawn'])],
  ['active',       new Set<CustomsRecordationStatus>(['grace_period', 'withdrawn'])],
  ['grace_period', new Set<CustomsRecordationStatus>(['active', 'expired', 'withdrawn'])],
  ['expired',      new Set<CustomsRecordationStatus>(['withdrawn'])],
  ['withdrawn',    new Set<CustomsRecordationStatus>()],
]);

export interface TransitionInput {
  from: CustomsRecordationStatus;
  to: CustomsRecordationStatus;
}

export type TransitionReason =
  | 'identical_state'
  | 'unknown_from_state'
  | 'unknown_to_state'
  | 'transition_not_permitted';

export interface TransitionResult {
  ok: boolean;
  reason?: TransitionReason;
}

export function canTransition({ from, to }: TransitionInput): TransitionResult {
  if (from === to) return { ok: false, reason: 'identical_state' };
  const allowed = VALID_RECORDATION_TRANSITIONS.get(from);
  if (!allowed) return { ok: false, reason: 'unknown_from_state' };
  if (!VALID_RECORDATION_TRANSITIONS.has(to)) return { ok: false, reason: 'unknown_to_state' };
  if (!allowed.has(to)) return { ok: false, reason: 'transition_not_permitted' };
  return { ok: true };
}

export function validateTransition(input: TransitionInput): void {
  const r = canTransition(input);
  if (!r.ok) {
    throw new Error(`Invalid recordation state transition ${input.from} -> ${input.to}: ${r.reason}`);
  }
}

export function allowedNextStatuses(from: CustomsRecordationStatus): CustomsRecordationStatus[] {
  const allowed = VALID_RECORDATION_TRANSITIONS.get(from);
  return allowed ? Array.from(allowed) : [];
}
