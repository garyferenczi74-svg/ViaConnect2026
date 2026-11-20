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

import { PUT } from '@/app/api/nutrition/hydration/target/route';

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

describe('PUT /api/nutrition/hydration/target when the service-role client cannot be constructed', () => {
  it('updates the owner profile through the signed-in session', async () => {
    mocks.supabaseAuth.mockResolvedValueOnce({ data: { user: { id: 'u-1' } } });
    mocks.sessionFrom.mockReturnValue(chain({
      data: { body_weight_kg: null, hydration_target_ml_per_day_custom: 2000 },
      error: null,
    }));

    const res = await PUT(new NextRequest('http://localhost/api/nutrition/hydration/target', {
      method: 'PUT',
      body: JSON.stringify({ custom_target_ml_per_day: 2000 }),
      headers: { 'content-type': 'application/json' },
    }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.custom_target_ml_per_day).toBe(2000);
    expect(mocks.sessionFrom).toHaveBeenCalledWith('profiles');
  });
});
