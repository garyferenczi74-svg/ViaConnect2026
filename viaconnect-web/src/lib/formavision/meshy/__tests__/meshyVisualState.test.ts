import { describe, expect, it } from 'vitest';
import {
  emptyMeshyVisual,
  mapMeshyHttpError,
  mapMeshyTaskStatus,
  meshyVisualHasForbiddenMeasurementKeys,
  sanitizeMeshyVisual,
} from '../meshyVisualState';

describe('sanitizeMeshyVisual', () => {
  it('drops measurement-shaped keys and keeps visual fields only', () => {
    const dirty = {
      taskId: 'task-1',
      status: 'succeeded',
      glbPath: 'u/s/meshy/visual.glb',
      glbBytes: 4_200_000,
      views: ['front', 'back', 'not-a-pose'],
      waist: 32,
      bodyFat: 24,
      measurements: { chest: 40 },
    };
    const clean = sanitizeMeshyVisual(dirty, '2026-09-03T00:00:00.000Z');
    expect(clean.taskId).toBe('task-1');
    expect(clean.glbPath).toBe('u/s/meshy/visual.glb');
    expect(clean.views).toEqual(['front', 'back']);
    expect(clean).not.toHaveProperty('waist');
    expect(clean).not.toHaveProperty('bodyFat');
    expect(clean).not.toHaveProperty('measurements');
    expect(meshyVisualHasForbiddenMeasurementKeys(dirty)).toBe(true);
    expect(meshyVisualHasForbiddenMeasurementKeys(clean)).toBe(false);
  });

  it('empty state has no measurements', () => {
    const empty = emptyMeshyVisual();
    expect(empty.status).toBe('idle');
    expect(empty.glbPath).toBeNull();
    expect(meshyVisualHasForbiddenMeasurementKeys(empty)).toBe(false);
  });
});

describe('mapMeshy errors', () => {
  it('maps 402 / 429 / moderation without crashing', () => {
    expect(mapMeshyHttpError(402, 'credits')).toBe('payment_required');
    expect(mapMeshyHttpError(429, 'slow down')).toBe('rate_limited');
    expect(mapMeshyHttpError(400, 'moderation_blocked')).toBe('moderation_blocked');
  });

  it('maps Meshy FAILED + moderation message', () => {
    expect(mapMeshyTaskStatus('FAILED', 'moderation_blocked')).toEqual({
      status: 'moderation_blocked',
      errorCode: 'moderation_blocked',
    });
    expect(mapMeshyTaskStatus('SUCCEEDED', '')).toEqual({
      status: 'succeeded',
      errorCode: null,
    });
  });
});
