// Prompt #95 Phase 4: submit-flow helper that creates proposal_approvals
// rows from the classification result + active approver assignments.
// Pure where possible; touches DB only to resolve approver user ids.

import { createClient } from '@/lib/supabase/server';
import type {
  ApproverRole,
  ClassificationResult,
} from '@/types/governance';

export interface ApprovalRowInput {
  proposal_id: string;
  approver_user_id: string;
  approver_role: ApproverRole;
  is_required: boolean;
  is_advisory: boolean;
}

/** Pure: given the classification + the active approver assignments,
 *  emit the proposal_approvals rows that should be inserted. */
export function buildApprovalRows(params: {
  proposalId: string;
  classification: ClassificationResult;
  activeAssignments: Array<{ approver_role: ApproverRole; user_id: string }>;
}): ApprovalRowInput[] {
  const rows: ApprovalRowInput[] = [];
  const seen = new Set<string>();

  const requiredSet = new Set(params.classification.requiredApprovers);
  const advisorySet = new Set(params.classification.advisoryApprovers);

  for (const a of params.activeAssignments) {
    const isRequired = requiredSet.has(a.approver_role);
    const isAdvisory = advisorySet.has(a.approver_role);
    if (!isRequired && !isAdvisory) continue;
    const key = `${params.proposalId}:${a.user_id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push({
      proposal_id: params.proposalId,
      approver_user_id: a.user_id,
      approver_role: a.approver_role,
      is_required: isRequired,
      is_advisory: isAdvisory,
    });
  }
  return rows;
}

/** DB-backed: resolve active approver_assignments for all unique roles
 *  referenced by the classification. */
export async function loadActiveAssignmentsForClassification(
  classification: ClassificationResult,
): Promise<Array<{ approver_role: ApproverRole; user_id: string }>> {
  const roles = Array.from(
    new Set([...classification.requiredApprovers, ...classification.advisoryApprovers]),
  );
  if (roles.length === 0) return [];

  const supabase = createClient();
  const { data, error } = await supabase
    .from('approver_assignments')
    .select('approver_role, user_id')
    .in('approver_role', roles)
    .eq('is_active', true);
  if (error) throw new Error(`Failed to load approver_assignments: ${error.message}`);

  return (data ?? []) as Array<{ approver_role: ApproverRole; user_id: string }>;
}
