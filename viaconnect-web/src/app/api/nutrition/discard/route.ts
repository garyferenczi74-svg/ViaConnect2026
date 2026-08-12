// Prompt #160 section 4.4: soft-discard a pending nutrition log.
// POST body: { logId }
// Auth: Supabase session required.

import { NextRequest, NextResponse } from 'next/server';
import { safeLog } from '@/lib/utils/safe-log';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const logId: string | undefined = body?.logId;
    if (!logId || typeof logId !== 'string') {
      return NextResponse.json({ error: 'Invalid logId' }, { status: 400 });
    }

    const { error } = await supabase
      .from('nutrition_logs')
      .update({ status: 'discarded', discarded_at: new Date().toISOString() })
      .eq('id', logId)
      .eq('user_id', user.id);

    if (error) {
      safeLog.error('api.nutrition.discard', 'update failed', { error, userId: user.id, logId });
      return NextResponse.json({ error: 'Update failed' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    safeLog.error('api.nutrition.discard', 'unexpected', { error: err });
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
