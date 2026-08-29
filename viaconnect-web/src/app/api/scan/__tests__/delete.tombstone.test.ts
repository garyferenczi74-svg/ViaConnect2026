import { describe, it, expect, vi, beforeEach } from 'vitest';

// Prompt 231: /api/scan/delete tombstone tests. Delete sets
// capture_status='delete_pending' first; an object-delete failure keeps
// delete_pending and never reports Deleted.

const mocks = vi.hoisted(() => ({
  supabaseGetUser: vi.fn(),
  adminFrom: vi.fn(),
  storageRemove: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth: { getUser: mocks.supabaseGetUser } }),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: mocks.adminFrom,
    storage: { from: () => ({ remove: mocks.storageRemove }) },
  }),
}));

vi.mock('@/lib/utils/safe-log', () => ({
  safeLog: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock('@/lib/utils/inMemoryRateLimit', () => ({
  inMemoryRateLimit: () => true,
}));

import { POST } from '@/app/api/scan/delete/route';

const SESSION_ROW = {
  id: 'session-1',
  front_full_path: 'owner-user/session-1/front_full_1000.jpg',
  front_thumb_path: 'owner-user/session-1/front_thumb_1000.jpg',
  right_full_path: null,
  right_thumb_path: null,
  back_full_path: null,
  back_thumb_path: null,
  left_full_path: null,
  left_thumb_path: null,
};

interface TableOpts {
  ownerUserId?: string;
  tombstoneError?: unknown;
  rowDeleteResult?: { data: unknown; error: unknown };
}

function installSessionsMock(opts: TableOpts = {}) {
  const ownerUserId = opts.ownerUserId ?? 'owner-user';
  const tombstoneCalls: unknown[] = [];
  const rowDeleteResult = opts.rowDeleteResult ?? { data: [{ id: 'session-1' }], error: null };

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
            filters.id === SESSION_ROW.id && filters.user_id === ownerUserId
              ? { data: SESSION_ROW, error: null }
              : { data: null, error: null },
          ),
        ),
      };
      return chain;
    }),
    update: vi.fn((payload: Record<string, unknown>) => {
      tombstoneCalls.push(payload);
      const single = vi.fn().mockResolvedValue(
        opts.tombstoneError ? { data: null, error: opts.tombstoneError } : { data: { id: 'session-1' }, error: null },
      );
      const select = vi.fn().mockReturnValue({ single });
      const eq2 = vi.fn().mockReturnValue({ select });
      const eq1 = vi.fn().mockReturnValue({ eq: eq2 });
      return { eq: eq1 };
    }),
    delete: vi.fn(() => {
      const select = vi.fn().mockResolvedValue(rowDeleteResult);
      const eq2 = vi.fn().mockReturnValue({ select });
      const eq1 = vi.fn().mockReturnValue({ eq: eq2 });
      return { eq: eq1 };
    }),
  };
  mocks.adminFrom.mockImplementation((tableName: string) => {
    if (tableName === 'body_photo_sessions') return table;
    throw new Error(`unexpected table ${tableName}`);
  });
  return { table, tombstoneCalls };
}

function buildRequest(sessionId: string) {
  return new Request('http://localhost/api/scan/delete', {
    method: 'POST',
    body: JSON.stringify({ sessionId }),
  });
}

beforeEach(() => {
  mocks.supabaseGetUser.mockReset();
  mocks.adminFrom.mockReset();
  mocks.storageRemove.mockReset();
  mocks.storageRemove.mockResolvedValue({ error: null });
});

describe('POST /api/scan/delete', () => {
  it('rejects an unauthenticated request with 401', async () => {
    mocks.supabaseGetUser.mockResolvedValue({ data: { user: null } });
    const res = await POST(buildRequest('session-1') as never);
    expect(res.status).toBe(401);
  });

  it('sets capture_status=delete_pending before touching storage', async () => {
    mocks.supabaseGetUser.mockResolvedValue({ data: { user: { id: 'owner-user' } } });
    const { tombstoneCalls } = installSessionsMock();
    const res = await POST(buildRequest('session-1') as never);
    expect(res.status).toBe(200);
    expect(tombstoneCalls[0]).toEqual({ capture_status: 'delete_pending' });
  });

  it('reports success and deletes the row + objects when everything succeeds', async () => {
    mocks.supabaseGetUser.mockResolvedValue({ data: { user: { id: 'owner-user' } } });
    installSessionsMock();
    const res = await POST(buildRequest('session-1') as never);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.deleted).toBe(true);
    expect(mocks.storageRemove).toHaveBeenCalledWith([
      SESSION_ROW.front_full_path,
      SESSION_ROW.front_thumb_path,
    ]);
  });

  it('keeps delete_pending and does NOT report Deleted when object removal fails', async () => {
    mocks.supabaseGetUser.mockResolvedValue({ data: { user: { id: 'owner-user' } } });
    installSessionsMock();
    mocks.storageRemove.mockResolvedValue({ error: { message: 'storage unavailable' } });

    const res = await POST(buildRequest('session-1') as never);
    const body = await res.json();

    expect(body.ok).toBe(false);
    expect(body.deleted).not.toBe(true);
    expect(body.error).toBe('delete_pending');
    expect(body.nextAction).toBeTruthy();
  });

  it('does not delete the session row when object removal failed', async () => {
    mocks.supabaseGetUser.mockResolvedValue({ data: { user: { id: 'owner-user' } } });
    const { table } = installSessionsMock();
    mocks.storageRemove.mockResolvedValue({ error: { message: 'storage unavailable' } });

    await POST(buildRequest('session-1') as never);
    expect(table.delete).not.toHaveBeenCalled();
  });

  it('keeps delete_pending and does not report Deleted when the row delete does not confirm', async () => {
    mocks.supabaseGetUser.mockResolvedValue({ data: { user: { id: 'owner-user' } } });
    installSessionsMock({ rowDeleteResult: { data: [], error: null } });

    const res = await POST(buildRequest('session-1') as never);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.deleted).not.toBe(true);
  });

  it('a second user cannot delete another user\'s session', async () => {
    mocks.supabaseGetUser.mockResolvedValue({ data: { user: { id: 'attacker-user' } } });
    installSessionsMock({ ownerUserId: 'owner-user' });
    const res = await POST(buildRequest('session-1') as never);
    const body = await res.json();
    expect(res.status).toBe(404);
    expect(body.ok).toBe(false);
    expect(mocks.storageRemove).not.toHaveBeenCalled();
  });
});
