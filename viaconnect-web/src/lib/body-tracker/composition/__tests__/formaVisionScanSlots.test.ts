import { describe, it, expect } from 'vitest';
import { FORMAVISION_SLOT_ORDER, POSITION_TO_POSE_ID } from '../formaVisionScanSlots';

describe('FormaVision slot order', () => {
  it('is Front → Right → Back → Left', () => {
    expect(FORMAVISION_SLOT_ORDER.map((s) => s.label)).toEqual(['Front', 'Right', 'Back', 'Left']);
    expect(FORMAVISION_SLOT_ORDER.map((s) => s.poseId)).toEqual(['front', 'right', 'back', 'left']);
    expect(FORMAVISION_SLOT_ORDER.map((s) => s.key)).toEqual([
      'front',
      'right_side',
      'back',
      'left_side',
    ]);
  });

  it('keeps 209 API keys mapped to live PoseId values', () => {
    expect(POSITION_TO_POSE_ID.right_side).toBe('right');
    expect(POSITION_TO_POSE_ID.left_side).toBe('left');
  });
});
