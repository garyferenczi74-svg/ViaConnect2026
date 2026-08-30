// Prompt 231 FormaVision 4-pose scan: useScanSession reducer transition tests.
// Covers every transition in spec Section 7 (task-5-brief.md Step 1 list).

import { describe, it, expect } from 'vitest';
import { scanReducer, initialScanState } from '../useScanSession';
import type { ScanFrame } from '@/lib/scan/types';

function makeFrame(pose: ScanFrame['pose'], overrides: Partial<ScanFrame> = {}): ScanFrame {
  return {
    pose,
    blob: new Blob(['x'], { type: 'image/jpeg' }),
    objectUrl: 'blob:test-url',
    capturedAt: '2026-08-28T00:00:00.000Z',
    qa: { pass: true, code: 'PASS', message: 'ok', mode: 'landmarker' },
    retryCount: 0,
    capturedWidth: 100,
    capturedHeight: 200,
    ...overrides,
  };
}

describe('useScanSession reducer', () => {
  it('starts in SETUP with a blank session', () => {
    const s = initialScanState();
    expect(s.phase).toBe('SETUP');
    expect(s.poseIndex).toBe(0);
    expect(s.count).toBe(0);
    expect(s.retryCount).toBe(0);
    expect(s.retakeMode).toBe(false);
    expect(s.frames).toEqual([null, null, null, null]);
    expect(s.scanId).toBeUndefined();
    expect(s.error).toBeUndefined();
  });

  it('START moves SETUP to WALK_IN', () => {
    const s = scanReducer(initialScanState(), { type: 'START' });
    expect(s.phase).toBe('WALK_IN');
  });

  it('WALK_IN_DONE moves WALK_IN to PROMPT with poseIndex unchanged', () => {
    let s = initialScanState();
    s = scanReducer(s, { type: 'START' });
    s = scanReducer(s, { type: 'WALK_IN_DONE' });
    expect(s.phase).toBe('PROMPT');
    expect(s.poseIndex).toBe(0);
  });

  it('PROMPT_DONE moves PROMPT to ARMED', () => {
    let s = initialScanState();
    s = scanReducer(s, { type: 'START' });
    s = scanReducer(s, { type: 'WALK_IN_DONE' });
    s = scanReducer(s, { type: 'PROMPT_DONE' });
    expect(s.phase).toBe('ARMED');
  });

  it('PRECHECK_PASS moves ARMED to COUNT with count 5', () => {
    let s = initialScanState();
    s = scanReducer(s, { type: 'START' });
    s = scanReducer(s, { type: 'WALK_IN_DONE' });
    s = scanReducer(s, { type: 'PROMPT_DONE' });
    s = scanReducer(s, { type: 'PRECHECK_PASS' });
    expect(s.phase).toBe('COUNT');
    expect(s.count).toBe(5);
  });

  // Prompt 231: COUNT_SET tracks the displayed digit off real elapsed
  // seconds; it never drives the phase, no matter how it is called.
  it('COUNT_SET sets count to the given display while phase is COUNT', () => {
    let s = initialScanState();
    s = scanReducer(s, { type: 'START' });
    s = scanReducer(s, { type: 'WALK_IN_DONE' });
    s = scanReducer(s, { type: 'PROMPT_DONE' });
    s = scanReducer(s, { type: 'PRECHECK_PASS' });

    s = scanReducer(s, { type: 'COUNT_SET', display: 4 });
    expect(s.phase).toBe('COUNT');
    expect(s.count).toBe(4);

    s = scanReducer(s, { type: 'COUNT_SET', display: 2 });
    expect(s.count).toBe(2);
  });

  it('COUNT_SET is ignored outside phase COUNT', () => {
    const s = scanReducer(initialScanState(), { type: 'COUNT_SET', display: 3 });
    expect(s.phase).toBe('SETUP');
    expect(s.count).toBe(0);
  });

  it('COUNT_SET is idempotent and clamps to 0..5', () => {
    let s: ReturnType<typeof scanReducer> = { ...initialScanState(), phase: 'COUNT', count: 5 };
    s = scanReducer(s, { type: 'COUNT_SET', display: 5 });
    expect(s.count).toBe(5);
    s = scanReducer(s, { type: 'COUNT_SET', display: 5 }); // repeat, same value
    expect(s.count).toBe(5);
    s = scanReducer(s, { type: 'COUNT_SET', display: 9 }); // out of range, clamp high
    expect(s.count).toBe(5);
    s = scanReducer(s, { type: 'COUNT_SET', display: -1 }); // out of range, clamp low
    expect(s.count).toBe(0);
  });

  it('COUNT_DONE transitions COUNT to CAPTURE with count 0', () => {
    let s: ReturnType<typeof scanReducer> = { ...initialScanState(), phase: 'COUNT', count: 1 };
    s = scanReducer(s, { type: 'COUNT_DONE' });
    expect(s.phase).toBe('CAPTURE');
    expect(s.count).toBe(0);
  });

  // Regression guard for the instant-weak-mode-capture bug: no volume of
  // COUNT_SET calls, in any order, can ever reach CAPTURE. Only COUNT_DONE
  // (the real onComplete, fired once at 5 elapsed seconds) can.
  it('repeated COUNT_SET, however many or in whatever order, never reaches CAPTURE; only COUNT_DONE does', () => {
    let s: ReturnType<typeof scanReducer> = { ...initialScanState(), phase: 'COUNT', count: 5 };
    const displays = [5, 4, 4, 3, 2, 2, 2, 1, 1, 5, 3, 1, 0, 0, 1];
    for (const display of displays) {
      s = scanReducer(s, { type: 'COUNT_SET', display });
      expect(s.phase).toBe('COUNT');
    }
    expect(s.phase).toBe('COUNT');

    s = scanReducer(s, { type: 'COUNT_DONE' });
    expect(s.phase).toBe('CAPTURE');
    expect(s.count).toBe(0);
  });

  it('CAPTURED moves CAPTURE to QA and stores the frame provisionally', () => {
    let s = initialScanState();
    s = scanReducer(s, { type: 'START' });
    s = scanReducer(s, { type: 'WALK_IN_DONE' });
    s = scanReducer(s, { type: 'PROMPT_DONE' });
    s = scanReducer(s, { type: 'PRECHECK_PASS' });
    s = scanReducer(s, { type: 'COUNT_DONE' });
    expect(s.phase).toBe('CAPTURE');

    const frame = makeFrame('front');
    s = scanReducer(s, { type: 'CAPTURED', frame });
    expect(s.phase).toBe('QA');
    expect(s.frames[0]).toBe(frame);
  });

  function toQaAtPose(poseIndex: number, state = initialScanState()) {
    let s = state;
    if (s.phase === 'SETUP') s = scanReducer(s, { type: 'START' });
    s = scanReducer(s, { type: 'WALK_IN_DONE' });
    s = scanReducer(s, { type: 'PROMPT_DONE' });
    s = scanReducer(s, { type: 'PRECHECK_PASS' });
    s = scanReducer(s, { type: 'COUNT_DONE' });
    const frame = makeFrame(['front', 'right', 'back', 'left'][poseIndex] as ScanFrame['pose']);
    s = scanReducer(s, { type: 'CAPTURED', frame });
    return s;
  }

  it('QA_PASS advances poseIndex, resets retryCount, and clears error', () => {
    let s = toQaAtPose(0);
    s = { ...s, error: 'stale error' };
    s = scanReducer(s, { type: 'QA_PASS' });
    expect(s.phase).toBe('PROMPT');
    expect(s.poseIndex).toBe(1);
    expect(s.retryCount).toBe(0);
    expect(s.error).toBeUndefined();
  });

  it('QA_FAIL discards the frame, re-arms to PROMPT, and increments retryCount', () => {
    let s = toQaAtPose(0);
    s = scanReducer(s, { type: 'QA_FAIL', code: 'BLURRY' });
    expect(s.phase).toBe('PROMPT');
    expect(s.poseIndex).toBe(0);
    expect(s.retryCount).toBe(1);
    expect(s.frames[0]).toBeNull();
  });

  it('a third QA_FAIL moves to CHOICE', () => {
    let s = toQaAtPose(0);
    s = scanReducer(s, { type: 'QA_FAIL', code: 'BLURRY' }); // retryCount 1, back to PROMPT
    s = scanReducer(s, { type: 'PROMPT_DONE' });
    s = scanReducer(s, { type: 'PRECHECK_PASS' });
    s = scanReducer(s, { type: 'COUNT_DONE' });
    s = scanReducer(s, { type: 'CAPTURED', frame: makeFrame('front') });
    s = scanReducer(s, { type: 'QA_FAIL', code: 'BLURRY' }); // retryCount 2, back to PROMPT
    s = scanReducer(s, { type: 'PROMPT_DONE' });
    s = scanReducer(s, { type: 'PRECHECK_PASS' });
    s = scanReducer(s, { type: 'COUNT_DONE' });
    s = scanReducer(s, { type: 'CAPTURED', frame: makeFrame('front') });
    s = scanReducer(s, { type: 'QA_FAIL', code: 'BLURRY' }); // retryCount 3 -> CHOICE
    expect(s.phase).toBe('CHOICE');
    expect(s.retryCount).toBe(3);
  });

  it('CHOOSE_RETRY resets retryCount to 0 and returns to PROMPT', () => {
    let s: ReturnType<typeof scanReducer> = { ...initialScanState(), phase: 'CHOICE', retryCount: 3 };
    s = scanReducer(s, { type: 'CHOOSE_RETRY' });
    expect(s.phase).toBe('PROMPT');
    expect(s.retryCount).toBe(0);
  });

  it('CHOOSE_SKIP marks the frame skipped and advances to the next pose', () => {
    let s: ReturnType<typeof scanReducer> = { ...initialScanState(), phase: 'CHOICE', retryCount: 3, poseIndex: 0 };
    s = scanReducer(s, { type: 'CHOOSE_SKIP' });
    expect(s.frames[0]).not.toBeNull();
    expect(s.frames[0]?.skipped).toBe(true);
    expect(s.frames[0]?.pose).toBe('front');
    expect(s.phase).toBe('PROMPT');
    expect(s.poseIndex).toBe(1);
    expect(s.retryCount).toBe(0);
  });

  it('CHOOSE_SKIP on the last pose goes to REVIEW instead of advancing poseIndex', () => {
    let s: ReturnType<typeof scanReducer> = { ...initialScanState(), phase: 'CHOICE', retryCount: 3, poseIndex: 3 };
    s = scanReducer(s, { type: 'CHOOSE_SKIP' });
    expect(s.frames[3]?.skipped).toBe(true);
    expect(s.phase).toBe('REVIEW');
    expect(s.poseIndex).toBe(3);
  });

  it('PRECHECK_FAIL during COUNT resets to ARMED with count 5 and Hold still.', () => {
    let s = initialScanState();
    s = scanReducer(s, { type: 'START' });
    s = scanReducer(s, { type: 'WALK_IN_DONE' });
    s = scanReducer(s, { type: 'PROMPT_DONE' });
    s = scanReducer(s, { type: 'PRECHECK_PASS' });
    s = scanReducer(s, { type: 'COUNT_SET', display: 4 }); // 5 -> 4
    s = scanReducer(s, { type: 'PRECHECK_FAIL' });
    expect(s.phase).toBe('ARMED');
    expect(s.count).toBe(5);
    expect(s.error).toBe('Hold still.');
  });

  it('QA_PASS on poseIndex 3 goes to REVIEW', () => {
    let s = toQaAtPose(3, { ...initialScanState(), poseIndex: 3 });
    s = scanReducer(s, { type: 'QA_PASS' });
    expect(s.phase).toBe('REVIEW');
    expect(s.poseIndex).toBe(3);
    expect(s.retakeMode).toBe(false);
  });

  it('RETAKE from REVIEW reruns WALK_IN then returns to REVIEW once that pose passes QA', () => {
    let s: ReturnType<typeof scanReducer> = { ...initialScanState(), phase: 'REVIEW', poseIndex: 3, retryCount: 0 };
    s = scanReducer(s, { type: 'RETAKE', poseIndex: 1 });
    expect(s.phase).toBe('WALK_IN');
    expect(s.poseIndex).toBe(1);
    expect(s.retakeMode).toBe(true);

    s = scanReducer(s, { type: 'WALK_IN_DONE' });
    expect(s.phase).toBe('PROMPT');
    s = scanReducer(s, { type: 'PROMPT_DONE' });
    s = scanReducer(s, { type: 'PRECHECK_PASS' });
    s = scanReducer(s, { type: 'COUNT_DONE' });
    s = scanReducer(s, { type: 'CAPTURED', frame: makeFrame('right') });
    s = scanReducer(s, { type: 'QA_PASS' });

    expect(s.phase).toBe('REVIEW');
    expect(s.retakeMode).toBe(false);
    expect(s.poseIndex).toBe(1);
  });

  it('SUBMIT moves REVIEW to UPLOADING', () => {
    const s = scanReducer({ ...initialScanState(), phase: 'REVIEW' }, { type: 'SUBMIT' });
    expect(s.phase).toBe('UPLOADING');
  });

  it('SUBMIT_OK moves UPLOADING to DONE with the scanId', () => {
    const s = scanReducer({ ...initialScanState(), phase: 'UPLOADING' }, { type: 'SUBMIT_OK', scanId: 'scan-123' });
    expect(s.phase).toBe('DONE');
    expect(s.scanId).toBe('scan-123');
  });

  it('SUBMIT_FAIL moves UPLOADING back to REVIEW with the error', () => {
    const s = scanReducer({ ...initialScanState(), phase: 'UPLOADING' }, { type: 'SUBMIT_FAIL', error: 'Upload failed.' });
    expect(s.phase).toBe('REVIEW');
    expect(s.error).toBe('Upload failed.');
  });

  it('DISCARD from REVIEW returns to a blank SETUP session', () => {
    const s = scanReducer(
      { ...initialScanState(), phase: 'REVIEW', poseIndex: 3, frames: [makeFrame('front'), null, null, null] },
      { type: 'DISCARD' }
    );
    expect(s.phase).toBe('SETUP');
    expect(s.poseIndex).toBe(0);
    expect(s.frames).toEqual([null, null, null, null]);
  });

  it('CAMERA_LOST then RESET returns to SETUP with the disconnect message', () => {
    let s = initialScanState();
    s = scanReducer(s, { type: 'START' });
    s = scanReducer(s, { type: 'WALK_IN_DONE' });
    s = scanReducer(s, { type: 'PROMPT_DONE' });
    s = scanReducer(s, { type: 'CAMERA_LOST' });
    expect(s.phase).toBe('CAMERA_LOST');

    s = scanReducer(s, { type: 'RESET' });
    expect(s.phase).toBe('SETUP');
    expect(s.error).toBe('Camera disconnected. Tap Start scan to try again.');
  });

  it('CAMERA_LOST interrupts any phase, including mid-count', () => {
    let s = initialScanState();
    s = scanReducer(s, { type: 'START' });
    s = scanReducer(s, { type: 'WALK_IN_DONE' });
    s = scanReducer(s, { type: 'PROMPT_DONE' });
    s = scanReducer(s, { type: 'PRECHECK_PASS' });
    s = scanReducer(s, { type: 'CAMERA_LOST' });
    expect(s.phase).toBe('CAMERA_LOST');
  });
});
