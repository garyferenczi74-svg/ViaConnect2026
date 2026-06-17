// Prompt 201b: Google Health OAuth 2.0 server-to-server auth.
//
// Server-side only. Tokens are encrypted (crypto.ts) before they reach
// data_source_connections and decrypted on read. Refresh races a timeout and
// fails open: a refresh failure marks the connection for re-auth rather than
// throwing into a user path. Tokens are never returned to the client.
//
// Credentials come from GOOGLE_HEALTH_CLIENT_ID and GOOGLE_HEALTH_CLIENT_SECRET
// (server secrets Gary provisions in Google Cloud). The connector stays
// not-configured until both those and GOOGLE_HEALTH_TOKEN_KEY are present.
//
// All comments use hyphens only. No em-dashes or en-dashes.

import type { SupabaseClient } from "@supabase/supabase-js";
import { withAbortTimeout, withTimeout, isTimeoutError } from "@/lib/utils/with-timeout";
import { safeLog } from "@/lib/utils/safe-log";
import {
  GOOGLE_OAUTH_AUTH_URL,
  GOOGLE_OAUTH_TOKEN_URL,
  GOOGLE_HEALTH_SOURCE_ID,
  ENABLED_DOMAINS,
  enabledScopes,
  type GoogleHealthDomain,
} from "./config";
import {
  encryptToken,
  decryptToken,
  tryDecryptToken,
  isTokenEncryptionConfigured,
} from "./crypto";

const SCOPE = "lib.integrations.google-health.auth";
const TOKEN_TIMEOUT_MS = 5000;

export interface GoogleHealthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: string; // ISO
}

interface ClientCreds {
  clientId: string;
  clientSecret: string;
}

export function getClientCreds(): ClientCreds | null {
  const clientId = process.env.GOOGLE_HEALTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_HEALTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

// The connector is usable only when OAuth credentials and the token encryption
// key are both present. Used by the UI and routes to stay honest.
export function isConnectorConfigured(): boolean {
  return getClientCreds() !== null && isTokenEncryptionConfigured();
}

// Build the Google consent URL. access_type=offline plus prompt=consent so a
// refresh token is issued. Scopes are minimal to the enabled domains.
export function buildAuthorizeUrl(
  redirectUri: string,
  state: string,
  domains: GoogleHealthDomain[] = ENABLED_DOMAINS,
): string | null {
  const creds = getClientCreds();
  if (!creds) return null;
  const params = new URLSearchParams({
    client_id: creds.clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    access_type: "offline",
    include_granted_scopes: "true",
    prompt: "consent",
    state,
    scope: enabledScopes(domains).join(" "),
  });
  return `${GOOGLE_OAUTH_AUTH_URL}?${params.toString()}`;
}

function tokenSetFromResponse(data: Record<string, unknown>, fallbackRefresh?: string): GoogleHealthTokens {
  const expiresIn = typeof data.expires_in === "number" ? data.expires_in : 3600;
  return {
    accessToken: String(data.access_token ?? ""),
    refreshToken: String(data.refresh_token ?? fallbackRefresh ?? ""),
    expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
  };
}

// Exchange an authorization code for tokens. Throws on failure (the callback
// route turns that into a redirect with an error code).
export async function exchangeCode(code: string, redirectUri: string): Promise<GoogleHealthTokens> {
  const creds = getClientCreds();
  if (!creds) throw new Error("google_health client not configured");
  const res = await withAbortTimeout(
    (signal) =>
      fetch(GOOGLE_OAUTH_TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          client_id: creds.clientId,
          client_secret: creds.clientSecret,
          redirect_uri: redirectUri,
        }),
        signal,
      }),
    TOKEN_TIMEOUT_MS * 2,
    `${SCOPE}.exchange`,
  );
  if (!res.ok) {
    const body = await res.text();
    safeLog.error(SCOPE, "code exchange non-2xx", { status: res.status, body });
    throw new Error(`code exchange failed: ${res.status}`);
  }
  return tokenSetFromResponse(await res.json());
}

// Refresh an access token. Races a timeout; on any failure returns null so the
// caller fails open (marks for re-auth) instead of throwing.
async function refreshAccessToken(refreshToken: string): Promise<GoogleHealthTokens | null> {
  const creds = getClientCreds();
  if (!creds) return null;
  try {
    const res = await withAbortTimeout(
      (signal) =>
        fetch(GOOGLE_OAUTH_TOKEN_URL, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            grant_type: "refresh_token",
            refresh_token: refreshToken,
            client_id: creds.clientId,
            client_secret: creds.clientSecret,
          }),
          signal,
        }),
      TOKEN_TIMEOUT_MS,
      `${SCOPE}.refresh`,
    );
    if (!res.ok) {
      safeLog.warn(SCOPE, "refresh non-2xx", { status: res.status });
      return null;
    }
    return tokenSetFromResponse(await res.json(), refreshToken);
  } catch (err) {
    if (isTimeoutError(err)) safeLog.warn(SCOPE, "refresh timeout", { error: err });
    else safeLog.warn(SCOPE, "refresh error", { error: err });
    return null;
  }
}

// Encrypted token bundle stored in body_tracker_connections.metadata. The
// dedicated World B token table (data_source_connections) was never applied to
// production, so the connector keeps its token state inside the Prompt 201
// connections table that does exist, encrypted at the application layer.
export interface GoogleHealthConnMeta {
  access_token?: string; // encrypted envelope
  refresh_token?: string; // encrypted envelope
  token_expires_at?: string; // ISO
  is_active?: boolean;
  health_user_id?: string | null; // Google Health account id, for webhook routing
  legacy_user_id?: string | null; // Fitbit legacy account id
}

export interface GoogleHealthIdentityInput {
  healthUserId: string | null;
  legacyUserId: string | null;
}

export interface ConnectionRow {
  id: string;
  user_id: string;
  metadata: GoogleHealthConnMeta | null;
}

// Persist a connection with encrypted tokens in body_tracker_connections. The
// identity (healthUserId / legacyUserId) is stored so webhook notifications can
// be routed to the right user.
export async function storeConnection(
  supabase: SupabaseClient,
  userId: string,
  tokens: GoogleHealthTokens,
  identity?: GoogleHealthIdentityInput | null,
): Promise<void> {
  if (!isTokenEncryptionConfigured()) {
    throw new Error("token encryption not configured; refusing to store plaintext");
  }
  const nowIso = new Date().toISOString();
  await withTimeout(
    (async () =>
      (supabase as unknown as { from: (t: string) => any })
        .from("body_tracker_connections")
        .upsert(
          {
            user_id: userId,
            source_id: GOOGLE_HEALTH_SOURCE_ID,
            status: "connected",
            auth_method: "oauth2",
            last_sync_at: nowIso,
            updated_at: nowIso,
            metadata: {
              access_token: encryptToken(tokens.accessToken),
              refresh_token: encryptToken(tokens.refreshToken),
              token_expires_at: tokens.expiresAt,
              is_active: true,
              health_user_id: identity?.healthUserId ?? null,
              legacy_user_id: identity?.legacyUserId ?? null,
            } satisfies GoogleHealthConnMeta,
          },
          { onConflict: "user_id,source_id" },
        ))(),
    8000,
    `${SCOPE}.store`,
  );
}

async function markForReauth(supabase: SupabaseClient, connectionId: string): Promise<void> {
  try {
    await withTimeout(
      (async () =>
        (supabase as unknown as { from: (t: string) => any })
          .from("body_tracker_connections")
          .update({ status: "disconnected", updated_at: new Date().toISOString() })
          .eq("id", connectionId))(),
      5000,
      `${SCOPE}.reauth`,
    );
  } catch {
    // best effort
  }
}

// Return a valid access token for a stored connection, refreshing under timeout
// when expired. Throws (after marking for re-auth) when no usable token can be
// produced; callers treat that as a soft skip.
export async function getValidAccessToken(
  supabase: SupabaseClient,
  conn: ConnectionRow,
): Promise<string> {
  const meta = conn.metadata ?? {};
  const access = tryDecryptToken(meta.access_token);
  if (meta.token_expires_at && new Date(meta.token_expires_at) > new Date(Date.now() + 60_000) && access) {
    return access;
  }

  const refresh = tryDecryptToken(meta.refresh_token);
  if (!refresh) {
    await markForReauth(supabase, conn.id);
    throw new Error("no refresh token; re-authentication required");
  }

  const refreshed = await refreshAccessToken(refresh);
  if (!refreshed || !refreshed.accessToken) {
    await markForReauth(supabase, conn.id);
    throw new Error("token refresh failed; re-authentication required");
  }

  try {
    await withTimeout(
      (async () =>
        (supabase as unknown as { from: (t: string) => any })
          .from("body_tracker_connections")
          .update({
            metadata: {
              ...meta,
              access_token: encryptToken(refreshed.accessToken),
              refresh_token: encryptToken(refreshed.refreshToken),
              token_expires_at: refreshed.expiresAt,
              is_active: true,
            } satisfies GoogleHealthConnMeta,
            updated_at: new Date().toISOString(),
          })
          .eq("id", conn.id))(),
      5000,
      `${SCOPE}.persist-refresh`,
    );
  } catch (err) {
    safeLog.warn(SCOPE, "failed to persist refreshed token", { error: err, connectionId: conn.id });
  }

  return refreshed.accessToken;
}
