import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  readOwnedSession: vi.fn(),
  signStoredGlb: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth: { getUser: mocks.getUser } }),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({}),
}));

vi.mock('@/lib/utils/safe-log', () => ({
  safeLog: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock('@/lib/utils/inMemoryRateLimit', () => ({
  inMemoryRateLimit: () => true,
}));

vi.mock('@/lib/formavision/meshy/meshySupabase', () => ({
  readOwnedSession: mocks.readOwnedSession,
  signStoredGlb: mocks.signStoredGlb,
}));

import { GET } from '../route';

const SESSION_ID = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';

beforeEach(() => {
  mocks.getUser.mockReset();
  mocks.readOwnedSession.mockReset();
  mocks.signStoredGlb.mockReset();
});

describe('GET /api/formavision/meshy/glb', () => {
  it('signs OUR stored path, never a Meshy CDN URL', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    mocks.readOwnedSession.mockResolvedValue({
      id: SESSION_ID,
      meshy_visual: {
        status: 'succeeded',
        glbPath: 'user-1/session-1/meshy/visual.glb',
        glbBytes: 3_000_000,
      },
    });
    mocks.signStoredGlb.mockResolvedValue(
      'https://supabase.example/storage/v1/object/sign/body-progress-photos/user-1/session-1/meshy/visual.glb',
    );
    const res = await GET(new Request(`http://localhost/api/formavision/meshy/glb?sessionId=${SESSION_ID}`));
    const body = (await res.json()) as { ok: boolean; signedUrl: string; glbPath: string };
    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.glbPath).toBe('user-1/session-1/meshy/visual.glb');
    expect(body.signedUrl).toContain('body-progress-photos');
    expect(body.signedUrl).not.toContain('assets.meshy.ai');
    expect(mocks.signStoredGlb).toHaveBeenCalledWith(
      expect.anything(),
      'user-1/session-1/meshy/visual.glb',
      3600,
    );
  });

  it('does not sign when no stored GLB exists', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    mocks.readOwnedSession.mockResolvedValue({
      id: SESSION_ID,
      meshy_visual: { status: 'pending', glbPath: null },
    });
    const res = await GET(new Request(`http://localhost/api/formavision/meshy/glb?sessionId=${SESSION_ID}`));
    expect(res.status).toBe(404);
    expect(mocks.signStoredGlb).not.toHaveBeenCalled();
  });
});
