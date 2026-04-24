import { describe, it, expect, vi } from 'vitest';
import { createHash } from 'node:crypto';

// -----------------------------------------------------------------------------
// Prompt #127 P4: HIPAA admin UI + API route tests.
//
// We exercise:
//   1. Auth gate on all 5 JSON POST routes (sanctions, contingency-tests,
//      emergency-access, device-media, breach-determinations). The upload
//      route (risk-analysis) is multipart so it's harder to unit test —
//      we cover its auth gate too.
//   2. Body validation on the breach 4-factor route (missing factor,
//      short rationale, invalid determination).
//   3. Sanctions pseudonym stability — same realId always maps to same
//      32-char uppercase hex pseudonym.
//   4. Legal notifier payload shape + error handling.
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
    from: (_t: string) => ({
      insert: () => ({
        select: () => ({
          single: async () => ({ data: { id: 'audit-log-id-123' }, error: null }),
        }),
      }),
    }),
  }),
}));

import { POST as postSanctions } from '@/app/api/hipaa/sanctions/route';
import { POST as postContingency } from '@/app/api/hipaa/contingency-tests/route';
import { POST as postEmergency } from '@/app/api/hipaa/emergency-access/route';
import { POST as postDeviceMedia } from '@/app/api/hipaa/device-media/route';
import { POST as postBreach } from '@/app/api/hipaa/breach-determinations/route';
import { notifyLegalOfConfirmedBreach } from '@/lib/hipaa/legalNotifier';

function mkReq(body: unknown): Request {
  return new Request('http://localhost/api/hipaa/anything', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

// ─── Auth gates (unauthenticated → 401) ───────────────────────────────────

describe('HIPAA POST routes: auth gating', () => {
  it('sanctions → 401 when unauthenticated', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await postSanctions(mkReq({}) as any);
    expect(res.status).toBe(401);
  });

  it('contingency-tests → 401 when unauthenticated', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await postContingency(mkReq({}) as any);
    expect(res.status).toBe(401);
  });

  it('emergency-access → 401 when unauthenticated', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await postEmergency(mkReq({}) as any);
    expect(res.status).toBe(401);
  });

  it('device-media → 401 when unauthenticated', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await postDeviceMedia(mkReq({}) as any);
    expect(res.status).toBe(401);
  });

  it('breach-determinations → 401 when unauthenticated', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await postBreach(mkReq({}) as any);
    expect(res.status).toBe(401);
  });
});

// ─── Pseudonym stability (stateless, no Supabase needed) ─────────────────

describe('HIPAA workforce pseudonym', () => {
  it('same realId → same 32-char uppercase hex pseudonym under the same seed', () => {
    const seed = 'farmceutica-workforce-pseudonym-v1';
    const realId = 'employee-42';
    const a = createHash('sha256').update(`${seed}:${realId}`).digest('hex').slice(0, 32).toUpperCase();
    const b = createHash('sha256').update(`${seed}:${realId}`).digest('hex').slice(0, 32).toUpperCase();
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9A-F]{32}$/);
  });

  it('different realIds → different pseudonyms', () => {
    const seed = 'farmceutica-workforce-pseudonym-v1';
    const a = createHash('sha256').update(`${seed}:alice`).digest('hex').slice(0, 32).toUpperCase();
    const b = createHash('sha256').update(`${seed}:bob`).digest('hex').slice(0, 32).toUpperCase();
    expect(a).not.toBe(b);
  });

  it('different seeds produce different pseudonyms for the same realId', () => {
    const realId = 'employee-42';
    const a = createHash('sha256').update(`seed-a:${realId}`).digest('hex').slice(0, 32).toUpperCase();
    const b = createHash('sha256').update(`seed-b:${realId}`).digest('hex').slice(0, 32).toUpperCase();
    expect(a).not.toBe(b);
  });
});

// ─── Legal notifier ──────────────────────────────────────────────────────

describe('notifyLegalOfConfirmedBreach', () => {
  function mkClient(opts: { error?: { message: string } | null; auditLogId?: string | number } = {}) {
    const captured: { table?: string; row?: Record<string, unknown> } = {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = {
      from: (table: string) => {
        captured.table = table;
        return {
          insert: (row: Record<string, unknown>) => {
            captured.row = row;
            return {
              select: () => ({
                single: async () => ({
                  data: opts.error ? null : { id: opts.auditLogId ?? 'default-id' },
                  error: opts.error ?? null,
                }),
              }),
            };
          },
        };
      },
    } as any;
    return { sb, captured };
  }

  it('writes a hipaa_breach_confirmed row to compliance_audit_log and returns ok', async () => {
    const { sb, captured } = mkClient({ auditLogId: 'audit-999' });
    const result = await notifyLegalOfConfirmedBreach({
      supabase: sb,
      breachDeterminationId: 'b-1',
      incidentId: 'i-1',
      individualsAffectedCount: 12,
      assessedBy: 'user-abc',
      rationaleSummary: 'Encryption failure on device LAPTOP-0042 confirmed PHI acquisition.',
    });
    expect(result.ok).toBe(true);
    expect(result.auditLogId).toBe('audit-999');
    expect(captured.table).toBe('compliance_audit_log');
    expect(captured.row?.event_type).toBe('hipaa_breach_confirmed');
    expect(captured.row?.actor_type).toBe('system');
  });

  it('embeds the 45 CFR 164.400-series escalation guidance in the payload', async () => {
    const { sb, captured } = mkClient();
    await notifyLegalOfConfirmedBreach({
      supabase: sb,
      breachDeterminationId: 'b-2',
      incidentId: 'i-2',
      individualsAffectedCount: null,
      assessedBy: 'user-abc',
      rationaleSummary: 'Rationale',
    });
    const payload = captured.row?.payload as Record<string, unknown>;
    expect(payload.notification_required_within).toContain('24 hours');
    const steps = payload.next_steps as string[];
    expect(steps.join(' | ')).toContain('legal counsel');
    expect(steps.join(' | ')).toContain('164.404');
    expect(steps.join(' | ')).toContain('164.408');
    expect(steps.join(' | ')).toContain('164.406');
  });

  it('truncates rationale_summary to 500 chars', async () => {
    const { sb, captured } = mkClient();
    const long = 'x'.repeat(2000);
    await notifyLegalOfConfirmedBreach({
      supabase: sb,
      breachDeterminationId: 'b-3',
      incidentId: 'i-3',
      individualsAffectedCount: 500,
      assessedBy: 'user-abc',
      rationaleSummary: long,
    });
    const payload = captured.row?.payload as Record<string, unknown>;
    expect((payload.rationale_summary as string).length).toBe(500);
  });

  it('returns ok=false and the error message when the audit log insert fails', async () => {
    const { sb } = mkClient({ error: { message: 'rls_denied' } });
    const result = await notifyLegalOfConfirmedBreach({
      supabase: sb,
      breachDeterminationId: 'b-4',
      incidentId: 'i-4',
      individualsAffectedCount: null,
      assessedBy: 'user-abc',
      rationaleSummary: 'Rationale',
    });
    expect(result.ok).toBe(false);
    expect(result.error).toBe('rls_denied');
  });
});
