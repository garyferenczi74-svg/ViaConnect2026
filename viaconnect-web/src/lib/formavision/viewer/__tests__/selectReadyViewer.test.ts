import { describe, expect, it } from 'vitest';
import {
  isMeshyVisualGlbReady,
  isParametricReadyViewerFail,
  isTerminalMeshyWithoutGlb,
  selectReadyViewer,
  shouldParkPhoneR3fReady,
  shouldParkR3fReady,
} from '../selectReadyViewer';

const GLB = 'https://storage.example/u/s/meshy/visual.glb?token=1';

describe('selectReadyViewer Gary lock: phone + desktop together', () => {
  it('phone Ready + Meshy GLB selects model-viewer', () => {
    expect(
      selectReadyViewer({
        host: 'phone',
        hasReadyScanData: true,
        meshyStatus: 'succeeded',
        meshyGlbUrl: GLB,
        glbLoadFailed: false,
      }),
    ).toBe('model-viewer');
    expect(
      isMeshyVisualGlbReady({
        meshyStatus: 'succeeded',
        meshyGlbUrl: GLB,
        glbLoadFailed: false,
      }),
    ).toBe(true);
  });

  it('desktop Ready + Meshy GLB selects the same model-viewer path', () => {
    expect(
      selectReadyViewer({
        host: 'desktop',
        hasReadyScanData: true,
        meshyStatus: 'succeeded',
        meshyGlbUrl: GLB,
      }),
    ).toBe('model-viewer');
    expect(
      isParametricReadyViewerFail({
        hasReadyScanData: true,
        readyViewer: 'r3f',
      }),
    ).toBe(true);
    expect(
      isParametricReadyViewerFail({
        hasReadyScanData: true,
        readyViewer: 'model-viewer',
      }),
    ).toBe(false);
  });

  it('Ready without GLB is an honest notice on every host — never R3F', () => {
    expect(
      selectReadyViewer({
        host: 'phone',
        hasReadyScanData: true,
        meshyStatus: 'pending',
        meshyGlbUrl: null,
      }),
    ).toBe('notice');
    expect(
      selectReadyViewer({
        host: 'desktop',
        hasReadyScanData: true,
        meshyStatus: 'idle',
        meshyGlbUrl: null,
      }),
    ).toBe('notice');
    expect(
      selectReadyViewer({
        host: 'unknown',
        hasReadyScanData: true,
        meshyStatus: 'idle',
        meshyGlbUrl: null,
      }),
    ).toBe('notice');
    expect(shouldParkR3fReady({ host: 'desktop', hasReadyScanData: true })).toBe(
      true,
    );
    expect(
      shouldParkPhoneR3fReady({ host: 'phone', hasReadyScanData: true }),
    ).toBe(true);
    expect(
      shouldParkPhoneR3fReady({ host: 'desktop', hasReadyScanData: true }),
    ).toBe(true);
  });

  it('#191: hydrating Ready (no scan data yet) must not mount R3F', () => {
    expect(
      selectReadyViewer({
        host: 'phone',
        hasReadyScanData: false,
        meshyStatus: 'idle',
        meshyGlbUrl: null,
      }),
    ).toBe('notice');
    expect(
      selectReadyViewer({
        host: 'desktop',
        hasReadyScanData: false,
        meshyStatus: 'idle',
        meshyGlbUrl: null,
      }),
    ).toBe('notice');
    expect(shouldParkR3fReady({ hasReadyScanData: false })).toBe(true);
  });

  it('failed GLB load is a notice, not another R3F paint patch', () => {
    expect(
      selectReadyViewer({
        host: 'desktop',
        hasReadyScanData: true,
        meshyStatus: 'succeeded',
        meshyGlbUrl: GLB,
        glbLoadFailed: true,
      }),
    ).toBe('notice');
    expect(
      isTerminalMeshyWithoutGlb({
        meshyStatus: 'skipped_no_key',
        meshyGlbUrl: null,
      }),
    ).toBe(true);
    expect(
      isMeshyVisualGlbReady({
        meshyStatus: 'succeeded',
        meshyGlbUrl: GLB,
        glbLoadFailed: true,
      }),
    ).toBe(false);
  });
});
