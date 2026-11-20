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

vi.mock('@/lib/nutrition/bos-bridge', () => ({
  recomputeNutritionDimension: vi.fn().mockResolvedValue(undefined),
}));

import { DELETE, PUT } from '@/app/api/nutrition/hydration/log/[mealId]/route';

function chain(result: { data: unknown; error: unknown }) {
  const builder: Record<string, unknown> = {};
  const next = () => builder;
  for (const method of ['select', 'eq', 'not', 'limit', 'update', 'delete']) {
    builder[method] = next;
  }
  builder.maybeSingle = () => Promise.resolve(result);
  builder.then = (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve);
  return builder;
}

const ctx = { params: Promise.resolve({ mealId: 'meal-1' }) };

beforeEach(() => {
  mocks.supabaseAuth.mockReset();
  mocks.sessionFrom.mockReset();
});

describe('hydration log edits when the service-role client cannot be constructed', () => {
  it('updates the owned log through the signed-in session', async () => {
    mocks.supabaseAuth.mockResolvedValueOnce({ data: { user: { id: 'u-1' } } });
    mocks.sessionFrom.mockImplementation((table: string) => {
      if (table === 'meals') {
        return chain({
          data: {
            meal_id: 'meal-1',
            user_id: 'u-1',
            meal_kind: 'hydration_only',
            logged_at: '2026-11-20T15:00:00.000Z',
          },
          error: null,
        });
      }
      if (table === 'profiles') {
        return chain({ data: { hydration_counting_mode: 'conservative' }, error: null });
      }
      return chain({
        data: {
          id: 'item-1',
          hydration_source_kind: 'pure_water',
          portion_volume_ml: 240,
          food_name: 'Water',
        },
        error: null,
      });
    });

    const res = await PUT(new NextRequest('http://localhost/api/nutrition/hydration/log/meal-1', {
      method: 'PUT',
      body: JSON.stringify({ volume_ml: 300 }),
      headers: { 'content-type': 'application/json' },
    }), ctx);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.meal_id).toBe('meal-1');
    expect(body.portion_volume_ml).toBe(300);
  });

  it('deletes the owned log through the signed-in session', async () => {
    mocks.supabaseAuth.mockResolvedValueOnce({ data: { user: { id: 'u-1' } } });
    mocks.sessionFrom.mockImplementation((table: string) => {
      if (table === 'meals') {
        return chain({
          data: {
            meal_id: 'meal-1',
            user_id: 'u-1',
            meal_kind: 'hydration_only',
            logged_at: '2026-11-20T15:00:00.000Z',
          },
          error: null,
        });
      }
      return chain({ data: null, error: null });
    });

    const res = await DELETE(new NextRequest('http://localhost/api/nutrition/hydration/log/meal-1', {
      method: 'DELETE',
    }), ctx);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ deleted: true, meal_id: 'meal-1' });
  });
});
