// Prompt #125 P3: Buffer webhook receiver.
//
// POST /api/marshall/scheduler/webhooks/buffer
//   1. Read raw body (Buffer delivers form-encoded or JSON; sig is HMAC
//      of the raw bytes either way).
//   2. Hand to handleSchedulerWebhook with the buffer adapter. That
//      verifies signature, parses, and writes scheduler_events with
//      platform+external_event_id dedup.
//   3. Orchestrator dispatch is queued for a separate worker (scheduled
//      via pg_cron / Vercel cron) so the HTTP response returns to Buffer
//      under their ~3s timeout budget.
//
// Fail-closed: unverified signature returns 401; parse errors return
// 400; persist errors return 500. Buffer retries on non-2xx, which is
// exactly what we want; the UNIQUE(platform, external_event_id) index
// guarantees retry idempotency.

import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { bufferAdapter } from '@/lib/marshall/scheduler/adapters/buffer';
import { getWebhookSigningSecret } from '@/lib/marshall/scheduler/platformConfigs';
import { handleSchedulerWebhook } from '@/lib/marshall/scheduler/webhookHandler';
import { schedulerLogger } from '@/lib/marshall/scheduler/logging';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  let signingSecret: string;
  try {
    signingSecret = getWebhookSigningSecret('buffer');
  } catch {
    return NextResponse.json({ error: 'signing_secret_missing' }, { status: 500 });
  }

  const rawBody = Buffer.from(await req.arrayBuffer());
  const adapter = bufferAdapter();

  try {
    const outcome = await handleSchedulerWebhook({
      supabase: createAdminClient(),
      adapter,
      rawBody,
      headers: req.headers,
      signingSecret,
    });

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
    schedulerLogger.error('[webhook/buffer] persist error', { error: (err as Error).message });
    return NextResponse.json({ error: 'persist_failed' }, { status: 500 });
  }
}
