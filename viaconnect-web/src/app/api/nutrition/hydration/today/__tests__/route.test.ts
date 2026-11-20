import { describe, it, expect, vi, beforeEach } from 'vitest';

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

import { GET } from '@/app/api/nutrition/hydration/today/route';

function chain(result: { data: unknown; error: unknown }) {
  const builder: Record<string, unknown> = {};
  const next = () => builder;
  for (const method of ['select', 'eq', 'gte', 'lte', 'not', 'order', 'limit']) {
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

describe('GET /api/nutrition/hydration/today when the service-role client cannot be constructed', () => {
  it('returns today totals from the signed-in session', async () => {
    mocks.supabaseAuth.mockResolvedValueOnce({ data: { user: { id: 'u-1' } } });
    mocks.sessionFrom.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return chain({
          data: {
            body_weight_kg: null,
            hydration_target_ml_per_day_custom: null,
            hydration_counting_mode: 'conservative',
          },
          error: null,
        });
      }
      return chain({ data: [], error: null });
    });

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.total_ml).toBe(0);
    expect(body.log_count).toBe(0);
    expect(mocks.sessionFrom).toHaveBeenCalledWith('profiles');
    expect(mocks.sessionFrom).toHaveBeenCalledWith('meal_items');
  });
});
