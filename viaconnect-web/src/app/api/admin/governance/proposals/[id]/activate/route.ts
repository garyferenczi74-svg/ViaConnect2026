// Prompt #95 Phase 5: manual proposal activation.
// POST /api/admin/governance/proposals/[id]/activate
// For proposals in approved_pending_activation whose effective date has
// arrived (or for emergency overrides). The scheduled activator (Phase 6
// cron) will call the same orchestrator.

import { type NextRequest, NextResponse } from 'next/server';
import { requireGovernanceAdmin } from '@/lib/governance/admin-guard';
import { activateProposal } from '@/lib/governance/activation';
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID();

  try {
    const auth = await requireGovernanceAdmin();
    if (auth.kind === 'error') return auth.response;

    let result;
    try {
      result = await withTimeout(
        activateProposal(params.id, auth.userId),
        20000,
        'api.governance.activate.activation',
      );
    } catch (err) {
      if (isTimeoutError(err)) {
        safeLog.error('api.governance.activate', 'activation timeout', { requestId, proposalId: params.id, userId: auth.userId, error: err });
        return NextResponse.json({ error: 'Activation took too long. Please try again.' }, { status: 504 });
      }
      throw err;
    }

    if (!result.ok) {
      safeLog.warn('api.governance.activate', 'activation rejected', { requestId, proposalId: params.id, reason: result.error });
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    safeLog.info('api.governance.activate', 'activated', { requestId, proposalId: params.id, userId: auth.userId });
    return NextResponse.json(result);
  } catch (err) {
    safeLog.error('api.governance.activate', 'unexpected error', { requestId, proposalId: params.id, error: err });
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
