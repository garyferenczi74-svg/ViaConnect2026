import { describe, it, expect, vi, beforeEach } from 'vitest';

// Prompt 231: /api/scan/signed-url ownership tests. The object path is
// always resolved through the parent session filtered by user_id; a second
// user can never obtain a signed URL for another user's session/object.

const mocks = vi.hoisted(() => ({
  supabaseGetUser: vi.fn(),
  adminFrom: vi.fn(),
  createSignedUrl: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth: { getUser: mocks.supabaseGetUser } }),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: mocks.adminFrom,
    storage: { from: () => ({ createSignedUrl: mocks.createSignedUrl }) },
  }),
}));

vi.mock('@/lib/utils/safe-log', () => ({
  safeLog: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock('@/lib/utils/inMemoryRateLimit', () => ({
  inMemoryRateLimit: () => true,
}));

import { POST } from '@/app/api/scan/signed-url/route';

const SESSION_ROW = {
  id: 'session-1',
  front_full_path: 'owner-user/session-1/front_full_1000.jpg',
  front_thumb_path: 'owner-user/session-1/front_thumb_1000.jpg',
};

/** Ownership modeled through the filter chain: only 'owner-user' + 'session-1' resolves a row. */
function installOwnedSessionMock() {
  const table = {
    select: vi.fn(() => {
      const filters: Record<string, unknown> = {};
      const chain = {
        eq: vi.fn((col: string, val: unknown) => {
          filters[col] = val;
          return chain;
        }),
        maybeSingle: vi.fn(() =>
          Promise.resolve(
            filters.id === SESSION_ROW.id && filters.user_id === 'owner-user'
              ? { data: SESSION_ROW, error: null }
              : { data: null, error: null },
          ),
        ),
      };
      return chain;
    }),
  };
  mocks.adminFrom.mockImplementation((tableName: string) => {
    if (tableName === 'body_photo_sessions') return table;
    throw new Error(`unexpected table ${tableName}`);
  });
  return table;
}

function buildRequest(body: Record<string, unknown>) {
  return new Request('http://localhost/api/scan/signed-url', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  mocks.supabaseGetUser.mockReset();
  mocks.adminFrom.mockReset();
  mocks.createSignedUrl.mockReset();
  mocks.createSignedUrl.mockResolvedValue({
    data: { signedUrl: 'https://signed.example/owner-user/session-1/front_full_1000.jpg' },
    error: null,
  });
});

describe('POST /api/scan/signed-url', () => {
  it('rejects an unauthenticated request with 401', async () => {
    mocks.supabaseGetUser.mockResolvedValue({ data: { user: null } });
    const res = await POST(buildRequest({ sessionId: 'session-1', view: 'front' }) as never);
    expect(res.status).toBe(401);
  });

  it('mints a signed URL for the owning user', async () => {
    mocks.supabaseGetUser.mockResolvedValue({ data: { user: { id: 'owner-user' } } });
    installOwnedSessionMock();
    const res = await POST(buildRequest({ sessionId: 'session-1', view: 'front' }) as never);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.signedUrl).toContain('front_full_1000.jpg');
    expect(mocks.createSignedUrl).toHaveBeenCalledWith(SESSION_ROW.front_full_path, 300);
  });

  it('a second user cannot obtain a signed URL for another user\'s session', async () => {
    mocks.supabaseGetUser.mockResolvedValue({ data: { user: { id: 'attacker-user' } } });
    installOwnedSessionMock();
    const res = await POST(buildRequest({ sessionId: 'session-1', view: 'front' }) as never);
    const body = await res.json();
    expect(res.status).toBe(404);
    expect(body.ok).toBe(false);
    expect(mocks.createSignedUrl).not.toHaveBeenCalled();
  });

  it('ignores a client-supplied path field and resolves the path server-side only', async () => {
    mocks.supabaseGetUser.mockResolvedValue({ data: { user: { id: 'owner-user' } } });
    installOwnedSessionMock();
    const res = await POST(
      buildRequest({
        sessionId: 'session-1',
        view: 'front',
        path: 'attacker-user/other-session/front_full_9999.jpg',
      }) as never,
    );
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(mocks.createSignedUrl).toHaveBeenCalledWith(SESSION_ROW.front_full_path, 300);
    expect(mocks.createSignedUrl).not.toHaveBeenCalledWith(
      'attacker-user/other-session/front_full_9999.jpg',
      expect.anything(),
    );
  });

  it('returns not_found for a pose with no stored path (e.g. skipped)', async () => {
    mocks.supabaseGetUser.mockResolvedValue({ data: { user: { id: 'owner-user' } } });
    installOwnedSessionMock();
    const res = await POST(buildRequest({ sessionId: 'session-1', view: 'right' }) as never);
    expect(res.status).toBe(404);
    expect(mocks.createSignedUrl).not.toHaveBeenCalled();
  });
});
