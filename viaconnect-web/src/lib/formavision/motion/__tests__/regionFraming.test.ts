import { describe, it, expect } from 'vitest';
import {
  framingForRegion,
  FULL_BODY_FRAMING,
  FULL_BODY_AZIMUTH_RAD,
  ORBIT_DISTANCE_MIN,
  ORBIT_DISTANCE_MAX,
  AVATAR_VERTICAL_FOV_DEG,
  visibleHeightMeters,
  fullBodyCameraPosition,
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
      expect(f.distance).toBeGreaterThanOrEqual(ORBIT_DISTANCE_MIN);
      expect(f.distance).toBeLessThanOrEqual(ORBIT_DISTANCE_MAX);
    }
    expect(FULL_BODY_FRAMING.distance).toBeGreaterThanOrEqual(ORBIT_DISTANCE_MIN);
    expect(FULL_BODY_FRAMING.distance).toBeLessThanOrEqual(ORBIT_DISTANCE_MAX);
  });

  it('full-body default crops at the ankles (ZOZO hero), not a bust and not empty floor', () => {
    expect(FULL_BODY_FRAMING.distance).toBeGreaterThan(framingForRegion('chest').distance);
    expect(FULL_BODY_FRAMING.distance).toBeLessThan(4);
    expect(FULL_BODY_FRAMING.targetY).toBeGreaterThan(0.85);
    expect(FULL_BODY_FRAMING.targetY).toBeLessThan(1.15);
    expect(FULL_BODY_FRAMING.targetY).toBeLessThan(framingForRegion('chest').targetY);

    const visible = visibleHeightMeters(FULL_BODY_FRAMING.distance, AVATAR_VERTICAL_FOV_DEG);
    // Head-through-ankles on the 1.75m male template — not a chest bust, not floor margin.
    expect(visible).toBeGreaterThan(MALE_TEMPLATE.heightM * 0.95);
    expect(visible).toBeLessThan(MALE_TEMPLATE.heightM * 1.15);

    // The pre-#141 pose (3.2m @ 30°) cannot fit the male template.
    expect(visibleHeightMeters(3.2, AVATAR_VERTICAL_FOV_DEG)).toBeLessThan(MALE_TEMPLATE.heightM);
  });

  it('default hero camera is rear three-quarter, not front +Z', () => {
    expect(FULL_BODY_AZIMUTH_RAD).toBeGreaterThan(Math.PI * 0.5);
    expect(FULL_BODY_AZIMUTH_RAD).toBeLessThan(Math.PI);
    const [x, y, z] = fullBodyCameraPosition();
    expect(y).toBeCloseTo(FULL_BODY_FRAMING.targetY, 5);
    expect(z).toBeLessThan(0);
    expect(x).toBeGreaterThan(0);
    const radius = Math.hypot(x, z);
    expect(radius).toBeCloseTo(FULL_BODY_FRAMING.distance, 5);
  });
});
