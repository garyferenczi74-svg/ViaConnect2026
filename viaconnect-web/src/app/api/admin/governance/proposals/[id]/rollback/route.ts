// Prompt #95 Phase 6: rollback API endpoint.
// POST /api/admin/governance/proposals/[id]/rollback
// Body: { justification: string }
// Reverses an activated proposal within the 30-day window. Minor tier
// or <24h instant window are allowed unilaterally. Moderate+ beyond 24h
// returns 409 with instructions to file a reversing proposal.

import { type NextRequest, NextResponse } from 'next/server';
import { requireGovernanceAdmin } from '@/lib/governance/admin-guard';
import { rollbackProposal } from '@/lib/governance/rollback';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireGovernanceAdmin();
  if (auth.kind === 'error') return auth.response;

  const body = (await request.json().catch(() => null)) as
    | { justification?: string }
    | null;
  if (!body?.justification) {
    return NextResponse.json({ error: 'Rollback justification is required' }, { status: 400 });
  }

  const result = await rollbackProposal({
    proposalId: params.id,
    actorUserId: auth.userId,
    justification: body.justification,
  });
  if (!result.ok) {
    const status = result.error?.includes('30 days') ? 409 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }
  return NextResponse.json(result);
}
