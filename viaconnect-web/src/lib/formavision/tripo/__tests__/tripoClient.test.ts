import { describe, expect, it, vi } from 'vitest';
import { createTripoTask, mapTripoTaskStatus } from '../tripoClient';
import { buildTripoMultiviewBody, orderTripoViews } from '../tripoViews';
import { TRIPO_CREATE_URL, TRIPO_VIEW_ORDER } from '../types';
import { readTripoApiKey } from '../tripoApiKey';
import { createTripoVisual } from '../createTripoVisual';
import { pickReadyMeshySessionId, pickReadyTripoSessionId, selectHybridPlateVisual } from '../selectHybridPlate';

describe('Tripo API key', () => {
  it('never reads NEXT_PUBLIC_TRIPO_API_KEY', () => {
    expect(
      readTripoApiKey({
        NEXT_PUBLIC_TRIPO_API_KEY: 'public-leak',
        TRIPO_API_KEY: '',
      }),
    ).toBeNull();
    expect(readTripoApiKey({ TRIPO_API_KEY: ' secret ' })).toBe('secret');
  });
});

describe('Tripo named FRBL views', () => {
  it('builds front/left/back/right inputs per Tripo docs', () => {
    const views = orderTripoViews(
      {
        front_full_path: 'u/s/front.jpg',
        right_full_path: 'u/s/right.jpg',
        back_full_path: 'u/s/back.jpg',
        left_full_path: 'u/s/left.jpg',
      },
      new Map([
        ['u/s/front.jpg', 'https://signed/front.jpg'],
        ['u/s/right.jpg', 'https://signed/right.jpg'],
        ['u/s/back.jpg', 'https://signed/back.jpg'],
        ['u/s/left.jpg', 'https://signed/left.jpg'],
      ]),
    );
    expect(views.map((v) => v.view)).toEqual([...TRIPO_VIEW_ORDER]);
    const body = buildTripoMultiviewBody(views);
    expect(body.texture).toBe(true);
    expect(body.inputs[0]).toEqual({ front: 'https://signed/front.jpg' });
    expect(body.inputs[1]).toEqual({ left: 'https://signed/left.jpg' });
    expect(body.inputs[2]).toEqual({ back: 'https://signed/back.jpg' });
    expect(body.inputs[3]).toEqual({ right: 'https://signed/right.jpg' });
  });
});

describe('createTripoTask mock', () => {
  it('POSTs named views and returns the task id', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ code: 0, data: { task_id: 'tripo-task-1' } }),
    });
    const result = await createTripoTask(
      'test-key',
      [{ view: 'front', url: 'https://signed/front.jpg' }],
      fetchImpl,
    );
    expect(result.ok).toBe(true);
    expect(result.data?.taskId).toBe('tripo-task-1');
    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(TRIPO_CREATE_URL);
    expect(String(init.headers && (init.headers as Record<string, string>).Authorization)).toBe(
      'Bearer test-key',
    );
    const posted = JSON.parse(String(init.body)) as { inputs: Array<{ front?: string }> };
    expect(posted.inputs[0]?.front).toContain('front.jpg');
  });
});

describe('createTripoVisual', () => {
  it('no-ops cleanly when TRIPO_API_KEY is missing', async () => {
    const persistVisual = vi.fn();
    const result = await createTripoVisual('sess-1', 'user-1', {
      apiKey: null,
      persistVisual,
      signPhotoUrls: vi.fn(),
      readSession: vi.fn(),
      now: () => '2026-09-06T00:00:00.000Z',
    });
    expect(result.ok).toBe(true);
    expect(result.skipped).toBe(true);
    expect(result.visual.status).toBe('skipped_no_key');
    expect(persistVisual).not.toHaveBeenCalled();
  });
});

describe('mapTripoTaskStatus', () => {
  it('maps success / running / failed', () => {
    expect(mapTripoTaskStatus('success').status).toBe('succeeded');
    expect(mapTripoTaskStatus('running').status).toBe('in_progress');
    expect(mapTripoTaskStatus('failed').status).toBe('failed');
  });
});

describe('hybrid plate + session pick', () => {
  it('prefers a landed Tripo GLB and never returns a wireframe source', () => {
    const plate = selectHybridPlateVisual({
      tripoStatus: 'succeeded',
      tripoGlbUrl: 'https://storage.example/tripo.glb',
      meshyStatus: 'succeeded',
      meshyGlbUrl: 'https://storage.example/meshy.glb',
      preferTripo: true,
    });
    expect(plate.provider).toBe('tripo');
    expect(plate.glbUrl).toContain('tripo.glb');
    expect(plate.failed).toBe(false);
  });

  it('marks failed when both pipelines miss a GLB', () => {
    const plate = selectHybridPlateVisual({
      tripoStatus: 'failed',
      tripoGlbUrl: null,
      meshyStatus: 'skipped_no_key',
      meshyGlbUrl: null,
      preferTripo: true,
    });
    expect(plate.glbUrl).toBeNull();
    expect(plate.failed).toBe(true);
  });

  it('routes retained FRBL to Tripo and 4pose to Meshy', () => {
    const scans = [
      {
        id: 'photo-retain',
        protocol: 'formavision_photo' as const,
        captureStatus: 'ready',
        poses: { front: true, right: true, back: true, left: true },
        photosRetained: true,
        frblSessionId: 'sess-tripo',
      },
      {
        id: 'guided',
        protocol: '4pose_v1' as const,
        captureStatus: 'ready',
        poses: { front: true, right: false, back: false, left: false },
        photosRetained: false,
        frblSessionId: null,
      },
    ];
    expect(pickReadyTripoSessionId(scans)).toBe('sess-tripo');
    expect(pickReadyMeshySessionId(scans)).toBe('guided');
  });
});
