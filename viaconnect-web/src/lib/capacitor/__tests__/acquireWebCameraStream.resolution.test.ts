// Prompt 231 FormaVision 4-pose scan: regression + resolution coverage for
// the shared web camera helper. This proves the resolution-aware extension
// stays backward compatible for existing NutriVision callers (no
// width/height) while letting FormaVision request an ideal resolution.

import { describe, it, expect, afterEach, vi } from 'vitest';
import { acquireWebCameraStream, getGrantedResolution } from '../camera-capture';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('acquireWebCameraStream resolution option', () => {
  it('passes ideal width/height into the getUserMedia constraints when provided', async () => {
    const stream = { getTracks: () => [] };
    const getUserMedia = vi.fn(() => Promise.resolve(stream));
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia } });

    const result = await acquireWebCameraStream({
      facingMode: 'environment',
      width: 1920,
      height: 1080,
    });

    expect(result).toBe(stream);
    expect(getUserMedia).toHaveBeenCalledTimes(1);
    expect(getUserMedia.mock.calls[0]?.[0]).toEqual({
      video: {
        facingMode: 'environment',
        width: { ideal: 1920 },
        height: { ideal: 1080 },
      },
    });
  });

  it('REGRESSION: a call with no opts requests only facingMode, identical to pre-resolution behavior', async () => {
    const stream = { getTracks: () => [] };
    const getUserMedia = vi.fn(() => Promise.resolve(stream));
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia } });

    const result = await acquireWebCameraStream();

    expect(result).toBe(stream);
    expect(getUserMedia).toHaveBeenCalledTimes(1);
    expect(getUserMedia.mock.calls[0]?.[0]).toEqual({
      video: { facingMode: 'environment' },
    });
  });

  it('REGRESSION: facingMode-only opts (no width/height) also omit resolution keys entirely', async () => {
    const stream = { getTracks: () => [] };
    const getUserMedia = vi.fn(() => Promise.resolve(stream));
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia } });

    await acquireWebCameraStream({ facingMode: 'user' });

    expect(getUserMedia.mock.calls[0]?.[0]).toEqual({
      video: { facingMode: 'user' },
    });
  });
});

describe('getGrantedResolution', () => {
  it('reads the first video track getSettings() width/height', () => {
    const stream = {
      getTracks: () => [
        { stop: () => {}, kind: 'video', getSettings: () => ({ width: 1920, height: 1080 }) },
      ],
    };

    expect(getGrantedResolution(stream)).toEqual({ width: 1920, height: 1080 });
  });

  it('returns 0/0 when the track has no getSettings', () => {
    const stream = { getTracks: () => [{ stop: () => {}, kind: 'video' }] };

    expect(getGrantedResolution(stream)).toEqual({ width: 0, height: 0 });
  });

  it('returns 0/0 when there are no tracks at all', () => {
    const stream = { getTracks: () => [] };

    expect(getGrantedResolution(stream)).toEqual({ width: 0, height: 0 });
  });

  it('returns 0/0 (never fabricated) when getSettings reports partial data', () => {
    const stream = {
      getTracks: () => [
        { stop: () => {}, kind: 'video', getSettings: () => ({ width: 1280 }) },
      ],
    };

    expect(getGrantedResolution(stream)).toEqual({ width: 1280, height: 0 });
  });
});
