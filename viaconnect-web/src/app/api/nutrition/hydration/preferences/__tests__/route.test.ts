import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  supabaseAuth: vi.fn(),
  sessionFrom: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => ({
    auth: { getUser: mocks.supabaseAuth },
    from: mocks.sessionFrom,
  }),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL not configured');
  },
}));

vi.mock('@/lib/utils/safe-log', () => ({
  safeLog: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

import { GET, PUT } from '@/app/api/nutrition/hydration/preferences/route';

function chain(result: { data: unknown; error: unknown }) {
  const builder: Record<string, unknown> = {};
  const next = () => builder;
  for (const method of ['select', 'eq', 'update']) {
    builder[method] = next;
  }
  builder.maybeSingle = () => Promise.resolve(result);
  builder.then = (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve);
  return builder;
}

beforeEach(() => {
  mocks.supabaseAuth.mockReset();
  mocks.sessionFrom.mockReset();
});

describe('hydration preferences when the service-role client cannot be constructed', () => {
  it('reads preferences through the signed-in session', async () => {
    mocks.supabaseAuth.mockResolvedValueOnce({ data: { user: { id: 'u-1' } } });
    mocks.sessionFrom.mockReturnValue(chain({
      data: {
        hydration_counting_mode: 'conservative',
        hydration_notifications_enabled: false,
        hydration_notification_cadence: null,
      },
      error: null,
    }));

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.counting_mode).toBe('conservative');
    expect(mocks.sessionFrom).toHaveBeenCalledWith('profiles');
  });

  it('writes preferences through the signed-in session', async () => {
    mocks.supabaseAuth.mockResolvedValueOnce({ data: { user: { id: 'u-1' } } });
    mocks.sessionFrom.mockReturnValue(chain({ data: null, error: null }));

    const res = await PUT(new NextRequest('http://localhost/api/nutrition/hydration/preferences', {
      method: 'PUT',
      body: JSON.stringify({ counting_mode: 'adjusted' }),
      headers: { 'content-type': 'application/json' },
    }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ ok: true, updated: true });
  });
});
