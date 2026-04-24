import { describe, it, expect } from 'vitest';
import {
  COOKIE_NAME,
  buildStateCookieHeader,
  clearStateCookieHeader,
  cookieStateStore,
  signStateCookie,
  verifyStateCookie,
} from '@/lib/marshall/scheduler/cookieStateStore';

const SECRET = 'cookie-secret-at-least-32-bytes-long-xxxxxxxxxxxxxxxx';

const payload = {
  v: 1 as const,
  state: 'state-abc',
  codeVerifier: 'verifier-xyz',
  practitionerId: 'pract-1',
  platform: 'buffer' as const,
  createdAt: new Date().toISOString(),
};

describe('signStateCookie / verifyStateCookie', () => {
  it('roundtrips an honest payload', () => {
    const cookie = signStateCookie(payload, SECRET);
    const back = verifyStateCookie(cookie, SECRET);
    expect(back?.state).toBe('state-abc');
    expect(back?.codeVerifier).toBe('verifier-xyz');
    expect(back?.practitionerId).toBe('pract-1');
  });

  it('rejects tampered payload (signature mismatch)', () => {
    const cookie = signStateCookie(payload, SECRET);
    const tampered = cookie.replace(/^[^.]+/, 'eyJhaGEiOjF9');
    expect(verifyStateCookie(tampered, SECRET)).toBeNull();
  });

  it('rejects signature from a different secret', () => {
    const cookie = signStateCookie(payload, 'other-secret');
    expect(verifyStateCookie(cookie, SECRET)).toBeNull();
  });

  it('rejects expired payload (>10 minutes old)', () => {
    const old = { ...payload, createdAt: new Date(Date.now() - 11 * 60_000).toISOString() };
    const cookie = signStateCookie(old, SECRET);
    expect(verifyStateCookie(cookie, SECRET)).toBeNull();
  });

  it('rejects malformed cookie', () => {
    expect(verifyStateCookie('not-a-cookie', SECRET)).toBeNull();
    expect(verifyStateCookie('onlyonepart', SECRET)).toBeNull();
  });
});

describe('buildStateCookieHeader / clearStateCookieHeader', () => {
  it('build header carries HttpOnly + Secure + SameSite=Lax', () => {
    const header = buildStateCookieHeader(payload, SECRET);
    expect(header).toContain(COOKIE_NAME);
    expect(header).toContain('HttpOnly');
    expect(header).toContain('Secure');
    expect(header).toContain('SameSite=Lax');
    expect(header).toContain('Path=/');
  });

  it('clear header sets Max-Age=0', () => {
    expect(clearStateCookieHeader()).toContain('Max-Age=0');
    expect(clearStateCookieHeader()).toContain(COOKIE_NAME);
  });
});

describe('cookieStateStore.take', () => {
  it('returns the stored payload when state matches', async () => {
    const value = encodeURIComponent(signStateCookie(payload, SECRET));
    const header = `${COOKIE_NAME}=${value}; session=abc`;
    const store = cookieStateStore(header, SECRET);
    const back = await store.take('state-abc');
    expect(back?.codeVerifier).toBe('verifier-xyz');
    expect(back?.platform).toBe('buffer');
  });

  it('returns null when state in URL does not match cookie', async () => {
    const value = encodeURIComponent(signStateCookie(payload, SECRET));
    const header = `${COOKIE_NAME}=${value}`;
    const store = cookieStateStore(header, SECRET);
    const back = await store.take('different-state');
    expect(back).toBeNull();
  });

  it('returns null when cookie is missing', async () => {
    const store = cookieStateStore('session=abc', SECRET);
    expect(await store.take('any')).toBeNull();
  });

  it('returns null for tampered cookie', async () => {
    const value = encodeURIComponent('tampered.parts');
    const header = `${COOKIE_NAME}=${value}`;
    const store = cookieStateStore(header, SECRET);
    expect(await store.take('state-abc')).toBeNull();
  });

  it('put() is not supported (response-header flow only)', async () => {
    const store = cookieStateStore('', SECRET);
    await expect(store.put('s', {
      codeVerifier: 'v', practitionerId: 'p', platform: 'buffer', createdAt: new Date().toISOString(),
    })).rejects.toThrow(/not_supported/);
  });
});
