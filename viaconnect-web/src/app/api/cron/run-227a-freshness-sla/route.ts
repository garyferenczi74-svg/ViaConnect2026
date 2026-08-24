/**
 * Prompt 227a: evaluate per-source freshness SLA (item yield, not run success).
 */
import { isCronAuthorized } from '@/lib/jeffery/ops/cronAuth';
import { evaluateFreshnessSla } from '@/lib/research-hub/freshnessSla227a';
import { safeLog } from '@/lib/utils/safe-log';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: Request): Promise<Response> {
  if (!isCronAuthorized(request.headers.get('authorization'))) {
    return new Response('Unauthorized', { status: 401 });
  }
  try {
    const url = new URL(request.url);
    const synthetic = url.searchParams.get('syntheticBreachDomain');
    const result = await evaluateFreshnessSla({
      syntheticBreachDomain: synthetic || null,
    });
    return Response.json({
      ok: result.ok,
      prompt: '227a',
      phase: 'freshness-sla',
      result,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    safeLog.error('cron.run-227a-freshness', 'threw', { error: message });
    return Response.json({ ok: false, error: message }, { status: 200 });
  }
}

export async function GET(request: Request): Promise<Response> {
  return POST(request);
}
