/**
 * Prompt 227f: weekly deep sweep on lower-priority gaps (elevated cycle caps).
 */
import { isCronAuthorized } from '@/lib/jeffery/ops/cronAuth';
import { runCurationCycle227a } from '@/lib/sherlock/curation/runCurationCycle227a';
import { loadBudgetCeiling } from '@/lib/sherlock/curation/budgetCeiling227d';
import { safeLog } from '@/lib/utils/safe-log';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 120;

export async function POST(request: Request): Promise<Response> {
  if (!isCronAuthorized(request.headers.get('authorization'))) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const ceiling = await loadBudgetCeiling();
    const result = await runCurationCycle227a({
      maxClass3Proposals: Math.min(20, Math.max(ceiling.maxClass3PerCycle, 12)),
      maxClass0Freshness: Math.min(20, Math.max(ceiling.maxClass0FreshnessPerCycle, 8)),
      maxNegativeSamples: Math.min(20, Math.max(ceiling.maxNegativeSamplesPerCycle, 10)),
    });
    return Response.json({
      ok: result.ok,
      prompt: '227f',
      phase: 'deep_sweep_weekly',
      result,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    safeLog.error('cron.run-227-deep-sweep', 'threw', { error: message });
    return Response.json({ ok: false, error: message }, { status: 200 });
  }
}
