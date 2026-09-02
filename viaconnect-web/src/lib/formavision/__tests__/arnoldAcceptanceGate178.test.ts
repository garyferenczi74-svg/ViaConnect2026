// Brief 58 Phase 1 — FormaVision ZOZO-class mesh bar (ViaConnect plasma teal).
//
// Gary rejected #177 Path B navy silhouette as the product look. Path B stays
// the honesty floor when WebGL dies. Product bar = live canvas + dense emissive
// teal wireframe volume. This gate locks Phase 1 visuals and proves Phase 0
// always-paint / NO-FABRICATION did not regress.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { emptyMeasurements } from '@/lib/body-tracker/circumference';
import {
  BODY_BUILD_BY_TIER,
  CINEMATIC_BODY_SEGMENTS,
  LITE_BODY_SEGMENTS,
  PHASE0_CINEMATIC_BODY_SEGMENTS,
} from '@/lib/formavision/geometry/buildBodyGeometry';
import {
  BODY_WIREFRAME_DEFAULTS,
  PHASE0_WIREFRAME_DEFAULTS,
  makeBodyWireframeMaterial,
} from '@/lib/formavision/materials/bodyWireframeMaterial';
import { FORMA_VISION_HEX } from '@/lib/formavision/materials/formaVisionTokens';
import { buildAvatarMorphStamp } from '@/lib/formavision/morph/avatarMorphStamp';
import {
  FULL_BODY_AZIMUTH_RAD,
  FULL_BODY_FRAMING,
  ORBIT_DISTANCE_MAX,
  ORBIT_DISTANCE_MIN,
  fullBodyCameraPosition,
} from '@/lib/formavision/motion/regionFraming';

const webRoot = process.cwd();

function src(rel: string): string {
  return readFileSync(join(webRoot, rel), 'utf8');
}

const PURPLE_BRAND_HEX = [
  '#6d597a',
  '#a78bfa',
  '#8b5cf6',
  '#7c3aed',
  '#9b59b6',
  '#b388ff',
  '#7b2cbf',
];

describe('Brief 58 Phase 1: cinematic density beats 64×48 cardboard', () => {
  it('cinematic segments are a real jump over Phase 0, lite stays cheaper', () => {
    expect(CINEMATIC_BODY_SEGMENTS.radialSegments).toBeGreaterThan(
      PHASE0_CINEMATIC_BODY_SEGMENTS.radialSegments,
    );
    expect(CINEMATIC_BODY_SEGMENTS.verticalSegments).toBeGreaterThan(
      PHASE0_CINEMATIC_BODY_SEGMENTS.verticalSegments,
    );
    const cinematicCells =
      CINEMATIC_BODY_SEGMENTS.radialSegments * CINEMATIC_BODY_SEGMENTS.verticalSegments;
    const phase0Cells =
      PHASE0_CINEMATIC_BODY_SEGMENTS.radialSegments *
      PHASE0_CINEMATIC_BODY_SEGMENTS.verticalSegments;
    const liteCells = LITE_BODY_SEGMENTS.radialSegments * LITE_BODY_SEGMENTS.verticalSegments;
    expect(cinematicCells).toBeGreaterThanOrEqual(phase0Cells * 2);
    expect(cinematicCells).toBeGreaterThanOrEqual(6890);
    expect(liteCells).toBeLessThan(phase0Cells);
    expect(BODY_BUILD_BY_TIER.cinematic).toEqual(CINEMATIC_BODY_SEGMENTS);
    expect(BODY_BUILD_BY_TIER.lite).toEqual(LITE_BODY_SEGMENTS);
  });

  it('Canvas wires BODY_BUILD_BY_TIER (no leftover 64×48 cinematic literal)', () => {
    const canvas = src('src/components/formavision/FormaVisionCanvas.tsx');
    expect(canvas).toMatch(/BODY_BUILD_BY_TIER/);
    expect(canvas).not.toMatch(/radialSegments:\s*64,\s*verticalSegments:\s*48/);
  });
});

describe('Brief 58 Phase 1: plasma teal wire, never ZOZO purple', () => {
  it('shader uniforms stay #2DA5A0 family and hotter / glassier than Phase 0', () => {
    expect(FORMA_VISION_HEX.teal).toBe('#2DA5A0');
    const m = makeBodyWireframeMaterial();
    expect(m.uniforms.uTeal.value.getHexString()).toBe(
      new THREE.Color(FORMA_VISION_HEX.teal).getHexString(),
    );
    expect(m.uniforms.uLineIntensity.value).toBeGreaterThan(
      PHASE0_WIREFRAME_DEFAULTS.lineIntensity,
    );
    expect(m.uniforms.uRimIntensity.value).toBeGreaterThan(PHASE0_WIREFRAME_DEFAULTS.rimIntensity);
    expect(m.uniforms.uFillOpacity.value).toBeLessThan(PHASE0_WIREFRAME_DEFAULTS.fillOpacity);
    expect(m.uniforms.uEdgeWidth.value).toBeLessThan(PHASE0_WIREFRAME_DEFAULTS.edgeWidth);
    expect(m.uniforms.uFillOpacity.value).toBe(BODY_WIREFRAME_DEFAULTS.fillOpacity);
    expect(m.material.blending).toBe(THREE.AdditiveBlending);
    expect(m.material.fragmentShader).toContain('uEdgeWidth');
    m.dispose();
  });

  it('FormaVision 3D path source does not introduce purple brand hex', () => {
    const files = [
      'src/lib/formavision/materials/formaVisionTokens.ts',
      'src/lib/formavision/materials/bodyWireframeMaterial.ts',
      'src/components/formavision/FormaVisionCanvas.tsx',
    ];
    for (const file of files) {
      const text = src(file).toLowerCase();
      for (const hex of PURPLE_BRAND_HEX) {
        expect(text).not.toContain(hex);
      }
    }
  });
});

describe('Brief 58 Phase 1: rear ¾ ankle-crop camera, orbit clamps held', () => {
  it('hero camera is behind-right and framing stays inside orbit clamps', () => {
    const [x, , z] = fullBodyCameraPosition();
    expect(FULL_BODY_AZIMUTH_RAD).toBeGreaterThan(Math.PI / 2);
    expect(z).toBeLessThan(0);
    expect(x).toBeGreaterThan(0);
    expect(FULL_BODY_FRAMING.distance).toBeGreaterThanOrEqual(ORBIT_DISTANCE_MIN);
    expect(FULL_BODY_FRAMING.distance).toBeLessThanOrEqual(ORBIT_DISTANCE_MAX);
    const canvas = src('src/components/formavision/FormaVisionCanvas.tsx');
    expect(canvas).toMatch(/fullBodyCameraPosition/);
    expect(canvas).toMatch(/ORBIT_DISTANCE_MIN/);
    expect(canvas).toMatch(/ORBIT_DISTANCE_MAX/);
    expect(canvas).toMatch(/circleGeometry/);
  });
});

describe('Brief 58 Phase 1: #177 always-paint + NO-FABRICATION still hold', () => {
  it('Canvas still recovers context-loss and never abandons the local floor', () => {
    const canvas = src('src/components/formavision/FormaVisionCanvas.tsx');
    const avatar = src('src/components/formavision/BodyCompositionAvatar.tsx');
    const page = src('src/app/(app)/(consumer)/body-tracker/formavision/page.tsx');
    expect(canvas).toMatch(/attachWebGLContextRecovery/);
    expect(canvas).toMatch(/scheduleZeroSizeHonestyCheck/);
    expect(avatar).toMatch(/FormaVisionLocalSilhouette|formavision-recovering-floor/);
    expect(avatar).toMatch(/shouldPaintPlateFloor/);
    expect(page).toMatch(/FormaVisionLocalSilhouette/);
    expect(page).toMatch(/formavision-plate-floor/);
    expect(page).toMatch(/bg-\[#1A2744\]/);
    expect(page).not.toMatch(/Male%20Avatar/);
    expect(page).not.toMatch(/data-testid="formavision-canvas-grid"[\s\S]*?bg-transparent/);
  });

  it('missing circs stay template; no invented waist', () => {
    const stamp = buildAvatarMorphStamp({
      scan: {
        entryId: 'ready-33',
        source: 'scan',
        recordedAt: '2026-09-02T00:00:00.000Z',
        totalBodyFatPct: 33,
        regionFatPct: {
          right_arm: null,
          left_arm: null,
          trunk: null,
          right_leg: null,
          left_leg: null,
        },
        visceralFatRating: null,
        bodyWaterPct: null,
        regionMuscleLbs: {
          right_arm: null,
          left_arm: null,
          trunk: null,
          right_leg: null,
          left_leg: null,
        },
        totalMuscleMassLbs: null,
        skeletalMuscleMassLbs: null,
        scanId: 'scan-33',
        estimatedBodyFatMin: 30,
        estimatedBodyFatMax: 36,
        isEstimated: true,
      },
      circumferences: emptyMeasurements(),
      sex: 'male',
      unit: 'in',
    });
    expect(stamp.morph).toBe('template');
    expect(stamp.waistM).toBe('');
    expect(stamp.bf).toBe('33.0');
  });
});
