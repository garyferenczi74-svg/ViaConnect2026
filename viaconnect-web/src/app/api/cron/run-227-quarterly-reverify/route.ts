/**
 * Prompt 227f: quarterly full re-verification (Class 0 last_verified_at refresh).
 */
import { isCronAuthorized } from '@/lib/jeffery/ops/cronAuth';
import { runCurationCycle227a } from '@/lib/sherlock/curation/runCurationCycle227a';
import { applyClass01Batch } from '@/lib/thanos/applyCurationProposals227ah';
import { safeLog } from '@/lib/utils/safe-log';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 120;

export async function POST(request: Request): Promise<Response> {
  if (!isCronAuthorized(request.headers.get('authorization'))) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const cycle = await runCurationCycle227a({
      maxClass3Proposals: 5,
      maxClass0Freshness: 20,
      maxNegativeSamples: 5,
    });
    const apply = await applyClass01Batch({ limit: 30 });
    return Response.json({
      ok: cycle.ok && apply.ok,
      prompt: '227f',
      phase: 'quarterly_reverify',
      cycle,
      apply,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    safeLog.error('cron.run-227-quarterly-reverify', 'threw', {
      error: message,
    });
    return Response.json({ ok: false, error: message }, { status: 200 });
  }
}
