// POST /api/integrations/oura/webhook (public, signature validated)

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { withTimeout } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';
import { getOuraCreds } from '@/lib/wearables/oura/config';
import { validateOuraWebhookSignature } from '@/lib/wearables/oura/webhook-signature';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SCOPE = 'api.integrations.oura.webhook';

interface OuraWebhookBody {
  user_id?: string;
  event_type?: string;
  data_type?: string;
  object_id?: string;
}

interface ConnectedRow {
  user_id: string;
}

export async function POST(req: NextRequest) {
  const started = Date.now();
  try {
    const creds = getOuraCreds();
    if (!creds) {
      return NextResponse.json({ error: 'not_configured' }, { status: 503 });
    }

    const rawBody = await req.text();
    const ok = validateOuraWebhookSignature(rawBody, req.headers, creds.clientSecret);
    if (!ok) {
      safeLog.warn(SCOPE, 'invalid signature', {});
      return NextResponse.json({ error: 'invalid_signature' }, { status: 401 });
    }

    let payload: OuraWebhookBody;
    try {
      payload = JSON.parse(rawBody) as OuraWebhookBody;
    } catch {
      return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
    }

    const eventType = String(payload.data_type ?? payload.event_type ?? 'unknown');
    const externalId = String(payload.object_id ?? `${eventType}:${Date.now()}`);
    const ouraUserId = payload.user_id != null ? String(payload.user_id) : null;

    const admin = createAdminClient();
    let userId: string | null = null;
    if (ouraUserId) {
      const { data } = await withTimeout(
        admin
          .from('connected_sources')
          .select('user_id')
          .eq('provider', 'oura')
          .eq('external_user_id', ouraUserId)
          .eq('status', 'connected')
          .maybeSingle(),
        3000,
        `${SCOPE}.resolveUser`,
      );
      userId = (data as ConnectedRow | null)?.user_id ?? null;
    }

    if (!userId) {
      safeLog.warn(SCOPE, 'unmapped oura user', { hasOuraUser: Boolean(ouraUserId) });
      return NextResponse.json({ ok: true, deferred: true });
    }

    const { error } = await withTimeout(
      admin.from('wearable_events').upsert(
        {
          user_id: userId,
          provider: 'oura',
          event_type: eventType,
          external_id: externalId,
          payload,
          recorded_at: new Date().toISOString(),
          processing_status: 'pending',
        },
        { onConflict: 'provider,external_id,event_type', ignoreDuplicates: true },
      ),
      3000,
      `${SCOPE}.insertEvent`,
    );

    if (error) {
      safeLog.warn(SCOPE, 'insert failed', { error });
    }

    const ms = Date.now() - started;
    if (ms > 2800) {
      safeLog.warn(SCOPE, 'slow webhook', { ms });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    safeLog.error(SCOPE, 'webhook failed', { error: err });
    return NextResponse.json({ ok: true, soft_fail: true });
  }
}
