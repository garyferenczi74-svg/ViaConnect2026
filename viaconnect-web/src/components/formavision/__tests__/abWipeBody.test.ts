// Tests for the pure A/B wipe body seam (Brief 2).

import { describe, it, expect } from 'vitest';
import { scanToParamVector } from '@/lib/formavision/geometry/scanToParamVector';
import type { Sex } from '@/lib/formavision/geometry/types';
import { mountBodyGeometry } from '../mountBodyGeometry';
import { mountAbWipeBody, shouldRenderAbWipe } from '../abWipeBody';

function neutralParam(sex: Sex = 'male') {
  return scanToParamVector({ snapshot: null, circumferences: null, sex });
}

describe('shouldRenderAbWipe (re-exported gate)', () => {
  it('is off until enabled with a real vector', () => {
    const vec = neutralParam();
    expect(shouldRenderAbWipe(true, vec)).toBe(true);
    expect(shouldRenderAbWipe(false, vec)).toBe(false);
    expect(shouldRenderAbWipe(true, null)).toBe(false);
  });
});

describe('mountAbWipeBody', () => {
  it('builds the SAME topology as the current body for the same vector', () => {
    const vec = neutralParam('female');
    const build = { radialSegments: 28, verticalSegments: 28 };
    const body = mountBodyGeometry(vec, { build });
    const wipe = mountAbWipeBody(vec, build);
    expect(wipe.geometry.getAttribute('position').count).toBe(
      body.geometry.getAttribute('position').count,
    );
    expect(wipe.geometry.index).toBeNull();
    body.dispose();
    wipe.dispose();
  });

  it('starts with wipe uniforms off (no discard until the scene enables it)', () => {
    const wipe = mountAbWipeBody(neutralParam());
    expect(wipe.materialHandle.uniforms.uWipeMode.value).toBe(0);
    wipe.dispose();
  });

  it('disposes geometry and material with no leak', () => {
    const wipe = mountAbWipeBody(neutralParam());
    let geometryDisposed = false;
    let materialDisposed = false;
    wipe.geometry.addEventListener('dispose', () => {
      geometryDisposed = true;
    });
    wipe.materialHandle.material.addEventListener('dispose', () => {
      materialDisposed = true;
    });
    expect(() => wipe.dispose()).not.toThrow();
    expect(geometryDisposed).toBe(true);
    expect(materialDisposed).toBe(true);
  });
});
