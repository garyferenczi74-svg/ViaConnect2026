// OAuth2 token refresh manager (Prompt #62j).
// Auto-refreshes expired tokens; marks connections for re-auth on failure.

export interface TokenSet {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
}

export async function getValidToken(connectionId: string): Promise<string> {
  const { createClient } = await import('@/lib/supabase/client');
  const supabase = createClient();

  const { data: conn } = await (supabase as any)
    .from('data_source_connections')
    .select('access_token, refresh_token, token_expires_at, source_id, source_name, user_id')
    .eq('id', connectionId)
    .single();

  if (!conn) throw new Error('Connection not found');

  // Token still valid
  if (conn.token_expires_at && new Date(conn.token_expires_at) > new Date()) {
    return conn.access_token;
  }

  // Attempt refresh
  if (!conn.refresh_token) {
    await markForReauth(connectionId);
    throw new Error('No refresh token; re-authentication required');
  }

  try {
    const newTokens = await refreshOAuthToken(conn.source_id, conn.refresh_token);

    await (supabase as any)
      .from('data_source_connections')
      .update({
        access_token: newTokens.accessToken,
        refresh_token: newTokens.refreshToken,
        token_expires_at: newTokens.expiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq('id', connectionId);

    return newTokens.accessToken;
  } catch {
    await markForReauth(connectionId);
    throw new Error('Token refresh failed; re-authentication required');
  }
}

async function markForReauth(connectionId: string) {
  try {
    const { createClient } = await import('@/lib/supabase/client');
    const supabase = createClient();
    await (supabase as any)
      .from('data_source_connections')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', connectionId);
  } catch { /* best effort */ }
}

async function refreshOAuthToken(sourceId: string, refreshToken: string): Promise<TokenSet> {
  const config = getOAuthConfig(sourceId);
  if (!config) throw new Error(`No OAuth config for ${sourceId}`);

  const res = await fetch(config.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: config.clientId,
      client_secret: config.clientSecret,
    }),
  });

  if (!res.ok) throw new Error(`Token refresh failed: ${res.status}`);

  const data = await res.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? refreshToken,
    expiresAt: new Date(Date.now() + (data.expires_in ?? 3600) * 1000).toISOString(),
  };
}

interface OAuthConfig {
  tokenUrl: string;
  clientId: string;
  clientSecret: string;
}

function getOAuthConfig(sourceId: string): OAuthConfig | null {
  const configs: Record<string, { tokenUrl: string; envPrefix: string }> = {
    myfitnesspal: { tokenUrl: 'https://api.myfitnesspal.com/oauth2/token', envPrefix: 'MFP' },
    cronometer: { tokenUrl: 'https://cronometer.com/oauth/token', envPrefix: 'CRONOMETER' },
    fitbit: { tokenUrl: 'https://api.fitbit.com/oauth2/token', envPrefix: 'FITBIT' },
    oura: { tokenUrl: 'https://api.ouraring.com/oauth/token', envPrefix: 'OURA' },
    whoop: { tokenUrl: 'https://api.prod.whoop.com/oauth/token', envPrefix: 'WHOOP' },
    garmin: { tokenUrl: 'https://connectapi.garmin.com/oauth-service/oauth/token', envPrefix: 'GARMIN' },
    strava: { tokenUrl: 'https://www.strava.com/api/v3/oauth/token', envPrefix: 'STRAVA' },
    hume: { tokenUrl: 'https://api.hume.ai/oauth2-cc/token', envPrefix: 'HUME' },
  };

  const cfg = configs[sourceId];
  if (!cfg) return null;

  const clientId = process.env[`${cfg.envPrefix}_CLIENT_ID`];
  const clientSecret = process.env[`${cfg.envPrefix}_CLIENT_SECRET`];
  if (!clientId || !clientSecret) return null;

  return { tokenUrl: cfg.tokenUrl, clientId, clientSecret };
}
