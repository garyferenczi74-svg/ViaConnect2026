import { describe, it, expect, vi } from 'vitest';
import {
  analyzeLiveFramesOnFormaVisionSpine,
  convergeLiveScanToFormaVisionSpine,
} from '../convergeLiveScanToFormaVisionSpine';
import type { FormaVisionAnalyzeSpine, PersistScanFn } from '../runFormaVisionAnalyze';
import type { LiveScanFrame } from '../convergeLiveScanToFormaVisionSpine';

const persistScanFn: PersistScanFn = vi.fn().mockResolvedValue({ ok: true, entryId: 'e1' });

const okSpine = (): FormaVisionAnalyzeSpine => ({
  ok: true,
  persistRes: { ok: true, entryId: 'e1' },
  flushCirc: () => undefined,
  circWritePromise: null,
});

const failSpine = (error: string): FormaVisionAnalyzeSpine => ({
  ok: false,
  persistRes: { ok: false, reason: 'analyze_failed' },
  flushCirc: () => undefined,
  circWritePromise: null,
  error,
});

function frame(pose: LiveScanFrame['pose']): LiveScanFrame {
  return { pose, blob: new Blob(['x'], { type: 'image/jpeg' }) };
}

describe('convergeLiveScanToFormaVisionSpine', () => {
  it('does not run the analyzer when session persist failed (231 SUBMIT_OK stays on persist)', async () => {
    const analyzeSpine = vi.fn();
    const framesToPhotos = vi.fn();
    const result = await convergeLiveScanToFormaVisionSpine({
      submitResult: { ok: false, error: 'upload failed' },
      frames: [frame('front')],
      persistScanFn,
      deps: { analyzeSpine, framesToPhotos },
    });
    expect(result.submitOk).toBe(false);
    expect(result.composition).toBeNull();
    expect(result.error).toBe('upload failed');
    expect(analyzeSpine).not.toHaveBeenCalled();
    expect(framesToPhotos).not.toHaveBeenCalled();
  });

  it('after submit ok, maps live frames and calls the shared spine with source live', async () => {
    const photos = { front: { file: new File(['x'], 'front.jpg'), base64: 'abc' } };
    const framesToPhotos = vi.fn().mockResolvedValue(photos);
    const analyzeSpine = vi.fn().mockResolvedValue(okSpine());
    const frames = [frame('front'), null, frame('back'), null];

    const result = await convergeLiveScanToFormaVisionSpine({
      submitResult: { ok: true, sessionId: 'sess-1' },
      frames,
      persistScanFn,
      heightCm: 178,
      deps: { framesToPhotos, analyzeSpine },
    });

    expect(result.submitOk).toBe(true);
    expect(result.sessionId).toBe('sess-1');
    expect(result.composition?.ok).toBe(true);
    expect(result.error).toBeNull();
    expect(framesToPhotos).toHaveBeenCalledWith(frames);
    expect(analyzeSpine).toHaveBeenCalledTimes(1);
    expect(analyzeSpine).toHaveBeenCalledWith(
      expect.objectContaining({
        photos,
        source: 'live',
        persistScanFn,
        heightCm: 178,
        alreadyNormalized: false,
      }),
    );
  });

  it('keeps submitOk true when vision/persistScan fails (does not unwind SUBMIT_OK)', async () => {
    const framesToPhotos = vi.fn().mockResolvedValue({ front: { file: new File(['x'], 'f.jpg'), base64: 'a' } });
    const analyzeSpine = vi.fn().mockResolvedValue(failSpine('vision timed out'));
    const result = await convergeLiveScanToFormaVisionSpine({
      submitResult: { ok: true, sessionId: 'sess-2' },
      frames: [frame('front')],
      persistScanFn,
      deps: { framesToPhotos, analyzeSpine },
    });
    expect(result.submitOk).toBe(true);
    expect(result.sessionId).toBe('sess-2');
    expect(result.composition?.ok).toBe(false);
    expect(result.error).toBe('vision timed out');
  });

  it('retry helper is the same analyzer path (source live)', async () => {
    const photos = { back: { file: new File(['x'], 'back.jpg'), base64: 'xyz' } };
    const framesToPhotos = vi.fn().mockResolvedValue(photos);
    const analyzeSpine = vi.fn().mockResolvedValue(okSpine());
    const frames = [null, null, frame('back'), null];

    const spine = await analyzeLiveFramesOnFormaVisionSpine({
      frames,
      persistScanFn,
      deps: { framesToPhotos, analyzeSpine },
    });

    expect(spine.ok).toBe(true);
    expect(analyzeSpine).toHaveBeenCalledWith(
      expect.objectContaining({ photos, source: 'live', persistScanFn }),
    );
  });
});
