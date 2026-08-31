// Prompt 231 FormaVision 4-pose scan: useCamera contract coverage.
//
// The vitest config here runs under environment: 'node' (no jsdom, no
// @testing-library/dom installed, see vitest.config.ts), so the actual
// useCamera() hook (useState/useRef/useEffect against a <video> element)
// cannot be rendered in this suite. That DOM-wiring half, attaching the
// stream to videoRef.current, canvas draw in grabStill(), is NOT
// unit-tested here; it is exercised by TypeScript's structural checking
// (this file imports useCamera and would fail to type-check on a bad
// interface) and belongs to a browser/E2E pass, not this suite.
//
// What IS unit-tested, honestly and without a DOM: the two plain functions
// useCamera's open() delegates to, openWebCamera and
// classifyOpenCameraFailure. That covers the requirement that
// navigator.permissions.query never runs ahead of the first getUserMedia
// call, plus the resolution passthrough, the load-bearing parts of this work.

import { describe, it, expect, afterEach, vi } from 'vitest';
import { openWebCamera, classifyOpenCameraFailure, useCamera, bindStreamToVideo } from '../useCamera';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('openWebCamera', () => {
  it('calls getUserMedia with no navigator.permissions.query beforehand, and requests the FormaVision ideal resolution', async () => {
    const callOrder: string[] = [];
    const stream = {
      getTracks: () => [
        { stop: () => {}, kind: 'video', getSettings: () => ({ width: 1920, height: 1080 }) },
      ],
    };
    const getUserMedia = vi.fn((constraints: unknown) => {
      callOrder.push('getUserMedia');
      return Promise.resolve(stream);
    });
    const permissionsQuery = vi.fn(() => {
      callOrder.push('permissions.query');
      return Promise.resolve({ state: 'granted' });
    });
    vi.stubGlobal('navigator', {
      mediaDevices: { getUserMedia },
      permissions: { query: permissionsQuery },
    });

    const result = await openWebCamera('environment');

    expect(result.stream).toBe(stream);
    expect(result.granted).toEqual({ width: 1920, height: 1080 });
    expect(getUserMedia).toHaveBeenCalledTimes(1);
    expect(getUserMedia.mock.calls[0]?.[0]).toEqual({
      video: {
        facingMode: 'environment',
        width: { ideal: 1920 },
        height: { ideal: 1080 },
      },
    });
    // The load-bearing assertion for condition 21: permissions.query was
    // never called by openWebCamera at all (this test's stub proves that,
    // since callOrder only ever gets a 'getUserMedia' entry).
    expect(permissionsQuery).not.toHaveBeenCalled();
    expect(callOrder).toEqual(['getUserMedia']);
  });

  it('reports 0/0 granted resolution honestly when the stream track has no getSettings', async () => {
    const stream = { getTracks: () => [{ stop: () => {}, kind: 'video' }] };
    vi.stubGlobal('navigator', {
      mediaDevices: { getUserMedia: () => Promise.resolve(stream) },
    });

    const result = await openWebCamera('user');
    expect(result.granted).toEqual({ width: 0, height: 0 });
  });
});

describe('classifyOpenCameraFailure', () => {
  it('classifies a permission-copy error as denied and carries its message', () => {
    const err = new Error('Camera permission was not granted. Enable it in browser settings, or upload a photo or log the meal manually.');
    const failure = classifyOpenCameraFailure(err);
    expect(failure.permission).toBe('denied');
    expect(failure.error).toBe(err.message);
  });

  it('classifies a non-permission error as unknown permission state', () => {
    const err = new Error('Camera is not available on this device. Upload a photo or log the meal manually.');
    const failure = classifyOpenCameraFailure(err);
    expect(failure.permission).toBe('unknown');
    expect(failure.error).toBe(err.message);
  });
});

describe('useCamera', () => {
  it('is exported as a function (hook), consistent with useScanSession/useCountdown in this directory', () => {
    // No DOM in this test environment, so the hook is not rendered; see
    // the file header. This only proves the export shape stays honest.
    expect(typeof useCamera).toBe('function');
  });
});

describe('bindStreamToVideo', () => {
  it('attaches a remounted video to the live stream and calls play', () => {
    const stream = { id: 'live-stream' };
    const play = vi.fn(() => Promise.resolve());
    const video = { srcObject: null as unknown, play };

    expect(bindStreamToVideo(video, stream)).toBe(true);
    expect(video.srcObject).toBe(stream);
    expect(play).toHaveBeenCalledTimes(1);
  });

  it('is a no-op when the video element or stream is missing (phase remount before open)', () => {
    const play = vi.fn(() => Promise.resolve());
    const video = { srcObject: null as unknown, play };

    expect(bindStreamToVideo(null, { id: 'x' })).toBe(false);
    expect(bindStreamToVideo(video, null)).toBe(false);
    expect(play).not.toHaveBeenCalled();
    expect(video.srcObject).toBeNull();
  });

  it('does not restart play when the same stream is already bound', () => {
    const stream = { id: 'already-bound' };
    const play = vi.fn(() => Promise.resolve());
    const video = { srcObject: stream as unknown, play };

    expect(bindStreamToVideo(video, stream)).toBe(true);
    expect(play).not.toHaveBeenCalled();
  });
});
