import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { AI_DATA_SHARING_CONSENT_VERSION } from '../consent';

const getClaims = vi.fn();
const maybeSingle = vi.fn();

vi.mock('@supabase/ssr', () => ({
  createServerClient: () => ({
    auth: { getClaims },
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle }),
      }),
    }),
  }),
}));

vi.mock('@/lib/utils/with-timeout', () => ({
  withTimeout: (promise: Promise<unknown>) => promise,
}));

import { blockAiRouteWithoutConsent } from '../block-route';

function ask(): NextRequest {
  return new NextRequest('http://localhost/api/hannah/ask', { method: 'POST' });
}

describe('blockAiRouteWithoutConsent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-test-key';
    delete process.env.AI_THIRD_PARTY_CONSENT_GATE;
    getClaims.mockResolvedValue({
      data: { claims: { sub: 'user-1' } },
      error: null,
    });
    maybeSingle.mockResolvedValue({ data: null, error: null });
  });

  it('does not look up consent while the gate is off', async () => {
    const blocked = await blockAiRouteWithoutConsent(ask());
    expect(blocked).toBeNull();
    expect(getClaims).not.toHaveBeenCalled();
  });

  it('refuses an AI post without a current agree when the gate is on', async () => {
    process.env.AI_THIRD_PARTY_CONSENT_GATE = 'true';
    const blocked = await blockAiRouteWithoutConsent(ask());
    expect(blocked?.status).toBe(403);
    const body = (await blocked?.json()) as { code?: string };
    expect(body.code).toBe('ai_consent_required');
  });

  it('allows the AI post when the stored agree matches the current text', async () => {
    process.env.AI_THIRD_PARTY_CONSENT_GATE = '1';
    maybeSingle.mockResolvedValue({
      data: {
        ai_data_sharing_accepted_at: '2026-10-03T12:00:00.000Z',
        ai_data_sharing_revoked_at: null,
        ai_data_sharing_consent_version: AI_DATA_SHARING_CONSENT_VERSION,
      },
      error: null,
    });
    const blocked = await blockAiRouteWithoutConsent(ask());
    expect(blocked).toBeNull();
  });

  it('returns 401 when the gate is on and there is no session', async () => {
    process.env.AI_THIRD_PARTY_CONSENT_GATE = 'true';
    getClaims.mockResolvedValue({ data: { claims: null }, error: null });
    const blocked = await blockAiRouteWithoutConsent(ask());
    expect(blocked?.status).toBe(401);
    expect(maybeSingle).not.toHaveBeenCalled();
  });

  it('does not gate a nutrition save that does not call an AI vendor', async () => {
    process.env.AI_THIRD_PARTY_CONSENT_GATE = 'true';
    const blocked = await blockAiRouteWithoutConsent(
      new NextRequest('http://localhost/api/nutrition/meals', { method: 'POST' }),
    );
    expect(blocked).toBeNull();
    expect(getClaims).not.toHaveBeenCalled();
  });
});
