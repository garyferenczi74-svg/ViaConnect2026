// Prompt #125 P3: HMAC-signed cookie-based OAuth state store.
//
// Stateless alternative to a DB table. On /start we sign the state
// payload (state value, PKCE verifier, practitioner id, platform,
// created-at) with HMAC-SHA256 under SCHEDULER_OAUTH_STATE_SECRET and
// drop a short-lived HttpOnly cookie. On /callback we verify the
// signature, cross-check that the state value matches the one in the
// callback URL, and consume the cookie in the same response.
//
// Why cookies instead of DB: OAuth state is transient (~10 minutes),
// single-browser-tab, and must survive exactly one round trip. A DB
// table is overkill and adds another surface for concurrent-write bugs.

import { createHmac, timingSafeEqual } from 'node:crypto';
import type { OAuthStateStore } from './oauth';
import type { SchedulerPlatform } from './types';

export const COOKIE_NAME = 'viaconnect_scheduler_oauth_state';
const TTL_MS = 10 * 60 * 1000;

interface StatePayloadV1 {
  v: 1;
  state: string;
  codeVerifier: string;
  practitionerId: string;
  platform: SchedulerPlatform;
  createdAt: string;
}

function b64url(buf: Buffer): string {
  return buf.toString('base64').replace(/=+$/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function b64urlDecode(input: string): Buffer {
  const pad = 4 - (input.length % 4 || 4);
  const padded = input + '='.repeat(pad % 4);
  return Buffer.from(padded.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
}

export function signStateCookie(payload: StatePayloadV1, secret: string): string {
  const json = JSON.stringify(payload);
  const payloadB64 = b64url(Buffer.from(json, 'utf8'));
  const sig = createHmac('sha256', secret).update(payloadB64).digest();
  return `${payloadB64}.${b64url(sig)}`;
}

export function verifyStateCookie(raw: string, secret: string): StatePayloadV1 | null {
  const parts = raw.split('.');
  if (parts.length !== 2) return null;
  const [payloadB64, sigB64] = parts;
  const expected = createHmac('sha256', secret).update(payloadB64).digest();
  const given = b64urlDecode(sigB64);
  if (expected.length !== given.length) return null;
  try {
    if (!timingSafeEqual(expected, given)) return null;
  } catch {
    return null;
  }
  try {
    const parsed = JSON.parse(b64urlDecode(payloadB64).toString('utf8')) as StatePayloadV1;
    if (parsed.v !== 1) return null;
    const createdAt = Date.parse(parsed.createdAt);
    if (Number.isNaN(createdAt) || Date.now() - createdAt > TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Build a Set-Cookie header value for the signed state cookie. The
 * caller attaches it to the /start redirect response.
 */
export function buildStateCookieHeader(payload: StatePayloadV1, secret: string): string {
  const value = signStateCookie(payload, secret);
  return `${COOKIE_NAME}=${encodeURIComponent(value)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${Math.floor(TTL_MS / 1000)}`;
}

export function clearStateCookieHeader(): string {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

/**
 * Caller-scoped OAuthStateStore backed by a single request's cookie
 * header value. `put` throws because cookies are set via response
 * headers not via this interface; callers on /start should use
 * buildStateCookieHeader directly.
 */
export function cookieStateStore(cookieHeader: string, secret: string): OAuthStateStore {
  return {
    async put() {
      throw new Error('cookie_state_store_put_not_supported');
    },
    async take(state) {
      const cookies = parseCookieHeader(cookieHeader);
      const raw = cookies[COOKIE_NAME];
      if (!raw) return null;
      const payload = verifyStateCookie(decodeURIComponent(raw), secret);
      if (!payload) return null;
      if (payload.state !== state) return null;
      return {
        codeVerifier: payload.codeVerifier,
        practitionerId: payload.practitionerId,
        platform: payload.platform,
        createdAt: payload.createdAt,
      };
    },
  };
}

function parseCookieHeader(header: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx <= 0) continue;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (key) out[key] = value;
  }
  return out;
}
