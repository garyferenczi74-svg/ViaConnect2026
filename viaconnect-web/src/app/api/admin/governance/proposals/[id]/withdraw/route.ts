// Prompt #95 Phase 3: withdraw a proposal.
// POST /api/admin/governance/proposals/[id]/withdraw
// Initiator transitions draft or submitted_for_approval to withdrawn.

import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireGovernanceAdmin } from '@/lib/governance/admin-guard';

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireGovernanceAdmin();
  if (auth.kind === 'error') return auth.response;

  const supabase = createClient();

  const { data: existing } = await supabase
    .from('pricing_proposals')
    .select('status, initiated_by')
    .eq('id', params.id)
    .maybeSingle();
  const row = existing as { status: string; initiated_by: string } | null;
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

  const { error } = await supabase
    .from('pricing_proposals')
    .update({
      status: 'withdrawn',
      updated_at: new Date().toISOString(),
    } as never)
    .eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
