// Prompt #104 Phase 1: Case state machine.
//
// Pure function deciding whether a state transition is valid. Mirrors
// the lifecycle diagram in spec §4.1. Invalid transitions throw via
// `validateTransition`; the API + admin UI use `canTransition` to
// gate buttons. The DB layer also rejects via a CHECK / trigger pair
// added in migration 20260423000020.

import type { LegalCaseState } from './types';

export const VALID_LEGAL_TRANSITIONS: ReadonlyMap<LegalCaseState, ReadonlySet<LegalCaseState>> = new Map([
  ['intake', new Set<LegalCaseState>(['triage_ai', 'closed_no_action'])],
  ['triage_ai', new Set<LegalCaseState>(['pending_human_triage', 'pending_medical_director_review', 'closed_no_action'])],
  ['pending_human_triage', new Set<LegalCaseState>(['pending_medical_director_review', 'classified', 'closed_no_action'])],
  ['pending_medical_director_review', new Set<LegalCaseState>(['classified', 'closed_no_action'])],
  ['classified', new Set<LegalCaseState>(['active_enforcement', 'escalated_to_outside_counsel', 'closed_no_action'])],
  ['active_enforcement', new Set<LegalCaseState>([
    'resolved_successful',
    'resolved_unsuccessful',
    'escalated_to_outside_counsel',
    'escalated_to_litigation',
    'closed_no_action',
  ])],
  ['resolved_unsuccessful', new Set<LegalCaseState>(['active_enforcement', 'escalated_to_outside_counsel', 'escalated_to_litigation', 'closed_no_action', 'archived'])],
  ['escalated_to_outside_counsel', new Set<LegalCaseState>([
    'escalated_to_litigation',
    'resolved_successful',
    'resolved_unsuccessful',
    'closed_no_action',
  ])],
  ['escalated_to_litigation', new Set<LegalCaseState>([
    'resolved_successful',
    'resolved_unsuccessful',
    'closed_no_action',
  ])],
  ['resolved_successful', new Set<LegalCaseState>(['archived'])],
  ['closed_no_action', new Set<LegalCaseState>(['archived'])],
  ['archived', new Set<LegalCaseState>()],
]);

export interface TransitionInput {
  from: LegalCaseState;
  to: LegalCaseState;
}

export interface TransitionResult {
  ok: boolean;
  reason?:
    | 'identical_state'
    | 'unknown_from_state'
    | 'unknown_to_state'
    | 'transition_not_permitted';
}

export function canTransition({ from, to }: TransitionInput): TransitionResult {
  if (from === to) return { ok: false, reason: 'identical_state' };
  const allowed = VALID_LEGAL_TRANSITIONS.get(from);
  if (!allowed) return { ok: false, reason: 'unknown_from_state' };
  if (!VALID_LEGAL_TRANSITIONS.has(to)) return { ok: false, reason: 'unknown_to_state' };
  if (!allowed.has(to)) return { ok: false, reason: 'transition_not_permitted' };
  return { ok: true };
}

export function validateTransition(input: TransitionInput): void {
  const r = canTransition(input);
  if (!r.ok) {
    throw new Error(`Invalid case state transition ${input.from} -> ${input.to}: ${r.reason}`);
  }
}
