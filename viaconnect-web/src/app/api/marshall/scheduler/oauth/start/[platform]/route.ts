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
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';

export const runtime = 'nodejs';

export async function GET(req: NextRequest, { params }: { params: { platform: string } }) {
  try {
    const platform = (params.platform ?? '').trim();
    if (!SCHEDULER_PLATFORMS.includes(platform as SchedulerPlatform)) {
      return NextResponse.json({ error: 'invalid_platform' }, { status: 400 });
    }
    const session = createServerClient();
    const { data: { user } } = await withTimeout(session.auth.getUser(), 5000, 'api.marshall.scheduler.oauth.start.auth');
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
      safeLog.error('api.marshall.scheduler.oauth.start', 'config missing', { platform, message });
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
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.warn('api.marshall.scheduler.oauth.start', 'request timeout', { error: err });
      return NextResponse.json({ error: 'timeout' }, { status: 503 });
    }
    safeLog.error('api.marshall.scheduler.oauth.start', 'unexpected error', { error: err });
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
