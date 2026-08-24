import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  insertSingle: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => ({
    auth: { getUser: mocks.getUser },
    from: () => ({
      insert: () => ({
        select: () => ({
          single: mocks.insertSingle,
        }),
      }),
    }),
  }),
}));

vi.mock('@/lib/utils/safe-log', () => ({
  safeLog: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import { POST } from '../route';

function req(body: unknown): NextRequest {
  return new Request('http://localhost/api/nutrition/pending-review', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as unknown as NextRequest;
}

describe('POST /api/nutrition/pending-review', () => {
  beforeEach(() => {
    mocks.getUser.mockReset();
    mocks.insertSingle.mockReset();
  });

  it('returns 401 without a session', async () => {
    mocks.getUser.mockResolvedValueOnce({ data: { user: null } });
    const res = await POST(req({ source: 'photo', mealType: 'lunch', serving_description: 'salad' }));
    expect(res.status).toBe(401);
  });

  it('inserts pending_review only and returns logId for every entry source', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    mocks.insertSingle.mockResolvedValue({ data: { id: 'log-1' }, error: null });
    for (const source of ['photo', 'upload', 'voice', 'dictation', 'text']) {
      const res = await POST(
        req({
          source,
          mealType: 'lunch',
          serving_description: 'salmon and spinach',
          protein_g: 30,
          carbs_g: 10,
          total_fat_g: 12,
          fiber_g: 4,
          sugar_g: 2,
          confidence: 0.7,
        }),
      );
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.logId).toBe('log-1');
    }
  });
});
