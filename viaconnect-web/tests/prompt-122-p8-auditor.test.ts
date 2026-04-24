import { describe, it, expect, vi } from 'vitest';

// Chainable stub: any method returns the same proxy so callers can chain
// .select().eq().eq().gt()... freely. Terminal thenables resolve to null.
// A per-test override can replace the terminal payload via __setGrant.
const mockState: { grant: Record<string, unknown> | null } = { grant: null };

function makeChain(): unknown {
  const terminal = async () => ({ data: mockState.grant, error: null });
  const handler: ProxyHandler<object> = {
    get(_target, prop) {
      if (prop === 'maybeSingle' || prop === 'single' || prop === 'then') {
        return terminal;
      }
      return () => proxy;
    },
  };
  const proxy: unknown = new Proxy({}, handler);
  return proxy;
}

const signInWithOtpSpy = vi.fn(async () => ({ data: null, error: null }));

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => ({
    auth: {
      getUser: async () => ({ data: { user: null } }),
      signInWithOtp: signInWithOtpSpy,
    },
    from: () => makeChain(),
  }),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: () => makeChain(),
    auth: { admin: { generateLink: async () => ({ data: null, error: null }) } },
    storage: { from: () => ({ createSignedUrl: async () => ({ data: null, error: { message: 'stub' } }) }) },
  }),
}));

import { POST as postGrant, GET as getGrants } from '@/app/api/admin/soc2/auditor-grants/route';
import { POST as revokeGrant } from '@/app/api/admin/soc2/auditor-grants/[id]/revoke/route';
import { POST as sendLink } from '@/app/api/auditor/send-link/route';
import { POST as resolveRequest } from '@/app/api/auditor/pseudonym-resolve-request/route';

function mkReq(body: unknown): Request {
  return new Request('http://localhost/api/admin/soc2/anything', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/admin/soc2/auditor-grants', () => {
  it('401 when unauthenticated', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await postGrant(mkReq({ auditorEmail: 'a@b.com', auditorFirm: 'Firm', packetIds: ['x'], expiresAt: futureIso(30) }) as any);
    expect(res.status).toBe(401);
  });
});

describe('GET /api/admin/soc2/auditor-grants', () => {
  it('401 when unauthenticated', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await getGrants(new Request('http://localhost/api/admin/soc2/auditor-grants') as any);
    expect(res.status).toBe(401);
  });
});

describe('POST /api/admin/soc2/auditor-grants/[id]/revoke', () => {
  it('401 when unauthenticated', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await revokeGrant(new Request('http://localhost') as any, { params: { id: 'any-id' } });
    expect(res.status).toBe(401);
  });
});

describe('POST /api/auditor/send-link', () => {
  it('invalid email → 400', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await sendLink(mkReq({ email: 'not-an-email', firmName: 'F' }) as any);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('invalid_email');
  });

  it('missing firm → 400', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await sendLink(mkReq({ email: 'auditor@firm.com' }) as any);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('firm_required');
  });

  it('no matching grant → generic ack (200), signInWithOtp NOT called', async () => {
    mockState.grant = null;
    signInWithOtpSpy.mockClear();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await sendLink(mkReq({ email: 'auditor@firm.com', firmName: 'Firm LLP' }) as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.message).toMatch(/secure link/i);
    expect(signInWithOtpSpy).not.toHaveBeenCalled();
  });

  it('matching grant + matching firm → generic ack (200) AND signInWithOtp called once', async () => {
    mockState.grant = {
      id: 'grant-1',
      auditor_firm: 'Firm LLP',
      expires_at: new Date(Date.now() + 30 * 86_400_000).toISOString(),
      revoked: false,
    };
    signInWithOtpSpy.mockClear();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await sendLink(mkReq({ email: 'auditor@firm.com', firmName: 'Firm LLP' }) as any);
    expect(res.status).toBe(200);
    expect(signInWithOtpSpy).toHaveBeenCalledTimes(1);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const call = (signInWithOtpSpy.mock.calls[0] as unknown as any[])[0] as { email: string; options: { emailRedirectTo: string } };
    expect(call.email).toBe('auditor@firm.com');
    expect(call.options.emailRedirectTo).toMatch(/\/auditor\/dashboard$/);
  });

  it('matching grant BUT firm name mismatch → generic ack, signInWithOtp NOT called (enumeration resistance)', async () => {
    mockState.grant = {
      id: 'grant-1',
      auditor_firm: 'Firm LLP',
      expires_at: new Date(Date.now() + 30 * 86_400_000).toISOString(),
      revoked: false,
    };
    signInWithOtpSpy.mockClear();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await sendLink(mkReq({ email: 'auditor@firm.com', firmName: 'WrongFirm Inc' }) as any);
    expect(res.status).toBe(200);
    expect(signInWithOtpSpy).not.toHaveBeenCalled();
  });
});

describe('POST /api/auditor/pseudonym-resolve-request', () => {
  it('401 when unauthenticated', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await resolveRequest(mkReq({
      packetId: 'p-1',
      pseudonym: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
      justification: 'Need to identify anomaly during walkthrough procedures.',
    }) as any);
    expect(res.status).toBe(401);
  });
});

function futureIso(daysAhead: number): string {
  return new Date(Date.now() + daysAhead * 86_400_000).toISOString();
}
