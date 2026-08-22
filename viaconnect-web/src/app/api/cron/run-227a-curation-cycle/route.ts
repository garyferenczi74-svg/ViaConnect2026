/**
 * Prompt 227a: run one Sherlock Collection 14 curation cycle.
 */
import { isCronAuthorized } from '@/lib/jeffery/ops/cronAuth';
import { runCurationCycle227a } from '@/lib/sherlock/curation/runCurationCycle227a';
import { safeLog } from '@/lib/utils/safe-log';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 120;

export async function POST(request: Request): Promise<Response> {
  if (!isCronAuthorized(request.headers.get('authorization'))) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const result = await runCurationCycle227a({ maxClass3Proposals: 5 });
    return Response.json({ ok: result.ok, prompt: '227a', result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    safeLog.error('cron.run-227a-curation', 'threw', { error: message });
    return Response.json({ ok: false, error: message }, { status: 200 });
  }
}
