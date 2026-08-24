// Oura Cloud HTTP client. Credentials come from env at runtime only.

import { withAbortTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';
import { OURA_API_BASE, OURA_TOKEN_URL, getOuraCreds } from './config';

const SCOPE = 'lib.wearables.oura.client';
const TIMEOUT_MS = 5000;

export interface OuraTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
}

export async function exchangeOuraCode(
  code: string,
  redirectUri: string,
): Promise<OuraTokenResponse> {
  const creds = getOuraCreds();
  if (!creds) throw new Error('Oura not configured');

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    client_id: creds.clientId,
    client_secret: creds.clientSecret,
  });

  const res = await withAbortTimeout(
    (signal) =>
      fetch(OURA_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
        signal,
      }),
    TIMEOUT_MS,
    `${SCOPE}.exchangeCode`,
  );

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    safeLog.warn(SCOPE, 'code exchange failed', { status: res.status, bodyLen: text.length });
    throw new Error(`Oura code exchange failed (${res.status})`);
  }
  return (await res.json()) as OuraTokenResponse;
}

export async function refreshOuraToken(refreshToken: string): Promise<OuraTokenResponse> {
  const creds = getOuraCreds();
  if (!creds) throw new Error('Oura not configured');

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: creds.clientId,
    client_secret: creds.clientSecret,
  });

  const res = await withAbortTimeout(
    (signal) =>
      fetch(OURA_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
        signal,
      }),
    TIMEOUT_MS,
    `${SCOPE}.refreshToken`,
  );

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    const err = new Error(`Oura refresh failed (${res.status})`) as Error & {
      status?: number;
      invalidGrant?: boolean;
    };
    err.status = res.status;
    err.invalidGrant = text.includes('invalid_grant') || res.status === 400;
    safeLog.warn(SCOPE, 'token refresh failed', {
      status: res.status,
      invalidGrant: err.invalidGrant,
    });
    throw err;
  }
  return (await res.json()) as OuraTokenResponse;
}

export async function ouraGet<T>(path: string, accessToken: string): Promise<T | null> {
  try {
    const url = path.startsWith('http') ? path : `${OURA_API_BASE}${path}`;
    const res = await withAbortTimeout(
      (signal) =>
        fetch(url, {
          headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
          signal,
        }),
      TIMEOUT_MS,
      `${SCOPE}.get`,
    );
    if (res.status === 429) {
      safeLog.warn(SCOPE, 'rate limited', { path });
      throw Object.assign(new Error('Oura rate limited'), { status: 429 });
    }
    if (!res.ok) {
      safeLog.warn(SCOPE, 'GET failed', { path, status: res.status });
      return null;
    }
    return (await res.json()) as T;
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.warn(SCOPE, 'GET timeout', { path, error: err });
      return null;
    }
    throw err;
  }
}

export async function revokeOuraAccess(accessToken: string): Promise<boolean> {
  try {
    const creds = getOuraCreds();
    if (!creds) return false;
    const body = new URLSearchParams({
      token: accessToken,
      client_id: creds.clientId,
      client_secret: creds.clientSecret,
    });
    const res = await withAbortTimeout(
      (signal) =>
        fetch(`${OURA_API_BASE.replace('/v2', '')}/oauth/revoke`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body,
          signal,
        }),
      TIMEOUT_MS,
      `${SCOPE}.revoke`,
    );
    return res.ok || res.status === 404;
  } catch (err) {
    safeLog.warn(SCOPE, 'revoke failed (fail-open)', { error: err });
    return false;
  }
}
