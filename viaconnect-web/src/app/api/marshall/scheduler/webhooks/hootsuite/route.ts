// Prompt #125 P6: Hootsuite webhook receiver.
//
// POST /api/marshall/scheduler/webhooks/hootsuite
// Identical contract to /webhooks/buffer: service-role, signature is
// sole trust anchor, fail-closed 401/400/500, deduplicated returns 200.

import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { hootsuiteAdapter } from '@/lib/marshall/scheduler/adapters/hootsuite';
import { getWebhookSigningSecret } from '@/lib/marshall/scheduler/platformConfigs';
import { handleSchedulerWebhook } from '@/lib/marshall/scheduler/webhookHandler';
import { schedulerLogger } from '@/lib/marshall/scheduler/logging';
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  let signingSecret: string;
  try {
    signingSecret = getWebhookSigningSecret('hootsuite');
  } catch {
    return NextResponse.json({ error: 'signing_secret_missing' }, { status: 500 });
  }

  const rawBody = Buffer.from(await req.arrayBuffer());
  const adapter = hootsuiteAdapter();

  try {
    const outcome = await withTimeout(
      handleSchedulerWebhook({
        supabase: createAdminClient(),
        adapter,
        rawBody,
        headers: req.headers,
        signingSecret,
      }),
      15000,
      'api.marshall.scheduler.webhooks.hootsuite',
    );

    switch (outcome.outcome) {
      case 'rejected_invalid_signature':
        return NextResponse.json({ error: 'invalid_signature' }, { status: 401 });
      case 'rejected_parse_error':
        return NextResponse.json({ error: 'parse_error', detail: outcome.error }, { status: 400 });
      case 'deduplicated':
        return NextResponse.json({ ok: true, deduplicated: true });
      case 'platform_disabled':
        return NextResponse.json({ ok: true, skipped: 'platform_disabled' });
      case 'accepted':
        return NextResponse.json({ ok: true, eventRowId: outcome.eventRowId });
    }
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.warn('api.marshall.scheduler.webhooks.hootsuite', 'webhook handler timeout', { error: err });
      return NextResponse.json({ error: 'timeout' }, { status: 504 });
    }
    schedulerLogger.error('[webhook/hootsuite] persist error', { error: (err as Error).message });
    safeLog.error('api.marshall.scheduler.webhooks.hootsuite', 'persist failed', { error: err });
    return NextResponse.json({ error: 'persist_failed' }, { status: 500 });
  }
}
