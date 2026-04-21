// Prompt #105 §3.3 — NDA-on-file gate, the single choke point for
// any distribution or portal access grant.

import type { NDAStatus } from '../types';

export type NDAGateOutcome =
  | 'allow'
  | 'deny_not_on_file'
  | 'deny_expired'
  | 'deny_departed';

export interface NDAGateInput {
  ndaStatus: NDAStatus;
  ndaExpiresAt: string | null;
  departureDate: string | null;
  accessRevokedAt: string | null;
  now?: Date;
}

/** Pure: single source of truth for "can this board member currently
 *  receive/access a pack". The DB trigger + RLS + edge function all
 *  call into this function. */
export function evaluateNDAGate(input: NDAGateInput): NDAGateOutcome {
  const now = input.now ?? new Date();
  if (input.accessRevokedAt !== null) return 'deny_departed';
  if (input.departureDate !== null) {
    const dep = new Date(input.departureDate + 'T00:00:00Z');
    if (dep.getTime() <= now.getTime()) return 'deny_departed';
  }
  if (input.ndaStatus !== 'on_file') return 'deny_not_on_file';
  if (input.ndaExpiresAt !== null) {
    const exp = new Date(input.ndaExpiresAt + 'T00:00:00Z');
    if (exp.getTime() <= now.getTime()) return 'deny_expired';
  }
  return 'allow';
}
