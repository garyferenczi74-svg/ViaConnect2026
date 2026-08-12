// Prompt 214a: Jeffery daily synchronism chain cron.
// Auth: Bearer CRON_SECRET (same pattern as hannah-research).
// Fail-open: returns 200 on partial stage failures so Vercel does not thrash.

import { timingSafeEqual } from 'node:crypto';
import { runSynchronismChain } from '@/lib/agents/synchronism/chain';
import { persistPipelineRun } from '@/lib/agents/synchronism/persist';
import { safeLog } from '@/lib/utils/safe-log';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

const BEARER_PREFIX = 'Bearer ';

function isAuthorized(headerValue: string | null): boolean {
  const expected = `${BEARER_PREFIX}${process.env.CRON_SECRET ?? ''}`;
  const actual = headerValue ?? '';
  if (expected.length <= BEARER_PREFIX.length) return false;
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(actual, 'utf8'), Buffer.from(expected, 'utf8'));
}

export async function GET(request: Request): Promise<Response> {
  if (!isAuthorized(request.headers.get('authorization'))) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const run = await runSynchronismChain({
      persist: persistPipelineRun,
    });
    safeLog.info('cron.synchronism-daily', 'chain complete', {
      runId: run.runId,
      status: run.status,
      stages: run.stages.map((s) => ({ stage: s.stage, status: s.status })),
    });
    return Response.json({ ok: true, run }, { status: 200 });
  } catch (err) {
    safeLog.error('cron.synchronism-daily', 'chain threw', { error: err });
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 200 },
    );
  }
}
