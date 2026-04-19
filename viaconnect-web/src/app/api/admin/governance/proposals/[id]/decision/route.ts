// Prompt #95 Phase 4: record an approver's decision.
//
// POST /api/admin/governance/proposals/[id]/decision
// Body: { decision: 'approved' | 'rejected' | 'abstain', notes?: string }
//
// The caller must have an active proposal_approvals row for this proposal.
// Updates the row, then re-tallies + transitions the proposal status.
// Only required approvers can trigger a state transition; advisory
// decisions are recorded but never change proposal state.

import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireGovernanceAdmin } from '@/lib/governance/admin-guard';
import { applyTransition } from '@/lib/governance/state-machine';
import { tallyApprovals } from '@/lib/governance/tally-approvals';
import type { ProposalStatus } from '@/types/governance';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
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

  // Verify the caller has an approval row for this proposal.
  const { data: myApproval } = await supabase
    .from('proposal_approvals')
    .select('id, is_required, is_advisory, decision')
    .eq('proposal_id', params.id)
    .eq('approver_user_id', auth.userId)
    .maybeSingle();
  const mine = myApproval as
    | { id: string; is_required: boolean; is_advisory: boolean; decision: string | null }
    | null;
  if (!mine) {
    return NextResponse.json(
      { error: 'You are not assigned as an approver for this proposal' },
      { status: 403 },
    );
  }

  // Load proposal status to gate the write.
  const { data: proposalRow } = await supabase
    .from('pricing_proposals')
    .select('status')
    .eq('id', params.id)
    .maybeSingle();
  const status = (proposalRow as { status: ProposalStatus } | null)?.status;
  if (!status) {
    return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
  }
  if (!['submitted_for_approval', 'under_review'].includes(status)) {
    return NextResponse.json(
      { error: `Cannot record a decision while proposal is ${status}` },
      { status: 409 },
    );
  }

  // Advisory approvers cannot record a binding decision; they use the
  // advisory-comment endpoint. If an advisory user hits this endpoint the
  // decision is stored under advisory_comment semantics instead of decision.
  if (mine.is_advisory && !mine.is_required) {
    return NextResponse.json(
      {
        error:
          'Advisory approvers cannot record approve/reject/abstain. Use the advisory-comment endpoint to record sentiment.',
      },
      { status: 400 },
    );
  }

  // Record the decision on the row.
  const { error: decisionErr } = await supabase
    .from('proposal_approvals')
    .update({
      decision: body.decision,
      decided_at: new Date().toISOString(),
      decision_notes: body.notes?.trim() ?? null,
      updated_at: new Date().toISOString(),
    } as never)
    .eq('id', mine.id);
  if (decisionErr) {
    return NextResponse.json({ error: decisionErr.message }, { status: 500 });
  }

  // Re-load the full approval set + tally.
  const { data: allApprovals } = await supabase
    .from('proposal_approvals')
    .select('is_required, is_advisory, decision')
    .eq('proposal_id', params.id);
  const outcome = tallyApprovals(
    (allApprovals ?? []) as Array<{
      is_required: boolean;
      is_advisory: boolean;
      decision: 'approved' | 'rejected' | 'abstain' | null;
    }>,
  );

  // Transition the proposal per the tally.
  let newStatus: ProposalStatus = status;
  if (outcome.kind === 'rejected') {
    const t = applyTransition(status, 'record_rejection');
    if (t.ok && t.nextStatus) newStatus = t.nextStatus;
  } else if (outcome.kind === 'approved') {
    const t = applyTransition(status, 'all_required_approved');
    if (t.ok && t.nextStatus) newStatus = t.nextStatus;
  } else if (status === 'submitted_for_approval') {
    // First decision after submit transitions to under_review.
    const t = applyTransition(status, body.decision === 'approved' ? 'record_approval' : body.decision === 'rejected' ? 'record_rejection' : 'record_abstention');
    if (t.ok && t.nextStatus) newStatus = t.nextStatus;
  }

  if (newStatus !== status) {
    await supabase
      .from('pricing_proposals')
      .update({ status: newStatus, updated_at: new Date().toISOString() } as never)
      .eq('id', params.id);
  }

  return NextResponse.json({
    ok: true,
    outcome: outcome.kind,
    new_proposal_status: newStatus,
  });
}
