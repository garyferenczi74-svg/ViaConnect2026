import { describe, expect, it, vi } from 'vitest';
import { createTripoTask, getTripoTask, mapTripoTaskStatus } from '../tripoClient';
import { buildTripoMultiviewBody, orderTripoViews } from '../tripoViews';
import { TRIPO_CREATE_URL, TRIPO_MULTIVIEW_MODEL, TRIPO_VIEW_ORDER } from '../types';
import { readTripoApiKey } from '../tripoApiKey';
import { createTripoVisual } from '../createTripoVisual';
import { pickReadyMeshySessionId, pickReadyTripoSessionId, selectHybridPlateVisual } from '../selectHybridPlate';
import { safeLog } from '@/lib/utils/safe-log';

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
    expect(body.model).toBe(TRIPO_MULTIVIEW_MODEL);
    expect(body.model).toBe('v3.1-20260211');
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
    const posted = JSON.parse(String(init.body)) as {
      model?: string;
      texture?: boolean;
      inputs: Array<{ front?: string }>;
    };
    expect(posted.model).toBe(TRIPO_MULTIVIEW_MODEL);
    expect(posted.texture).toBe(true);
    expect(posted.inputs[0]?.front).toContain('front.jpg');
  });

  it('logs a redacted reject body snippet and keeps status + errorCode', async () => {
    const warnSpy = vi.spyOn(safeLog, 'warn').mockImplementation(() => undefined);
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      text: async () =>
        JSON.stringify({
          code: 2000,
          message: 'missing model Authorization: Bearer super-secret-tripo-key',
        }),
    });
    const result = await createTripoTask(
      'test-key',
      [{ view: 'front', url: 'https://signed/front.jpg' }],
      fetchImpl,
    );
    expect(result.ok).toBe(false);
    expect(result.status).toBe(400);
    expect(result.errorCode).toBe('tripo_failed');
    expect(warnSpy).toHaveBeenCalledWith(
      'formavision.tripo',
      'create rejected',
      expect.objectContaining({
        status: 400,
        errorCode: 'tripo_failed',
      }),
    );
    const context = warnSpy.mock.calls.find((call) => call[1] === 'create rejected')?.[2] as
      | { body?: string }
      | undefined;
    expect(context?.body).toBeTruthy();
    expect(context?.body).not.toContain('super-secret-tripo-key');
    expect(context?.body).not.toMatch(/Bearer\s+super-secret/i);
    expect(context?.body).not.toContain('test-key');
    warnSpy.mockRestore();
  });
});

describe('getTripoTask mock', () => {
  it('logs a redacted poll reject body snippet', async () => {
    const warnSpy = vi.spyOn(safeLog, 'warn').mockImplementation(() => undefined);
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      text: async () => 'poll failed Bearer leaked-poll-token',
    });
    const result = await getTripoTask('test-key', 'task-1', fetchImpl);
    expect(result.ok).toBe(false);
    expect(result.status).toBe(400);
    expect(result.errorCode).toBe('tripo_failed');
    const context = warnSpy.mock.calls.find((call) => call[1] === 'poll rejected')?.[2] as
      | { body?: string; status?: number; errorCode?: string }
      | undefined;
    expect(context).toMatchObject({ status: 400, errorCode: 'tripo_failed' });
    expect(context?.body).toContain('Bearer [redacted]');
    expect(context?.body).not.toContain('leaked-poll-token');
    warnSpy.mockRestore();
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
