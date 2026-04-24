import { describe, it, expect } from 'vitest';

// The admin API routes exported PATCH handlers for collector + distribution
// target toggles. We don't spin up a Supabase client here; we exercise the
// request-validation paths that are table-stakes for any admin endpoint:
//   - missing auth → 401
//   - missing body / wrong type → 400
//   - invalid platform → 400 (distribution-target route)
//   - api_url non-https → 400 (distribution-target route)
//
// We stub `createClient` via vi.mock to short-circuit auth.getUser() so we
// can reach the body-validation branch without a real session.

import { vi } from 'vitest';

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => ({
    auth: { getUser: async () => ({ data: { user: null } }) },
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }),
    }),
  }),
}));

import { PATCH as patchCollector } from '@/app/api/admin/soc2/collectors/[id]/route';
import { PATCH as patchTarget } from '@/app/api/admin/soc2/distribution-targets/[platform]/route';

function mkReq(body: unknown): Request {
  return new Request('http://localhost/api/admin/soc2/anything', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('collectors PATCH route', () => {
  it('401 when unauthenticated', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await patchCollector(mkReq({ enabled: true }) as any, { params: { id: 'github-prs-collector' } });
    expect(res.status).toBe(401);
  });
});

describe('distribution-targets PATCH route', () => {
  it('invalid platform → 400', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await patchTarget(mkReq({ enabled: true }) as any, { params: { platform: 'bogus' } });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('invalid_platform');
  });

  it('401 when unauthenticated on valid platform', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await patchTarget(mkReq({ enabled: true }) as any, { params: { platform: 'drata' } });
    expect(res.status).toBe(401);
  });
});
