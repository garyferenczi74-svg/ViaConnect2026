import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Prompt 231b: middleware allowlist test. Asserts /mediapipe is public
// (unauthenticated requests pass through, no redirect) and that an
// unrelated protected route still redirects to /login. The immutable
// Cache-Control header on /mediapipe assets is applied by next.config
// headers(), not by this middleware, so it is not asserted here; it is
// verified post-deploy by curl.

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({
    auth: {
      getClaims: vi.fn().mockResolvedValue({ data: { claims: null }, error: null }),
    },
  })),
}));

import { updateSession } from '../middleware';

function req(pathname: string): NextRequest {
  return new NextRequest(new URL(`http://localhost${pathname}`));
}

describe('updateSession public route allowlist (Prompt 231b)', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
  });

  it('treats an unauthenticated request to /mediapipe/1.0.1/VERSION as public: no redirect', async () => {
    const response = await updateSession(req('/mediapipe/1.0.1/VERSION'));
    expect(response.status).not.toBe(307);
    expect(response.headers.get('location')).toBeNull();
  });

  it('still redirects an unauthenticated request to /body-tracker/formavision/scan to /login', async () => {
    const response = await updateSession(req('/body-tracker/formavision/scan'));
    expect(response.status).toBe(307);
    const location = response.headers.get('location');
    expect(location).not.toBeNull();
    expect(new URL(location as string).pathname).toBe('/login');
  });
});
