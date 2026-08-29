import { describe, it, expect } from 'vitest';
import {
  framingForRegion,
  FULL_BODY_FRAMING,
  AVATAR_VERTICAL_FOV_DEG,
  visibleHeightMeters,
} from '../regionFraming';
import { MALE_TEMPLATE } from '../../geometry/types';

describe('framingForRegion', () => {
  it('returns a closer framing at the region height for a known region', () => {
    const chest = framingForRegion('chest');
    expect(chest.targetY).toBeGreaterThan(0);
    expect(chest.distance).toBeLessThan(FULL_BODY_FRAMING.distance);
  });

  it('places higher regions above lower regions along the body', () => {
    expect(framingForRegion('neck').targetY).toBeGreaterThan(
      framingForRegion('chest').targetY,
    );
    expect(framingForRegion('chest').targetY).toBeGreaterThan(
      framingForRegion('thigh').targetY,
    );
    expect(framingForRegion('thigh').targetY).toBeGreaterThan(
      framingForRegion('calf').targetY,
    );
  });

  it('matches side-prefixed keys onto the canonical region (rThigh -> thigh)', () => {
    expect(framingForRegion('rThigh')).toEqual(framingForRegion('thigh'));
    expect(framingForRegion('lCalf')).toEqual(framingForRegion('calf'));
  });

  it('is case insensitive', () => {
    expect(framingForRegion('CHEST')).toEqual(framingForRegion('chest'));
  });

  it('returns the full-body default for null', () => {
    expect(framingForRegion(null)).toEqual(FULL_BODY_FRAMING);
  });

  it('returns the full-body default for an unknown region (no crash)', () => {
    expect(framingForRegion('elbowpit')).toEqual(FULL_BODY_FRAMING);
  });

  it('keeps every framing distance inside a sane orbit clamp (2.2 to 4.5)', () => {
    for (const region of ['neck', 'chest', 'waist', 'hip', 'thigh', 'calf', 'arm', 'ankle']) {
      const f = framingForRegion(region);
      expect(f.distance).toBeGreaterThanOrEqual(2.2);
      expect(f.distance).toBeLessThanOrEqual(4.5);
    }
    expect(FULL_BODY_FRAMING.distance).toBeGreaterThanOrEqual(2.2);
    expect(FULL_BODY_FRAMING.distance).toBeLessThanOrEqual(4.5);
  });

  it('full-body default is pulled back so a 1.75m mesh cannot crop to a bust', () => {
    expect(FULL_BODY_FRAMING.distance).toBeGreaterThanOrEqual(4);
    expect(FULL_BODY_FRAMING.targetY).toBeGreaterThan(0.7);
    expect(FULL_BODY_FRAMING.targetY).toBeLessThan(1.1);
    expect(FULL_BODY_FRAMING.targetY).toBeLessThan(framingForRegion('chest').targetY);
    expect(FULL_BODY_FRAMING.distance).toBeGreaterThan(framingForRegion('chest').distance + 1);

    const visible = visibleHeightMeters(FULL_BODY_FRAMING.distance, AVATAR_VERTICAL_FOV_DEG);
    expect(visible).toBeGreaterThan(MALE_TEMPLATE.heightM * 1.2);

    // The pre-#141 pose (3.2m @ 30°) cannot fit the male template.
    expect(visibleHeightMeters(3.2, AVATAR_VERTICAL_FOV_DEG)).toBeLessThan(MALE_TEMPLATE.heightM);
  });
});
