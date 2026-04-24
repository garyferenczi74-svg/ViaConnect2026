import { describe, it, expect, vi } from 'vitest';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockSupabase = (opts: {
  user?: { id: string } | null;
  scan?: { id: string; practitioner_id: string; decision: string } | null;
  priorOverrides?: Array<{ finding_ids: string[] }>;
}) => {
  const calls: string[] = [];
  const supabase = {
    auth: {
      async getUser() { return { data: { user: opts.user ?? null } }; },
    },
    from(table: string) {
      calls.push(table);
      if (table === 'scheduler_scans') {
        return {
          select: () => ({
            eq: () => ({
              async maybeSingle() { return { data: opts.scan ?? null }; },
            }),
          }),
          update() {
            return { async eq() { return { error: null }; } };
          },
        };
      }
      if (table === 'scheduler_overrides') {
        return {
          select: () => ({
            eq: () => ({
              async gte() { return { data: opts.priorOverrides ?? [] }; },
            }),
          }),
          insert() {
            return {
              select: () => ({
                async single() { return { data: { id: 'ov-1' }, error: null }; },
              }),
            };
          },
        };
      }
      return { select: () => ({ eq: () => ({ async maybeSingle() { return { data: null }; } }) }) };
    },
  };
  return { supabase, calls };
};

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => currentSupabase,
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let currentSupabase: any = null;

async function post(body: unknown, scanId = 'scan-1') {
  const { POST } = await import('@/app/api/marshall/scheduler/scans/[id]/override/route');
  const req = new Request(`http://localhost/api/marshall/scheduler/scans/${scanId}/override`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-forwarded-for': '203.0.113.5, 10.0.0.1',
      'user-agent': 'Test/1.0',
    },
    body: JSON.stringify(body),
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return POST(req as any, { params: { id: scanId } });
}

describe('POST /api/marshall/scheduler/scans/[id]/override', () => {
  it('401 when unauthenticated', async () => {
    currentSupabase = mockSupabase({ user: null }).supabase;
    const res = await post({ findingIds: ['R.A'], justification: 'x'.repeat(60) });
    expect(res.status).toBe(401);
  });

  it('404 when scan not found', async () => {
    currentSupabase = mockSupabase({ user: { id: 'p1' }, scan: null }).supabase;
    const res = await post({ findingIds: ['R.A'], justification: 'x'.repeat(60) });
    expect(res.status).toBe(404);
  });

  it('403 when scan belongs to a different practitioner', async () => {
    currentSupabase = mockSupabase({
      user: { id: 'p1' },
      scan: { id: 'scan-1', practitioner_id: 'p2', decision: 'blocked' },
    }).supabase;
    const res = await post({ findingIds: ['R.A'], justification: 'x'.repeat(60) });
    expect(res.status).toBe(403);
  });

  it('409 when scan is in a non-overridable decision state', async () => {
    currentSupabase = mockSupabase({
      user: { id: 'p1' },
      scan: { id: 'scan-1', practitioner_id: 'p1', decision: 'clean' },
    }).supabase;
    const res = await post({ findingIds: ['R.A'], justification: 'x'.repeat(60) });
    expect(res.status).toBe(409);
  });

  it('400 when justification too short', async () => {
    currentSupabase = mockSupabase({
      user: { id: 'p1' },
      scan: { id: 'scan-1', practitioner_id: 'p1', decision: 'blocked' },
      priorOverrides: [],
    }).supabase;
    const res = await post({ findingIds: ['R.A'], justification: 'too short' });
    expect(res.status).toBe(400);
  });

  it('200 with patternFlagTriggered=false on first override', async () => {
    currentSupabase = mockSupabase({
      user: { id: 'p1' },
      scan: { id: 'scan-1', practitioner_id: 'p1', decision: 'blocked' },
      priorOverrides: [],
    }).supabase;
    const res = await post({ findingIds: ['R.A'], justification: 'Confirmed with Steve: this claim cites an FDA-approved indication for the product.' });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; patternFlagTriggered: boolean };
    expect(body.ok).toBe(true);
    expect(body.patternFlagTriggered).toBe(false);
  });

  it('200 with patternFlagTriggered=true when same rule hits threshold', async () => {
    currentSupabase = mockSupabase({
      user: { id: 'p1' },
      scan: { id: 'scan-1', practitioner_id: 'p1', decision: 'blocked' },
      priorOverrides: [
        { finding_ids: ['R.CLAIM'] },
        { finding_ids: ['R.CLAIM'] },
        { finding_ids: ['R.CLAIM'] },
      ],
    }).supabase;
    const res = await post({ findingIds: ['R.CLAIM'], justification: 'Confirmed with Steve: our internal documentation supports this claim on four prior reviews.' });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { patternFlagTriggered: boolean };
    expect(body.patternFlagTriggered).toBe(true);
  });

  it('400 on invalid JSON body', async () => {
    currentSupabase = mockSupabase({
      user: { id: 'p1' },
      scan: { id: 'scan-1', practitioner_id: 'p1', decision: 'blocked' },
    }).supabase;
    const { POST } = await import('@/app/api/marshall/scheduler/scans/[id]/override/route');
    const req = new Request('http://localhost/api/marshall/scheduler/scans/scan-1/override', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: 'not-json',
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await POST(req as any, { params: { id: 'scan-1' } });
    expect(res.status).toBe(400);
  });
});
