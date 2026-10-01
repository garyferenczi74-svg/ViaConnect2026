import { generateKeyPairSync } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { revokeAppleSignIn, signAppleClientSecret } from '@/lib/account/apple-revoke';

function pem(): string {
  const { privateKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  return privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
}

const ENV = {
  APPLE_TEAM_ID: 'TEAM123',
  APPLE_KEY_ID: 'KEY123',
  APPLE_CLIENT_ID: 'com.farmceutica.viaconnect',
  APPLE_PRIVATE_KEY: pem(),
};

describe('revokeAppleSignIn', () => {
  it('skips when the user has no Apple identity', async () => {
    const result = await revokeAppleSignIn({ identities: [{ provider: 'email' }], env: ENV });
    expect(result).toEqual({ status: 'skipped', note: 'no_apple_identity' });
  });

  it('skips when Apple env vars are missing', async () => {
    const result = await revokeAppleSignIn({
      identities: [{ provider: 'apple', identity_data: { refresh_token: 'tok' } }],
      env: {},
    });
    expect(result).toEqual({ status: 'skipped', note: 'apple_env_missing' });
  });

  it('skips when the Apple identity has no refresh token', async () => {
    const result = await revokeAppleSignIn({
      identities: [{ provider: 'apple', identity_data: { sub: 'abc' } }],
      env: ENV,
    });
    expect(result).toEqual({ status: 'skipped', note: 'apple_token_unavailable' });
  });

  it('calls the Apple revoke endpoint when a token and env are present', async () => {
    const calls: string[] = [];
    const result = await revokeAppleSignIn({
      identities: [{ provider: 'apple', identity_data: { refresh_token: 'refresh-token' } }],
      env: ENV,
      nowSeconds: 1_700_000_000,
      fetchImpl: async (input) => {
        calls.push(String(input));
        return new Response('', { status: 200 });
      },
    });
    expect(result).toEqual({ status: 'revoked' });
    expect(calls).toEqual(['https://appleid.apple.com/auth/revoke']);
  });

  it('treats an already-invalid token as a safe skip', async () => {
    const result = await revokeAppleSignIn({
      identities: [{ provider: 'apple', identity_data: { refresh_token: 'refresh-token' } }],
      env: ENV,
      fetchImpl: async () => new Response(JSON.stringify({ error: 'invalid_token' }), { status: 400 }),
    });
    expect(result).toEqual({ status: 'skipped', note: 'apple_token_already_invalid' });
  });

  it('signs a three-part client secret', () => {
    const jwt = signAppleClientSecret({
      teamId: 'TEAM123',
      keyId: 'KEY123',
      clientId: 'com.farmceutica.viaconnect',
      privateKeyPem: ENV.APPLE_PRIVATE_KEY,
      nowSeconds: 1_700_000_000,
    });
    expect(jwt.split('.')).toHaveLength(3);
  });
});
