import { describe, it, expect } from 'vitest';
import { framingForRegion, FULL_BODY_FRAMING } from '../regionFraming';

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
  });
});
