import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest, { params }: { params: { appId: string } }) {
  const { appId } = params;

  try {
    const payload = await req.json();
    const supabase = createClient();

    // Resolve ViaConnect user from external user ID in webhook payload
    const externalUserId = payload.user_id ?? payload.userId ?? payload.owner_id;
    if (!externalUserId) {
      return NextResponse.json({ error: 'No user identifier in payload' }, { status: 400 });
    }

    const { data: conn } = await (supabase as any)
      .from('data_source_connections')
      .select('user_id, id')
      .eq('source_id', appId)
      .eq('is_active', true)
      .limit(1)
      .single();

    if (!conn) {
      return NextResponse.json({ error: 'No active connection found' }, { status: 404 });
    }

    // Log the sync
    await (supabase as any).from('integration_sync_log').insert({
      connection_id: conn.id,
      user_id: conn.user_id,
      sync_type: 'webhook',
      items_received: 1,
      items_new: 1,
      gauges_affected: [],
      success: true,
    });

    // Update last sync timestamp
    await (supabase as any)
      .from('data_source_connections')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('id', conn.id);

    return NextResponse.json({ status: 'received' });
  } catch (err: any) {
    console.error(`webhook/${appId}:`, err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
