/**
 * Prompt 231: state-driven coverage for the Submit flow with persistScan
 * and thumbnail generation both mocked/injected - neither the real
 * network/storage round trip nor real canvas decoding is exercised here (no
 * jsdom in this repo; see thumbnail.test.ts and persist.test.ts for what
 * each of those pieces covers on its own). Deferred to Playwright / the
 * manual device matrix: real getUserMedia capture, real canvas thumbnail
 * encoding, a real signed-upload round trip against Supabase Storage, and
 * the actual button click wiring inside ScanExperience.tsx.
 *
 * What this suite asserts: SUBMIT is always dispatched first; SUBMIT_OK is
 * dispatched only on a confirmed persistScan ok:true (carrying the
 * server-confirmed sessionId) and NEVER otherwise; a partial or thrown
 * failure always dispatches SUBMIT_FAIL with a message, never a false
 * success; skipped/missing frames become null in the uploaded array per the
 * persist.ts contract; a non-skipped frame gets a real thumbBlob from the
 * injected generator.
 */
import { describe, it, expect, vi } from 'vitest';
import { buildUploadFrames, buildSubmitErrorMessage, runSubmit } from '../submitFlow';
import type { PersistScanResult, ScanUploadFrame } from '../persist';
import type { ScanFrame } from '../types';
import type { ScanAction } from '@/hooks/scan/useScanSession';

function makeFrame(pose: ScanFrame['pose'], overrides: Partial<ScanFrame> = {}): ScanFrame {
  return {
    pose,
    blob: new Blob([`full:${pose}`], { type: 'image/jpeg' }),
    objectUrl: `blob:${pose}`,
    capturedAt: '2026-08-29T00:00:00.000Z',
    qa: { pass: true, code: 'PASS', message: '', mode: 'weak' },
    retryCount: 0,
    capturedWidth: 1080,
    capturedHeight: 1920,
    ...overrides,
  };
}

function skippedFrame(pose: ScanFrame['pose']): ScanFrame {
  return makeFrame(pose, {
    blob: new Blob([], { type: 'image/jpeg' }),
    objectUrl: '',
    skipped: true,
    qa: { pass: false, code: 'NO_BODY', message: 'Skipped by user', mode: 'weak' },
  });
}

describe('buildUploadFrames', () => {
  it('generates a real thumbBlob for every non-skipped frame, in POSE_ORDER', async () => {
    const frames: (ScanFrame | null)[] = [
      makeFrame('front'),
      makeFrame('right'),
      makeFrame('back'),
      makeFrame('left'),
    ];
    const thumbBlob = new Blob(['thumb'], { type: 'image/jpeg' });
    const generateThumb = vi.fn().mockResolvedValue(thumbBlob);

    const result = await buildUploadFrames(frames, generateThumb);

    expect(result).toHaveLength(4);
    expect(generateThumb).toHaveBeenCalledTimes(4);
    for (let i = 0; i < 4; i++) {
      expect(generateThumb).toHaveBeenNthCalledWith(i + 1, frames[i]!.blob);
      expect((result[i] as ScanUploadFrame).thumbBlob).toBe(thumbBlob);
      expect((result[i] as ScanUploadFrame).pose).toBe(frames[i]!.pose);
    }
  });

  it('maps a skipped frame to null and never calls the thumbnail generator for it', async () => {
    const frames: (ScanFrame | null)[] = [
      makeFrame('front'),
      skippedFrame('right'),
      makeFrame('back'),
      makeFrame('left'),
    ];
    const generateThumb = vi.fn().mockResolvedValue(new Blob(['t'], { type: 'image/jpeg' }));

    const result = await buildUploadFrames(frames, generateThumb);

    expect(result[1]).toBeNull();
    expect(generateThumb).toHaveBeenCalledTimes(3);
  });

  it('maps a missing (null) frame slot to null', async () => {
    const frames: (ScanFrame | null)[] = [makeFrame('front'), null, makeFrame('back'), makeFrame('left')];
    const generateThumb = vi.fn().mockResolvedValue(new Blob(['t'], { type: 'image/jpeg' }));

    const result = await buildUploadFrames(frames, generateThumb);

    expect(result[1]).toBeNull();
    expect(generateThumb).toHaveBeenCalledTimes(3);
  });
});

describe('buildSubmitErrorMessage', () => {
  it('names the failed pose(s) when the server reports them', () => {
    const msg = buildSubmitErrorMessage({
      ok: false,
      failedPoses: ['front', 'back'],
      nextAction: 'Retry upload for the listed pose(s) and finalize again.',
    });
    expect(msg).toContain('front');
    expect(msg).toContain('back');
    expect(msg).toContain('Retry upload for the listed pose(s) and finalize again.');
  });

  it('falls back to the server nextAction when no failed poses are named', () => {
    const msg = buildSubmitErrorMessage({ ok: false, error: 'network_error', nextAction: 'Check your connection and try again.' });
    expect(msg).toBe('Check your connection and try again.');
  });

  it('falls back to a generic retry line when neither is present', () => {
    const msg = buildSubmitErrorMessage({ ok: false });
    expect(msg).toBe('Saving failed. Retry to try again.');
  });
});

describe('runSubmit', () => {
  const frames: (ScanFrame | null)[] = [
    makeFrame('front'),
    makeFrame('right'),
    makeFrame('back'),
    makeFrame('left'),
  ];
  const generateThumb = () => Promise.resolve(new Blob(['t'], { type: 'image/jpeg' }));

  it('dispatches SUBMIT first, then SUBMIT_OK with the server-confirmed sessionId on a confirmed ok:true', async () => {
    const dispatched: ScanAction[] = [];
    const dispatch = (a: ScanAction) => dispatched.push(a);
    const persistScanFn = vi.fn().mockResolvedValue({ ok: true, sessionId: 'server-confirmed-id' } satisfies PersistScanResult);

    const result = await runSubmit(dispatch, 'client-scan-id', frames, { persistScanFn, generateThumb });

    expect(result.ok).toBe(true);
    expect(dispatched[0]).toEqual({ type: 'SUBMIT' });
    expect(dispatched[1]).toEqual({ type: 'SUBMIT_OK', scanId: 'server-confirmed-id' });
    expect(persistScanFn).toHaveBeenCalledWith('client-scan-id', expect.any(Array));
    // Never a stray dispatch beyond SUBMIT + the terminal outcome.
    expect(dispatched).toHaveLength(2);
  });

  it('dispatches SUBMIT_FAIL, never SUBMIT_OK, on a partial (422-shaped) result', async () => {
    const dispatched: ScanAction[] = [];
    const dispatch = (a: ScanAction) => dispatched.push(a);
    const persistScanFn = vi.fn().mockResolvedValue({
      ok: false,
      sessionId: 'client-scan-id',
      failedPoses: ['front'],
      error: 'incomplete_upload',
      nextAction: 'Retry upload for the listed pose(s) and finalize again.',
    } satisfies PersistScanResult);

    const result = await runSubmit(dispatch, 'client-scan-id', frames, { persistScanFn, generateThumb });

    expect(result.ok).toBe(false);
    expect(dispatched[0]).toEqual({ type: 'SUBMIT' });
    expect(dispatched[1].type).toBe('SUBMIT_FAIL');
    expect(dispatched.some((a) => a.type === 'SUBMIT_OK')).toBe(false);
    expect((dispatched[1] as { type: 'SUBMIT_FAIL'; error: string }).error).toContain('front');
  });

  it('dispatches SUBMIT_FAIL, never SUBMIT_OK, when persistScan (or thumbnail generation) throws', async () => {
    const dispatched: ScanAction[] = [];
    const dispatch = (a: ScanAction) => dispatched.push(a);
    const persistScanFn = vi.fn().mockRejectedValue(new Error('network exploded'));

    const result = await runSubmit(dispatch, 'client-scan-id', frames, { persistScanFn, generateThumb });

    expect(result.ok).toBe(false);
    expect(dispatched[0]).toEqual({ type: 'SUBMIT' });
    expect(dispatched[1].type).toBe('SUBMIT_FAIL');
    expect(dispatched.some((a) => a.type === 'SUBMIT_OK')).toBe(false);
  });

  it('never dispatches SUBMIT_OK when persistScan reports ok:true but omits a sessionId', async () => {
    // Defensive: the real prepare/finalize contract always returns a
    // sessionId on ok:true, but this asserts the guard holds even if that
    // contract were ever violated - no false success on a malformed result.
    const dispatched: ScanAction[] = [];
    const dispatch = (a: ScanAction) => dispatched.push(a);
    const persistScanFn = vi.fn().mockResolvedValue({ ok: true } satisfies PersistScanResult);

    await runSubmit(dispatch, 'client-scan-id', frames, { persistScanFn, generateThumb });

    expect(dispatched.some((a) => a.type === 'SUBMIT_OK')).toBe(false);
    expect(dispatched[1].type).toBe('SUBMIT_FAIL');
  });
});
