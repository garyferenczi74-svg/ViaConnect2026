// Gary standing lock 2026-09-03 (via Arnold) after #185
// (ed76143 / dpl_BiBzCb2wbE4crZYvbG1Go3UDacCN).
//
// Phone FAIL: Sep 1 Ready, BF 30–36%, Male stayed on the teal alien with
// "Loading 3D avatar from your scan. This outline is not your body."
// Diagnostics: floor=loading paint=pending.
//
// #185 present-ready-mesh refused to stamp canvasHasPainted (correct) but
// resolveFloor3dCrossfade(!painted) kept floorOpacity 1. The loading
// anatomical floor stayed at z-20 over the mesh forever.
//
// Superseding lock: REMOVE the teal outline from the product path —
// not as Loading, unavailable, Ready, or a flash. Never-empty is navy
// chamber + live 3D, or a text-only notice.

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { BodyCompositionAvatar } from '@/components/formavision/BodyCompositionAvatar';
import { FormaVision3DAvatar } from '@/components/formavision/FormaVision3DAvatar';
import {
  FORMAVISION_PLATE_LOADING_NOTICE,
  FORMAVISION_PLATE_UNAVAILABLE_NOTICE,
  FormaVisionPlateNotice,
} from '@/components/formavision/FormaVisionPlateNotice';
import { estimateCircumferencesFromComposition } from '@/lib/body-tracker/composition/estimateCircumferencesFromComposition';
import { snapshotFromPhotoScanSummary } from '@/lib/body-tracker/composition/snapshotFromScanResult';
import { resolveFloor3dCrossfade } from '@/lib/formavision/motion/floorMotionSpec';
import {
  decideFirstPaintDeadlineAction,
  frameloopAfterDeadline,
  shouldTreatPresentReadyMeshAsPainted,
} from '@/lib/formavision/gl/webglContextRecovery';
import {
  hasReadyScanData,
  isPermanentLoadingRoleFail,
  resolveReadyPlatePresentation,
} from '@/lib/formavision/tier/readyPlateContract';
import {
  shouldMountAnatomicalOutline,
  shouldPaintPlateFloor,
} from '@/lib/formavision/tier/avatarSurfaceDecision';
import { selectPlateMeshSource } from '@/lib/formavision/meshy/selectPlateMeshSource';

const webRoot = process.cwd();

function src(rel: string): string {
  return readFileSync(join(webRoot, rel), 'utf8');
}

const CONSUMER_PLATE_FILES = [
  'src/app/(app)/(consumer)/body-tracker/formavision/page.tsx',
  'src/components/formavision/BodyCompositionAvatar.tsx',
  'src/components/formavision/FormaVision3DAvatar.tsx',
] as const;

function garyReadyScan() {
  return snapshotFromPhotoScanSummary({
    id: 'prod-ready-185-follow',
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
      children: React.createElement(FormaVisionPlateNotice, {
        kind: 'unavailable',
      }),
    }),
  );
}

describe('Gary 2026-09-03: anatomical outline is gone from the consumer plate', () => {
  it('shouldMountAnatomicalOutline is false and shouldPaintPlateFloor never covers Ready', () => {
    expect(shouldMountAnatomicalOutline()).toBe(false);
    expect(
      shouldPaintPlateFloor({
        liveCanvasHasPainted: false,
        hasReadyScanData: true,
      }),
    ).toBe(false);
    expect(
      shouldPaintPlateFloor({
        liveCanvasHasPainted: false,
        presentReadyWithoutPaint: true,
      }),
    ).toBe(false);
  });

  it('consumer plate sources do not mount FormaVisionAnatomicalFloor or LocalSilhouette', () => {
    for (const file of CONSUMER_PLATE_FILES) {
      const text = src(file);
      expect(text).not.toMatch(/FormaVisionAnatomicalFloor/);
      expect(text).not.toMatch(/FormaVisionLocalSilhouette/);
      expect(text).not.toMatch(/formavision-anatomical-floor/);
      expect(text).not.toMatch(/data-floor="anatomical-2d"/);
      expect(text).not.toMatch(/picassoPack/);
      expect(text).not.toMatch(/formavision\/picasso/);
    }
  });

  it('Sep 1 Ready BF 30–36 SSR plate is scan-mesh, not the teal alien', () => {
    const scan = garyReadyScan();
    expect(hasReadyScanData(scan)).toBe(true);
    const markup = renderReadyPlate();
    expect(markup).toContain('data-surface="ready-notice"');
    expect(markup).toContain('data-morph="applied"');
    expect(markup).toContain('data-morph-bf="33.0"');
    expect(markup).toContain('data-result="scan-mesh"');
    expect(markup).toContain('data-floor-role="hidden"');
    expect(markup).toContain('data-paint-state="pending"');
    expect(markup).toContain('data-morph-3d="1"');
    expect(markup).toContain('floor=hidden paint=pending');
    expect(markup).toContain('data-notice-presented="true"');
    expect(markup).toContain('formavision-plate-notice');
    expect(markup).toContain(FORMAVISION_PLATE_LOADING_NOTICE);
    expect(markup).not.toContain('formavision-anatomical-floor');
    expect(markup).not.toContain('formavision-anatomical-contour');
    expect(markup).not.toContain('data-floor="anatomical-2d"');
    expect(markup).not.toContain('This outline is not your body');
    expect(markup).not.toContain('formavision-picasso-plate');
    expect(markup).not.toContain('/formavision/picasso/');
    expect(markup).not.toContain('formavision-fallback-2d');
  });

  it('Ready + paint pending after deadline hides floor, keeps always-loop, does not fake paint', () => {
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
    expect(presented.floorPresented).toBe(false);
    expect(presented.noticePresented).toBe(false);
    expect(
      isPermanentLoadingRoleFail({
        hasReadyScanData: true,
        ...presented,
      }),
    ).toBe(false);
    expect(
      isPermanentLoadingRoleFail({
        hasReadyScanData: true,
        floorRole: 'loading',
        resultKind: 'loading',
        paintState: 'pending',
        floorPresented: true,
      }),
    ).toBe(true);

    const fade = resolveFloor3dCrossfade({
      liveCanvasHasPainted: false,
      recovering: false,
      fellBack: false,
      hasReadyScanData: true,
      presentReadyWithoutPaint: true,
    });
    expect(fade.floorOpacity).toBe(0);
    expect(fade.morph3d).toBe(1);

    expect(
      decideFirstPaintDeadlineAction({ painted: false, hasReadyScanData: true }),
    ).toBe('present-ready-mesh');
    expect(shouldTreatPresentReadyMeshAsPainted()).toBe(false);
    expect(
      frameloopAfterDeadline({
        painted: false,
        action: 'present-ready-mesh',
        requested: 'demand',
      }),
    ).toBe('always');
  });

  it('3D pending and error fallback are navy + text, never the outline figure', () => {
    const scan = garyReadyScan();
    const circumferences = estimateCircumferencesFromComposition(scan, 'male', 'in');
    const pending = renderToStaticMarkup(
      React.createElement(FormaVision3DAvatar, {
        sex: 'male',
        scan,
        circumferences,
        girthSource: 'estimate',
        unit: 'in',
        activeTab: 'bodyFat',
        onRenderError: () => undefined,
      }),
    );
    expect(pending).toContain('formavision-3d-pending');
    expect(pending).toContain('formavision-canvas-loader');
    expect(pending).toContain(FORMAVISION_PLATE_LOADING_NOTICE);
    expect(pending).not.toContain('formavision-anatomical-floor');
    expect(pending).not.toContain('This outline is not your body');
    expect(pending).not.toContain('formavision-picasso-plate');

    const notice = renderToStaticMarkup(
      React.createElement(FormaVisionPlateNotice, { kind: 'unavailable' }),
    );
    expect(notice).toContain(FORMAVISION_PLATE_UNAVAILABLE_NOTICE);
    expect(notice).not.toContain('outline');
    expect(notice).not.toContain('formavision-anatomical-contour');
  });

  it('deadline wiring never stamps first-interactive; Picasso is never a mesh source', () => {
    const avatar = src('src/components/formavision/BodyCompositionAvatar.tsx');
    expect(avatar).toMatch(/presentReadyWithoutPaint/);
    expect(avatar).toMatch(/setPresentReadyWithoutPaint\(true\)/);
    expect(avatar).toMatch(/present-ready-mesh/);
    expect(avatar).toMatch(/shouldTreatPresentReadyMeshAsPainted/);
    expect(avatar).not.toMatch(
      /action === 'present-ready-mesh'\) \{\s*handleFirstInteractive\(\)/,
    );
    expect(avatar).toMatch(/FormaVisionPlateNotice/);
    expect(avatar).not.toMatch(/FormaVisionAnatomicalFloor/);
    expect(selectPlateMeshSource.toString()).not.toMatch(/picasso/i);
    expect(
      selectPlateMeshSource({
        meshyGlbUrl: null,
        meshyStatus: 'idle',
        glbLoadFailed: false,
      }),
    ).toBe('parametric');
  });
});
