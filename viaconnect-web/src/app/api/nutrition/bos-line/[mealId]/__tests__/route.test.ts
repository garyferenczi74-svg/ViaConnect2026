// Prompt 172 Phase 2 (172b): GET /api/nutrition/bos-line/[mealId] tests.
//
// Contract under test:
//   1. 401 when unauthenticated.
//   2. 404 when meal does not exist.
//   3. 404 when meal exists but user does not own it (no cross user leak).
//   4. 200 + null body when the resolver returns null (degradation path).
//   5. 200 + BosLine JSON when the resolver returns a line.
//   6. 200 + null body when BOS_LINE_RENDERING_ENABLED kill switch is off,
//      with no Supabase query made.
//   7. Cache-Control: private, max-age=300 on every 200 response.
//   8. Safety mode is read server side from user_safety_preferences and
//      threaded into the resolver call.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  userAuth: vi.fn(),
  mealMaybeSingle: vi.fn(),
  prefMaybeSingle: vi.fn(),
  resolveBosLine: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => ({
    auth: { getUser: mocks.userAuth },
  }),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          maybeSingle:
            table === 'meals' ? mocks.mealMaybeSingle : mocks.prefMaybeSingle,
        }),
      }),
    }),
  }),
}));

vi.mock('@/lib/nutrition/bos-line/resolver', () => ({
  resolveBosLine: mocks.resolveBosLine,
}));

import { GET } from '@/app/api/nutrition/bos-line/[mealId]/route';

function makeReq(): NextRequest {
  return new Request('http://localhost/api/nutrition/bos-line/m-1', {
    method: 'GET',
  }) as unknown as NextRequest;
}

beforeEach(() => {
  mocks.userAuth.mockReset();
  mocks.mealMaybeSingle.mockReset();
  mocks.prefMaybeSingle.mockReset();
  mocks.resolveBosLine.mockReset();
  delete process.env.BOS_LINE_RENDERING_ENABLED;
  delete process.env.NEXT_PUBLIC_BOS_LINE_RENDERING_ENABLED;
  delete process.env.EATING_DISORDER_SAFETY_MODE_ENABLED;
  delete process.env.NEXT_PUBLIC_EATING_DISORDER_SAFETY_MODE_ENABLED;
});

describe('GET /api/nutrition/bos-line/[mealId]: auth', () => {
  it('returns 401 when unauthenticated', async () => {
    mocks.userAuth.mockResolvedValueOnce({ data: { user: null } });
    const res = await GET(makeReq(), { params: { mealId: 'm-1' } });
    expect(res.status).toBe(401);
    expect(mocks.mealMaybeSingle).not.toHaveBeenCalled();
    expect(mocks.resolveBosLine).not.toHaveBeenCalled();
  });
});

describe('GET /api/nutrition/bos-line/[mealId]: ownership', () => {
  it('returns 404 when the meal does not exist', async () => {
    mocks.userAuth.mockResolvedValueOnce({ data: { user: { id: 'u-1' } } });
    mocks.mealMaybeSingle.mockResolvedValueOnce({ data: null });
    const res = await GET(makeReq(), { params: { mealId: 'm-1' } });
    expect(res.status).toBe(404);
    expect(mocks.resolveBosLine).not.toHaveBeenCalled();
  });

  it('returns 404 when the meal exists but belongs to a different user (no cross user leak)', async () => {
    mocks.userAuth.mockResolvedValueOnce({ data: { user: { id: 'u-1' } } });
    mocks.mealMaybeSingle.mockResolvedValueOnce({
      data: { meal_id: 'm-1', user_id: 'u-other' },
    });
    const res = await GET(makeReq(), { params: { mealId: 'm-1' } });
    expect(res.status).toBe(404);
    expect(mocks.resolveBosLine).not.toHaveBeenCalled();
  });
});

describe('GET /api/nutrition/bos-line/[mealId]: success', () => {
  it('returns 200 + BosLine JSON when the resolver returns a line', async () => {
    mocks.userAuth.mockResolvedValueOnce({ data: { user: { id: 'u-1' } } });
    mocks.mealMaybeSingle.mockResolvedValueOnce({
      data: { meal_id: 'm-1', user_id: 'u-1' },
    });
    mocks.prefMaybeSingle.mockResolvedValueOnce({
      data: { ed_safety_mode_enabled: false },
      error: null,
    });
    const line = {
      kind: 'positive_delta',
      copy: 'This meal nudged your Bio Optimization Score in the right direction.',
      mealId: 'm-1',
      generatedAt: '2026-06-02T12:00:00.000Z',
    };
    mocks.resolveBosLine.mockResolvedValueOnce(line);

    const res = await GET(makeReq(), { params: { mealId: 'm-1' } });
    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe('private, max-age=300');
    const body = await res.json();
    expect(body).toEqual(line);
  });

  it('returns 200 + null body when the resolver returns null (no analytics history)', async () => {
    mocks.userAuth.mockResolvedValueOnce({ data: { user: { id: 'u-1' } } });
    mocks.mealMaybeSingle.mockResolvedValueOnce({
      data: { meal_id: 'm-1', user_id: 'u-1' },
    });
    mocks.prefMaybeSingle.mockResolvedValueOnce({
      data: null,
      error: null,
    });
    mocks.resolveBosLine.mockResolvedValueOnce(null);

    const res = await GET(makeReq(), { params: { mealId: 'm-1' } });
    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe('private, max-age=300');
    const body = await res.json();
    expect(body).toBeNull();
  });
});

describe('GET /api/nutrition/bos-line/[mealId]: kill switch', () => {
  it('returns 200 + null body without consulting Supabase when BOS_LINE_RENDERING_ENABLED is off', async () => {
    process.env.BOS_LINE_RENDERING_ENABLED = 'false';
    const res = await GET(makeReq(), { params: { mealId: 'm-1' } });
    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe('private, max-age=300');
    const body = await res.json();
    expect(body).toBeNull();
    expect(mocks.userAuth).not.toHaveBeenCalled();
    expect(mocks.mealMaybeSingle).not.toHaveBeenCalled();
    expect(mocks.resolveBosLine).not.toHaveBeenCalled();
  });
});

describe('GET /api/nutrition/bos-line/[mealId]: safety mode threading', () => {
  it('threads safetyMode true into the resolver when ed_safety_mode_enabled is true', async () => {
    mocks.userAuth.mockResolvedValueOnce({ data: { user: { id: 'u-1' } } });
    mocks.mealMaybeSingle.mockResolvedValueOnce({
      data: { meal_id: 'm-1', user_id: 'u-1' },
    });
    mocks.prefMaybeSingle.mockResolvedValueOnce({
      data: { ed_safety_mode_enabled: true },
      error: null,
    });
    mocks.resolveBosLine.mockResolvedValueOnce(null);

    await GET(makeReq(), { params: { mealId: 'm-1' } });
    expect(mocks.resolveBosLine).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        mealId: 'm-1',
        userId: 'u-1',
        safetyMode: true,
      }),
    );
  });

  it('threads safetyMode false when the user has no preference row', async () => {
    mocks.userAuth.mockResolvedValueOnce({ data: { user: { id: 'u-1' } } });
    mocks.mealMaybeSingle.mockResolvedValueOnce({
      data: { meal_id: 'm-1', user_id: 'u-1' },
    });
    mocks.prefMaybeSingle.mockResolvedValueOnce({
      data: null,
      error: null,
    });
    mocks.resolveBosLine.mockResolvedValueOnce(null);

    await GET(makeReq(), { params: { mealId: 'm-1' } });
    expect(mocks.resolveBosLine).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ safetyMode: false }),
    );
  });

  it('falls closed (safetyMode false) when the master kill switch is off', async () => {
    process.env.EATING_DISORDER_SAFETY_MODE_ENABLED = 'false';
    mocks.userAuth.mockResolvedValueOnce({ data: { user: { id: 'u-1' } } });
    mocks.mealMaybeSingle.mockResolvedValueOnce({
      data: { meal_id: 'm-1', user_id: 'u-1' },
    });
    mocks.resolveBosLine.mockResolvedValueOnce(null);

    await GET(makeReq(), { params: { mealId: 'm-1' } });
    expect(mocks.prefMaybeSingle).not.toHaveBeenCalled();
    expect(mocks.resolveBosLine).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ safetyMode: false }),
    );
  });
});
