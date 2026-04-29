// Prompt #95 Phase 6: rollback API endpoint.
// POST /api/admin/governance/proposals/[id]/rollback
// Body: { justification: string }
// Reverses an activated proposal within the 30-day window. Minor tier
// or <24h instant window are allowed unilaterally. Moderate+ beyond 24h
// returns 409 with instructions to file a reversing proposal.

import { type NextRequest, NextResponse } from 'next/server';
import { requireGovernanceAdmin } from '@/lib/governance/admin-guard';
import { rollbackProposal } from '@/lib/governance/rollback';
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

    const body = (await request.json().catch(() => null)) as
      | { justification?: string }
      | null;
    if (!body?.justification) {
      return NextResponse.json({ error: 'Rollback justification is required' }, { status: 400 });
    }

    let result;
    try {
      result = await withTimeout(
        rollbackProposal({
          proposalId: params.id,
          actorUserId: auth.userId,
          justification: body.justification,
        }),
        20000,
        'api.governance.rollback.engine',
      );
    } catch (err) {
      if (isTimeoutError(err)) {
        safeLog.error('api.governance.rollback', 'rollback timeout', { requestId, proposalId: params.id, userId: auth.userId, error: err });
        return NextResponse.json({ error: 'Rollback took too long. Please try again.' }, { status: 504 });
      }
      throw err;
    }

    if (!result.ok) {
      const status = result.error?.includes('30 days') ? 409 : 400;
      safeLog.warn('api.governance.rollback', 'rollback rejected', { requestId, proposalId: params.id, reason: result.error });
      return NextResponse.json({ error: result.error }, { status });
    }
    safeLog.info('api.governance.rollback', 'rolled back', { requestId, proposalId: params.id, userId: auth.userId });
    return NextResponse.json(result);
  } catch (err) {
    safeLog.error('api.governance.rollback', 'unexpected error', { requestId, proposalId: params.id, error: err });
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
