// POST /api/integrations/oura/disconnect

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';
import { getOuraAccessToken, deleteOuraTokens } from '@/lib/wearables/oura/tokens';
import { revokeOuraAccess } from '@/lib/wearables/oura/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SCOPE = 'api.integrations.oura.disconnect';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    let userId: string | null = null;
    try {
      const { data } = await withTimeout(supabase.auth.getUser(), 5000, `${SCOPE}.auth`);
      userId = data.user?.id ?? null;
    } catch (err) {
      if (isTimeoutError(err)) {
        return NextResponse.json({ error: 'auth_timeout' }, { status: 503 });
      }
      throw err;
    }
    if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

    let body: { deleteData?: boolean } = {};
    try {
      body = (await req.json()) as { deleteData?: boolean };
    } catch {
      body = {};
    }

    const admin = createAdminClient();
    const access = await getOuraAccessToken(admin, userId);
    if (access) {
      await revokeOuraAccess(access);
    }
    await deleteOuraTokens(admin, userId);

    await withTimeout(
      admin
        .from('connected_sources')
        .update({
          status: 'revoked',
          updated_at: new Date().toISOString(),
          error_detail: null,
        })
        .eq('user_id', userId)
        .eq('provider', 'oura'),
      4000,
      `${SCOPE}.revokeStatus`,
    );

    if (body.deleteData) {
      const tables = [
        'wearable_sleep_sessions',
        'wearable_recovery',
        'wearable_workouts',
        'wearable_daily_vitals',
        'wearable_body_composition',
        'wearable_events',
      ] as const;
      for (const t of tables) {
        try {
          const col = t === 'wearable_events' ? 'provider' : 'source_provider';
          await withTimeout(
            admin.from(t).delete().eq('user_id', userId).eq(col, 'oura'),
            5000,
            `${SCOPE}.delete.${t}`,
          );
        } catch (err) {
          safeLog.warn(SCOPE, 'delete table failed', { table: t, error: err });
        }
      }
    }

    await withTimeout(
      admin.from('wearable_audit_log').insert({
        user_id: userId,
        action: body.deleteData ? 'oura_disconnect_delete' : 'oura_disconnect',
        provider: 'oura',
        detail: { deleteData: Boolean(body.deleteData) },
      }),
      3000,
      `${SCOPE}.audit`,
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    safeLog.error(SCOPE, 'disconnect failed', { error: err });
    return NextResponse.json({ error: 'disconnect_failed' }, { status: 500 });
  }
}
