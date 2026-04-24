import { describe, it, expect, vi } from 'vitest';
import {
  buildAuthorizeUrl,
  completeOAuthCallback,
  exchangeCodeForTokens,
  generatePkcePair,
  generateState,
  refreshAccessToken,
  type PlatformOAuthConfig,
} from '@/lib/marshall/scheduler/oauth';
import type { OAuthStateStore } from '@/lib/marshall/scheduler/oauth';
import type { TokenVaultClient } from '@/lib/marshall/scheduler/tokenVault';

const cfg: PlatformOAuthConfig = {
  platform: 'buffer',
  authorizationUrl: 'https://bufferapp.com/oauth2/authorize',
  tokenUrl: 'https://api.bufferapp.com/1/oauth2/token.json',
  clientId: 'test-client-id',
  redirectUri: 'https://via-connect2026.vercel.app/api/marshall/scheduler/oauth/callback/buffer',
  scopes: ['read:updates', 'read:profiles', 'write:updates'],
};

describe('PKCE + state generation', () => {
  it('generates a 64-byte verifier and a matching S256 challenge', () => {
    const p = generatePkcePair();
    expect(p.codeVerifier.length).toBeGreaterThanOrEqual(40);
    expect(p.codeChallenge.length).toBeGreaterThanOrEqual(40);
    expect(p.codeChallengeMethod).toBe('S256');
    // No padding, no +/
    expect(p.codeChallenge).not.toContain('=');
    expect(p.codeChallenge).not.toContain('+');
    expect(p.codeChallenge).not.toContain('/');
  });

  it('state values are unique across calls', () => {
    const states = new Set(Array.from({ length: 10 }, () => generateState()));
    expect(states.size).toBe(10);
  });
});

describe('buildAuthorizeUrl', () => {
  it('includes PKCE + state + scopes + client_id on every URL', () => {
    const { url } = buildAuthorizeUrl(cfg);
    const u = new URL(url);
    expect(u.searchParams.get('code_challenge')).toBeTruthy();
    expect(u.searchParams.get('code_challenge_method')).toBe('S256');
    expect(u.searchParams.get('state')).toBeTruthy();
    expect(u.searchParams.get('client_id')).toBe('test-client-id');
    expect(u.searchParams.get('scope')).toBe('read:updates read:profiles write:updates');
    expect(u.searchParams.get('redirect_uri')).toBe(cfg.redirectUri);
  });

  it('merges platform-specific extra params', () => {
    const { url } = buildAuthorizeUrl({ ...cfg, extraAuthParams: { access_type: 'offline' } });
    expect(new URL(url).searchParams.get('access_type')).toBe('offline');
  });

  it('extraAuthParams cannot downgrade PKCE or suppress state', () => {
    const { url } = buildAuthorizeUrl({
      ...cfg,
      extraAuthParams: {
        code_challenge_method: 'plain',
        state: 'attacker-chosen',
        scope: 'admin',
      },
    });
    const u = new URL(url);
    expect(u.searchParams.get('code_challenge_method')).toBe('S256');
    expect(u.searchParams.get('state')).not.toBe('attacker-chosen');
    expect(u.searchParams.get('scope')).toBe('read:updates read:profiles write:updates');
  });
});

describe('exchangeCodeForTokens', () => {
  it('returns normalized bundle from a well-formed response', async () => {
    const fakeFetch = vi.fn(async () => new Response(
      JSON.stringify({ access_token: 'at', refresh_token: 'rt', token_type: 'Bearer', expires_in: 3600, scope: 'read:updates' }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    ));
    const bundle = await exchangeCodeForTokens({
      cfg,
      code: 'code123',
      codeVerifier: 'verifier',
      clientSecret: 'secret',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      fetchImpl: fakeFetch as any,
    });
    expect(bundle.accessToken).toBe('at');
    expect(bundle.refreshToken).toBe('rt');
    expect(bundle.tokenType).toBe('Bearer');
    expect(bundle.expiresAt).toBeTruthy();
    expect(fakeFetch).toHaveBeenCalledOnce();
  });

  it('throws on non-2xx', async () => {
    const fakeFetch = vi.fn(async () => new Response('nope', { status: 401 }));
    await expect(exchangeCodeForTokens({
      cfg, code: 'c', codeVerifier: 'v', clientSecret: 's',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      fetchImpl: fakeFetch as any,
    })).rejects.toThrow(/token_exchange_failed:401/);
  });

  it('throws when response omits access_token', async () => {
    const fakeFetch = vi.fn(async () => new Response(JSON.stringify({ token_type: 'Bearer' }), { status: 200 }));
    await expect(exchangeCodeForTokens({
      cfg, code: 'c', codeVerifier: 'v', clientSecret: 's',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      fetchImpl: fakeFetch as any,
    })).rejects.toThrow(/missing_access_token/);
  });
});

describe('refreshAccessToken', () => {
  it('sends grant_type=refresh_token and returns a fresh bundle', async () => {
    let capturedBody = '';
    const fakeFetch = vi.fn(async (_url: string | URL, init?: RequestInit) => {
      capturedBody = String(init?.body ?? '');
      return new Response(
        JSON.stringify({ access_token: 'new', token_type: 'Bearer', expires_in: 1800 }),
        { status: 200 },
      );
    });
    const bundle = await refreshAccessToken({
      cfg, refreshToken: 'rt-old', clientSecret: 's',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      fetchImpl: fakeFetch as any,
    });
    expect(capturedBody).toContain('grant_type=refresh_token');
    expect(capturedBody).toContain('refresh_token=rt-old');
    expect(bundle.accessToken).toBe('new');
  });
});

describe('completeOAuthCallback', () => {
  it('rejects unknown state', async () => {
    const store: OAuthStateStore = {
      async put() { /* noop */ },
      async take() { return null; },
    };
    const vault: TokenVaultClient = {
      async store() { return { vaultRef: 'x' }; },
      async read() { return { accessToken: 'at', tokenType: 'Bearer' }; },
      async delete() { /* noop */ },
    };
    await expect(completeOAuthCallback({
      cfg,
      code: 'c',
      state: 'bogus',
      clientSecret: 's',
      stateStore: store,
      vault,
    })).rejects.toThrow(/oauth_state_unknown/);
  });

  it('rejects platform mismatch on state', async () => {
    const store: OAuthStateStore = {
      async put() {},
      async take() {
        return { codeVerifier: 'v', practitionerId: 'p1', platform: 'hootsuite', createdAt: new Date().toISOString() };
      },
    };
    const vault: TokenVaultClient = {
      async store() { return { vaultRef: 'x' }; },
      async read() { return { accessToken: 'at', tokenType: 'Bearer' }; },
      async delete() {},
    };
    await expect(completeOAuthCallback({
      cfg,
      code: 'c',
      state: 'valid',
      clientSecret: 's',
      stateStore: store,
      vault,
    })).rejects.toThrow(/platform_mismatch/);
  });

  it('happy path: exchanges + stores in Vault + returns vaultRef', async () => {
    const store: OAuthStateStore = {
      async put() {},
      async take() {
        return { codeVerifier: 'v', practitionerId: 'p1', platform: 'buffer', createdAt: new Date().toISOString() };
      },
    };
    const storedBundles: unknown[] = [];
    const vault: TokenVaultClient = {
      async store(bundle) {
        storedBundles.push(bundle);
        return { vaultRef: 'vault-ref-xyz' };
      },
      async read() { return { accessToken: 'at', tokenType: 'Bearer' }; },
      async delete() {},
    };
    const fakeFetch = vi.fn(async () => new Response(
      JSON.stringify({ access_token: 'at', refresh_token: 'rt', token_type: 'Bearer', expires_in: 7200, scope: 'read:updates' }),
      { status: 200 },
    ));
    const result = await completeOAuthCallback({
      cfg,
      code: 'c',
      state: 's',
      clientSecret: 'sec',
      stateStore: store,
      vault,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      fetchImpl: fakeFetch as any,
    });
    expect(result.practitionerId).toBe('p1');
    expect(result.platform).toBe('buffer');
    expect(result.vaultRef).toBe('vault-ref-xyz');
    expect(storedBundles).toHaveLength(1);
  });
});
