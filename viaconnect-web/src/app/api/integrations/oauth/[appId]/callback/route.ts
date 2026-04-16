import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAppDef } from '@/lib/integrations/appRegistry';

export async function GET(req: NextRequest, { params }: { params: { appId: string } }) {
  const { appId } = params;
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  if (error) {
    return NextResponse.redirect(new URL(`/settings/integrations?error=${error}`, req.url));
  }

  if (!code) {
    return NextResponse.redirect(new URL('/settings/integrations?error=no_code', req.url));
  }

  const appDef = getAppDef(appId);
  if (!appDef) {
    return NextResponse.redirect(new URL('/settings/integrations?error=unknown_app', req.url));
  }

  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.redirect(new URL('/login', req.url));
    }

    // Exchange code for tokens (app-specific token URLs are in tokenManager)
    const envPrefix = appId.toUpperCase().replace(/[^A-Z]/g, '');
    const clientId = process.env[`${envPrefix}_CLIENT_ID`];
    const clientSecret = process.env[`${envPrefix}_CLIENT_SECRET`];
    const redirectUri = `${url.origin}/api/integrations/oauth/${appId}/callback`;

    if (!clientId || !clientSecret) {
      return NextResponse.redirect(new URL('/settings/integrations?error=not_configured', req.url));
    }

    const tokenRes = await fetch(getTokenUrl(appId), {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      console.error(`oauth/${appId}: Token exchange failed`, err);
      return NextResponse.redirect(new URL('/settings/integrations?error=token_failed', req.url));
    }

    const tokens = await tokenRes.json();

    // Store connection
    // @ts-expect-error -- data_source_connections table not in generated Database type
    await supabase.from('data_source_connections').upsert({
      user_id: user.id,
      source_id: appId,
      source_type: appDef.category === 'nutrition' ? 'nutrition_app' : appDef.category === 'mindfulness' ? 'mindfulness_app' : 'wearable',
      source_name: appDef.name,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_expires_at: new Date(Date.now() + (tokens.expires_in ?? 3600) * 1000).toISOString(),
      is_active: true,
      last_sync_at: new Date().toISOString(),
    }, { onConflict: 'user_id,source_id' });

    return NextResponse.redirect(new URL('/settings/integrations?connected=' + appId, req.url));
  } catch (err: unknown) {
    console.error(`oauth/${appId}:`, err);
    return NextResponse.redirect(new URL('/settings/integrations?error=internal', req.url));
  }
}

function getTokenUrl(appId: string): string {
  const urls: Record<string, string> = {
    myfitnesspal: 'https://api.myfitnesspal.com/oauth2/token',
    cronometer: 'https://cronometer.com/oauth/token',
    fitbit: 'https://api.fitbit.com/oauth2/token',
    oura: 'https://api.ouraring.com/oauth/token',
    whoop: 'https://api.prod.whoop.com/oauth/token',
    garmin: 'https://connectapi.garmin.com/oauth-service/oauth/token',
    strava: 'https://www.strava.com/api/v3/oauth/token',
    hume: 'https://api.hume.ai/oauth2-cc/token',
    sonar_health: 'https://api.sonar.health/oauth/token',
    everme: 'https://api.everme.app/oauth2/token',
    bevel: 'https://api.bevel.app/oauth/token',
    fitonamy: 'https://api.fitonamy.com/oauth2/token',
    bestmy: 'https://api.bestmy.app/oauth/token',
    lyfta: 'https://api.lyfta.app/oauth2/token',
  };
  return urls[appId] ?? '';
}
