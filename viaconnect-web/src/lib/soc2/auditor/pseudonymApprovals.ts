// Prompt #122 P9: Pseudonym-resolution approval lifecycle helper.
//
// The P1 access_log trigger makes every row immutable after INSERT, so we
// model the approval state as a stream of log events tied to the original
// request by (packet_id, resolved_pseudonym).
//
// Event sequence:
//   1. 'pseudonym_resolve_request' — the request row (master, has the
//      justification).
//   2. 'pseudonym_resolve_granted' with approver_steve set — Steve's approval.
//   3. 'pseudonym_resolve_granted' with approver_thomas set — Thomas's approval.
//   4. 'pseudonym_resolve_granted' with BOTH approver_steve AND
//      approver_thomas set — the resolution result. target_path holds the
//      resolved real ID (comma-separated if multiple matches).
//   5. 'pseudonym_resolve_denied' — any approver said no; terminates the flow.

import type { SupabaseClient } from '@supabase/supabase-js';

export type ApprovalState =
  | 'pending'            // only the request row exists
  | 'steve_approved'     // Steve signed; Thomas pending
  | 'thomas_approved'    // Thomas signed; Steve pending
  | 'both_approved'      // Steve + Thomas both signed; resolution runs
  | 'resolved'           // resolution event present
  | 'denied';

export interface ApprovalSnapshot {
  state: ApprovalState;
  requestRow: LogRow;
  steveApprovalRow: LogRow | null;
  thomasApprovalRow: LogRow | null;
  resolutionRow: LogRow | null;
  denialRow: LogRow | null;
}

export interface LogRow {
  id: number;
  grant_id: string;
  packet_id: string | null;
  action: string;
  target_path: string | null;
  resolved_pseudonym: string | null;
  justification: string | null;
  approver_steve: string | null;
  approver_thomas: string | null;
  occurred_at: string;
}

/**
 * Load every event tied to a given request row (same packet_id +
 * resolved_pseudonym) and classify the current state. The caller owns auth
 * checks.
 */
export async function snapshotApproval(
  supabase: SupabaseClient,
  requestLogId: number,
): Promise<ApprovalSnapshot | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  const { data: request } = await sb
    .from('soc2_auditor_access_log')
    .select('id, grant_id, packet_id, action, target_path, resolved_pseudonym, justification, approver_steve, approver_thomas, occurred_at')
    .eq('id', requestLogId)
    .maybeSingle();
  if (!request) return null;
  const req = request as LogRow;
  if (req.action !== 'pseudonym_resolve_request') return null;

  const { data: related } = await sb
    .from('soc2_auditor_access_log')
    .select('id, grant_id, packet_id, action, target_path, resolved_pseudonym, justification, approver_steve, approver_thomas, occurred_at')
    .eq('packet_id', req.packet_id)
    .eq('resolved_pseudonym', req.resolved_pseudonym)
    .order('occurred_at', { ascending: true });
  const rows = (related as LogRow[] | null) ?? [];

  return classifyFromRows(req, rows);
}

/** Pure state-machine classifier; exposed for unit testing without Supabase. */
export function classifyFromRows(requestRow: LogRow, rows: readonly LogRow[]): ApprovalSnapshot {
  let steveRow: LogRow | null = null;
  let thomasRow: LogRow | null = null;
  let resolutionRow: LogRow | null = null;
  let denialRow: LogRow | null = null;

  for (const r of rows) {
    if (r.id === requestRow.id) continue; // skip the master request row
    if (r.action === 'pseudonym_resolve_denied') {
      denialRow = r;
      continue;
    }
    if (r.action === 'pseudonym_resolve_granted') {
      const hasSteve = r.approver_steve !== null;
      const hasThomas = r.approver_thomas !== null;
      if (hasSteve && hasThomas) {
        resolutionRow = r;
      } else if (hasSteve) {
        steveRow = r;
      } else if (hasThomas) {
        thomasRow = r;
      }
    }
  }

  let state: ApprovalState;
  if (denialRow) {
    state = 'denied';
  } else if (resolutionRow) {
    state = 'resolved';
  } else if (steveRow && thomasRow) {
    state = 'both_approved';
  } else if (steveRow) {
    state = 'steve_approved';
  } else if (thomasRow) {
    state = 'thomas_approved';
  } else {
    state = 'pending';
  }

  return {
    state,
    requestRow,
    steveApprovalRow: steveRow,
    thomasApprovalRow: thomasRow,
    resolutionRow,
    denialRow,
  };
}

/**
 * Whether the given role is allowed to act as the "Steve" slot.
 * compliance_officer / compliance_admin are Steve's team. admin / superadmin
 * can break-glass. Returns false for legal_counsel / Thomas-side roles.
 */
export function canApproveAsSteve(role: string): boolean {
  return role === 'compliance_officer' || role === 'compliance_admin' || role === 'admin' || role === 'superadmin';
}

/**
 * Whether the given role is allowed to act as the "Thomas" slot. The
 * schema uses legal_counsel if defined; else superadmin stands in per the
 * standing Thomas-or-Gary co-sign pattern.
 */
export function canApproveAsThomas(role: string): boolean {
  return role === 'legal_counsel' || role === 'superadmin';
}
