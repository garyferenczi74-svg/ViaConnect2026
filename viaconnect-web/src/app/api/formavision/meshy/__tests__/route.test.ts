import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  createMeshyVisual: vi.fn(),
  advanceMeshyVisual: vi.fn(),
  readOwnedSession: vi.fn(),
  buildCreateDeps: vi.fn(() => ({})),
  buildAdvanceDeps: vi.fn(() => ({})),
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

vi.mock('@/lib/formavision/meshy/createMeshyVisual', () => ({
  createMeshyVisual: mocks.createMeshyVisual,
}));

vi.mock('@/lib/formavision/meshy/advanceMeshyVisual', () => ({
  advanceMeshyVisual: mocks.advanceMeshyVisual,
}));

vi.mock('@/lib/formavision/meshy/meshySupabase', () => ({
  readOwnedSession: mocks.readOwnedSession,
  buildCreateDeps: mocks.buildCreateDeps,
  buildAdvanceDeps: mocks.buildAdvanceDeps,
  signStoredGlb: mocks.signStoredGlb,
}));

import { GET, POST } from '../route';

const SESSION_ID = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';

beforeEach(() => {
  mocks.getUser.mockReset();
  mocks.createMeshyVisual.mockReset();
  mocks.advanceMeshyVisual.mockReset();
  mocks.readOwnedSession.mockReset();
  mocks.signStoredGlb.mockReset();
});

describe('POST /api/formavision/meshy', () => {
  it('rejects unauthenticated callers', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null } });
    const res = await POST(
      new Request('http://localhost/api/formavision/meshy', {
        method: 'POST',
        body: JSON.stringify({ sessionId: SESSION_ID }),
      }),
    );
    expect(res.status).toBe(401);
  });

  it('returns the pending visual without blocking on Meshy poll', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    mocks.createMeshyVisual.mockResolvedValue({
      ok: true,
      skipped: false,
      errorCode: null,
      visual: {
        taskId: 'task-1',
        status: 'pending',
        glbPath: null,
        glbBytes: null,
        views: ['front'],
        errorCode: null,
        progress: 0,
        createdAt: 't',
        updatedAt: 't',
      },
    });
    const res = await POST(
      new Request('http://localhost/api/formavision/meshy', {
        method: 'POST',
        body: JSON.stringify({ sessionId: SESSION_ID }),
      }),
    );
    const body = (await res.json()) as { ok: boolean; visual: { status: string; taskId: string } };
    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.visual.status).toBe('pending');
    expect(body.visual.taskId).toBe('task-1');
    expect(mocks.advanceMeshyVisual).not.toHaveBeenCalled();
  });
});

describe('GET /api/formavision/meshy', () => {
  it('404s when the session is not owned', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'attacker' } } });
    mocks.readOwnedSession.mockResolvedValue(null);
    const res = await GET(new Request(`http://localhost/api/formavision/meshy?sessionId=${SESSION_ID}`));
    const body = (await res.json()) as { error: string; visual: { status: string; errorCode: string } };
    expect(res.status).toBe(404);
    expect(body.error).toBe('not_found');
    expect(body.visual.status).toBe('failed');
    expect(body.visual.errorCode).toBe('not_found');
  });

  it('returns a signed URL with the poll visual when the stored GLB is ready', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    mocks.readOwnedSession.mockResolvedValue({
      id: SESSION_ID,
      meshy_visual: {
        taskId: 'task-1',
        status: 'succeeded',
        glbPath: 'user-1/session-1/meshy/visual.glb',
        glbBytes: 3_000_000,
      },
    });
    mocks.signStoredGlb.mockResolvedValue(
      'https://supabase.example/storage/v1/object/sign/body-progress-photos/user-1/session-1/meshy/visual.glb',
    );
    const res = await GET(new Request(`http://localhost/api/formavision/meshy?sessionId=${SESSION_ID}`));
    const body = (await res.json()) as {
      ok: boolean;
      signedUrl: string;
      visual: { status: string; glbPath: string };
    };
    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.visual.status).toBe('succeeded');
    expect(body.visual.glbPath).toBe('user-1/session-1/meshy/visual.glb');
    expect(body.signedUrl).toContain('body-progress-photos');
    expect(body.signedUrl).not.toContain('assets.meshy.ai');
  });
});
