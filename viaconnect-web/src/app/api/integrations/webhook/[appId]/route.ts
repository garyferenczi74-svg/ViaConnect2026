import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';

export async function POST(req: NextRequest, { params }: { params: { appId: string } }) {
  const { appId } = params;

  try {
    const payload = await req.json();
    const supabase = createClient();

    const externalUserId = payload.user_id ?? payload.userId ?? payload.owner_id;
    if (!externalUserId) {
      return NextResponse.json({ error: 'No user identifier in payload' }, { status: 400 });
    }

    const { data: conn } = await withTimeout(
      (async () => (supabase as any)
        .from('data_source_connections')
        .select('user_id, id')
        .eq('source_id', appId)
        .eq('is_active', true)
        .limit(1)
        .single())(),
      8000,
      `api.integrations.webhook.${appId}.lookup`,
    );

    if (!conn) {
      return NextResponse.json({ error: 'No active connection found' }, { status: 404 });
    }

    await withTimeout(
      (async () => (supabase as any).from('integration_sync_log').insert({
        connection_id: conn.id,
        user_id: conn.user_id,
        sync_type: 'webhook',
        items_received: 1,
        items_new: 1,
        gauges_affected: [],
        success: true,
      }))(),
      5000,
      `api.integrations.webhook.${appId}.log`,
    );

    await withTimeout(
      (async () => (supabase as any)
        .from('data_source_connections')
        .update({ last_sync_at: new Date().toISOString() })
        .eq('id', conn.id))(),
      5000,
      `api.integrations.webhook.${appId}.update-sync`,
    );

    return NextResponse.json({ status: 'received' });
  } catch (err: any) {
    if (isTimeoutError(err)) {
      safeLog.warn(`api.integrations.webhook.${appId}`, 'timeout', { error: err });
      return NextResponse.json({ error: 'timeout' }, { status: 504 });
    }
    safeLog.error(`api.integrations.webhook.${appId}`, 'webhook handler error', { error: err });
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
