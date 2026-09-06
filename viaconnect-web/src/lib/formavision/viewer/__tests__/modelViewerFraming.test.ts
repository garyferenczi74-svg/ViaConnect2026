import { describe, expect, it } from 'vitest';
import {
  AVATAR_VERTICAL_FOV_DEG,
  FULL_BODY_FRAMING,
} from '@/lib/formavision/motion/regionFraming';
import {
  modelViewerCameraOrbit,
  modelViewerCameraTarget,
  modelViewerFieldOfView,
} from '../modelViewerFraming';

describe('modelViewerFraming', () => {
  it('locks the in-page viewer to the product rear ankle-crop hero', () => {
    expect(modelViewerFieldOfView()).toBe(`${AVATAR_VERTICAL_FOV_DEG}deg`);
    expect(modelViewerCameraTarget()).toBe(`0m ${FULL_BODY_FRAMING.targetY}m 0m`);
    expect(modelViewerCameraOrbit()).toContain(`${FULL_BODY_FRAMING.distance}m`);
    expect(modelViewerCameraOrbit()).toMatch(/^148deg /);
  });
});
