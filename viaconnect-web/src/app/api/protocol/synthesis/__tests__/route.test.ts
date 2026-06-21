/**
 * src/app/api/protocol/synthesis/__tests__/route.test.ts
 *
 * Tests for GET /api/protocol/synthesis.
 * Three scenarios per brief:
 *   1. Unauthenticated -> 401
 *   2. Authenticated, row found -> 200 { synthesis: row }
 *   3. Authenticated, getLatestUserProtocolSynthesis throws -> 200 { synthesis: null } (fail-open)
 *
 * No jsdom. Pure TypeScript with vitest.
 * Prompt 208, Phase 8, Task 23 (2026-06-21).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  getLatestUserProtocolSynthesis: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => ({
    auth: { getUser: mocks.getUser },
  }),
}));

vi.mock('@/lib/protocol/readSynthesis', () => ({
  getLatestUserProtocolSynthesis: mocks.getLatestUserProtocolSynthesis,
}));

// ---------------------------------------------------------------------------
// Import route AFTER mocks are registered
// ---------------------------------------------------------------------------

import { GET } from '@/app/api/protocol/synthesis/route';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MOCK_USER_ID = 'user-test-abc';

const MOCK_ROW = {
  recommended_vitamins_minerals: [],
  supplement_flags: [],
  nutrition_guidance: {
    prefer: ['Preformed vitamin A from animal sources'],
    avoid: ['Folic acid-fortified grains'],
  },
  disclaimers_version: 'v1',
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  mocks.getUser.mockReset();
  mocks.getLatestUserProtocolSynthesis.mockReset();
});

describe('GET /api/protocol/synthesis: unauthenticated', () => {
  it('returns 401 when the session has no user', async () => {
    mocks.getUser.mockResolvedValueOnce({ data: { user: null }, error: null });

    const res = await GET();

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toMatchObject({ error: expect.any(String) });
    expect(mocks.getLatestUserProtocolSynthesis).not.toHaveBeenCalled();
  });
});

describe('GET /api/protocol/synthesis: authenticated', () => {
  it('returns 200 with { synthesis: row } when a row exists', async () => {
    mocks.getUser.mockResolvedValueOnce({ data: { user: { id: MOCK_USER_ID } }, error: null });
    mocks.getLatestUserProtocolSynthesis.mockResolvedValueOnce(MOCK_ROW);

    const res = await GET();

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ synthesis: MOCK_ROW });
    expect(mocks.getLatestUserProtocolSynthesis).toHaveBeenCalledWith(MOCK_USER_ID);
  });

  it('returns 200 with { synthesis: null } when no row exists', async () => {
    mocks.getUser.mockResolvedValueOnce({ data: { user: { id: MOCK_USER_ID } }, error: null });
    mocks.getLatestUserProtocolSynthesis.mockResolvedValueOnce(null);

    const res = await GET();

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ synthesis: null });
  });

  it('returns 200 { synthesis: null } (fail-open) when getLatestUserProtocolSynthesis throws', async () => {
    mocks.getUser.mockResolvedValueOnce({ data: { user: { id: MOCK_USER_ID } }, error: null });
    mocks.getLatestUserProtocolSynthesis.mockRejectedValueOnce(new Error('DB timeout'));

    const res = await GET();

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ synthesis: null });
  });
});
