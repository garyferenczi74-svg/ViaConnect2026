/**
 * Prompt 227a: signal-lane claims observatory ingest.
 */
import { isCronAuthorized } from '@/lib/jeffery/ops/cronAuth';
import { runSignalLaneIngest } from '@/lib/research-hub/signalLaneIngest';
import { safeLog } from '@/lib/utils/safe-log';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 120;

export async function POST(request: Request): Promise<Response> {
  if (!isCronAuthorized(request.headers.get('authorization'))) {
    return new Response('Unauthorized', { status: 401 });
  }
  try {
    const result = await runSignalLaneIngest({ batchSize: 3 });
    return Response.json({
      ok: result.ok,
      prompt: '227a',
      phase: 'signal-lane',
      result,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    safeLog.error('cron.run-227a-signal', 'threw', { error: message });
    return Response.json({ ok: false, error: message }, { status: 200 });
  }
}

export async function GET(request: Request): Promise<Response> {
  return POST(request);
}
