import { describe, expect, it } from 'vitest';
import {
  isMeshyVisualGlbReady,
  isTerminalMeshyWithoutGlb,
  selectReadyViewer,
  shouldParkPhoneR3fReady,
} from '../selectReadyViewer';

const GLB = 'https://storage.example/u/s/meshy/visual.glb?token=1';

describe('selectReadyViewer Option A', () => {
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

  it('Jeffery lock: desktop Ready stays on R3F even when Meshy GLB exists', () => {
    expect(
      selectReadyViewer({
        host: 'desktop',
        hasReadyScanData: true,
        meshyStatus: 'succeeded',
        meshyGlbUrl: GLB,
      }),
    ).toBe('r3f');
  });

  it('phone / unknown Ready without GLB is an honest notice, never R3F', () => {
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
        host: 'unknown',
        hasReadyScanData: true,
        meshyStatus: 'idle',
        meshyGlbUrl: null,
      }),
    ).toBe('notice');
    expect(
      shouldParkPhoneR3fReady({ host: 'phone', hasReadyScanData: true }),
    ).toBe(true);
    expect(
      shouldParkPhoneR3fReady({ host: 'unknown', hasReadyScanData: true }),
    ).toBe(true);
  });

  it('desktop Ready without GLB may keep parametric R3F', () => {
    expect(
      selectReadyViewer({
        host: 'desktop',
        hasReadyScanData: true,
        meshyStatus: 'idle',
        meshyGlbUrl: null,
      }),
    ).toBe('r3f');
    expect(
      shouldParkPhoneR3fReady({ host: 'desktop', hasReadyScanData: true }),
    ).toBe(false);
  });

  it('non-Ready stays on R3F (template / empty path)', () => {
    expect(
      selectReadyViewer({
        host: 'phone',
        hasReadyScanData: false,
        meshyStatus: 'idle',
        meshyGlbUrl: null,
      }),
    ).toBe('r3f');
  });

  it('failed GLB load on phone is a notice, not another R3F paint patch', () => {
    expect(
      selectReadyViewer({
        host: 'phone',
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
