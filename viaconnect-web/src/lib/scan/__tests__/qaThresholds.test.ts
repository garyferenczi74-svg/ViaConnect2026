import { describe, it, expect } from 'vitest';
import * as T from '../qaThresholds';
describe('qa thresholds', () => {
  it('define the calibration surface as sane ranges', () => {
    expect(T.VISIBILITY_MIN).toBeGreaterThan(0);
    expect(T.BODY_HEIGHT_MIN).toBeLessThan(T.BODY_HEIGHT_MAX);
    expect(T.HIP_CENTER_MIN).toBeLessThan(T.HIP_CENTER_MAX);
    expect(T.FRONT_SHOULDER_WIDTH_MIN).toBeGreaterThan(T.SIDE_SHOULDER_WIDTH_MAX);
    expect(T.BLUR_VARIANCE_MIN).toBeGreaterThan(0);
  });
});
