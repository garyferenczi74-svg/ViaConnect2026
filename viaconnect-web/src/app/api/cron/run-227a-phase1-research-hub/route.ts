/**
 * Prompt 227a Phase 1: ingest one Tier 2 journal batch into research_hub_items.
 */
import { isCronAuthorized } from '@/lib/jeffery/ops/cronAuth';
import { runPhase1ResearchHubIngest } from '@/lib/research-hub/phase1JournalIngest';
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
    const batchSize = batchSizeRaw ? Number(batchSizeRaw) : 3;
    const result = await runPhase1ResearchHubIngest({
      batchSize: Number.isFinite(batchSize) && batchSize > 0 ? batchSize : 3,
      allowFallback: true,
    });
    return Response.json({
      ok: result.ok,
      prompt: '227a',
      phase: 'phase1-research-hub',
      result,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    safeLog.error('cron.run-227a-phase1-rh', 'threw', { error: message });
    return Response.json({ ok: false, error: message }, { status: 200 });
  }
}

export async function GET(request: Request): Promise<Response> {
  return POST(request);
}
