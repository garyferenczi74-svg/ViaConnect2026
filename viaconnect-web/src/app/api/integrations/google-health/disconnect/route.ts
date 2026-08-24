/**
 * Prompt 218: disconnect Google Health.
 * Clears encrypted tokens from body_tracker_connections metadata; marks disconnected.
 * Never returns token material to the client.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';
import { GOOGLE_HEALTH_SOURCE_ID } from '@/lib/integrations/google-health/config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SCOPE = 'api.integrations.google-health.disconnect';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    let userId: string | null = null;
    try {
      const { data } = await withTimeout(supabase.auth.getUser(), 5000, `${SCOPE}.auth`);
      userId = data.user?.id ?? null;
    } catch (err) {
      if (isTimeoutError(err)) {
        return NextResponse.json({ error: 'auth_timeout' }, { status: 504 });
      }
      throw err;
    }
    if (!userId) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const admin = createAdminClient();
    const nowIso = new Date().toISOString();

    // Service role write: strip tokens, mark disconnected. No token values logged.
    const { error } = await withTimeout(
      (admin as any)
        .from('body_tracker_connections')
        .update({
          status: 'disconnected',
          updated_at: nowIso,
          metadata: {
            is_active: false,
            access_token: null,
            refresh_token: null,
            token_expires_at: null,
          },
        })
        .eq('user_id', userId)
        .eq('source_id', GOOGLE_HEALTH_SOURCE_ID) as Promise<{ error: unknown }>,
      5000,
      `${SCOPE}.update`,
    );

    if (error) {
      safeLog.warn(SCOPE, 'disconnect update failed open', {
        userId: userId.slice(0, 8),
        error,
      });
      return NextResponse.json({ error: 'disconnect_failed' }, { status: 500 });
    }

    // Mirror soft-disconnect into data_source_connections if present (no tokens returned).
    try {
      await withTimeout(
        (admin as any)
          .from('data_source_connections')
          .update({
            is_active: false,
            access_token: null,
            refresh_token: null,
            updated_at: nowIso,
          })
          .eq('user_id', userId)
          .eq('source_id', GOOGLE_HEALTH_SOURCE_ID) as Promise<unknown>,
        4000,
        `${SCOPE}.dsc`,
      );
    } catch {
      /* optional table */
    }

    safeLog.info(SCOPE, 'disconnected', { userId: userId.slice(0, 8) });
    return NextResponse.json({ ok: true, slug: GOOGLE_HEALTH_SOURCE_ID });
  } catch (err) {
    safeLog.error(SCOPE, 'disconnect failed', {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: 'disconnect_failed' }, { status: 500 });
  }
}

// Allow GET from form/link with redirect back to plugins
export async function GET(req: NextRequest) {
  const origin = new URL(req.url).origin;
  const returnTo = new URL(req.url).searchParams.get('return_to') || '/plugins';
  const res = await POST(req);
  if (res.ok) {
    return NextResponse.redirect(new URL(`${returnTo}?disconnected=google_health`, origin));
  }
  return NextResponse.redirect(new URL(`${returnTo}?error=disconnect_failed`, origin));
}
