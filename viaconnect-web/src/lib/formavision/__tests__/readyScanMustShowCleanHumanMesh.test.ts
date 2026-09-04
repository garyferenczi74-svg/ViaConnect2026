// Production FAIL after #187 (09025c11) on www.viaconnectapp.com.
//
// Desktop Chrome: Sep 1 Ready, Male/in, floor=hidden paint=painted. The
// plate showed a cyan jagged Picasso/wireframe — not a clean human body.
// Mobile WebKit: same Ready, honesty notice held, paint=pending forever.
//
// #187 is the never-empty notice. This file locks the live clean mesh.

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import * as THREE from 'three';
import { BodyCompositionAvatar } from '@/components/formavision/BodyCompositionAvatar';
import { FormaVisionPlateNotice } from '@/components/formavision/FormaVisionPlateNotice';
import { mountBodyGeometry } from '@/components/formavision/mountBodyGeometry';
import { estimateCircumferencesFromComposition } from '@/lib/body-tracker/composition/estimateCircumferencesFromComposition';
import { snapshotFromPhotoScanSummary } from '@/lib/body-tracker/composition/snapshotFromScanResult';
import { scanToParamVector } from '@/lib/formavision/geometry/scanToParamVector';
import {
  isPicassoWireframeDrawMode,
  isSolidHumanDrawMode,
} from '@/lib/formavision/materials/bodySolidMaterial';
import {
  hasReadyScanData,
  isAlienFloorReadySuccessFail,
  isHumanShapedBodyBounds,
  isPicassoWireframeSuccessFail,
  resolveReadyPlatePresentation,
  resolveReadySuccessLook,
  shouldPresentPlateNotice,
} from '@/lib/formavision/tier/readyPlateContract';
import {
  drawingBufferHasPixels,
  shouldStampPaintedFrame,
  shouldTreatPresentReadyMeshAsPainted,
} from '@/lib/formavision/gl/webglContextRecovery';

const webRoot = process.cwd();

function src(rel: string): string {
  return readFileSync(join(webRoot, rel), 'utf8');
}

function garyReadyScan() {
  return snapshotFromPhotoScanSummary({
    id: 'prod-ready-187-follow',
    date: '2026-09-01',
    estimatedBodyFatMin: 30,
    estimatedBodyFatMax: 36,
    estimatedWhrMin: 0.84,
    estimatedWhrMax: 0.88,
  });
}

function renderReadyPlate() {
  const scan = garyReadyScan();
  const circumferences = estimateCircumferencesFromComposition(scan, 'male', 'in');
  return renderToStaticMarkup(
    React.createElement(BodyCompositionAvatar, {
      sex: 'male',
      scan,
      circumferences,
      girthSource: 'estimate',
      unit: 'in',
      activeTab: 'bodyFat',
      children: React.createElement(FormaVisionPlateNotice, { kind: 'unavailable' }),
    }),
  );
}

describe('Ready success look is a clean human mesh, not Picasso wireframe', () => {
  it('contract rejects wireframe/Picasso as a Ready success surface', () => {
    expect(
      isPicassoWireframeSuccessFail({
        hasReadyScanData: true,
        look: 'wireframe-picasso',
      }),
    ).toBe(true);
    expect(
      isPicassoWireframeSuccessFail({
        hasReadyScanData: true,
        look: 'solid-human',
      }),
    ).toBe(false);
    expect(
      isPicassoWireframeSuccessFail({
        hasReadyScanData: true,
        look: 'meshy-glb',
      }),
    ).toBe(false);
    expect(
      resolveReadySuccessLook({
        meshSource: 'parametric',
        parametricLook: 'solid',
      }),
    ).toBe('solid-human');
    expect(
      resolveReadySuccessLook({
        meshSource: 'parametric',
        parametricLook: 'wireframe',
      }),
    ).toBe('wireframe-picasso');
    expect(
      resolveReadySuccessLook({
        meshSource: 'meshy-glb',
        parametricLook: 'wireframe',
      }),
    ).toBe('meshy-glb');
  });

  it('Gary Ready male 30–36% parametric mount is solid and human-shaped', () => {
    const scan = garyReadyScan();
    expect(hasReadyScanData(scan)).toBe(true);
    const circumferences = estimateCircumferencesFromComposition(scan, 'male', 'in');
    const vector = scanToParamVector({
      snapshot: scan,
      circumferences,
      sex: 'male',
      unit: 'in',
    });
    const mounted = mountBodyGeometry(vector);
    expect(isSolidHumanDrawMode(mounted.materialHandle.material)).toBe(true);
    expect(isPicassoWireframeDrawMode(mounted.materialHandle.material)).toBe(false);
    expect(mounted.materialHandle.material.blending).toBe(THREE.NormalBlending);
    expect(mounted.materialHandle.material.wireframe).toBe(false);
    expect(
      isHumanShapedBodyBounds({
        min: mounted.boundsMin,
        max: mounted.boundsMax,
      }),
    ).toBe(true);
    expect(
      isPicassoWireframeSuccessFail({
        hasReadyScanData: true,
        look: resolveReadySuccessLook({
          meshSource: 'parametric',
          parametricLook: 'solid',
        }),
      }),
    ).toBe(false);
    mounted.dispose();
  });

  it('SSR Ready plate stamps solid-human and never mounts the alien', () => {
    const markup = renderReadyPlate();
    expect(markup).toContain('data-mesh-look="solid-human"');
    expect(markup).toContain('data-result="scan-mesh"');
    expect(markup).toContain('data-floor-role="hidden"');
    expect(markup).not.toContain('formavision-anatomical-floor');
    expect(markup).not.toContain('formavision-anatomical-contour');
    const presented = resolveReadyPlatePresentation({
      canvasHasPainted: false,
      fellBack: false,
      recovering: false,
      hasReadyScanData: true,
    });
    expect(
      isAlienFloorReadySuccessFail({
        hasReadyScanData: true,
        ...presented,
      }),
    ).toBe(false);
  });
});

describe('Mobile WebKit: notice until painted, then the live mesh', () => {
  it('keeps the #187 honesty notice while paint is pending', () => {
    expect(
      shouldPresentPlateNotice({
        canvasHasPainted: false,
        hasReadyScanData: true,
      }),
    ).toBe(true);
    expect(
      shouldPresentPlateNotice({
        canvasHasPainted: true,
        hasReadyScanData: true,
      }),
    ).toBe(false);
    expect(shouldTreatPresentReadyMeshAsPainted()).toBe(false);
  });

  it('stamps paint from a drawing buffer even when the client box is 0', () => {
    expect(drawingBufferHasPixels({ drawingBufferWidth: 390, drawingBufferHeight: 520 })).toBe(
      true,
    );
    expect(drawingBufferHasPixels({ drawingBufferWidth: 0, drawingBufferHeight: 0 })).toBe(false);
    expect(
      shouldStampPaintedFrame({
        clientBoxZero: true,
        drawingBufferHasPixels: true,
      }),
    ).toBe(true);
    expect(
      shouldStampPaintedFrame({
        clientBoxZero: true,
        drawingBufferHasPixels: false,
      }),
    ).toBe(false);
    expect(
      shouldStampPaintedFrame({
        clientBoxZero: false,
        drawingBufferHasPixels: false,
      }),
    ).toBe(true);
  });

  it('product path skips the hide-then-sweep intro and uses Safari-safe GL', () => {
    const canvas = src('src/components/formavision/FormaVisionCanvas.tsx');
    expect(canvas).toMatch(/reducedMotion:\s*true/);
    expect(canvas).toMatch(/syncCanvasToParentBox/);
    expect(canvas).toMatch(/shouldStampPaintedFrame/);
    expect(canvas).toMatch(/isSafariWebGLHost/);
    expect(canvas).toMatch(/makeBodySolidMaterial|solid-human/);
    expect(canvas).not.toMatch(/FormaVisionAnatomicalFloor/);

    const mount = src('src/components/formavision/mountBodyGeometry.ts');
    expect(mount).toMatch(/makeBodySolidMaterial/);
    expect(mount).toMatch(/look \?\? 'solid'/);

    const acquire = src('src/lib/formavision/gl/acquireWebGLContext.ts');
    expect(acquire).toMatch(/SAFARI_SAFE_GL_ATTRIBUTES/);
    expect(acquire).toMatch(/preserveDrawingBuffer:\s*true/);
    expect(acquire).toMatch(/alpha:\s*false/);
  });
});
