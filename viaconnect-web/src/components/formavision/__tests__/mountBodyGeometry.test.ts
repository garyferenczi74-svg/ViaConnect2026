// Tests for the geometry-to-material mount wiring (Prompt 210b, task P1-T4).
//
// These prove the MATERIAL MOUNT CONTRACT without a GPU: the mounted geometry is
// non-indexed, carries the barycentric attribute, the material bounds uniforms are
// set from the real mesh extent, and dispose frees everything. A neutral (all
// null) param vector must still produce a body.

import { describe, it, expect } from 'vitest';
import { AdditiveBlending, Vector3 } from 'three';
import { scanToParamVector } from '@/lib/formavision/geometry/scanToParamVector';
import {
  CINEMATIC_BODY_SEGMENTS,
  LITE_BODY_SEGMENTS,
} from '@/lib/formavision/geometry/buildBodyGeometry';
import type { BodyParamVector, Sex } from '@/lib/formavision/geometry/types';
import { mountBodyGeometry } from '../mountBodyGeometry';

function neutralParam(sex: Sex = 'male'): BodyParamVector {
  // scan null + circumferences null -> the sex template fills every ring.
  return scanToParamVector({ snapshot: null, circumferences: null, sex });
}

describe('mountBodyGeometry', () => {
  it('produces a non-indexed geometry (the wireframe contract)', () => {
    const mounted = mountBodyGeometry(neutralParam());
    expect(mounted.geometry.index).toBeNull();
    mounted.dispose();
  });

  it('bakes the barycentric attribute the wireframe shader needs', () => {
    const mounted = mountBodyGeometry(neutralParam());
    const bary = mounted.geometry.getAttribute('aBary');
    const position = mounted.geometry.getAttribute('position');
    expect(bary).toBeTruthy();
    expect(bary.itemSize).toBe(3);
    expect(bary.count).toBe(position.count);
    mounted.dispose();
  });

  it('sets the material bounds uniforms from the real mesh extent', () => {
    const mounted = mountBodyGeometry(neutralParam());
    const min = mounted.materialHandle.uniforms.uBoundsMin.value as Vector3;
    const max = mounted.materialHandle.uniforms.uBoundsMax.value as Vector3;
    // The body spans a real vertical range, so max.y must exceed min.y.
    expect(max.y).toBeGreaterThan(min.y);
    expect(mounted.boundsMax.y).toBeGreaterThan(mounted.boundsMin.y);
    // The uniform carries the same extent as the reported bounds.
    expect(max.y).toBeCloseTo(mounted.boundsMax.y, 5);
    mounted.dispose();
  });

  it('renders a neutral template body when every measurement is UNKNOWN', () => {
    const mounted = mountBodyGeometry(neutralParam('female'));
    // A full template body, not a blank: many vertices and every ring estimated.
    expect(mounted.geometry.getAttribute('position').count).toBeGreaterThan(100);
    expect(mounted.estimatedRingIds.length).toBeGreaterThan(0);
    mounted.dispose();
  });

  it('honors the lite render tier with a lower vertex count than cinematic', () => {
    const cinematic = mountBodyGeometry(neutralParam(), {
      build: CINEMATIC_BODY_SEGMENTS,
    });
    const lite = mountBodyGeometry(neutralParam(), {
      build: LITE_BODY_SEGMENTS,
    });
    expect(lite.geometry.getAttribute('position').count).toBeLessThan(
      cinematic.geometry.getAttribute('position').count,
    );
    cinematic.dispose();
    lite.dispose();
  });

  it('dispose frees the geometry and material without throwing', () => {
    const mounted = mountBodyGeometry(neutralParam());
    expect(() => mounted.dispose()).not.toThrow();
  });

  it('Ready default look is holographic-f3, not additive Picasso or opaque solid', () => {
    const mounted = mountBodyGeometry(neutralParam());
    expect(mounted.materialHandle.material.type).toBe('ShaderMaterial');
    expect(mounted.materialHandle.material.blending).not.toBe(AdditiveBlending);
    expect(mounted.materialHandle.material.wireframe).toBe(false);
    expect(mounted.materialHandle.material.depthWrite).toBe(true);
    expect(mounted.materialHandle.material.userData.formavisionLook).toBe('holographic-f3');
    expect(mounted.materialHandle.uniforms.uLineIntensity.value).toBeGreaterThan(0);
    expect(mounted.materialHandle.uniforms.uFillOpacity.value).toBeGreaterThanOrEqual(0.25);
    expect(mounted.materialHandle.uniforms.uFillOpacity.value).toBeLessThanOrEqual(0.4);
    mounted.dispose();
  });
});
