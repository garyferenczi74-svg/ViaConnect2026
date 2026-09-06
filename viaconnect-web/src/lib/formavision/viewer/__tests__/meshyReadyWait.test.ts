import { describe, expect, it } from 'vitest';
import {
  decideReadyNoticeKind,
  hasMeshySessionId,
  meshyErrorAfterWaitExpired,
  meshyStatusAfterWaitExpired,
  shouldMarkMeshyCreateAttempted,
  shouldTreatMeshyAsUnavailable,
  visualFromMeshyPollBody,
} from '../meshyReadyWait';

const GLB = 'https://storage.example/u/s/meshy/visual.glb?token=1';

describe('meshyReadyWait: Ready never stays Loading forever', () => {
  it('keeps Loading only while Meshy can still produce a GLB', () => {
    expect(
      decideReadyNoticeKind({
        meshyStatus: 'pending',
        meshyGlbUrl: null,
        historyResolved: true,
        sessionId: 'sess-ready',
      }),
    ).toBe('loading');
    expect(
      decideReadyNoticeKind({
        meshyStatus: 'idle',
        meshyGlbUrl: null,
        historyResolved: false,
        sessionId: null,
      }),
    ).toBe('loading');
  });

  it('Ready without a FRBL session after history resolves is unavailable, not Loading', () => {
    expect(
      shouldTreatMeshyAsUnavailable({
        meshyStatus: 'idle',
        meshyGlbUrl: null,
        historyResolved: true,
        sessionId: null,
      }),
    ).toBe(true);
    expect(
      decideReadyNoticeKind({
        meshyStatus: 'idle',
        meshyGlbUrl: null,
        historyResolved: true,
        sessionId: null,
      }),
    ).toBe('unavailable');
    expect(hasMeshySessionId(null)).toBe(false);
    expect(hasMeshySessionId('sess-ready')).toBe(true);
  });

  it('Meshy timeout / fail / missing signed URL is unavailable — never a wireframe path', () => {
    expect(
      decideReadyNoticeKind({
        meshyStatus: 'pending',
        meshyGlbUrl: null,
        waitExpired: true,
        sessionId: 'sess-ready',
        historyResolved: true,
      }),
    ).toBe('unavailable');
    expect(
      decideReadyNoticeKind({
        meshyStatus: 'failed',
        meshyGlbUrl: null,
        sessionId: 'sess-ready',
        historyResolved: true,
      }),
    ).toBe('unavailable');
    expect(
      decideReadyNoticeKind({
        meshyStatus: 'succeeded',
        meshyGlbUrl: null,
        sessionId: 'sess-ready',
        historyResolved: true,
      }),
    ).toBe('unavailable');
    expect(
      decideReadyNoticeKind({
        meshyStatus: 'succeeded',
        meshyGlbUrl: GLB,
        glbLoadFailed: true,
        sessionId: 'sess-ready',
        historyResolved: true,
      }),
    ).toBe('unavailable');
    expect(meshyStatusAfterWaitExpired('pending')).toBe('failed');
    expect(meshyErrorAfterWaitExpired(null)).toBe('timeout');
  });

  it('a landed Meshy GLB is not treated as unavailable', () => {
    expect(
      shouldTreatMeshyAsUnavailable({
        meshyStatus: 'succeeded',
        meshyGlbUrl: GLB,
        historyResolved: true,
        sessionId: 'sess-ready',
      }),
    ).toBe(false);
  });

  it('create is marked attempted only after POST actually stuck', () => {
    expect(shouldMarkMeshyCreateAttempted(null)).toBe(false);
    expect(shouldMarkMeshyCreateAttempted({ error: 'timeout' })).toBe(false);
    expect(shouldMarkMeshyCreateAttempted({ ok: true, visual: { status: 'pending', taskId: 't1' } })).toBe(
      true,
    );
    expect(shouldMarkMeshyCreateAttempted({ skipped: true, visual: { status: 'skipped_no_key' } })).toBe(
      true,
    );
  });

  it('poll body maps not_found / signedUrl so the client can stop Loading', () => {
    expect(
      visualFromMeshyPollBody({
        ok: false,
        error: 'not_found',
      }),
    ).toMatchObject({
      status: 'failed',
      errorCode: 'not_found',
      terminalWithoutVisual: true,
    });
    expect(
      visualFromMeshyPollBody({
        ok: true,
        signedUrl: GLB,
        visual: { status: 'succeeded', glbPath: 'u/s/meshy/visual.glb' },
      }),
    ).toMatchObject({
      status: 'succeeded',
      glbPath: 'u/s/meshy/visual.glb',
      signedUrl: GLB,
    });
  });
});
