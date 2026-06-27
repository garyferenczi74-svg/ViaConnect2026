import { describe, it, expect } from 'vitest';
import {
  calloutAnchors,
  calloutAnchorFor,
  labelSideFor,
} from '../measurementCallouts';
import { ringLoopForRegion } from '@/lib/formavision/geometry/ringLoopForRegion';
import { MEASUREMENT_KEYS } from '@/lib/body-tracker/circumference';
import type { BodyParamVector } from '@/lib/formavision/geometry/types';

const PARAM: BodyParamVector = {
  sex: 'male',
  heightM: 1.8,
  rings: [
    { id: 'neck', levelN: 0.87, circumferenceM: 0.38, aspectRatio: 0.9, estimated: false },
    { id: 'chest', levelN: 0.72, circumferenceM: 1.0, aspectRatio: 0.72, estimated: false },
    { id: 'waist', levelN: 0.62, circumferenceM: 0.85, aspectRatio: 0.78, estimated: false },
    { id: 'hip', levelN: 0.52, circumferenceM: 0.98, aspectRatio: 0.74, estimated: false },
    { id: 'rThigh', levelN: 0.45, circumferenceM: 0.56, aspectRatio: 0.92, estimated: false },
    { id: 'lThigh', levelN: 0.45, circumferenceM: 0.56, aspectRatio: 0.92, estimated: false },
    { id: 'rCalf', levelN: 0.22, circumferenceM: 0.37, aspectRatio: 0.9, estimated: false },
    { id: 'lCalf', levelN: 0.22, circumferenceM: 0.37, aspectRatio: 0.9, estimated: false },
  ],
  arms: [
    { side: 'r', bicepM: 0.32, forearmM: 0.27, estimated: false },
    { side: 'l', bicepM: 0.32, forearmM: 0.27, estimated: false },
  ],
};

describe('calloutAnchors', () => {
  it('produces exactly one callout per MEASUREMENT_KEYS entry (drift-proof)', () => {
    const anchors = calloutAnchors(PARAM);
    expect(anchors).toHaveLength(MEASUREMENT_KEYS.length);
    expect(anchors.map((a) => a.key)).toEqual([...MEASUREMENT_KEYS]);
  });

  it('anchors a ring-backed region at the SAME level as ringLoopForRegion', () => {
    const chest = calloutAnchorFor(PARAM, 'chest');
    expect(chest.y).toBeCloseTo(ringLoopForRegion(PARAM, 'chest').y, 6);
    const rCalf = calloutAnchorFor(PARAM, 'rightCalf');
    expect(rCalf.y).toBeCloseTo(ringLoopForRegion(PARAM, 'rCalf').y, 6);
  });

  it('places left regions on the negative x side and right on the positive x side', () => {
    expect(calloutAnchorFor(PARAM, 'rightQuadriceps').x).toBeGreaterThan(0);
    expect(calloutAnchorFor(PARAM, 'leftQuadriceps').x).toBeLessThan(0);
    expect(calloutAnchorFor(PARAM, 'rightBicep').x).toBeGreaterThan(0);
    expect(calloutAnchorFor(PARAM, 'leftBicep').x).toBeLessThan(0);
  });

  it('places center regions on the body axis (x = 0)', () => {
    expect(calloutAnchorFor(PARAM, 'chest').x).toBe(0);
    expect(calloutAnchorFor(PARAM, 'neck').x).toBe(0);
  });

  it('includes shoulderWidth as a neutral center callout (documented choice)', () => {
    const sw = calloutAnchors(PARAM).find((a) => a.key === 'shoulderWidth');
    expect(sw).toBeDefined();
    expect(sw?.side).toBe('center');
  });

  it('is deterministic', () => {
    expect(calloutAnchors(PARAM)).toEqual(calloutAnchors(PARAM));
  });
});

describe('labelSideFor', () => {
  it('sends right regions right and left or center regions left', () => {
    expect(labelSideFor('right')).toBe('right');
    expect(labelSideFor('left')).toBe('left');
    expect(labelSideFor('center')).toBe('left');
  });
});
