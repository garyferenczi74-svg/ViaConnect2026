// Prompt #95 Phase 4: record an advisory approver's sentiment.
//
// POST /api/admin/governance/proposals/[id]/advisory-comment
// Body: { comment: string }
// Advisory approvers (Thomas CTO, Fadi Medical) leave commentary but do
// not block or advance state. The comment is stored on their
// proposal_approvals row. Does NOT trigger a state transition.

import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireGovernanceAdmin } from '@/lib/governance/admin-guard';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireGovernanceAdmin();
  if (auth.kind === 'error') return auth.response;

  const body = (await request.json().catch(() => null)) as { comment?: string } | null;
  if (!body?.comment || body.comment.trim().length < 20) {
    return NextResponse.json(
      { error: 'Advisory comment must be at least 20 characters' },
      { status: 400 },
    );
  }

  const supabase = createClient();

  const { data: row } = await supabase
    .from('proposal_approvals')
    .select('id, is_advisory, is_required')
    .eq('proposal_id', params.id)
    .eq('approver_user_id', auth.userId)
    .maybeSingle();
  const mine = row as
    | { id: string; is_advisory: boolean; is_required: boolean }
    | null;
  if (!mine) {
    return NextResponse.json({ error: 'You are not an approver for this proposal' }, { status: 403 });
  }

  const { error } = await supabase
    .from('proposal_approvals')
    .update({
      advisory_comment: body.comment.trim(),
      advisory_commented_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as never)
    .eq('id', mine.id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
