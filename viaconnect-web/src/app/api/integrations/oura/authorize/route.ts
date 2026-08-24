// GET /api/integrations/oura/authorize — Whoop-pattern OAuth start.

import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';
import {
  OURA_AUTH_URL,
  OURA_SCOPES,
  getOuraCreds,
  getOuraRedirectUri,
  isOuraConfigured,
} from '@/lib/wearables/oura/config';
import { isWearableTokenKeyConfigured } from '@/lib/wearables/crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SCOPE = 'api.integrations.oura.authorize';
const BACK = '/body-tracker/connections';

export async function GET(req: NextRequest) {
  const origin = new URL(req.url).origin;
  const back = (q: string) => NextResponse.redirect(new URL(`${BACK}?${q}`, origin));

  if (!isOuraConfigured() || !isWearableTokenKeyConfigured()) {
    return back('wearable_error=oura_not_configured');
  }
  const creds = getOuraCreds();
  if (!creds) return back('wearable_error=oura_not_configured');

  try {
    const supabase = await createClient();
    let userId: string | null = null;
    try {
      const { data } = await withTimeout(supabase.auth.getUser(), 5000, `${SCOPE}.auth`);
      userId = data.user?.id ?? null;
    } catch (err) {
      if (isTimeoutError(err)) return back('wearable_error=auth_timeout');
      throw err;
    }
    if (!userId) {
      return NextResponse.redirect(
        new URL(`/login?redirectTo=${encodeURIComponent('/api/integrations/oura/authorize')}`, origin),
      );
    }

    const state = randomBytes(24).toString('hex');
    const admin = createAdminClient();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    await withTimeout(
      admin.from('wearable_oauth_states').upsert({
        state,
        user_id: userId,
        expires_at: expiresAt,
      }),
      4000,
      `${SCOPE}.state`,
    );

    const redirectUri = getOuraRedirectUri(origin);
    const params = new URLSearchParams({
      client_id: creds.clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: OURA_SCOPES.join(' '),
      state,
    });

    return NextResponse.redirect(`${OURA_AUTH_URL}?${params.toString()}`);
  } catch (err) {
    safeLog.error(SCOPE, 'authorize failed', { error: err });
    return back('wearable_error=oura_authorize_failed');
  }
}
