// Brief 60 — Gary + Arnold F3 holographic Ready settle.
//
// Standing locks: no alien floor, never blank-only after deadline, no Picasso
// shards, no opaque solid as the parametric Ready stamp. Motion beats match
// the 800ms F1→F3 window. SnapMeasure OBJ is not a Ready source.

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  CINEMATIC_BODY_SEGMENTS,
} from '@/lib/formavision/geometry/buildBodyGeometry';
import {
  BODY_HOLOGRAPHIC_F3_DEFAULTS,
  HOLOGRAPHIC_F3_LINE_HEX,
  isHolographicFillInRange,
} from '@/lib/formavision/materials/bodyHolographicMaterial';
import {
  BRIEF_60_F1_TO_F3_TOLERANCE_MS,
  FORMAVISION_MOTION_SPEC,
  brief60F1ToF3Ms,
} from '@/lib/formavision/motion/floorMotionSpec';
import {
  AVATAR_VERTICAL_FOV_DEG,
  isBrief60AvatarFov,
} from '@/lib/formavision/motion/regionFraming';
import {
  isAllowedReadySuccessLook,
  isAlienFloorReadySuccessFail,
  isBlankOnlyPlateFail,
  isPicassoWireframeSuccessFail,
  isSolidOnlyReadySuccessFail,
  resolveReadyPlatePresentation,
  resolveReadySuccessLook,
} from '@/lib/formavision/tier/readyPlateContract';

const webRoot = process.cwd();

function src(rel: string): string {
  return readFileSync(join(webRoot, rel), 'utf8');
}

describe('Brief 60 F3 holographic Ready settle', () => {
  it('Ready success look is holographic-f3, not solid-only or Picasso shards', () => {
    expect(
      resolveReadySuccessLook({
        meshSource: 'parametric',
        parametricLook: 'holographic',
      }),
    ).toBe('holographic-f3');
    expect(isAllowedReadySuccessLook('holographic-f3')).toBe(false);
    expect(isAllowedReadySuccessLook('meshy-glb')).toBe(true);
    expect(
      isPicassoWireframeSuccessFail({
        hasReadyScanData: true,
        look: 'wireframe-picasso',
      }),
    ).toBe(true);
    expect(
      isSolidOnlyReadySuccessFail({
        hasReadyScanData: true,
        look: 'solid-human',
        meshSource: 'parametric',
      }),
    ).toBe(true);
  });

  it('alien floor and blank-only after deadline stay FAIL', () => {
    const pending = resolveReadyPlatePresentation({
      canvasHasPainted: false,
      fellBack: false,
      recovering: false,
      hasReadyScanData: true,
    });
    expect(
      isAlienFloorReadySuccessFail({
        hasReadyScanData: true,
        ...pending,
      }),
    ).toBe(false);
    expect(pending.noticePresented).toBe(true);
    expect(
      isBlankOnlyPlateFail({
        hasReadyScanData: true,
        paintState: pending.paintState,
        noticePresented: pending.noticePresented,
      }),
    ).toBe(false);
    expect(
      isBlankOnlyPlateFail({
        hasReadyScanData: true,
        paintState: 'pending',
        noticePresented: false,
      }),
    ).toBe(true);
  });

  it('motion beats match Brief 60 within tolerance', () => {
    expect(FORMAVISION_MOTION_SPEC.floorPaintMs).toBe(0);
    expect(FORMAVISION_MOTION_SPEC.halfMorphMs).toBe(280);
    expect(FORMAVISION_MOTION_SPEC.ready3dMs).toBe(420);
    expect(FORMAVISION_MOTION_SPEC.ready3dEasing).toBe('cubic-bezier(0.22, 1, 0.36, 1)');
    expect(FORMAVISION_MOTION_SPEC.settleMs).toBe(200);
    expect(FORMAVISION_MOTION_SPEC.settleEasing).toBe('ease-out');
    expect(Math.abs(brief60F1ToF3Ms() - 800)).toBeLessThanOrEqual(
      BRIEF_60_F1_TO_F3_TOLERANCE_MS,
    );
  });

  it('F3 material + camera + cinematic grid stay in the locked envelope', () => {
    expect(HOLOGRAPHIC_F3_LINE_HEX.toLowerCase()).toBe('#2ee6d6');
    expect(isHolographicFillInRange(BODY_HOLOGRAPHIC_F3_DEFAULTS.fillOpacity)).toBe(true);
    expect(isBrief60AvatarFov(AVATAR_VERTICAL_FOV_DEG)).toBe(true);
    expect(CINEMATIC_BODY_SEGMENTS.radialSegments).toBeGreaterThanOrEqual(32);
    expect(CINEMATIC_BODY_SEGMENTS.verticalSegments).toBeGreaterThanOrEqual(64);
    expect(CINEMATIC_BODY_SEGMENTS.verticalSegments).toBeLessThanOrEqual(96);
  });

  it('product path does not wire SnapMeasure OBJ to Ready', () => {
    const canvas = src('src/components/formavision/FormaVisionCanvas.tsx');
    const select = src('src/lib/formavision/meshy/selectPlateMeshSource.ts');
    expect(canvas).not.toMatch(/SnapMeasure|\.obj['"`]/);
    expect(select).not.toMatch(/SnapMeasure|\.obj['"`]/);
    expect(select).toMatch(/meshy-glb|parametric/);
  });
});
