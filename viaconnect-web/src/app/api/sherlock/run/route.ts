// Sherlock manual trigger — POST /api/sherlock/run
// Calls the deployed sherlock-research-hub edge function. Used by the
// "refresh" affordance in the SherlockActivityFeed UI so users can
// manually trigger a research cycle without waiting for the 6h cron.

import { NextResponse } from 'next/server';
import { withAbortTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const FUNCTION_NAME = 'sherlock-research-hub';

export async function POST() {
  if (!SUPABASE_URL) {
    return NextResponse.json(
      { ok: false, message: 'SUPABASE_URL not configured' },
      { status: 500 },
    );
  }

  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  try {
    const res = await withAbortTimeout(
      (signal) => fetch(`${SUPABASE_URL}/functions/v1/${FUNCTION_NAME}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${anonKey}`,
        },
        body: JSON.stringify({ trigger: 'manual' }),
        signal,
      }),
      120000,
      'api.sherlock.run.invoke',
    );

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      safeLog.warn('api.sherlock.run', 'edge function returned non-2xx', { status: res.status, detail: data });
      return NextResponse.json(
        { ok: false, message: data?.error || 'Sherlock returned an error', detail: data },
        { status: res.status },
      );
    }

    return NextResponse.json({
      ok: true,
      message: `Sherlock cycle complete: scored ${data?.scored ?? 0}, ${data?.alerts ?? 0} alerts`,
      result: data,
    });
  } catch (e: any) {
    if (isTimeoutError(e)) {
      safeLog.warn('api.sherlock.run', 'sherlock invocation timeout', { error: e });
      return NextResponse.json({ ok: false, message: 'Sherlock cycle took too long.' }, { status: 504 });
    }
    safeLog.error('api.sherlock.run', 'network error reaching Sherlock', { error: e });
    return NextResponse.json(
      { ok: false, message: e?.message || 'Network error reaching Sherlock' },
      { status: 502 },
    );
  }
}
