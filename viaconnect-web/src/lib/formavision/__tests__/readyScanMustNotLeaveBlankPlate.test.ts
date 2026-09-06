// Production FAIL after PR #186 (b2baee06 on www.viaconnectapp.com).
//
// Gary iPhone smoke: Sep 1 Ready, Male/in, hard refresh. Teal alien is
// gone (standing lock held) but the plate is blank navy with
// `floor=hidden paint=pending` forever. Never-empty is broken.
//
// Contract:
//   A. Ready + paint pending past the ~8s deadline presents the compositable
//      holographic mesh. A text-only notice is for the wait before the mesh
//      is mounted — not a permanent Ready shroud (#189).
//   B. Do not require canvasHasPainted to show the mesh after the deadline.
//      Do not fake the paint stamp. Prefer keeping morph3d compositable.
//   C. Ready never presents FormaVisionAnatomicalFloor / LocalSilhouette.
//   D. Notice copy has no outline figure and no "this outline is not your body".

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { BodyCompositionAvatar } from '@/components/formavision/BodyCompositionAvatar';
import {
  FORMAVISION_PLATE_LOADING_NOTICE,
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
  isBlankOnlyPlateFail,
  isPermanentLoadingRoleFail,
  resolveReadyPlatePresentation,
  shouldPresentPlateNotice,
} from '@/lib/formavision/tier/readyPlateContract';
import {
  shouldMountAnatomicalOutline,
  shouldPaintPlateFloor,
} from '@/lib/formavision/tier/avatarSurfaceDecision';
import { FORMAVISION_FLOOR_LOADING_COPY } from '@/lib/formavision/tier/floorRoleCopy';

const webRoot = process.cwd();

function src(rel: string): string {
  return readFileSync(join(webRoot, rel), 'utf8');
}

function garyReadyScan() {
  return snapshotFromPhotoScanSummary({
    id: 'prod-ready-186-follow',
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

describe('Gary 2026-09-04: Ready paint-pending must not leave a blank navy plate', () => {
  it('Ready + paint pending past deadline presents the mounted mesh without a covering notice', () => {
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
      shouldPresentPlateNotice({
        canvasHasPainted: false,
        hasReadyScanData: true,
        presentReadyWithoutPaint: true,
      }),
    ).toBe(false);
    expect(
      isBlankOnlyPlateFail({
        hasReadyScanData: true,
        paintState: presented.paintState,
        noticePresented: presented.noticePresented,
        presentReadyWithoutPaint: true,
      }),
    ).toBe(false);
    expect(
      isPermanentLoadingRoleFail({
        hasReadyScanData: true,
        ...presented,
      }),
    ).toBe(false);

    const fade = resolveFloor3dCrossfade({
      liveCanvasHasPainted: false,
      recovering: false,
      fellBack: false,
      hasReadyScanData: true,
      presentReadyWithoutPaint: true,
    });
    expect(fade.morph3d).toBe(1);
    expect(fade.floorOpacity).toBe(0);

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

  it('Ready never presents the alien floor, including while paint is pending', () => {
    expect(shouldMountAnatomicalOutline()).toBe(false);
    expect(
      shouldPaintPlateFloor({
        liveCanvasHasPainted: false,
        hasReadyScanData: true,
        presentReadyWithoutPaint: true,
      }),
    ).toBe(false);
    const presented = resolveReadyPlatePresentation({
      canvasHasPainted: false,
      fellBack: false,
      recovering: false,
      hasReadyScanData: true,
      presentReadyWithoutPaint: true,
    });
    expect(presented.floorPresented).toBe(false);
    expect(presented.floorRole).toBe('hidden');

    const markup = renderReadyPlate();
    expect(hasReadyScanData(garyReadyScan())).toBe(true);
    expect(markup).not.toContain('formavision-anatomical-floor');
    expect(markup).not.toContain('formavision-anatomical-contour');
    expect(markup).not.toContain('data-floor="anatomical-2d"');
    expect(markup).not.toContain(FORMAVISION_FLOOR_LOADING_COPY);
    expect(markup).not.toContain('This outline is not your body');
  });

  it('never blank-only after the deadline: mounted F3 path is not blank navy', () => {
    expect(
      isBlankOnlyPlateFail({
        hasReadyScanData: true,
        paintState: 'pending',
        noticePresented: false,
        presentReadyWithoutPaint: true,
      }),
    ).toBe(false);
    expect(
      isBlankOnlyPlateFail({
        hasReadyScanData: true,
        paintState: 'pending',
        noticePresented: false,
      }),
    ).toBe(true);
    expect(
      isBlankOnlyPlateFail({
        hasReadyScanData: true,
        paintState: 'pending',
        noticePresented: true,
        presentReadyWithoutPaint: true,
      }),
    ).toBe(false);
    expect(
      isBlankOnlyPlateFail({
        hasReadyScanData: true,
        paintState: 'painted',
        noticePresented: false,
      }),
    ).toBe(false);
    expect(
      shouldPresentPlateNotice({
        canvasHasPainted: true,
        hasReadyScanData: true,
        presentReadyWithoutPaint: true,
      }),
    ).toBe(false);
  });

  it('Sep 1 Ready SSR plate is never empty navy: scan-mesh plus text notice', () => {
    const markup = renderReadyPlate();
    expect(markup).toContain('data-surface="ready-notice"');
    expect(markup).toContain('data-result="scan-mesh"');
    expect(markup).toContain('data-floor-role="hidden"');
    expect(markup).toContain('data-paint-state="pending"');
    expect(markup).toContain('data-notice-presented="true"');
    expect(markup).toContain('data-morph-3d="1"');
    expect(markup).toContain('floor=hidden paint=pending');
    expect(markup).toContain('formavision-plate-notice');
    expect(markup).toContain(FORMAVISION_PLATE_LOADING_NOTICE);
    expect(markup).not.toContain('formavision-anatomical-floor');
    expect(markup).not.toContain('formavision-fallback-2d');
  });

  it('deadline wiring presents notice without stamping paint; chunk load is not empty navy', () => {
    const avatar = src('src/components/formavision/BodyCompositionAvatar.tsx');
    expect(avatar).toMatch(/shouldPresentPlateNotice/);
    expect(avatar).toMatch(/presentReadyWithoutPaint/);
    expect(avatar).toMatch(/setPresentReadyWithoutPaint\(true\)/);
    expect(avatar).toMatch(/shouldTreatPresentReadyMeshAsPainted/);
    expect(avatar).not.toMatch(
      /action === 'present-ready-mesh'\) \{\s*handleFirstInteractive\(\)/,
    );
    expect(avatar).toMatch(/readyLive &&[\s\S]*shouldPresentPlateNotice/);
    expect(avatar).not.toMatch(/FormaVisionAnatomicalFloor/);

    const threeD = src('src/components/formavision/FormaVision3DAvatar.tsx');
    expect(threeD).toMatch(/loading:\s*\(\)\s*=>\s*<CanvasLoader\s*\/>/);
    expect(threeD).toMatch(/FormaVisionPlateNotice/);
    expect(threeD).not.toMatch(/FormaVisionAnatomicalFloor/);
  });
});
