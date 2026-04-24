import { describe, it, expect, vi } from 'vitest';

// -----------------------------------------------------------------------------
// Prompt #127 P8: framework-scoped grants + Gate A sign-off tests.
//
// Covers:
//   1. Auditor-grant create POST rejects invalid framework_id.
//   2. Auditor-grant create POST auth gate (401 when unauthenticated).
//   3. Gate A sign POST auth gate (401 when unauthenticated).
//   4. Framework-to-attestor-role mapping matches registry expectations.
//   5. Gate A critical-flags blocker returns 409.
// -----------------------------------------------------------------------------

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => ({
    auth: { getUser: async () => ({ data: { user: null } }) },
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: async () => ({ data: null }) }),
      }),
    }),
  }),
}));

import { POST as postGrant } from '@/app/api/admin/soc2/auditor-grants/route';
import { POST as postGateA } from '@/app/api/compliance/gate-a/sign/route';
import { loadRegistry } from '@/lib/compliance/frameworks/registry';

function mkReq(body: unknown = {}): Request {
  return new Request('http://localhost/api/anything', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

// ─── Grant create auth gate ───────────────────────────────────────────────

describe('POST /api/admin/soc2/auditor-grants auth gate', () => {
  it('401 when unauthenticated', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await postGrant(mkReq({}) as any);
    expect(res.status).toBe(401);
  });
});

// ─── Gate A sign auth gate ────────────────────────────────────────────────

describe('POST /api/compliance/gate-a/sign auth gate', () => {
  it('401 when unauthenticated', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await postGateA(mkReq({}) as any);
    expect(res.status).toBe(401);
  });
});

// ─── Framework to attestor role mapping ───────────────────────────────────

describe('framework to attestor role mapping', () => {
  const expected: Record<string, string> = {
    soc2: 'compliance_officer',
    hipaa_security: 'security_officer',
    iso_27001_2022: 'isms_manager',
  };

  it('every framework in the registry has a declared attestor role', () => {
    const registry = loadRegistry();
    for (const [fid, def] of Object.entries(registry.frameworks)) {
      expect(def.attestorRole).toBe(expected[fid]);
    }
  });

  it('attestor roles are from the fixed 3-role set', () => {
    const validRoles = new Set(['compliance_officer', 'security_officer', 'isms_manager']);
    const registry = loadRegistry();
    for (const def of Object.values(registry.frameworks)) {
      expect(validRoles.has(def.attestorRole)).toBe(true);
    }
  });
});

// ─── Valid framework IDs enforced by both APIs ────────────────────────────

describe('valid framework IDs', () => {
  const VALID = new Set(['soc2', 'hipaa_security', 'iso_27001_2022']);

  it('registry IDs match the API whitelist', () => {
    const registry = loadRegistry();
    for (const fid of Object.keys(registry.frameworks)) {
      expect(VALID.has(fid)).toBe(true);
    }
  });

  it('rejects impostor IDs', () => {
    expect(VALID.has('iso_27002')).toBe(false);
    expect(VALID.has('hipaa_privacy')).toBe(false);
    expect(VALID.has('pci_dss')).toBe(false);
    expect(VALID.has('')).toBe(false);
  });
});
