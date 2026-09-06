// Production FAIL after #189 (8b9966ce) on www.viaconnectapp.com.
//
// Gary iPhone WebKit: hard refresh Ready + BF/girths. Flash, then dark.
// Stuck on "Loading 3D avatar from your scan." Debug:
// `floor=hidden paint=pending` forever. Teal alien gone. Frame 3
// holographic mesh never sticks.
//
// Root cause class (#185/#187 WebKit miss + #189 THREE r184):
//   1. Live Safari factory asked WebGL1 first, then passed that context
//      into THREE r184, which throws "WebGL 1 is not supported since r163."
//   2. Safari-safe opaque / preserveDrawingBuffer attrs never reached the
//      live canvas (factory hardcoded SAFE_GL_ATTRIBUTES).
//   3. Honesty notice stayed after the deadline even when the mesh was
//      mounted, so Ready looked like forever-Loading.
//
// Contract:
//   A. Eternal paint=pending still presents the holographic-f3 path.
//   B. Do not fake canvasHasPainted / the paint stamp.
//   C. After the deadline, notice must not permanently cover a mounted mesh.
//   D. Alien / anatomical floor still forbidden.

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
import { isHolographicF3DrawMode } from '@/lib/formavision/materials/bodyHolographicMaterial';
import { isPicassoWireframeDrawMode } from '@/lib/formavision/materials/bodySolidMaterial';
import {
  drawingBufferHasPixels,
  frameloopAfterDeadline,
  shouldStampPaintedFrame,
  shouldTreatPresentReadyMeshAsPainted,
} from '@/lib/formavision/gl/webglContextRecovery';
import {
  glAttributesForHost,
  liveCanvasContextTypeOrder,
  shouldPassContextToThreeRenderer,
} from '@/lib/formavision/gl/acquireWebGLContext';
import {
  hasReadyScanData,
  isAlienFloorReadySuccessFail,
  isBlankOnlyPlateFail,
  isNoticeCoveringMountedReadyFail,
  isPicassoWireframeSuccessFail,
  resolveReadyPlatePresentation,
  resolveReadySuccessLook,
  shouldPresentPlateNotice,
} from '@/lib/formavision/tier/readyPlateContract';

const webRoot = process.cwd();

function src(rel: string): string {
  return readFileSync(join(webRoot, rel), 'utf8');
}

function garyReadyScan() {
  return snapshotFromPhotoScanSummary({
    id: 'prod-ready-189-follow',
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
      readyViewerHost: 'desktop',
      children: React.createElement(FormaVisionPlateNotice, { kind: 'unavailable' }),
    }),
  );
}

describe('Ready + eternal paint pending still presents visible holographic F3', () => {
  it('parametric Ready mount is holographic-f3 even when paint never stamps', () => {
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
    expect(isHolographicF3DrawMode(mounted.materialHandle.material)).toBe(true);
    expect(isPicassoWireframeDrawMode(mounted.materialHandle.material)).toBe(false);
    expect(mounted.materialHandle.material.blending).toBe(THREE.NormalBlending);
    expect(mounted.materialHandle.uniforms.uMorph.value).toBe(1);
    mounted.materialHandle.setMorph(0);
    expect(mounted.materialHandle.uniforms.uMorph.value).toBe(1);
    expect(
      resolveReadySuccessLook({
        meshSource: 'parametric',
        parametricLook: 'holographic',
      }),
    ).toBe('holographic-f3');
    mounted.dispose();
  });

  it('deadline-mounted Ready hides the notice without faking the paint stamp', () => {
    const presented = resolveReadyPlatePresentation({
      canvasHasPainted: false,
      fellBack: false,
      recovering: false,
      hasReadyScanData: true,
      presentReadyWithoutPaint: true,
    });
    expect(presented.floorRole).toBe('hidden');
    expect(presented.resultKind).toBe('scan-mesh');
    expect(presented.paintState).toBe('pending');
    expect(presented.noticePresented).toBe(false);
    expect(
      shouldPresentPlateNotice({
        canvasHasPainted: false,
        hasReadyScanData: true,
        presentReadyWithoutPaint: true,
      }),
    ).toBe(false);
    expect(shouldTreatPresentReadyMeshAsPainted()).toBe(false);
    expect(
      isBlankOnlyPlateFail({
        hasReadyScanData: true,
        paintState: presented.paintState,
        noticePresented: presented.noticePresented,
        presentReadyWithoutPaint: true,
      }),
    ).toBe(false);
    expect(
      isNoticeCoveringMountedReadyFail({
        hasReadyScanData: true,
        presentReadyWithoutPaint: true,
        noticePresented: presented.noticePresented,
      }),
    ).toBe(false);
    expect(
      isNoticeCoveringMountedReadyFail({
        hasReadyScanData: true,
        presentReadyWithoutPaint: true,
        noticePresented: true,
      }),
    ).toBe(true);
    expect(
      frameloopAfterDeadline({
        painted: false,
        action: 'present-ready-mesh',
        requested: 'demand',
      }),
    ).toBe('always');
    expect(
      isAlienFloorReadySuccessFail({
        hasReadyScanData: true,
        ...presented,
      }),
    ).toBe(false);
    expect(
      isPicassoWireframeSuccessFail({
        hasReadyScanData: true,
        look: 'holographic-f3',
      }),
    ).toBe(false);
  });

  it('SSR Ready plate is holographic-f3 scan-mesh, never the alien', () => {
    const markup = renderReadyPlate();
    expect(markup).toContain('data-mesh-look="notice"');
    expect(markup).not.toContain('data-mesh-look="holographic-f3"');
    expect(markup).toContain('data-ready-viewer="notice"');
    expect(markup).toContain('data-r3f-parked="true"');
    expect(markup).not.toContain('formavision-3d-pending');
    expect(markup).toContain('data-result="scan-mesh"');
    expect(markup).toContain('data-floor-role="hidden"');
    expect(markup).toContain('data-paint-state="pending"');
    expect(markup).toContain('data-morph-3d="1"');
    expect(markup).not.toContain('formavision-anatomical-floor');
    expect(markup).not.toContain('formavision-anatomical-contour');
    expect(markup).not.toContain('formavision-fallback-2d');
  });

  it('drawing-buffer / first useFrame may stamp; deadline must not', () => {
    expect(
      shouldStampPaintedFrame({
        clientBoxZero: true,
        drawingBufferHasPixels: drawingBufferHasPixels({
          drawingBufferWidth: 390,
          drawingBufferHeight: 520,
        }),
      }),
    ).toBe(true);
    expect(shouldTreatPresentReadyMeshAsPainted()).toBe(false);
  });
});

describe('Phone WebKit live canvas is WebGL2 + Safari-safe attrs', () => {
  it('live order is webgl2-only and Safari attrs stay opaque + preserved', () => {
    expect(liveCanvasContextTypeOrder()).toEqual(['webgl2']);
    expect(glAttributesForHost(true).alpha).toBe(false);
    expect(glAttributesForHost(true).preserveDrawingBuffer).toBe(true);
    expect(shouldPassContextToThreeRenderer({ kind: 'webgl2' })).toBe(true);
  });

  it('product path wires the live WebGL2 factory and never-empty deadline lift', () => {
    const factory = src('src/lib/formavision/gl/createFormaVisionRenderer.ts');
    expect(factory).toMatch(/glAttributesForHost/);
    expect(factory).toMatch(/liveCanvasContextTypeOrder/);
    expect(factory).toMatch(/shouldPassContextToThreeRenderer/);
    expect(factory).not.toMatch(/attributes:\s*SAFE_GL_ATTRIBUTES/);

    const acquire = src('src/lib/formavision/gl/acquireWebGLContext.ts');
    expect(acquire).toMatch(/LIVE_CANVAS_ORDER/);
    expect(acquire).toMatch(/preserveDrawingBuffer:\s*true/);

    const avatar = src('src/components/formavision/BodyCompositionAvatar.tsx');
    expect(avatar).toMatch(/shouldTreatPresentReadyMeshAsPainted/);
    expect(avatar).not.toMatch(
      /action === 'present-ready-mesh'\) \{\s*handleFirstInteractive\(\)/,
    );

    const holo = src('src/lib/formavision/materials/bodyHolographicMaterial.ts');
    expect(holo).toMatch(/uMorph\.value = 1/);
    expect(holo).toMatch(/setMorph/);
  });
});
