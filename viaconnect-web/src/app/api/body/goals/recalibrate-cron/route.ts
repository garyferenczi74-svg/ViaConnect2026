// Prompt 179 weekly recalibration cron. Authorized by Bearer CRON_SECRET
// (timing-safe). Iterates active goals via the service-role client and
// recalibrates each in its own try/catch so one failure never aborts the batch.

import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { recalibrateGoal } from '@/lib/body-goals/recalibrate';
import { safeLog } from '@/lib/utils/safe-log';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const BEARER_PREFIX = 'Bearer ';

function isAuthorized(headerValue: string | null): boolean {
  const expected = `${BEARER_PREFIX}${process.env.CRON_SECRET ?? ''}`;
  const actual = headerValue ?? '';
  if (expected.length <= BEARER_PREFIX.length) return false; // secret unset -> reject all
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(actual), Buffer.from(expected));
}

export async function GET(request: Request) {
  if (!isAuthorized(request.headers.get('authorization'))) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const today = new Date().toISOString().slice(0, 10);
  const sb = createAdminClient();
  let processed = 0;
  let recalibrated = 0;
  let skipped = 0;
  let failed = 0;

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: goals } = await (sb as any).from('body_goals').select('id').eq('status', 'active');
    for (const g of (goals ?? []) as Array<{ id: string }>) {
      processed++;
      try {
        const r = await recalibrateGoal(g.id, today, sb);
        if (r.ok) recalibrated++;
        else skipped++;
      } catch (err) {
        failed++;
        safeLog.error('cron.body-goals-recalibrate', 'goal failed', { err, goalId: g.id });
      }
    }
  } catch (err) {
    safeLog.error('cron.body-goals-recalibrate', 'batch query failed', { err });
    return NextResponse.json({ ok: false, error: 'batch_failed' }, { status: 500 });
  }

  safeLog.info('cron.body-goals-recalibrate', 'done', { processed, recalibrated, skipped, failed });
  return NextResponse.json({ ok: true, processed, recalibrated, skipped, failed });
}
