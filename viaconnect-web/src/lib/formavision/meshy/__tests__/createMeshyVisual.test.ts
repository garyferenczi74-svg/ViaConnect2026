import { describe, expect, it, vi } from 'vitest';
import { createMeshyVisual, type SessionPhotoRow } from '../createMeshyVisual';
import { MESHY_CREATE_URL } from '../types';

const SESSION: SessionPhotoRow = {
  id: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
  user_id: 'user-1',
  front_full_path: 'user-1/sess/front_full_1.jpg',
  right_full_path: 'user-1/sess/right_full_1.jpg',
  back_full_path: null,
  left_full_path: 'user-1/sess/left_full_1.jpg',
};

function deps(overrides: {
  apiKey?: string | null;
  session?: SessionPhotoRow | null;
  fetchImpl?: typeof fetch;
  signed?: string[];
}) {
  const persistVisual = vi.fn().mockResolvedValue(undefined);
  const signPhotoUrls = vi.fn().mockResolvedValue(
    overrides.signed ?? [
      'https://signed.example/front.jpg',
      'https://signed.example/right.jpg',
      'https://signed.example/left.jpg',
    ],
  );
  return {
    persistVisual,
    signPhotoUrls,
    readSession: vi.fn().mockResolvedValue(overrides.session === undefined ? SESSION : overrides.session),
    fetchImpl: overrides.fetchImpl,
    apiKey: overrides.apiKey === undefined ? 'test-key' : overrides.apiKey,
    now: () => '2026-09-03T00:00:00.000Z',
    persist: persistVisual,
  };
}

describe('createMeshyVisual', () => {
  it('no-ops cleanly when MESHY_API_KEY is missing', async () => {
    const d = deps({ apiKey: null });
    const result = await createMeshyVisual(SESSION.id, 'user-1', d);
    expect(result.ok).toBe(true);
    expect(result.skipped).toBe(true);
    expect(result.visual.status).toBe('skipped_no_key');
    expect(d.persistVisual).not.toHaveBeenCalled();
    expect(d.signPhotoUrls).not.toHaveBeenCalled();
  });

  it('sends images front-first and persists the task id immediately', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 202,
      text: async () => JSON.stringify({ result: 'meshy-task-1' }),
    });
    const d = deps({ fetchImpl });
    const result = await createMeshyVisual(SESSION.id, 'user-1', d);
    expect(result.ok).toBe(true);
    expect(result.visual.taskId).toBe('meshy-task-1');
    expect(result.visual.status).toBe('pending');
    expect(result.visual.views).toEqual(['front', 'right', 'left']);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(MESHY_CREATE_URL);
    const body = JSON.parse(String(init.body)) as { image_urls: string[] };
    expect(body.image_urls[0]).toContain('front.jpg');
    expect(body.image_urls).toEqual([
      'https://signed.example/front.jpg',
      'https://signed.example/right.jpg',
      'https://signed.example/left.jpg',
    ]);
    expect(d.persistVisual).toHaveBeenCalledWith(
      SESSION.id,
      expect.objectContaining({ taskId: 'meshy-task-1', status: 'pending' }),
    );
  });

  it('records moderation_blocked without throwing', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      text: async () => 'moderation_blocked: clothing required',
    });
    const d = deps({ fetchImpl });
    const result = await createMeshyVisual(SESSION.id, 'user-1', d);
    expect(result.ok).toBe(false);
    expect(result.visual.status).toBe('moderation_blocked');
    expect(result.errorCode).toBe('moderation_blocked');
  });

  it('returns the stored path when the session already succeeded', async () => {
    const fetchImpl = vi.fn();
    const d = deps({
      fetchImpl,
      session: {
        ...SESSION,
        meshy_visual: {
          taskId: 'done',
          status: 'succeeded',
          glbPath: 'user-1/sess/meshy/visual.glb',
          glbBytes: 3_100_000,
          views: ['front'],
          errorCode: null,
          progress: 100,
          createdAt: '2026-09-03T00:00:00.000Z',
          updatedAt: '2026-09-03T00:03:00.000Z',
        },
      },
    });
    const result = await createMeshyVisual(SESSION.id, 'user-1', d);
    expect(result.ok).toBe(true);
    expect(result.visual.glbPath).toBe('user-1/sess/meshy/visual.glb');
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
