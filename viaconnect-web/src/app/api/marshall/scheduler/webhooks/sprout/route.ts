// Prompt #125 P8: Sprout Social webhook receiver.
//
// POST /api/marshall/scheduler/webhooks/sprout
// Byte-for-byte parallel to buffer/hootsuite/later webhook receivers:
// service-role, signature is sole trust anchor, fail-closed
// 401/400/500, deduplicated returns 200.

import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sproutAdapter } from '@/lib/marshall/scheduler/adapters/sprout';
import { getWebhookSigningSecret } from '@/lib/marshall/scheduler/platformConfigs';
import { handleSchedulerWebhook } from '@/lib/marshall/scheduler/webhookHandler';
import { schedulerLogger } from '@/lib/marshall/scheduler/logging';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  let signingSecret: string;
  try {
    signingSecret = getWebhookSigningSecret('sprout_social');
  } catch {
    return NextResponse.json({ error: 'signing_secret_missing' }, { status: 500 });
  }

  const rawBody = Buffer.from(await req.arrayBuffer());
  const adapter = sproutAdapter();

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
    schedulerLogger.error('[webhook/sprout] persist error', { error: (err as Error).message });
    return NextResponse.json({ error: 'persist_failed' }, { status: 500 });
  }
}
