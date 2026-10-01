// Sign in with Apple token revocation.
// https://developer.apple.com/documentation/sign_in_with_apple/revoke_tokens
//
// Called only when the user has an Apple identity. Skips when the Apple
// env vars are missing or when Supabase did not return a refresh token.
//
// Required env (all must be set, or this step skips):
//   APPLE_TEAM_ID
//   APPLE_KEY_ID
//   APPLE_CLIENT_ID   Services ID used for Sign in with Apple
//   APPLE_PRIVATE_KEY PEM of the Sign in with Apple key. Newlines may be
//                     stored as the two characters \n.

import { createPrivateKey, createSign, type KeyObject } from 'node:crypto';

export const APPLE_REVOKE_ENV = [
  'APPLE_TEAM_ID',
  'APPLE_KEY_ID',
  'APPLE_CLIENT_ID',
  'APPLE_PRIVATE_KEY',
] as const;

export interface AppleIdentityInput {
  provider: string;
  identity_data?: unknown;
}

export type AppleRevokeResult =
  | { status: 'skipped'; note: 'no_apple_identity' | 'apple_env_missing' | 'apple_token_unavailable' | 'apple_token_already_invalid' }
  | { status: 'revoked' }
  | { status: 'failed'; note: 'apple_revoke_failed' };

const APPLE_REVOKE_URL = 'https://appleid.apple.com/auth/revoke';
const APPLE_AUDIENCE = 'https://appleid.apple.com';

function readEnv(name: (typeof APPLE_REVOKE_ENV)[number], env: NodeJS.ProcessEnv): string | null {
  const value = env[name];
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function appleEnvPresent(env: NodeJS.ProcessEnv = process.env): boolean {
  return APPLE_REVOKE_ENV.every((name) => readEnv(name, env) !== null);
}

function readRefreshToken(identityData: unknown): string | null {
  if (typeof identityData !== 'object' || identityData === null) return null;
  const record = identityData as Record<string, unknown>;
  for (const key of ['refresh_token', 'provider_refresh_token']) {
    const value = record[key];
    if (typeof value === 'string' && value.trim().length > 0) return value.trim();
  }
  return null;
}

export function findAppleRefreshToken(identities: readonly AppleIdentityInput[]): string | null {
  for (const identity of identities) {
    if (identity.provider !== 'apple') continue;
    const token = readRefreshToken(identity.identity_data);
    if (token) return token;
  }
  return null;
}

export function userHasAppleIdentity(identities: readonly AppleIdentityInput[]): boolean {
  return identities.some((identity) => identity.provider === 'apple');
}

function base64url(input: Buffer | string): string {
  const buf = typeof input === 'string' ? Buffer.from(input) : input;
  return buf.toString('base64url');
}

function derToJose(der: Buffer): Buffer {
  if (der.length < 8 || der[0] !== 0x30) {
    throw new Error('apple_key_signature');
  }
  let offset = 2;
  if ((der[1] & 0x80) !== 0) {
    offset = 2 + (der[1] & 0x7f);
  }
  if (der[offset] !== 0x02) throw new Error('apple_key_signature');
  const rLen = der[offset + 1];
  let r = der.subarray(offset + 2, offset + 2 + rLen);
  offset = offset + 2 + rLen;
  if (der[offset] !== 0x02) throw new Error('apple_key_signature');
  const sLen = der[offset + 1];
  let s = der.subarray(offset + 2, offset + 2 + sLen);
  if (r[0] === 0x00) r = r.subarray(1);
  if (s[0] === 0x00) s = s.subarray(1);
  if (r.length > 32 || s.length > 32) throw new Error('apple_key_signature');
  const out = Buffer.alloc(64);
  r.copy(out, 32 - r.length);
  s.copy(out, 64 - s.length);
  return out;
}

export function signAppleClientSecret(args: {
  teamId: string;
  keyId: string;
  clientId: string;
  privateKeyPem: string;
  nowSeconds: number;
}): string {
  const header = base64url(JSON.stringify({ alg: 'ES256', kid: args.keyId, typ: 'JWT' }));
  const payload = base64url(JSON.stringify({
    iss: args.teamId,
    iat: args.nowSeconds,
    exp: args.nowSeconds + 300,
    aud: APPLE_AUDIENCE,
    sub: args.clientId,
  }));
  const signingInput = `${header}.${payload}`;
  const pem = args.privateKeyPem.includes('\\n')
    ? args.privateKeyPem.replace(/\\n/g, '\n')
    : args.privateKeyPem;
  const key: KeyObject = createPrivateKey(pem);
  const signer = createSign('SHA256');
  signer.update(signingInput);
  signer.end();
  const jose = derToJose(signer.sign(key));
  return `${signingInput}.${base64url(jose)}`;
}

export async function revokeAppleSignIn(args: {
  identities: readonly AppleIdentityInput[];
  env?: NodeJS.ProcessEnv;
  nowSeconds?: number;
  fetchImpl?: typeof fetch;
}): Promise<AppleRevokeResult> {
  if (!userHasAppleIdentity(args.identities)) {
    return { status: 'skipped', note: 'no_apple_identity' };
  }
  const env = args.env ?? process.env;
  if (!appleEnvPresent(env)) {
    return { status: 'skipped', note: 'apple_env_missing' };
  }
  const token = findAppleRefreshToken(args.identities);
  if (!token) {
    return { status: 'skipped', note: 'apple_token_unavailable' };
  }

  const teamId = readEnv('APPLE_TEAM_ID', env);
  const keyId = readEnv('APPLE_KEY_ID', env);
  const clientId = readEnv('APPLE_CLIENT_ID', env);
  const privateKey = readEnv('APPLE_PRIVATE_KEY', env);
  if (!teamId || !keyId || !clientId || !privateKey) {
    return { status: 'skipped', note: 'apple_env_missing' };
  }

  let clientSecret: string;
  try {
    clientSecret = signAppleClientSecret({
      teamId,
      keyId,
      clientId,
      privateKeyPem: privateKey,
      nowSeconds: args.nowSeconds ?? Math.floor(Date.now() / 1000),
    });
  } catch {
    return { status: 'failed', note: 'apple_revoke_failed' };
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    token,
    token_type_hint: 'refresh_token',
  });

  const fetchImpl = args.fetchImpl ?? fetch;
  let response: Response;
  try {
    response = await fetchImpl(APPLE_REVOKE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
  } catch {
    return { status: 'failed', note: 'apple_revoke_failed' };
  }

  if (response.ok) return { status: 'revoked' };

  if (response.status === 400) {
    let errorCode = '';
    try {
      const parsed: unknown = await response.json();
      if (typeof parsed === 'object' && parsed !== null && 'error' in parsed) {
        const value = (parsed as { error?: unknown }).error;
        if (typeof value === 'string') errorCode = value;
      }
    } catch {
      errorCode = '';
    }
    if (errorCode === 'invalid_token' || errorCode === 'invalid_grant') {
      return { status: 'skipped', note: 'apple_token_already_invalid' };
    }
  }

  return { status: 'failed', note: 'apple_revoke_failed' };
}
