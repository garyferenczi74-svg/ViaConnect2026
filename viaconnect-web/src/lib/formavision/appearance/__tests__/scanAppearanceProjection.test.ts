import { describe, expect, it } from 'vitest';
import {
  PHOTO_PROJECTION_BLOCKER,
  PHOTO_PROJECTION_NEXT_DEPENDENCY,
  resolveScanAppearanceProjection,
} from '../scanAppearanceProjection';

describe('resolveScanAppearanceProjection', () => {
  it('refuses to invent a photo-conditioned texture', () => {
    const projection = resolveScanAppearanceProjection();
    expect(projection.mode).toBe('procedural');
    expect(projection.photoProjection.available).toBe(false);
    expect(projection.photoProjection.reason).toBe(PHOTO_PROJECTION_BLOCKER);
    expect(projection.photoProjection.requiredInputs).toEqual([
      'front',
      'right',
      'back',
      'left',
    ]);
    expect(projection.photoProjection.nextDependency).toBe(
      PHOTO_PROJECTION_NEXT_DEPENDENCY,
    );
  });
});
