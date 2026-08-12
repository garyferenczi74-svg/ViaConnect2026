// Prompt 179 POST /api/body/goals/:id/recalibrate: run the adaptive
// reconciliation for the current window. Also invoked by the weekly cron.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';
import { recalibrateGoal } from '@/lib/body-goals/recalibrate';

export const dynamic = 'force-dynamic';

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  try {
    const sb = createClient();
    const { data: { user } } = await withTimeout(sb.auth.getUser(), 5000, 'api.body.goals.recalibrate.auth');
    if (!user) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

    const today = new Date().toISOString().slice(0, 10);
    const result = await recalibrateGoal(params.id, today, sb);
    if (!result.ok) return NextResponse.json({ ok: false, reason: result.reason });
    return NextResponse.json({ ok: true, target: result.target });
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.warn('api.body.goals.recalibrate', 'timeout', { error: err });
      return NextResponse.json({ ok: false, error: 'timeout' }, { status: 503 });
    }
    safeLog.error('api.body.goals.recalibrate', 'unexpected error', { error: err });
    return NextResponse.json({ ok: false, error: 'unexpected_error' }, { status: 500 });
  }
}
