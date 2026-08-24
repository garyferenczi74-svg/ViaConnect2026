// GET /api/integrations/oura/callback — persist tokens then mark Connected.

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { withTimeout } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';
import { getOuraRedirectUri, isOuraConfigured, OURA_SCOPES } from '@/lib/wearables/oura/config';
import { exchangeOuraCode, ouraGet } from '@/lib/wearables/oura/client';
import { storeOuraTokens } from '@/lib/wearables/oura/tokens';
import { enqueueOuraBackfill } from '@/lib/wearables/oura/backfill';
import { seedDefaultPrecedence } from '@/lib/wearables/precedence';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SCOPE = 'api.integrations.oura.callback';
const BACK = '/body-tracker/connections';

interface OAuthStateRow {
  user_id: string;
  expires_at: string;
}

interface OuraPersonalInfo {
  id?: string;
}

export async function GET(req: NextRequest) {
  const origin = new URL(req.url).origin;
  const back = (q: string) => NextResponse.redirect(new URL(`${BACK}?${q}`, origin));

  if (!isOuraConfigured()) return back('wearable_error=oura_not_configured');

  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const oauthError = url.searchParams.get('error');

  if (oauthError) {
    safeLog.warn(SCOPE, 'oauth error param', { oauthError });
    return back('wearable_error=oura_denied');
  }
  if (!code || !state || state.length < 8) {
    return back('wearable_error=oura_invalid_state');
  }

  try {
    const admin = createAdminClient();
    const { data: st } = await withTimeout(
      admin.from('wearable_oauth_states').select('user_id, expires_at').eq('state', state).maybeSingle(),
      4000,
      `${SCOPE}.loadState`,
    );
    const row = st as OAuthStateRow | null;

    if (!row?.user_id) return back('wearable_error=oura_invalid_state');
    if (new Date(row.expires_at).getTime() < Date.now()) {
      return back('wearable_error=oura_state_expired');
    }

    await withTimeout(
      admin.from('wearable_oauth_states').delete().eq('state', state),
      3000,
      `${SCOPE}.clearState`,
    );

    const redirectUri = getOuraRedirectUri(origin);
    const tokens = await exchangeOuraCode(code, redirectUri);
    if (!tokens.refresh_token) {
      return back('wearable_error=oura_callback_failed');
    }
    await storeOuraTokens(admin, row.user_id, {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresIn: tokens.expires_in ?? 3600,
      scope: OURA_SCOPES.join(' '),
    });

    let externalUserId: string | null = null;
    try {
      const profile = await ouraGet<OuraPersonalInfo>('/usercollection/personal_info', tokens.access_token);
      if (profile?.id) externalUserId = String(profile.id);
    } catch (err) {
      safeLog.warn(SCOPE, 'profile fetch failed (non-blocking)', { error: err });
    }

    await withTimeout(
      admin.from('connected_sources').upsert(
        {
          user_id: row.user_id,
          provider: 'oura',
          status: 'connected',
          scopes: [...OURA_SCOPES],
          external_user_id: externalUserId,
          connected_at: new Date().toISOString(),
          last_sync_at: null,
          error_detail: null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,provider' },
      ),
      4000,
      `${SCOPE}.upsertSource`,
    );

    await seedDefaultPrecedence(admin, row.user_id);
    void enqueueOuraBackfill(admin, row.user_id).catch((err) =>
      safeLog.warn(SCOPE, 'backfill enqueue failed', { error: err }),
    );

    await withTimeout(
      admin.from('wearable_audit_log').insert({
        user_id: row.user_id,
        action: 'oura_connected',
        provider: 'oura',
        detail: { external_user_id: externalUserId },
      }),
      3000,
      `${SCOPE}.audit`,
    );

    return back('wearable_success=oura_connected');
  } catch (err) {
    safeLog.error(SCOPE, 'callback failed', { error: err });
    return back('wearable_error=oura_callback_failed');
  }
}
