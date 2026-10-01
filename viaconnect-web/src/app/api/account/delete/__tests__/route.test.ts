import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  getStripe: vi.fn(),
  events: [] as string[],
  deleted: [] as string[],
  withCustomer: true,
  storageError: false,
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth: { getUser: mocks.getUser } }),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from(table: string) {
      const api = {
        select() { return api; },
        update() {
          mocks.events.push('database');
          return api;
        },
        delete() {
          mocks.events.push('database');
          return api;
        },
        eq() { return api; },
        in() { return api; },
        then(onFulfilled: (value: { data: unknown; error: null }) => unknown, onRejected?: (reason: unknown) => unknown) {
          const data = table === 'memberships' && mocks.withCustomer
            ? [{ stripe_customer_id: 'cus_test' }]
            : [];
          return Promise.resolve({ data, error: null }).then(onFulfilled, onRejected);
        },
      };
      return api;
    },
    rpc: async () => ({ data: null, error: { message: 'Could not find the function', code: 'PGRST202' } }),
    storage: {
      from() {
        return {
          list: async () => {
            mocks.events.push('storage');
            if (mocks.storageError) return { data: null, error: { message: 'storage down' } };
            return { data: [], error: null };
          },
          remove: async () => ({ error: null }),
        };
      },
    },
    auth: {
      admin: {
        deleteUser: async (id: string) => {
          mocks.events.push('auth');
          mocks.deleted.push(id);
          return { data: { user: null }, error: null };
        },
      },
    },
  }),
}));

vi.mock('@/lib/pricing/stripe', () => ({
  getStripe: () => mocks.getStripe(),
}));

vi.mock('@/lib/utils/inMemoryRateLimit', () => ({
  inMemoryRateLimit: () => true,
}));

vi.mock('@/lib/utils/safe-log', () => ({
  safeLog: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { POST } from '@/app/api/account/delete/route';

const SESSION_USER = 'session-user';

function authedUser() {
  mocks.getUser.mockResolvedValue({
    data: { user: { id: SESSION_USER, identities: [] } },
    error: null,
  });
}

function request(body: unknown) {
  return new Request('http://localhost/api/account/delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  mocks.getUser.mockReset();
  mocks.getStripe.mockReset();
  mocks.events.length = 0;
  mocks.deleted.length = 0;
  mocks.withCustomer = true;
  mocks.storageError = false;
  process.env.STRIPE_SECRET_KEY = 'sk_test_account_delete';
  mocks.getStripe.mockImplementation(() => ({
    subscriptions: {
      list: async () => ({ data: [{ id: 'sub_1', status: 'active' }], has_more: false }),
      cancel: async () => {
        mocks.events.push('stripe');
      },
    },
    customers: {
      del: async () => undefined,
    },
  }));
});

describe('POST /api/account/delete', () => {
  it('requires a session', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
    const response = await POST(request({ confirmation: 'DELETE' }));
    expect(response.status).toBe(401);
    const body = await response.json() as { errorCode: string };
    expect(body.errorCode).toBe('auth_required');
    expect(mocks.deleted).toEqual([]);
    expect(mocks.getStripe).not.toHaveBeenCalled();
  });

  it('rejects a client-supplied user id that is not the session user', async () => {
    authedUser();
    const response = await POST(request({ confirmation: 'DELETE', userId: 'someone-else' }));
    expect(response.status).toBe(403);
    const body = await response.json() as { errorCode: string };
    expect(body.errorCode).toBe('user_mismatch');
    expect(mocks.deleted).toEqual([]);
    expect(mocks.events).toEqual([]);
  });

  it('runs stripe, storage, database, apple, then auth', async () => {
    authedUser();
    const response = await POST(request({ confirmation: 'DELETE', userId: SESSION_USER }));
    expect(response.status).toBe(200);
    const body = await response.json() as { ok: boolean; steps: Array<{ step: string }> };
    expect(body.ok).toBe(true);
    expect(body.steps.map((step) => step.step)).toEqual([
      'stripe',
      'storage',
      'database',
      'apple',
      'auth',
    ]);
    expect(mocks.events[0]).toBe('stripe');
    expect(mocks.events.indexOf('storage')).toBeGreaterThan(mocks.events.indexOf('stripe'));
    expect(mocks.events.indexOf('database')).toBeGreaterThan(mocks.events.indexOf('storage'));
    expect(mocks.events.indexOf('auth')).toBeGreaterThan(mocks.events.indexOf('database'));
    expect(mocks.events[mocks.events.length - 1]).toBe('auth');
    expect(mocks.deleted).toEqual([SESSION_USER]);
  });

  it('is idempotent when the second run finds nothing left to remove', async () => {
    authedUser();
    mocks.withCustomer = true;
    const first = await POST(request({ confirmation: 'DELETE' }));
    expect(first.status).toBe(200);
    mocks.withCustomer = false;
    mocks.events.length = 0;
    const second = await POST(request({ confirmation: 'DELETE' }));
    expect(second.status).toBe(200);
    const body = await second.json() as { ok: boolean; steps: Array<{ step: string; note?: string }> };
    expect(body.ok).toBe(true);
    expect(body.steps.find((step) => step.step === 'stripe')?.note).toBe('no_customer');
    expect(mocks.deleted).toEqual([SESSION_USER, SESSION_USER]);
  });

  it('keeps the auth user when storage fails', async () => {
    authedUser();
    mocks.storageError = true;
    const response = await POST(request({ confirmation: 'DELETE' }));
    expect(response.status).toBe(500);
    const body = await response.json() as { ok: boolean; failedStep: string; errorCode: string };
    expect(body.ok).toBe(false);
    expect(body.failedStep).toBe('storage');
    expect(body.errorCode).toBe('storage_failed');
    expect(mocks.events).toContain('stripe');
    expect(mocks.events).toContain('storage');
    expect(mocks.events).not.toContain('database');
    expect(mocks.events).not.toContain('auth');
    expect(mocks.deleted).toEqual([]);
  });

  it('skips Stripe when it is not configured and still deletes the auth user', async () => {
    authedUser();
    delete process.env.STRIPE_SECRET_KEY;
    const response = await POST(request({ confirmation: 'DELETE' }));
    expect(response.status).toBe(200);
    const body = await response.json() as { ok: boolean; steps: Array<{ step: string; status: string; note?: string }> };
    expect(body.ok).toBe(true);
    expect(body.steps[0]).toEqual({ step: 'stripe', status: 'skipped', note: 'stripe_unconfigured' });
    expect(mocks.getStripe).not.toHaveBeenCalled();
    expect(mocks.deleted).toEqual([SESSION_USER]);
    expect(mocks.events).not.toContain('stripe');
    expect(mocks.events).toContain('auth');
  });
});
