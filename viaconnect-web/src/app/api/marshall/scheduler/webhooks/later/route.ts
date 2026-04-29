// Prompt #125 P7: Later webhook receiver.
//
// POST /api/marshall/scheduler/webhooks/later
// Identical contract to /webhooks/buffer and /webhooks/hootsuite.
// Later's webhook coverage is tier-dependent; many accounts never
// fire this path and rely entirely on polling via /poll/[connectionId].

import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { laterAdapter } from '@/lib/marshall/scheduler/adapters/later';
import { getWebhookSigningSecret } from '@/lib/marshall/scheduler/platformConfigs';
import { handleSchedulerWebhook } from '@/lib/marshall/scheduler/webhookHandler';
import { schedulerLogger } from '@/lib/marshall/scheduler/logging';
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  let signingSecret: string;
  try {
    signingSecret = getWebhookSigningSecret('later');
  } catch {
    return NextResponse.json({ error: 'signing_secret_missing' }, { status: 500 });
  }

  const rawBody = Buffer.from(await req.arrayBuffer());
  const adapter = laterAdapter();

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
      'api.marshall.scheduler.webhooks.later',
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
      safeLog.warn('api.marshall.scheduler.webhooks.later', 'webhook handler timeout', { error: err });
      return NextResponse.json({ error: 'timeout' }, { status: 504 });
    }
    schedulerLogger.error('[webhook/later] persist error', { error: (err as Error).message });
    safeLog.error('api.marshall.scheduler.webhooks.later', 'persist failed', { error: err });
    return NextResponse.json({ error: 'persist_failed' }, { status: 500 });
  }
}
