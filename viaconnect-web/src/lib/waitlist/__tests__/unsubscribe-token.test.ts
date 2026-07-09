/**
 * src/lib/waitlist/__tests__/unsubscribe-token.test.ts
 *
 * Prompt 210f Task F4b. Red-first tests for the pure unsubscribe token
 * module (sign + verify, HMAC-SHA256, constant-time compare). This file was
 * written and run BEFORE src/lib/waitlist/unsubscribe-token.ts existed
 * (module unresolvable = red), then the module was implemented to green.
 *
 * Token contract (pinned here; the Deno signer mirror in
 * supabase/functions/practitioner-waitlist-mailer/index.ts must produce
 * byte-identical tokens):
 *   token       = <waitlistId>.<signature>
 *   waitlistId  = lowercase UUID (the practitioner_waitlist row id; reuses
 *                 the row's existing unique identifier, no new column)
 *   signature   = 64 lowercase hex chars, HMAC-SHA256(secret, waitlistId)
 *   secret      = UNSUBSCRIBE_TOKEN_SECRET (Gary sets it in Vercel env at
 *                 arming; missing secret fails closed)
 *
 * Rules: node-safe, node builtins only, zero any, no em dashes, no en
 * dashes, no emojis.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  signUnsubscribeToken,
  verifyUnsubscribeToken,
} from '../unsubscribe-token';

const SECRET = 'test-secret-for-vitest-only-not-a-real-credential';
const OTHER_SECRET = 'a-completely-different-secret-value';
const WAITLIST_ID = '3f2a1b4c-5d6e-4f70-8a9b-0c1d2e3f4a5b';
const OTHER_ID = '9e8d7c6b-5a49-4382-b716-05f4e3d2c1b0';

// ---------------------------------------------------------------------------
// 1. Valid roundtrip
// ---------------------------------------------------------------------------

describe('unsubscribe token: valid roundtrip', () => {
  it('sign then verify returns valid with the original waitlist id', () => {
    const token = signUnsubscribeToken(WAITLIST_ID, SECRET);
    const result = verifyUnsubscribeToken(token, SECRET);
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.waitlistId).toBe(WAITLIST_ID);
    }
  });

  it('token format is <uuid>.<64 lowercase hex chars> and is URL-safe as-is', () => {
    const token = signUnsubscribeToken(WAITLIST_ID, SECRET);
    expect(token).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.[0-9a-f]{64}$/,
    );
    // No percent-encoding needed in a query string: the Deno mailer mirror
    // concatenates the token into the unsubscribe URL without encoding.
    expect(encodeURIComponent(token)).toBe(token);
  });

  it('signing is deterministic (HMAC, no nonce): same id + secret = same token', () => {
    expect(signUnsubscribeToken(WAITLIST_ID, SECRET)).toBe(
      signUnsubscribeToken(WAITLIST_ID, SECRET),
    );
  });

  it('different waitlist ids produce different signatures', () => {
    const a = signUnsubscribeToken(WAITLIST_ID, SECRET);
    const b = signUnsubscribeToken(OTHER_ID, SECRET);
    expect(a.split('.')[1]).not.toBe(b.split('.')[1]);
  });
});

// ---------------------------------------------------------------------------
// 2. Tampered tokens fail
// ---------------------------------------------------------------------------

describe('unsubscribe token: tampering fails verification', () => {
  it('a flipped signature character invalidates the token', () => {
    const token = signUnsubscribeToken(WAITLIST_ID, SECRET);
    const lastChar = token.slice(-1);
    const flipped = lastChar === '0' ? '1' : '0';
    const tampered = token.slice(0, -1) + flipped;
    expect(verifyUnsubscribeToken(tampered, SECRET)).toEqual({ valid: false });
  });

  it('swapping in a different waitlist id while keeping the signature fails', () => {
    const token = signUnsubscribeToken(WAITLIST_ID, SECRET);
    const signature = token.split('.')[1];
    expect(verifyUnsubscribeToken(`${OTHER_ID}.${signature}`, SECRET)).toEqual({
      valid: false,
    });
  });

  it('a token signed with a different secret fails', () => {
    const token = signUnsubscribeToken(WAITLIST_ID, OTHER_SECRET);
    expect(verifyUnsubscribeToken(token, SECRET)).toEqual({ valid: false });
  });

  it('an uppercased signature fails (strict lowercase hex, no normalization)', () => {
    const token = signUnsubscribeToken(WAITLIST_ID, SECRET);
    const [id, sig] = token.split('.');
    expect(verifyUnsubscribeToken(`${id}.${sig.toUpperCase()}`, SECRET)).toEqual({
      valid: false,
    });
  });
});

// ---------------------------------------------------------------------------
// 3. Malformed input fails closed, never throws
// ---------------------------------------------------------------------------

describe('unsubscribe token: malformed input fails closed without throwing', () => {
  const malformed: ReadonlyArray<string | null | undefined> = [
    '',
    'not-a-token',
    WAITLIST_ID,
    `${WAITLIST_ID}.`,
    `.${'a'.repeat(64)}`,
    `${WAITLIST_ID}.${'a'.repeat(63)}`,
    `${WAITLIST_ID}.${'a'.repeat(65)}`,
    `${WAITLIST_ID}.${'g'.repeat(64)}`,
    `${WAITLIST_ID}.${'a'.repeat(64)}.extra`,
    `not-a-uuid.${'a'.repeat(64)}`,
    null,
    undefined,
  ];

  for (const bad of malformed) {
    it(`rejects ${JSON.stringify(bad)}`, () => {
      expect(verifyUnsubscribeToken(bad, SECRET)).toEqual({ valid: false });
    });
  }

  it('rejects an absurdly long token without doing HMAC work on it', () => {
    expect(verifyUnsubscribeToken('a'.repeat(10000), SECRET)).toEqual({
      valid: false,
    });
  });
});

// ---------------------------------------------------------------------------
// 4. Missing secret behavior
// ---------------------------------------------------------------------------

describe('unsubscribe token: missing secret behavior', () => {
  it('verify with an empty secret fails closed (route returns 503 before this, belt and suspenders)', () => {
    const token = signUnsubscribeToken(WAITLIST_ID, SECRET);
    expect(verifyUnsubscribeToken(token, '')).toEqual({ valid: false });
    expect(verifyUnsubscribeToken(token, null)).toEqual({ valid: false });
    expect(verifyUnsubscribeToken(token, undefined)).toEqual({ valid: false });
  });

  it('sign with an empty secret throws (the mailer must fail loud, never sign unsigned)', () => {
    expect(() => signUnsubscribeToken(WAITLIST_ID, '')).toThrow();
  });

  it('sign with a non-UUID waitlist id throws (fail loud on bad callers)', () => {
    expect(() => signUnsubscribeToken('not-a-uuid', SECRET)).toThrow();
    expect(() => signUnsubscribeToken(WAITLIST_ID.toUpperCase(), SECRET)).toThrow();
  });
});

// ---------------------------------------------------------------------------
// 5. Constant-time comparison (source-text pin)
// ---------------------------------------------------------------------------

describe('unsubscribe token: constant-time compare', () => {
  const __filename = fileURLToPath(import.meta.url);
  const moduleSource = readFileSync(
    resolve(dirname(__filename), '..', 'unsubscribe-token.ts'),
    'utf-8',
  );

  it('verification compares signatures with crypto.timingSafeEqual', () => {
    expect(moduleSource).toContain('timingSafeEqual(');
  });

  it('module stays pure: node:crypto only, no env reads, no I/O imports', () => {
    expect(moduleSource).toContain("from 'node:crypto'");
    expect(moduleSource).not.toContain('process.env');
    expect(moduleSource).not.toContain('fetch(');
    expect(moduleSource).not.toContain('@supabase');
    expect(moduleSource).not.toContain('@/lib/supabase');
  });
});
