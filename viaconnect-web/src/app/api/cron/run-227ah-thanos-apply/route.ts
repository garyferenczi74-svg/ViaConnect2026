/**
 * Prompt 227ah: Thanos applies Class 0/1 curation proposals (G61 gated).
 */
import { isCronAuthorized } from '@/lib/jeffery/ops/cronAuth';
import {
  applyClass01Batch,
  revertCurationProposal,
} from '@/lib/thanos/applyCurationProposals227ah';
import { safeLog } from '@/lib/utils/safe-log';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 120;

export async function POST(request: Request): Promise<Response> {
  if (!isCronAuthorized(request.headers.get('authorization'))) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const url = new URL(request.url);
    const revertId = url.searchParams.get('revert');
    if (revertId) {
      const reverted = await revertCurationProposal(revertId);
      return Response.json({
        ok: reverted.ok,
        prompt: '227ah',
        action: 'revert',
        proposalId: revertId,
        result: reverted,
      });
    }

    const result = await applyClass01Batch({ limit: 20 });
    return Response.json({ ok: result.ok, prompt: '227ah', result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    safeLog.error('cron.run-227ah-thanos-apply', 'threw', { error: message });
    return Response.json({ ok: false, error: message }, { status: 200 });
  }
}
