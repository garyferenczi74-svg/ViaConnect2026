// Prompt #125 P3: OAuth callback.
//
// GET /api/marshall/scheduler/oauth/callback/{platform}?code=...&state=...
//   Verifies the signed state cookie, exchanges code for tokens, stores
//   tokens in Vault, inserts a scheduler_connections row, clears the
//   state cookie, and redirects to the practitioner scheduler portal.

import { NextResponse, type NextRequest } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { completeOAuthCallback } from '@/lib/marshall/scheduler/oauth';
import { clearStateCookieHeader, cookieStateStore } from '@/lib/marshall/scheduler/cookieStateStore';
import { supabaseTokenVault } from '@/lib/marshall/scheduler/tokenVault';
import { getClientSecret, getPlatformOAuthConfig } from '@/lib/marshall/scheduler/platformConfigs';
import { SCHEDULER_PLATFORMS, type SchedulerPlatform } from '@/lib/marshall/scheduler/types';
import { schedulerLogger } from '@/lib/marshall/scheduler/logging';

export const runtime = 'nodejs';

const PORTAL_PATH = '/practitioner/marshall/scheduler';

export async function GET(req: NextRequest, { params }: { params: { platform: string } }) {
  const platform = (params.platform ?? '').trim();
  if (!SCHEDULER_PLATFORMS.includes(platform as SchedulerPlatform)) {
    return NextResponse.json({ error: 'invalid_platform' }, { status: 400 });
  }

  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const platformError = url.searchParams.get('error');

  if (platformError) {
    const redirectUrl = new URL(PORTAL_PATH, url);
    redirectUrl.searchParams.set('oauth_error', platformError);
    redirectUrl.searchParams.set('platform', platform);
    const res = NextResponse.redirect(redirectUrl, 302);
    res.headers.append('set-cookie', clearStateCookieHeader());
    return res;
  }

  if (!code || !state) {
    return NextResponse.json({ error: 'missing_code_or_state' }, { status: 400 });
  }

  const session = createServerClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  const stateSecret = process.env.SCHEDULER_OAUTH_STATE_SECRET;
  if (!stateSecret) {
    return NextResponse.json({ error: 'state_secret_missing' }, { status: 500 });
  }

  const cookieHeader = req.headers.get('cookie') ?? '';
  const stateStore = cookieStateStore(cookieHeader, stateSecret);

  let cfg;
  try {
    cfg = getPlatformOAuthConfig(platform as SchedulerPlatform);
  } catch {
    return NextResponse.json({ error: 'platform_config_missing' }, { status: 500 });
  }
  let clientSecret: string;
  try {
    clientSecret = getClientSecret(platform as SchedulerPlatform);
  } catch {
    return NextResponse.json({ error: 'client_secret_missing' }, { status: 500 });
  }

  const admin = createAdminClient();
  const vault = supabaseTokenVault(admin);

  let outcome;
  try {
    outcome = await completeOAuthCallback({
      cfg,
      code,
      state,
      clientSecret,
      stateStore,
      vault,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'callback_failed';
    schedulerLogger.error('[scheduler/oauth/callback] complete failed', { platform, message });
    const redirectUrl = new URL(PORTAL_PATH, url);
    redirectUrl.searchParams.set('oauth_error', message);
    redirectUrl.searchParams.set('platform', platform);
    const res = NextResponse.redirect(redirectUrl, 302);
    res.headers.append('set-cookie', clearStateCookieHeader());
    return res;
  }

  // Defense in depth: the state cookie's practitionerId MUST match the
  // authenticated session. Protects against a stolen cookie being replayed
  // by a different logged-in user.
  if (outcome.practitionerId !== user.id) {
    schedulerLogger.warn('[scheduler/oauth/callback] practitioner mismatch', {
      platform,
      cookiePractitioner: outcome.practitionerId.slice(0, 8),
      sessionPractitioner: user.id.slice(0, 8),
    });
    // Best-effort revoke the just-stored token so an attacker doesn't
    // benefit from the trip.
    try {
      await vault.delete(outcome.vaultRef);
    } catch {
      // swallow: we already have bigger problems
    }
    return NextResponse.json({ error: 'practitioner_mismatch' }, { status: 403 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sbAdmin = admin as any;
  const { error: insertError } = await sbAdmin
    .from('scheduler_connections')
    .upsert(
      {
        practitioner_id: user.id,
        platform,
        external_account_id: `${platform}:${user.id}`,
        external_account_label: null,
        scopes_granted: (outcome.scope ?? cfg.scopes.join(' ')).split(/\s+/).filter(Boolean),
        token_vault_ref: outcome.vaultRef,
        connected_at: new Date().toISOString(),
        last_verified_at: new Date().toISOString(),
        active: true,
      },
      { onConflict: 'practitioner_id,platform,external_account_id' },
    );
  if (insertError) {
    schedulerLogger.error('[scheduler/oauth/callback] connection upsert failed', {
      platform,
      code: insertError.code,
    });
    return NextResponse.json({ error: 'connection_persist_failed' }, { status: 500 });
  }

  const redirectUrl = new URL(PORTAL_PATH, url);
  redirectUrl.searchParams.set('connected', platform);
  const res = NextResponse.redirect(redirectUrl, 302);
  res.headers.append('set-cookie', clearStateCookieHeader());
  return res;
}
