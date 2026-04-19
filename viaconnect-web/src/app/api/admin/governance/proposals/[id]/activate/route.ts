// Prompt #95 Phase 5: manual proposal activation.
// POST /api/admin/governance/proposals/[id]/activate
// For proposals in approved_pending_activation whose effective date has
// arrived (or for emergency overrides). The scheduled activator (Phase 6
// cron) will call the same orchestrator.

import { type NextRequest, NextResponse } from 'next/server';
import { requireGovernanceAdmin } from '@/lib/governance/admin-guard';
import { activateProposal } from '@/lib/governance/activation';

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireGovernanceAdmin();
  if (auth.kind === 'error') return auth.response;

  const result = await activateProposal(params.id, auth.userId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json(result);
}
