import { describe, it, expect } from 'vitest';
import { buildFrameRow, type FrameRowInput } from '@/lib/scan/finalizeFrameRow';

// Prompt 231: unit tests for the pure frame-row builder extracted from
// /api/scan/finalize. These assert the landmarks key is truly ABSENT (not
// null) from the row when SCAN_PERSIST_LANDMARKS is off, and that no
// landmark data can be smuggled onto the row under another key such as qa.

function buildInput(overrides: Partial<FrameRowInput> = {}): FrameRowInput {
  return {
    view: 'front',
    qa: { pass: true, code: 'PASS', message: '', mode: 'weak' },
    capturedWidth: 100,
    capturedHeight: 200,
    skipped: false,
    retryCount: 0,
    capturedAt: '2026-08-28T00:00:00.000Z',
    ...overrides,
  };
}

describe('buildFrameRow', () => {
  it('omits the landmarks key entirely when persistLandmarks is false, even with a landmarks array present', () => {
    const input = buildInput({ landmarks: [{ x: 1, y: 2, z: 3, visibility: 1, presence: 1 }] });
    const row = buildFrameRow(input, false);
    expect(Object.prototype.hasOwnProperty.call(row, 'landmarks')).toBe(false);
    expect(Object.keys(row)).not.toContain('landmarks');
  });

  it('includes landmarks when persistLandmarks is true and the frame carries a landmarks array', () => {
    const landmarks = [{ x: 1, y: 2, z: 3, visibility: 1, presence: 1 }];
    const input = buildInput({ landmarks });
    const row = buildFrameRow(input, true);
    expect(row.landmarks).toEqual(landmarks);
  });

  it('omits landmarks when persistLandmarks is true but the frame carries no landmarks array', () => {
    const input = buildInput();
    const row = buildFrameRow(input, true);
    expect(Object.prototype.hasOwnProperty.call(row, 'landmarks')).toBe(false);
  });

  it('never smuggles landmark data under the qa key: qa keys are a subset of pass/code/message/mode', () => {
    const input = buildInput({
      qa: { pass: false, code: 'NO_BODY', message: 'no body detected', mode: 'landmarker' },
      landmarks: [{ x: 1, y: 2, z: 3, visibility: 1, presence: 1 }],
    });
    const row = buildFrameRow(input, false);
    const allowedQaKeys = new Set(['pass', 'code', 'message', 'mode']);
    for (const key of Object.keys(row.qa)) {
      expect(allowedQaKeys.has(key)).toBe(true);
    }
    expect(Object.prototype.hasOwnProperty.call(row.qa, 'landmarks')).toBe(false);
  });
});
