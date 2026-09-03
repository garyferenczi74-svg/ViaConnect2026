import { describe, expect, it, vi } from 'vitest';
import { advanceMeshyVisual } from '../advanceMeshyVisual';
import { emptyMeshyVisual } from '../meshyVisualState';
import { MESHY_CREATE_URL } from '../types';

const pending = {
  ...emptyMeshyVisual('2026-09-03T00:00:00.000Z'),
  taskId: 'meshy-task-1',
  status: 'pending' as const,
  views: ['front' as const],
};

describe('advanceMeshyVisual', () => {
  it('on SUCCEEDED downloads the GLB and stores our path', async () => {
    const glbBytes = new Uint8Array([103, 108, 84, 70]).buffer;
    const fetchImpl = vi.fn(async (url: string) => {
      if (String(url).startsWith(MESHY_CREATE_URL)) {
        return {
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              id: 'meshy-task-1',
              status: 'SUCCEEDED',
              progress: 100,
              model_urls: { glb: 'https://assets.meshy.ai/tmp/model.glb' },
            }),
        };
      }
      return {
        ok: true,
        status: 200,
        arrayBuffer: async () => glbBytes,
        text: async () => '',
      };
    }) as unknown as typeof fetch;
    const persistVisual = vi.fn().mockResolvedValue(undefined);
    const storeGlb = vi.fn().mockResolvedValue(true);
    const visual = await advanceMeshyVisual('session-1', 'user-1', pending, {
      fetchImpl,
      persistVisual,
      storeGlb,
      apiKey: 'test-key',
      now: () => '2026-09-03T00:03:00.000Z',
    });
    expect(visual.status).toBe('succeeded');
    expect(visual.glbPath).toBe('user-1/session-1/meshy/visual.glb');
    expect(visual.glbBytes).toBe(4);
    expect(storeGlb).toHaveBeenCalledWith('user-1/session-1/meshy/visual.glb', glbBytes);
    expect(visual).not.toHaveProperty('waist');
    expect(visual).not.toHaveProperty('bodyFat');
  });

  it('moderation_blocked stays failed-open and does not store a GLB', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          id: 'meshy-task-1',
          status: 'FAILED',
          task_error: { message: 'moderation_blocked' },
        }),
    });
    const storeGlb = vi.fn();
    const visual = await advanceMeshyVisual('session-1', 'user-1', pending, {
      fetchImpl,
      persistVisual: vi.fn().mockResolvedValue(undefined),
      storeGlb,
      apiKey: 'test-key',
      now: () => '2026-09-03T00:03:00.000Z',
    });
    expect(visual.status).toBe('moderation_blocked');
    expect(visual.glbPath).toBeNull();
    expect(storeGlb).not.toHaveBeenCalled();
  });
});
