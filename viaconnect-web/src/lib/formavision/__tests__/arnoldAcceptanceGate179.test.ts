// Brief 59 honesty amend — Ready scan is 3D morph, not Picasso stock person.
//
// Designed anatomical 2D is loading / hard-failure only. Never-empty plate
// (#179) stays. Brief 58 / #178 Phase 1 mesh bar unchanged. No SVG→mesh.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { emptyMeasurements } from '@/lib/body-tracker/circumference';
import { BodyCompositionAvatar } from '@/components/formavision/BodyCompositionAvatar';
import { FormaVisionAnatomicalFloor } from '@/components/formavision/FormaVisionAnatomicalFloor';
import { FORMAVISION_MOTION_SPEC } from '@/lib/formavision/motion/floorMotionSpec';
import { GENERIC_WEBGL_UNAVAILABLE_DETAIL } from '@/lib/formavision/tier/fallbackNoticeCopy';
import { FORMAVISION_FLOOR_LOADING_COPY } from '@/lib/formavision/tier/floorRoleCopy';
import { FORMA_VISION_HEX } from '@/lib/formavision/materials/formaVisionTokens';
import {
  BODY_BUILD_BY_TIER,
  CINEMATIC_BODY_SEGMENTS,
  PHASE0_CINEMATIC_BODY_SEGMENTS,
} from '@/lib/formavision/geometry/buildBodyGeometry';
import {
  BODY_WIREFRAME_DEFAULTS,
  PHASE0_WIREFRAME_DEFAULTS,
} from '@/lib/formavision/materials/bodyWireframeMaterial';

const webRoot = process.cwd();

function src(rel: string): string {
  return readFileSync(join(webRoot, rel), 'utf8');
}

const PRODUCT_FLOOR_FILES = [
  'src/components/formavision/FormaVisionAnatomicalFloor.tsx',
  'src/components/formavision/BodyCompositionAvatar.tsx',
  'src/components/formavision/FormaVision3DAvatar.tsx',
  'src/app/(app)/(consumer)/body-tracker/formavision/page.tsx',
] as const;

const PURPLE_BRAND_HEX = [
  '#6d597a',
  '#a78bfa',
  '#8b5cf6',
  '#7c3aed',
  '#9b59b6',
  '#b388ff',
  '#7b2cbf',
];

describe('Brief 59 honesty amend: product floor is designed 2D, not Picasso', () => {
  it('requires the labeled anatomical floor on SSR / pending / recovering', () => {
    const markup = renderToStaticMarkup(
      React.createElement(BodyCompositionAvatar, {
        sex: 'male',
        scan: null,
        circumferences: null,
        unit: 'in',
        activeTab: 'bodyFat',
        children: React.createElement(FormaVisionAnatomicalFloor, {
          sex: 'male',
          floorRole: 'unavailable',
        }),
      }),
    );
    expect(markup).toContain('formavision-anatomical-floor');
    expect(markup).toContain('data-floor="anatomical-2d"');
    expect(markup).toContain('data-floor-role="loading"');
    expect(markup).toContain(FORMAVISION_FLOOR_LOADING_COPY);
    expect(markup).toContain('formavision-recovering-floor');
    expect(markup).toContain('formavision-3d-pending');
    expect(markup).toContain('data-motion-phase="floor"');
    expect(markup).toContain('data-morph-3d="1"');
    expect(markup).not.toContain('formavision-picasso-plate');
    expect(markup).not.toContain('data-floor="picasso-pack"');
    expect(markup).not.toContain('formavision-local-silhouette');
    expect(markup).not.toContain('formavision-fallback-2d');
  });

  it('product path sources import AnatomicalFloor and drop Picasso + stick beziers', () => {
    for (const file of PRODUCT_FLOOR_FILES) {
      const text = src(file);
      expect(text).not.toMatch(/c13 0 24 11 24 26/);
      expect(text).not.toMatch(/c12 0 22 10 22 24/);
      expect(text).not.toMatch(/picassoPackSrc/);
      expect(text).not.toMatch(/formavision\/picasso/);
      if (
        file.endsWith('page.tsx') ||
        file.endsWith('BodyCompositionAvatar.tsx') ||
        file.endsWith('FormaVision3DAvatar.tsx')
      ) {
        expect(text).toMatch(/FormaVisionAnatomicalFloor/);
        expect(text).not.toMatch(/FormaVisionLocalSilhouette/);
      }
    }
  });
});

describe('Brief 59: never-empty plate + honest fallback notice hold', () => {
  it('page plate underlay and latch child stay navy + labeled', () => {
    const page = src('src/app/(app)/(consumer)/body-tracker/formavision/page.tsx');
    expect(page).toMatch(/formavision-plate-floor/);
    expect(page).toMatch(/formavision-2d-floor-child/);
    expect(page).toMatch(/bg-\[#1A2744\]/);
    expect(page).toMatch(/floorRoleForAnatomicalFloor\(plateFloorMotion\.floorRole\)/);
    expect(page).toMatch(/floorRole: 'loading'/);
    expect(page).toMatch(/floorRole="unavailable"/);
    expect(page).not.toMatch(/Male%20Avatar/);
    expect(page).not.toMatch(/supabase\.co/);
    expect(GENERIC_WEBGL_UNAVAILABLE_DETAIL).toMatch(/3D preview needs a stronger GPU/);
    expect(GENERIC_WEBGL_UNAVAILABLE_DETAIL).toMatch(/not a body morph/);
  });
});

describe('Brief 59: chrome lock is plasma teal, never ZOZO purple', () => {
  it('anatomical floor + tokens stay in the #2DA5A0 family', () => {
    expect(FORMA_VISION_HEX.teal).toBe('#2DA5A0');
    expect(FORMA_VISION_HEX.navy).toBe('#1A2744');
    const floor = src('src/components/formavision/FormaVisionAnatomicalFloor.tsx');
    expect(floor).toMatch(/FORMA_VISION_HEX\.teal|FORMA_VISION_HEX\.navy/);
    expect(FORMAVISION_MOTION_SPEC.ready3dMs).toBe(420);
    for (const file of PRODUCT_FLOOR_FILES) {
      const text = src(file).toLowerCase();
      for (const hex of PURPLE_BRAND_HEX) {
        expect(text).not.toContain(hex);
      }
    }
  });
});

describe('Brief 59 LOCKED: 3D is parametric morph, not SVG-to-mesh', () => {
  it('Canvas still morphs from scan girths/BF and never converts the 2D floor', () => {
    const canvas = src('src/components/formavision/FormaVisionCanvas.tsx');
    const floor = src('src/components/formavision/FormaVisionAnatomicalFloor.tsx');
    expect(canvas).toMatch(/scanToParamVector/);
    expect(canvas).toMatch(/BODY_BUILD_BY_TIER/);
    expect(canvas).not.toMatch(/svgToMesh|SVG→mesh|photogrammetry|extrude.*silhouette/i);
    expect(floor).not.toMatch(/svgToMesh|photogrammetry/);
    expect(floor).toMatch(/anatomicalBuild/);
    expect(floor).not.toMatch(/picassoPackSrc|picasso-pack/);
    const avatar = src('src/components/formavision/BodyCompositionAvatar.tsx');
    expect(avatar).toMatch(/resolveFloor3dCrossfade/);
    expect(avatar).toMatch(/FORMAVISION_MOTION_SPEC/);
    expect(avatar).toMatch(/morph3d/);
    const brief = src('docs/formavision/BRIEF-59-anatomical-2d-floor.md');
    expect(brief).toMatch(/3D/);
    expect(brief).toMatch(/Never-empty stays/);
    expect(brief).toMatch(/Picasso/);
  });
});

describe('Brief 59: Gate 178 Phase 1 mesh bar is unchanged', () => {
  it('cinematic density and hotter teal uniforms still beat Phase 0', () => {
    expect(CINEMATIC_BODY_SEGMENTS.radialSegments).toBeGreaterThan(
      PHASE0_CINEMATIC_BODY_SEGMENTS.radialSegments,
    );
    const cinematicCells =
      CINEMATIC_BODY_SEGMENTS.radialSegments * CINEMATIC_BODY_SEGMENTS.verticalSegments;
    expect(cinematicCells).toBeGreaterThanOrEqual(6890);
    expect(BODY_BUILD_BY_TIER.cinematic).toEqual(CINEMATIC_BODY_SEGMENTS);
    expect(BODY_WIREFRAME_DEFAULTS.fillOpacity).toBeLessThan(PHASE0_WIREFRAME_DEFAULTS.fillOpacity);
    expect(BODY_WIREFRAME_DEFAULTS.lineIntensity).toBeGreaterThan(
      PHASE0_WIREFRAME_DEFAULTS.lineIntensity,
    );
    const canvas = src('src/components/formavision/FormaVisionCanvas.tsx');
    expect(canvas).toMatch(/BODY_BUILD_BY_TIER/);
    expect(canvas).toMatch(/fullBodyCameraPosition/);
    expect(canvas).not.toMatch(/radialSegments:\s*64,\s*verticalSegments:\s*48/);
  });
});

describe('Brief 59: landmark ticks stay honest', () => {
  it('SSR recovering floor does not tick estimate girths', () => {
    const estimated = emptyMeasurements();
    estimated.waist = 34;
    const markup = renderToStaticMarkup(
      React.createElement(BodyCompositionAvatar, {
        sex: 'male',
        scan: null,
        circumferences: estimated,
        girthSource: 'estimate',
        unit: 'in',
        activeTab: 'bodyFat',
        children: React.createElement(FormaVisionAnatomicalFloor, {
          sex: 'male',
          girths: null,
        }),
      }),
    );
    expect(markup).toContain('formavision-anatomical-floor');
    expect(markup).not.toContain('formavision-anatomical-landmark-ticks');
  });
});
