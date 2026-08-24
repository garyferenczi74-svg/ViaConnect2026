// Prompt Brief 2: tests for the screen-space A/B wipe helpers.

import { describe, it, expect } from 'vitest';
import { scanToParamVector } from '@/lib/formavision/geometry/scanToParamVector';
import {
  WIPE_OFF,
  WIPE_KEEP_LEFT,
  WIPE_KEEP_RIGHT,
  clampWipeT,
  shouldRenderAbWipe,
  wipeModeForRole,
  wipePercentFromT,
  wipeTFromPercent,
} from '../abWipe';

const vec = scanToParamVector({ snapshot: null, circumferences: null, sex: 'male' });

describe('clampWipeT', () => {
  it('clamps to 0..1 and substitutes 0.5 for non-finite input', () => {
    expect(clampWipeT(0.25)).toBe(0.25);
    expect(clampWipeT(-2)).toBe(0);
    expect(clampWipeT(4)).toBe(1);
    expect(clampWipeT(Number.NaN)).toBe(0.5);
  });
});

describe('shouldRenderAbWipe', () => {
  it('renders only when enabled AND a baseline vector is present', () => {
    expect(shouldRenderAbWipe(true, vec)).toBe(true);
  });

  it('renders nothing when disabled or the vector is missing (never fabricates)', () => {
    expect(shouldRenderAbWipe(false, vec)).toBe(false);
    expect(shouldRenderAbWipe(undefined, vec)).toBe(false);
    expect(shouldRenderAbWipe(true, null)).toBe(false);
    expect(shouldRenderAbWipe(true, undefined)).toBe(false);
  });
});

describe('wipeModeForRole', () => {
  it('is off for both roles when compare is disabled', () => {
    expect(wipeModeForRole('current', false)).toBe(WIPE_OFF);
    expect(wipeModeForRole('baseline', false)).toBe(WIPE_OFF);
  });

  it('keeps baseline on the left and current on the right', () => {
    expect(wipeModeForRole('baseline', true)).toBe(WIPE_KEEP_LEFT);
    expect(wipeModeForRole('current', true)).toBe(WIPE_KEEP_RIGHT);
  });
});

describe('wipe percent conversion', () => {
  it('round-trips a mid wipe and clamps percent input', () => {
    expect(wipePercentFromT(0.5)).toBe(50);
    expect(wipeTFromPercent(50)).toBe(0.5);
    expect(wipeTFromPercent(250)).toBe(1);
    expect(wipeTFromPercent(Number.NaN)).toBe(0.5);
  });
});
