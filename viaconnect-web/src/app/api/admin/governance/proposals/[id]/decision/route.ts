// Prompt #95 Phase 4: record an approver's decision.
//
// POST /api/admin/governance/proposals/[id]/decision
// Body: { decision: 'approved' | 'rejected' | 'abstain', notes?: string }
//
// The caller must have an active proposal_approvals row for this proposal.
// Updates the row, then re-tallies + transitions the proposal status.
// Only required approvers can trigger a state transition; advisory
// decisions are recorded but never change proposal state.
//
// Prompt #140b Layer 3 hardening: every Supabase call wrapped with withTimeout,
// outer try/catch with safeLog, structured timeout/error responses.

import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireGovernanceAdmin } from '@/lib/governance/admin-guard';
import { applyTransition } from '@/lib/governance/state-machine';
import { tallyApprovals } from '@/lib/governance/tally-approvals';
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';
import type { ProposalStatus } from '@/types/governance';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID();

  try {
    const auth = await requireGovernanceAdmin();
    if (auth.kind === 'error') return auth.response;

    const body = (await request.json().catch(() => null)) as
      | { decision?: 'approved' | 'rejected' | 'abstain'; notes?: string }
      | null;

    if (!body?.decision || !['approved', 'rejected', 'abstain'].includes(body.decision)) {
      return NextResponse.json(
        { error: 'decision must be approved | rejected | abstain' },
        { status: 400 },
      );
    }

    const supabase = createClient();

    const myApprovalRes = await withTimeout(
      (async () => supabase
        .from('proposal_approvals')
        .select('id, is_required, is_advisory, decision')
        .eq('proposal_id', params.id)
        .eq('approver_user_id', auth.userId)
        .maybeSingle())(),
      8000,
      'api.governance.decision.load-approval',
    );
    const mine = myApprovalRes.data as
      | { id: string; is_required: boolean; is_advisory: boolean; decision: string | null }
      | null;
    if (!mine) {
      return NextResponse.json(
        { error: 'You are not assigned as an approver for this proposal' },
        { status: 403 },
      );
    }

    const proposalRes = await withTimeout(
      (async () => supabase
        .from('pricing_proposals')
        .select('status')
        .eq('id', params.id)
        .maybeSingle())(),
      8000,
      'api.governance.decision.load-proposal',
    );
    const status = (proposalRes.data as { status: ProposalStatus } | null)?.status;
    if (!status) {
      return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
    }
    if (!['submitted_for_approval', 'under_review'].includes(status)) {
      return NextResponse.json(
        { error: `Cannot record a decision while proposal is ${status}` },
        { status: 409 },
      );
    }

    if (mine.is_advisory && !mine.is_required) {
      return NextResponse.json(
        {
          error:
            'Advisory approvers cannot record approve/reject/abstain. Use the advisory-comment endpoint to record sentiment.',
        },
        { status: 400 },
      );
    }

    const decisionUpdateRes = await withTimeout(
      (async () => supabase
        .from('proposal_approvals')
        .update({
          decision: body.decision,
          decided_at: new Date().toISOString(),
          decision_notes: body.notes?.trim() ?? null,
          updated_at: new Date().toISOString(),
        } as never)
        .eq('id', mine.id))(),
      8000,
      'api.governance.decision.update-decision',
    );
    if (decisionUpdateRes.error) {
      safeLog.error('api.governance.decision', 'decision update failed', { requestId, proposalId: params.id, error: decisionUpdateRes.error });
      return NextResponse.json({ error: decisionUpdateRes.error.message }, { status: 500 });
    }

    const allApprovalsRes = await withTimeout(
      (async () => supabase
        .from('proposal_approvals')
        .select('is_required, is_advisory, decision')
        .eq('proposal_id', params.id))(),
      8000,
      'api.governance.decision.load-all-approvals',
    );
    const outcome = tallyApprovals(
      (allApprovalsRes.data ?? []) as Array<{
        is_required: boolean;
        is_advisory: boolean;
        decision: 'approved' | 'rejected' | 'abstain' | null;
      }>,
    );

    let newStatus: ProposalStatus = status;
    if (outcome.kind === 'rejected') {
      const t = applyTransition(status, 'record_rejection');
      if (t.ok && t.nextStatus) newStatus = t.nextStatus;
    } else if (outcome.kind === 'approved') {
      const t = applyTransition(status, 'all_required_approved');
      if (t.ok && t.nextStatus) newStatus = t.nextStatus;
    } else if (status === 'submitted_for_approval') {
      const t = applyTransition(status, body.decision === 'approved' ? 'record_approval' : body.decision === 'rejected' ? 'record_rejection' : 'record_abstention');
      if (t.ok && t.nextStatus) newStatus = t.nextStatus;
    }

    if (newStatus !== status) {
      await withTimeout(
        (async () => supabase
          .from('pricing_proposals')
          .update({ status: newStatus, updated_at: new Date().toISOString() } as never)
          .eq('id', params.id))(),
        8000,
        'api.governance.decision.update-status',
      );
    }

    safeLog.info('api.governance.decision', 'decision recorded', {
      requestId, proposalId: params.id, userId: auth.userId, decision: body.decision, newStatus,
    });

    return NextResponse.json({
      ok: true,
      outcome: outcome.kind,
      new_proposal_status: newStatus,
    });
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.error('api.governance.decision', 'database timeout', { requestId, proposalId: params.id, error: err });
      return NextResponse.json({ error: 'Database operation timed out. Please try again.' }, { status: 503 });
    }
    safeLog.error('api.governance.decision', 'unexpected error', { requestId, proposalId: params.id, error: err });
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
