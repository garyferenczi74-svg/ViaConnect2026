/**
 * Prompt 227e: run Collection 14 retraction / trial-status watch.
 */
import { isCronAuthorized } from '@/lib/jeffery/ops/cronAuth';
import { runRetractionWatch227e } from '@/lib/thanos/retractionWatch227e';
import { safeLog } from '@/lib/utils/safe-log';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 120;

export async function POST(request: Request): Promise<Response> {
  if (!isCronAuthorized(request.headers.get('authorization'))) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const result = await runRetractionWatch227e({
      maxPubs: 20,
      maxTrials: 20,
    });
    return Response.json({ ok: result.ok, prompt: '227e', result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    safeLog.error('cron.run-227e-retraction', 'threw', { error: message });
    return Response.json({ ok: false, error: message }, { status: 200 });
  }
}
