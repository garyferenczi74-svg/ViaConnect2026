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

import { GET } from '@/app/api/nutrition/hydration/history/route';

function chain(result: { data: unknown; error: unknown }) {
  const builder: Record<string, unknown> = {};
  const next = () => builder;
  for (const method of ['select', 'eq', 'gte', 'lte', 'order']) {
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

describe('GET /api/nutrition/hydration/history when the service-role client cannot be constructed', () => {
  it('returns the week from the signed-in session', async () => {
    mocks.supabaseAuth.mockResolvedValueOnce({ data: { user: { id: 'u-1' } } });
    mocks.sessionFrom.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return chain({
          data: { body_weight_kg: null, hydration_target_ml_per_day_custom: null },
          error: null,
        });
      }
      return chain({ data: [], error: null });
    });

    const res = await GET(new NextRequest('http://localhost/api/nutrition/hydration/history?range=week'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.range).toBe('week');
    expect(body.days).toEqual([]);
    expect(mocks.sessionFrom).toHaveBeenCalledWith('hydration_aggregations_daily');
  });
});
