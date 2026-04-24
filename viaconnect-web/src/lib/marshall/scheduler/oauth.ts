// Prompt #125 P2: OAuth 2.0 authorization code flow helpers.
//
// Hard rails from §5:
//   - PKCE on every platform (all five support S256).
//   - State parameter on every redirect; verified on callback.
//   - Redirect URI allowlist pinned at platform-registration time.
//   - Tokens written straight to Vault via TokenVaultClient; no token
//     ever lives in a DB column, a log line, or an API response body.
//   - Minimum-necessary scopes per platform (see §4).
//
// This module is shaped so it can be consumed by per-platform adapters
// that supply their own token endpoint URLs, client credentials, and
// scope lists.

import { createHash, randomBytes } from 'node:crypto';
import { schedulerLogger } from './logging';
import type { SchedulerPlatform } from './types';
import type { OAuthTokenBundle, TokenVaultClient } from './tokenVault';

// ─── PKCE ─────────────────────────────────────────────────────────────────

export interface PkcePair {
  codeVerifier: string;
  codeChallenge: string; // S256 of verifier, base64url no padding
  codeChallengeMethod: 'S256';
}

function base64url(buf: Buffer): string {
  return buf.toString('base64').replace(/=+$/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

export function generatePkcePair(): PkcePair {
  // RFC 7636 recommends 43-128 chars; we use 64 bytes entropy -> ~86 chars.
  const verifier = base64url(randomBytes(64));
  const challenge = base64url(createHash('sha256').update(verifier).digest());
  return { codeVerifier: verifier, codeChallenge: challenge, codeChallengeMethod: 'S256' };
}

export function generateState(): string {
  return base64url(randomBytes(32));
}

// ─── Authorization URL construction ───────────────────────────────────────

export interface PlatformOAuthConfig {
  platform: SchedulerPlatform;
  authorizationUrl: string;
  tokenUrl: string;
  revocationUrl?: string;
  clientId: string;
  redirectUri: string;
  scopes: string[];
  /** Extra params pinned by the platform (e.g. Hootsuite `response_type=code`). */
  extraAuthParams?: Record<string, string>;
}

export interface AuthorizeUrlResult {
  url: string;
  state: string;
  codeVerifier: string;
  pkceChallenge: string;
}

// Keys that a hostile platform config must not be allowed to overwrite via
// extraAuthParams. Prevents silent PKCE downgrade or state suppression.
const PROTECTED_AUTH_PARAMS = new Set([
  'response_type',
  'client_id',
  'redirect_uri',
  'scope',
  'state',
  'code_challenge',
  'code_challenge_method',
]);

export function buildAuthorizeUrl(
  cfg: PlatformOAuthConfig,
  override?: { state?: string; pkce?: PkcePair },
): AuthorizeUrlResult {
  const state = override?.state ?? generateState();
  const pkce = override?.pkce ?? generatePkcePair();
  const url = new URL(cfg.authorizationUrl);
  for (const [k, v] of Object.entries(cfg.extraAuthParams ?? {})) {
    if (PROTECTED_AUTH_PARAMS.has(k)) continue;
    url.searchParams.set(k, v);
  }
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', cfg.clientId);
  url.searchParams.set('redirect_uri', cfg.redirectUri);
  url.searchParams.set('scope', cfg.scopes.join(' '));
  url.searchParams.set('state', state);
  url.searchParams.set('code_challenge', pkce.codeChallenge);
  url.searchParams.set('code_challenge_method', 'S256');
  return { url: url.toString(), state, codeVerifier: pkce.codeVerifier, pkceChallenge: pkce.codeChallenge };
}

// ─── State store (caller-provided) ────────────────────────────────────────

/**
 * Caller supplies the storage for OAuth transient state. Typical impl
 * writes to a short-lived server-side cache keyed by state value; state
 * expires in ~10 minutes. Tests use an in-memory Map.
 */
export interface OAuthStateStore {
  put(state: string, payload: { codeVerifier: string; practitionerId: string; platform: SchedulerPlatform; createdAt: string }): Promise<void>;
  take(state: string): Promise<{ codeVerifier: string; practitionerId: string; platform: SchedulerPlatform; createdAt: string } | null>;
}

// ─── Token exchange ───────────────────────────────────────────────────────

export interface ExchangeCodeInput {
  cfg: PlatformOAuthConfig;
  code: string;
  codeVerifier: string;
  clientSecret: string;
  fetchImpl?: typeof fetch;
}

export async function exchangeCodeForTokens(input: ExchangeCodeInput): Promise<OAuthTokenBundle> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code: input.code,
    redirect_uri: input.cfg.redirectUri,
    client_id: input.cfg.clientId,
    client_secret: input.clientSecret,
    code_verifier: input.codeVerifier,
  });
  const f = input.fetchImpl ?? fetch;
  const res = await f(input.cfg.tokenUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' },
    body,
  });
  if (!res.ok) {
    schedulerLogger.error('[oauth] token exchange failed', { platform: input.cfg.platform, status: res.status });
    throw new Error(`token_exchange_failed:${res.status}`);
  }
  const payload = (await res.json()) as {
    access_token?: string;
    refresh_token?: string;
    token_type?: string;
    expires_in?: number;
    scope?: string;
  };
  if (!payload.access_token) {
    throw new Error('token_exchange_missing_access_token');
  }
  const expiresAt = typeof payload.expires_in === 'number'
    ? new Date(Date.now() + payload.expires_in * 1000).toISOString()
    : undefined;
  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token,
    tokenType: payload.token_type ?? 'Bearer',
    expiresAt,
    scope: payload.scope,
  };
}

export interface RefreshTokensInput {
  cfg: PlatformOAuthConfig;
  refreshToken: string;
  clientSecret: string;
  fetchImpl?: typeof fetch;
}

export async function refreshAccessToken(input: RefreshTokensInput): Promise<OAuthTokenBundle> {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: input.refreshToken,
    client_id: input.cfg.clientId,
    client_secret: input.clientSecret,
  });
  const f = input.fetchImpl ?? fetch;
  const res = await f(input.cfg.tokenUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' },
    body,
  });
  if (!res.ok) {
    schedulerLogger.error('[oauth] refresh failed', { platform: input.cfg.platform, status: res.status });
    throw new Error(`token_refresh_failed:${res.status}`);
  }
  const payload = (await res.json()) as {
    access_token?: string;
    refresh_token?: string;
    token_type?: string;
    expires_in?: number;
    scope?: string;
  };
  if (!payload.access_token) {
    throw new Error('token_refresh_missing_access_token');
  }
  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token,
    tokenType: payload.token_type ?? 'Bearer',
    expiresAt: typeof payload.expires_in === 'number'
      ? new Date(Date.now() + payload.expires_in * 1000).toISOString()
      : undefined,
    scope: payload.scope,
  };
}

// ─── Complete callback flow ───────────────────────────────────────────────

export interface CompleteCallbackInput {
  cfg: PlatformOAuthConfig;
  code: string;
  state: string;
  clientSecret: string;
  stateStore: OAuthStateStore;
  vault: TokenVaultClient;
  fetchImpl?: typeof fetch;
}

export interface CompleteCallbackResult {
  practitionerId: string;
  platform: SchedulerPlatform;
  vaultRef: string;
  scope?: string;
  expiresAt?: string;
}

export async function completeOAuthCallback(input: CompleteCallbackInput): Promise<CompleteCallbackResult> {
  const stored = await input.stateStore.take(input.state);
  if (!stored) {
    throw new Error('oauth_state_unknown');
  }
  if (stored.platform !== input.cfg.platform) {
    throw new Error('oauth_state_platform_mismatch');
  }
  const bundle = await exchangeCodeForTokens({
    cfg: input.cfg,
    code: input.code,
    codeVerifier: stored.codeVerifier,
    clientSecret: input.clientSecret,
    fetchImpl: input.fetchImpl,
  });
  const { vaultRef } = await input.vault.store(bundle, `scheduler:${input.cfg.platform}:connect`);
  return {
    practitionerId: stored.practitionerId,
    platform: input.cfg.platform,
    vaultRef,
    scope: bundle.scope,
    expiresAt: bundle.expiresAt,
  };
}
