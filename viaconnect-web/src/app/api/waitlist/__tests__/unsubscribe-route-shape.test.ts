/**
 * src/app/api/waitlist/__tests__/unsubscribe-route-shape.test.ts
 *
 * Prompt 210f Task F4b: source-text shape assertions for the unsubscribe
 * route (src/app/api/waitlist/unsubscribe/route.ts), in the same style as
 * practitioner-route-shape.test.ts.
 *
 * Guards:
 * 1. Column-name truth: the route flips exactly the column the F3 migration
 *    created on practitioner_waitlist (`unsubscribed`), which the mailer
 *    re-checks per lead at send time. Asserted against the migration text,
 *    not against memory.
 * 2. Privacy: no PII in logs or pages. No console logging, no token or
 *    email or waitlist id shorthand in any log context or response body,
 *    no token interpolation into HTML.
 * 3. Drift visibility: reportSupabaseError with table-name-only context.
 * 4. Graceful degradation: 503 when UNSUBSCRIBE_TOKEN_SECRET is unset.
 * 5. Token verification goes through the canonical pure module.
 * 6. Branding and entity: Deep Navy / card / teal palette, Instrument Sans,
 *    FarmCeutica Wellness LLC (never Ltd), ASCII only (which also proves
 *    no emojis and no em or en dashes).
 *
 * All assertions are static text checks. No network, no DB, no route
 * execution. Node-safe, zero any, no em dashes, no en dashes, no emojis.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ROUTE_PATH = resolve(__dirname, '..', 'unsubscribe', 'route.ts');
const MIGRATION_PATH = resolve(
  __dirname,
  '..', '..', '..', '..', '..',
  'supabase', 'migrations',
  '20260707170000_prompt_210f_certification_waitlist_additive.sql',
);
const TOKEN_MODULE_PATH = resolve(
  __dirname,
  '..', '..', '..', '..',
  'lib', 'waitlist', 'unsubscribe-token.ts',
);

const src = readFileSync(ROUTE_PATH, 'utf-8');
const migration = readFileSync(MIGRATION_PATH, 'utf-8');
const tokenModule = readFileSync(TOKEN_MODULE_PATH, 'utf-8');

// ---------------------------------------------------------------------------
// 1. Column-name truth vs the F3 migration text
// ---------------------------------------------------------------------------

describe('unsubscribe route: column name matches the F3 migration', () => {
  it('the F3 migration defines practitioner_waitlist.unsubscribed as boolean default false', () => {
    expect(migration).toContain('practitioner_waitlist');
    expect(migration).toContain('unsubscribed BOOLEAN DEFAULT false');
  });

  it('the route updates exactly that column to true on practitioner_waitlist', () => {
    expect(src).toContain(".from('practitioner_waitlist')");
    expect(src).toContain('unsubscribed: true');
  });

  it('the update is keyed by the row id (single-row, idempotent)', () => {
    expect(src).toContain(".eq('id', verification.waitlistId)");
  });

  it('no other column is flipped and no row is deleted', () => {
    expect(src).not.toContain('.delete()');
    expect(src).not.toContain('.insert(');
    expect(src).not.toContain('.upsert(');
  });
});

// ---------------------------------------------------------------------------
// 2. Privacy: no PII in logs or pages
// ---------------------------------------------------------------------------

describe('unsubscribe route: no PII in logs or responses', () => {
  it('no console logging anywhere (safeLog only)', () => {
    expect(src).not.toContain('console.');
    expect(src).toContain('safeLog');
  });

  it('no token, email, or waitlist id is placed into any object literal shorthand (log contexts stay clean)', () => {
    expect(src).not.toMatch(/\{\s*token\b/);
    expect(src).not.toMatch(/\{\s*email\b/);
    expect(src).not.toMatch(/\{\s*waitlistId\b/);
  });

  it('no token or verification value is interpolated into HTML or messages', () => {
    expect(src).not.toContain('${token');
    expect(src).not.toContain('${verification');
    expect(src).not.toContain('${request');
  });

  it('the route never selects lead data back (no SELECT of email or name columns)', () => {
    expect(src).not.toContain('.select(');
    expect(src).not.toContain('email,');
    expect(src).not.toContain('first_name');
  });

  it('responses are not cacheable and not indexable', () => {
    expect(src).toContain("'Cache-Control': 'no-store'");
    expect(src).toContain('noindex');
  });
});

// ---------------------------------------------------------------------------
// 3. Drift visibility
// ---------------------------------------------------------------------------

describe('unsubscribe route: drift visibility via reportSupabaseError', () => {
  it('reportSupabaseError is imported from schema-drift', () => {
    expect(src).toContain('reportSupabaseError');
    expect(src).toContain('schema-drift');
  });

  it('the update error path reports with its scope and table-name-only context', () => {
    expect(src).toMatch(/reportSupabaseError\(\s*'waitlist\.unsubscribe\.update'/);
    expect(src).toContain("table: 'practitioner_waitlist'");
  });
});

// ---------------------------------------------------------------------------
// 4. Graceful degradation and resilience
// ---------------------------------------------------------------------------

describe('unsubscribe route: degradation and resilience', () => {
  it('missing UNSUBSCRIBE_TOKEN_SECRET degrades to a 503 page before any verify or update', () => {
    expect(src).toContain('UNSUBSCRIBE_TOKEN_SECRET');
    expect(src).toContain('503');
  });

  it('the DB update is bounded by withTimeout and timeouts are handled', () => {
    expect(src).toContain('withTimeout');
    expect(src).toContain('isTimeoutError');
    expect(src).toContain("'api.waitlist.unsubscribe.update'");
  });

  it('runs on the node runtime (node:crypto verification downstream)', () => {
    expect(src).toContain("runtime = 'nodejs'");
  });

  it('exposes GET only (email clients prefetch links; no state-changing POST forms)', () => {
    expect(src).toContain('export async function GET(');
    expect(src).not.toContain('export async function POST(');
  });

  it('uses the service-role client (anon has no UPDATE policy; endpoint needs no session by design)', () => {
    expect(src).toContain('createAdminClient');
  });
});

// ---------------------------------------------------------------------------
// 5. Token verification through the canonical module
// ---------------------------------------------------------------------------

describe('unsubscribe route: canonical token verification', () => {
  it('imports verifyUnsubscribeToken from the pure module', () => {
    expect(src).toContain('verifyUnsubscribeToken');
    expect(src).toContain('@/lib/waitlist/unsubscribe-token');
  });

  it('the pure module exists and compares constant-time', () => {
    expect(tokenModule).toContain('timingSafeEqual(');
  });

  it('no inline HMAC in the route (single source of truth for the format)', () => {
    expect(src).not.toContain('createHmac');
    expect(src).not.toContain('crypto.subtle');
  });
});

// ---------------------------------------------------------------------------
// 6. Branding, entity string, character rules
// ---------------------------------------------------------------------------

describe('unsubscribe route: branding and character rules', () => {
  it('branded palette: Deep Navy background, card panel, teal accent', () => {
    expect(src).toContain('#1A2744');
    expect(src).toContain('#1E3054');
    expect(src).toContain('#2DA5A0');
  });

  it('Instrument Sans with system fallbacks', () => {
    expect(src).toContain('Instrument Sans');
  });

  it('entity string is FarmCeutica Wellness LLC, never Ltd (Gary decision 2026-07-08)', () => {
    expect(src).toContain('FarmCeutica Wellness LLC');
    expect(src).not.toMatch(/Wellness\s+Ltd/i);
  });

  it('route source is pure ASCII (proves no emojis, no em dashes, no en dashes)', () => {
    // eslint-disable-next-line no-control-regex
    expect(/^[\x00-\x7F]*$/.test(src)).toBe(true);
  });

  it('token module source is pure ASCII too', () => {
    // eslint-disable-next-line no-control-regex
    expect(/^[\x00-\x7F]*$/.test(tokenModule)).toBe(true);
  });
});
