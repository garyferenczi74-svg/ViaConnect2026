/**
 * src/app/api/waitlist/__tests__/practitioner-route-shape.test.ts
 *
 * Prompt 210f Task F3c: source-text shape assertions for the practitioner
 * waitlist API route (src/app/api/waitlist/practitioner/route.ts).
 *
 * Guards three invariants:
 *
 * 1. No INSERT...RETURNING under anon: the route must NOT chain .select()
 *    after .insert() on the practitioner_waitlist query. Postgres enforces
 *    SELECT policies on INSERT...RETURNING; the anon role has no SELECT
 *    policy on practitioner_waitlist by design (leads are PII), so the
 *    whole insert would roll back with 42501.
 *
 * 2. Drift visibility: reportSupabaseError is imported and called on the
 *    insert error path with scope 'waitlist.practitioner.insert' and context
 *    { table: 'practitioner_waitlist' } only (no PII in context).
 *
 * 3. Form consumer compatibility: PractitionerWaitlistForm.tsx reads
 *    (a) res.status === 201 for success (no body fields needed),
 *    (b) j.error on non-201 for the error message. Both must be produced.
 *
 * All assertions are static text checks. No network, no DB, no route
 * execution. Node-safe (no jsdom), node builtins only, zero any.
 * Rules: no em dashes, no en dashes, no emojis.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ROUTE_PATH = resolve(__dirname, '..', 'practitioner', 'route.ts');
const src = readFileSync(ROUTE_PATH, 'utf-8');

// ---------------------------------------------------------------------------
// 1. No INSERT...RETURNING under anon
// ---------------------------------------------------------------------------

describe('practitioner-waitlist route: no INSERT...RETURNING under anon', () => {
  it('no .select chained to the practitioner_waitlist insert', () => {
    // Previously: .insert({...}).select('id').single()
    // That triggers RETURNING which requires SELECT policy on anon.
    // The anon role has no SELECT policy on practitioner_waitlist.
    expect(src).not.toContain(".select('id')");
  });

  it('no .single() call (was part of the RETURNING chain)', () => {
    // .single() only appeared as part of the .select('id').single() chain.
    // Its absence confirms the RETURNING path is fully gone from the route.
    expect(src).not.toContain('.single()');
  });

  it('practitioner_waitlist insert call is present', () => {
    // Confirm we did not accidentally remove the insert entirely.
    expect(src).toContain(".from('practitioner_waitlist')");
    expect(src).toContain('.insert({');
  });
});

// ---------------------------------------------------------------------------
// 2. Drift visibility
// ---------------------------------------------------------------------------

describe('practitioner-waitlist route: drift visibility via reportSupabaseError', () => {
  it('reportSupabaseError is imported from schema-drift', () => {
    expect(src).toContain('reportSupabaseError');
    expect(src).toContain('schema-drift');
  });

  it("drift scope 'waitlist.practitioner.insert' is present", () => {
    expect(src).toContain("'waitlist.practitioner.insert'");
  });

  it('reportSupabaseError is called with the insert scope', () => {
    expect(src).toMatch(/reportSupabaseError\(\s*'waitlist\.practitioner\.insert'/);
  });

  it("context carries table: 'practitioner_waitlist' (object names only, no PII)", () => {
    expect(src).toContain("table: 'practitioner_waitlist'");
  });
});

// ---------------------------------------------------------------------------
// 3. Form consumer compatibility
// ---------------------------------------------------------------------------

describe('practitioner-waitlist route: form consumer compatibility', () => {
  // PractitionerWaitlistForm.tsx submit handler:
  //   if (res.status === 201) { setSubmitted(true); return; }
  //   const j = await res.json().catch(() => ({}));
  //   setErrorMessage(j.error ?? `Submission failed...`);

  it('success response emits status 201 (form gates on status, not body)', () => {
    expect(src).toContain('status: 201');
  });

  it('duplicate-email path emits 409 with an error field', () => {
    // Form reads j.error on any non-201; 409 must carry the error string.
    expect(src).toContain("'23505'");
    expect(src).toContain('409');
    expect(src).toContain('already on our waitlist');
  });

  it('non-201 error responses include an error field (form reads j.error)', () => {
    // Count NextResponse.json calls that include an error key in the body.
    const matches = src.match(/NextResponse\.json\(\s*\{[^}]*error:/g) ?? [];
    expect(matches.length).toBeGreaterThan(0);
  });

  it('timeout error returns 503 with a user-facing message', () => {
    expect(src).toContain('503');
    expect(src).toContain('Submission took too long');
  });

  it('success response does not include waitlistId (body not read by form)', () => {
    // The form only checks res.status === 201, so waitlistId in the body
    // was dead weight. Its removal keeps the contract correct.
    expect(src).not.toMatch(/NextResponse\.json\(\s*\{[^}]*waitlistId\s*:/);
  });
});

// ---------------------------------------------------------------------------
// 4. Payload key subset (guards insert covers the form-submitted columns)
// ---------------------------------------------------------------------------

describe('practitioner-waitlist route: insert payload key subset', () => {
  // Minimum keys that must remain in the insert payload. Full 37-column
  // coverage is asserted by the migration shape test; this subset guards
  // the form's required fields and the schema-visible columns.
  const REQUIRED_PAYLOAD_KEYS: readonly string[] = [
    'email:',
    'first_name:',
    'last_name:',
    'practice_name:',
    'credential_type:',
    'primary_clinical_focus:',
    'referral_source:',
    'interest_reason:',
    'submission_type:',
    'invitation_token:',
    'user_agent:',
    'ip_address:',
    'referrer_url:',
  ];

  for (const key of REQUIRED_PAYLOAD_KEYS) {
    it(`insert payload includes key ${key}`, () => {
      expect(src).toContain(key);
    });
  }
});
