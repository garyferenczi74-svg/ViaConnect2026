// Prompt 213a: Hannah daily insight compilation cron.
// Schedule: 30 6 * * * (after synchronism-daily at :15).
// Auth: Bearer CRON_SECRET.

import { timingSafeEqual } from 'node:crypto';
import { runHannahCompilationBatch } from '@/lib/hannah/compilation/runCompilation';
import { runHoundDogDailyIngest } from '@/lib/hounddog/ingest/runDailyIngest';
import { runSherlockCuration } from '@/lib/sherlock/curate';
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
    // Stage 1 + gate: Firecrawl/PubMed/social ingest (214b)
    const ingest = await runHoundDogDailyIngest({
      runId: `compile-ingest-${new Date().toISOString().slice(0, 10)}`,
    });
    // Stage 3: Sherlock curation from gated items
    const curate = await runSherlockCuration(40);
    // Stage 5: Hannah compose for active users
    const batch = await runHannahCompilationBatch(40);

    safeLog.info('cron.hannah-compile', 'complete', { ingest, curate, batch });
    return Response.json({ ok: true, ingest, curate, batch }, { status: 200 });
  } catch (err) {
    safeLog.error('cron.hannah-compile', 'failed open', { error: err });
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 200 },
    );
  }
}
