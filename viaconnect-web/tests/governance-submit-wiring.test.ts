// Prompt #95 Phase 4: pure test for buildApprovalRows.
// Ensures that given a classification + the active approver_assignments,
// exactly the right proposal_approvals rows are emitted.

import { describe, it, expect } from 'vitest';
import { buildApprovalRows } from '@/lib/governance/submit-wiring';
import type { ApproverRole, ClassificationResult } from '@/types/governance';

const PROPOSAL_ID = '10000000-0000-0000-0000-000000000001';
const GARY = 'aa000000-0000-0000-0000-000000000001';
const DOMENIC = 'aa000000-0000-0000-0000-000000000002';
const THOMAS = 'aa000000-0000-0000-0000-000000000003';
const FADI = 'aa000000-0000-0000-0000-000000000004';
const BOARD1 = 'aa000000-0000-0000-0000-000000000005';
const BOARD2 = 'aa000000-0000-0000-0000-000000000006';

function classification(overrides: Partial<ClassificationResult> = {}): ClassificationResult {
  return {
    tier: 'moderate',
    percentChange: 10,
    reasons: [],
    requiredApprovers: ['ceo', 'cfo'] as ApproverRole[],
    advisoryApprovers: ['advisory_cto'] as ApproverRole[],
    requiresBoardNotification: false,
    requiresBoardApproval: false,
    slaHours: 24,
    ...overrides,
  };
}

describe('buildApprovalRows', () => {
  it('creates rows for required + advisory roles that have assignments', () => {
    const rows = buildApprovalRows({
      proposalId: PROPOSAL_ID,
      classification: classification(),
      activeAssignments: [
        { approver_role: 'ceo', user_id: GARY },
        { approver_role: 'cfo', user_id: DOMENIC },
        { approver_role: 'advisory_cto', user_id: THOMAS },
        { approver_role: 'advisory_medical', user_id: FADI },
      ],
    });
    expect(rows).toHaveLength(3);
    const roles = rows.map((r) => r.approver_role).sort();
    expect(roles).toEqual(['advisory_cto', 'ceo', 'cfo']);
    expect(rows.find((r) => r.approver_role === 'ceo')?.is_required).toBe(true);
    expect(rows.find((r) => r.approver_role === 'advisory_cto')?.is_required).toBe(false);
    expect(rows.find((r) => r.approver_role === 'advisory_cto')?.is_advisory).toBe(true);
  });

  it('handles multiple board members on structural proposal', () => {
    const rows = buildApprovalRows({
      proposalId: PROPOSAL_ID,
      classification: classification({
        tier: 'structural',
        requiredApprovers: ['ceo', 'cfo', 'board_member'],
        advisoryApprovers: ['advisory_cto'],
        requiresBoardApproval: true,
      }),
      activeAssignments: [
        { approver_role: 'ceo', user_id: GARY },
        { approver_role: 'cfo', user_id: DOMENIC },
        { approver_role: 'board_member', user_id: BOARD1 },
        { approver_role: 'board_member', user_id: BOARD2 },
        { approver_role: 'advisory_cto', user_id: THOMAS },
      ],
    });
    expect(rows).toHaveLength(5);
    const boardRows = rows.filter((r) => r.approver_role === 'board_member');
    expect(boardRows).toHaveLength(2);
    expect(boardRows.every((r) => r.is_required)).toBe(true);
  });

  it('skips unassigned roles without error', () => {
    const rows = buildApprovalRows({
      proposalId: PROPOSAL_ID,
      classification: classification({
        requiredApprovers: ['ceo', 'cfo'],
        advisoryApprovers: ['advisory_cto'],
      }),
      activeAssignments: [
        { approver_role: 'ceo', user_id: GARY },
        // cfo unassigned
        // advisory_cto unassigned
      ],
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].approver_role).toBe('ceo');
  });

  it('ignores assignments for roles not in classification', () => {
    const rows = buildApprovalRows({
      proposalId: PROPOSAL_ID,
      classification: classification({
        requiredApprovers: ['ceo'],
        advisoryApprovers: [],
      }),
      activeAssignments: [
        { approver_role: 'ceo', user_id: GARY },
        { approver_role: 'cfo', user_id: DOMENIC },
        { approver_role: 'board_member', user_id: BOARD1 },
      ],
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].approver_role).toBe('ceo');
  });

  it('deduplicates same user on the same proposal', () => {
    const rows = buildApprovalRows({
      proposalId: PROPOSAL_ID,
      classification: classification({
        requiredApprovers: ['ceo', 'cfo'],
        advisoryApprovers: ['advisory_cto'],
      }),
      activeAssignments: [
        { approver_role: 'ceo', user_id: GARY },
        { approver_role: 'advisory_cto', user_id: GARY }, // same user, different role
      ],
    });
    // Only the first (ceo/required) row is kept for Gary.
    expect(rows).toHaveLength(1);
    expect(rows[0].approver_role).toBe('ceo');
    expect(rows[0].is_required).toBe(true);
  });

  it('empty classification + empty assignments -> empty rows', () => {
    const rows = buildApprovalRows({
      proposalId: PROPOSAL_ID,
      classification: classification({
        requiredApprovers: [],
        advisoryApprovers: [],
      }),
      activeAssignments: [],
    });
    expect(rows).toEqual([]);
  });
});
