// Prompt #95 Phase 3: withdraw a proposal.
// POST /api/admin/governance/proposals/[id]/withdraw
// Initiator transitions draft or submitted_for_approval to withdrawn.

import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireGovernanceAdmin } from '@/lib/governance/admin-guard';
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireGovernanceAdmin();
  if (auth.kind === 'error') return auth.response;

  const supabase = createClient();

  try {
    const existingRes = await withTimeout(
      (async () => supabase
        .from('pricing_proposals')
        .select('status, initiated_by')
        .eq('id', params.id)
        .maybeSingle())(),
      8000,
      'api.admin.governance.proposals.withdraw.load',
    );
    const row = existingRes.data as { status: string; initiated_by: string } | null;
    if (!row) return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
    if (!['draft', 'submitted_for_approval', 'under_review', 'approved_pending_activation'].includes(row.status)) {
      return NextResponse.json(
        { error: `Cannot withdraw proposal in status ${row.status}` },
        { status: 409 },
      );
    }
    if (row.initiated_by !== auth.userId) {
      return NextResponse.json({ error: 'Only initiator may withdraw' }, { status: 403 });
    }

    const updateRes = await withTimeout(
      (async () => supabase
        .from('pricing_proposals')
        .update({
          status: 'withdrawn',
          updated_at: new Date().toISOString(),
        } as never)
        .eq('id', params.id))(),
      8000,
      'api.admin.governance.proposals.withdraw.update',
    );
    if (updateRes.error) {
      safeLog.error('api.admin.governance.proposals.withdraw', 'update failed', { proposalId: params.id, error: updateRes.error });
      return NextResponse.json({ error: updateRes.error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.error('api.admin.governance.proposals.withdraw', 'timeout', { proposalId: params.id, error: err });
      return NextResponse.json({ error: 'Database operation timed out.' }, { status: 503 });
    }
    safeLog.error('api.admin.governance.proposals.withdraw', 'unexpected error', { proposalId: params.id, error: err });
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
