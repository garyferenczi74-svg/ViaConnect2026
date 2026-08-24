/**
 * Prompt 227a: evidence-lane Research Hub ingest (6h cadence).
 * Registry-driven eutils + RSS. Mercola never included.
 */
import { isCronAuthorized } from '@/lib/jeffery/ops/cronAuth';
import { runEvidenceLaneIngest } from '@/lib/research-hub/evidenceLaneIngest';
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
    const batchSizeRaw = url.searchParams.get('batchSize');
    const maxSourcesRaw = url.searchParams.get('maxSources');
    const batchSize = batchSizeRaw ? Number(batchSizeRaw) : 2;
    const maxSources = maxSourcesRaw ? Number(maxSourcesRaw) : 12;
    const result = await runEvidenceLaneIngest({
      batchSize: Number.isFinite(batchSize) && batchSize > 0 ? batchSize : 2,
      maxSources: Number.isFinite(maxSources) && maxSources > 0 ? maxSources : 12,
    });
    return Response.json({
      ok: result.ok,
      prompt: '227a',
      phase: 'evidence-lane-research-hub',
      result,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    safeLog.error('cron.run-227a-evidence-lane', 'threw', { error: message });
    return Response.json({ ok: false, error: message }, { status: 200 });
  }
}

export async function GET(request: Request): Promise<Response> {
  return POST(request);
}
