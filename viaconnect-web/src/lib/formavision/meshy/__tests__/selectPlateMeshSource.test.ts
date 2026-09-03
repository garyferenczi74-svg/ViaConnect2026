import { describe, expect, it } from 'vitest';
import { pickReadyFrblSessionId, selectPlateMeshSource } from '../selectPlateMeshSource';

describe('selectPlateMeshSource', () => {
  it('prefers the stored GLB over the parametric mesh when ready', () => {
    expect(
      selectPlateMeshSource({
        meshyGlbUrl: 'https://storage.example/u/s/meshy/visual.glb?token=1',
        meshyStatus: 'succeeded',
        glbLoadFailed: false,
      }),
    ).toBe('meshy-glb');
  });

  it('never returns picasso for any Meshy state', () => {
    const states = [
      selectPlateMeshSource({ meshyGlbUrl: null, meshyStatus: 'idle', glbLoadFailed: false }),
      selectPlateMeshSource({ meshyGlbUrl: null, meshyStatus: 'pending', glbLoadFailed: false }),
      selectPlateMeshSource({
        meshyGlbUrl: null,
        meshyStatus: 'moderation_blocked',
        glbLoadFailed: false,
      }),
      selectPlateMeshSource({
        meshyGlbUrl: 'https://example/broken.glb',
        meshyStatus: 'succeeded',
        glbLoadFailed: true,
      }),
      selectPlateMeshSource({ meshyGlbUrl: null, meshyStatus: 'skipped_no_key', glbLoadFailed: false }),
    ];
    expect(states.every((s) => s === 'parametric')).toBe(true);
    expect(JSON.stringify(states)).not.toMatch(/picasso/i);
  });
});

describe('pickReadyFrblSessionId', () => {
  it('picks a Ready 4-pose session with at least one pose', () => {
    const id = pickReadyFrblSessionId([
      {
        id: 'photo-row',
        protocol: 'formavision_photo',
        captureStatus: 'ready',
        poses: { front: false, right: false, back: false, left: false },
      },
      {
        id: 'frbl-ready',
        protocol: '4pose_v1',
        captureStatus: 'ready',
        poses: { front: true, right: false, back: false, left: false },
      },
    ]);
    expect(id).toBe('frbl-ready');
  });

  it('does not post a photo-analyze row that discarded FRBL photos', () => {
    expect(
      pickReadyFrblSessionId([
        {
          id: 'photo-only',
          protocol: 'formavision_photo',
          captureStatus: 'ready',
          poses: { front: false, right: false, back: false, left: false },
        },
      ]),
    ).toBeNull();
  });

  it('kicks Meshy for an existing session that still has FRBL photos', () => {
    expect(
      pickReadyFrblSessionId([
        {
          id: 'old-frbl',
          protocol: '4pose_v1',
          captureStatus: 'partial',
          poses: { front: true, right: true, back: true, left: true },
        },
      ]),
    ).toBe('old-frbl');
  });
});
