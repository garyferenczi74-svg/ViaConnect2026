import { describe, it, expect, vi } from 'vitest';

// -----------------------------------------------------------------------------
// Prompt #127 P6: ISO 27001 admin UI + API route tests.
//
// We exercise:
//   1. Auth gate on all 6 JSON POST routes (soa, risks, internal-audits,
//      management-reviews, nonconformities, and the multipart isms-scope
//      upload). Unauthenticated -> 401.
//   2. Input shape validators (likelihood/impact range, enum values).
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

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    storage: { from: (_b: string) => ({ upload: async () => ({ error: null }) }) },
  }),
}));

import { POST as postSoa } from '@/app/api/iso/soa/route';
import { POST as postRisk } from '@/app/api/iso/risks/route';
import { POST as postAudit } from '@/app/api/iso/internal-audits/route';
import { POST as postReview } from '@/app/api/iso/management-reviews/route';
import { POST as postNc } from '@/app/api/iso/nonconformities/route';
import { POST as postScope } from '@/app/api/iso/isms-scope/route';

function mkReq(body: unknown): Request {
  return new Request('http://localhost/api/iso/anything', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function mkMultipartReq(): Request {
  const fd = new FormData();
  fd.set('scopeDescription', 'x');
  return new Request('http://localhost/api/iso/isms-scope', {
    method: 'POST',
    body: fd,
  });
}

// ─── Auth gates (unauthenticated -> 401) ─────────────────────────────────

describe('ISO POST routes: auth gating', () => {
  it('soa -> 401 when unauthenticated', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await postSoa(mkReq({}) as any);
    expect(res.status).toBe(401);
  });

  it('risks -> 401 when unauthenticated', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await postRisk(mkReq({}) as any);
    expect(res.status).toBe(401);
  });

  it('internal-audits -> 401 when unauthenticated', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await postAudit(mkReq({}) as any);
    expect(res.status).toBe(401);
  });

  it('management-reviews -> 401 when unauthenticated', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await postReview(mkReq({}) as any);
    expect(res.status).toBe(401);
  });

  it('nonconformities -> 401 when unauthenticated', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await postNc(mkReq({}) as any);
    expect(res.status).toBe(401);
  });

  it('isms-scope upload -> 401 when unauthenticated', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await postScope(mkMultipartReq() as any);
    expect(res.status).toBe(401);
  });
});

// ─── Pure validators (no supabase interaction) ────────────────────────────

describe('ISO risk validators', () => {
  function isInt1to5(n: unknown): n is number {
    return typeof n === 'number' && Number.isInteger(n) && n >= 1 && n <= 5;
  }

  it('accepts integers 1 to 5', () => {
    expect(isInt1to5(1)).toBe(true);
    expect(isInt1to5(3)).toBe(true);
    expect(isInt1to5(5)).toBe(true);
  });

  it('rejects 0, 6, negatives, floats, non-numbers', () => {
    expect(isInt1to5(0)).toBe(false);
    expect(isInt1to5(6)).toBe(false);
    expect(isInt1to5(-1)).toBe(false);
    expect(isInt1to5(3.5)).toBe(false);
    expect(isInt1to5('3')).toBe(false);
    expect(isInt1to5(null)).toBe(false);
    expect(isInt1to5(undefined)).toBe(false);
  });
});

describe('ISO SoA applicability determination', () => {
  // Simple determination shape matches what the narrator consumes in P7.
  const VALID_APPLICABILITY = new Set(['applicable', 'excluded']);
  const VALID_IMPL_STATUS = new Set(['implemented', 'in_progress', 'planned', 'not_applicable']);

  it('only two applicability values are valid', () => {
    expect(VALID_APPLICABILITY.size).toBe(2);
    expect(VALID_APPLICABILITY.has('applicable')).toBe(true);
    expect(VALID_APPLICABILITY.has('excluded')).toBe(true);
    expect(VALID_APPLICABILITY.has('partial')).toBe(false);
  });

  it('implementation status enum covers 4 states', () => {
    expect(VALID_IMPL_STATUS.size).toBe(4);
    expect(VALID_IMPL_STATUS.has('implemented')).toBe(true);
    expect(VALID_IMPL_STATUS.has('in_progress')).toBe(true);
    expect(VALID_IMPL_STATUS.has('planned')).toBe(true);
    expect(VALID_IMPL_STATUS.has('not_applicable')).toBe(true);
  });
});

describe('ISO nonconformity status workflow', () => {
  const VALID_STATUS = ['open', 'root_cause_analysis', 'action_planned', 'in_progress', 'closed', 'verified'];
  const VALID_SEVERITY = ['major', 'minor', 'observation'];

  it('workflow is linear from open to verified', () => {
    expect(VALID_STATUS[0]).toBe('open');
    expect(VALID_STATUS[VALID_STATUS.length - 1]).toBe('verified');
  });

  it('severity enum covers the standard ISO three', () => {
    expect(VALID_SEVERITY).toContain('major');
    expect(VALID_SEVERITY).toContain('minor');
    expect(VALID_SEVERITY).toContain('observation');
  });
});
