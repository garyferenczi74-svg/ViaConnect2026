// Prompt #125 P3: OAuth start redirect.
//
// GET /api/marshall/scheduler/oauth/start/{platform}
//   Requires an authenticated practitioner session. Builds the platform
//   authorize URL with PKCE + state, drops a signed HttpOnly state
//   cookie, and 302-redirects to the platform's authorize page.

import { NextResponse, type NextRequest } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { buildAuthorizeUrl, generatePkcePair, generateState } from '@/lib/marshall/scheduler/oauth';
import { buildStateCookieHeader } from '@/lib/marshall/scheduler/cookieStateStore';
import { getPlatformOAuthConfig } from '@/lib/marshall/scheduler/platformConfigs';
import { SCHEDULER_PLATFORMS, type SchedulerPlatform } from '@/lib/marshall/scheduler/types';

export const runtime = 'nodejs';

export async function GET(req: NextRequest, { params }: { params: { platform: string } }) {
  const platform = (params.platform ?? '').trim();
  if (!SCHEDULER_PLATFORMS.includes(platform as SchedulerPlatform)) {
    return NextResponse.json({ error: 'invalid_platform' }, { status: 400 });
  }
  const session = createServerClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  const stateSecret = process.env.SCHEDULER_OAUTH_STATE_SECRET;
  if (!stateSecret) {
    return NextResponse.json({ error: 'state_secret_missing' }, { status: 500 });
  }

  let cfg;
  try {
    cfg = getPlatformOAuthConfig(platform as SchedulerPlatform);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'config_failed';
    // eslint-disable-next-line no-console
    console.error('[scheduler/oauth/start] config missing', { platform, message });
    return NextResponse.json({ error: 'platform_config_missing' }, { status: 500 });
  }

  const pkce = generatePkcePair();
  const state = generateState();
  const { url } = buildAuthorizeUrl(cfg, { state, pkce });

  const cookie = buildStateCookieHeader(
    {
      v: 1,
      state,
      codeVerifier: pkce.codeVerifier,
      practitionerId: user.id,
      platform: platform as SchedulerPlatform,
      createdAt: new Date().toISOString(),
    },
    stateSecret,
  );

  const res = NextResponse.redirect(url, 302);
  res.headers.append('set-cookie', cookie);
  return res;
}
