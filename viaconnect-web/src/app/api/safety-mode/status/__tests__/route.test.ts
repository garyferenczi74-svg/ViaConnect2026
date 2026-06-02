// Prompt 172 Phase 0 (170c primitive): /api/safety-mode/status GET tests.
//
// Per 170c §8.4 silent UX:
//   1. Unauthenticated callers get { enabled: false } with HTTP 200 (no 401;
//      the hook fail closes gracefully and never reveals the auth boundary
//      via a safety mode endpoint).
//   2. Authenticated callers get the user's row from user_safety_preferences.
//   3. When the user has no row yet (never opted in), default to false.
//   4. When the master kill switch is off, return false regardless of row.
//   5. Database error returns enabled false (fail closed per §23.1).

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => {
  return {
    supabaseAuth: vi.fn(),
    maybeSingle: vi.fn(),
  };
});

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => ({
    auth: { getUser: mocks.supabaseAuth },
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: mocks.maybeSingle,
        }),
      }),
    }),
  }),
}));

import { GET } from '@/app/api/safety-mode/status/route';

beforeEach(() => {
  mocks.supabaseAuth.mockReset();
  mocks.maybeSingle.mockReset();
  delete process.env.EATING_DISORDER_SAFETY_MODE_ENABLED;
  delete process.env.NEXT_PUBLIC_EATING_DISORDER_SAFETY_MODE_ENABLED;
});

describe('GET /api/safety-mode/status: unauthenticated', () => {
  it('returns enabled false with 200, never 401', async () => {
    mocks.supabaseAuth.mockResolvedValueOnce({ data: { user: null } });
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ enabled: false });
    expect(mocks.maybeSingle).not.toHaveBeenCalled();
  });
});

describe('GET /api/safety-mode/status: authenticated', () => {
  it('returns the user row when ed_safety_mode_enabled is true', async () => {
    mocks.supabaseAuth.mockResolvedValueOnce({ data: { user: { id: 'u-1' } } });
    mocks.maybeSingle.mockResolvedValueOnce({
      data: { ed_safety_mode_enabled: true },
      error: null,
    });
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ enabled: true });
  });

  it('returns enabled false when the user has no row yet', async () => {
    mocks.supabaseAuth.mockResolvedValueOnce({ data: { user: { id: 'u-2' } } });
    mocks.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ enabled: false });
  });

  it('returns enabled false on a database error per fail closed posture', async () => {
    mocks.supabaseAuth.mockResolvedValueOnce({ data: { user: { id: 'u-3' } } });
    mocks.maybeSingle.mockResolvedValueOnce({
      data: null,
      error: { message: 'permission denied for table user_safety_preferences' },
    });
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ enabled: false });
  });
});

describe('GET /api/safety-mode/status: master kill switch', () => {
  it('returns enabled false when EATING_DISORDER_SAFETY_MODE_ENABLED is off', async () => {
    process.env.EATING_DISORDER_SAFETY_MODE_ENABLED = 'false';
    mocks.supabaseAuth.mockResolvedValueOnce({ data: { user: { id: 'u-1' } } });
    mocks.maybeSingle.mockResolvedValueOnce({
      data: { ed_safety_mode_enabled: true },
      error: null,
    });
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ enabled: false });
  });
});
