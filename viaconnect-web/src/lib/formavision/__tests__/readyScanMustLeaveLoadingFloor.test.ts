// Production FAIL after PR #182 (2315b90 / dpl_Epu1wEyy): Ready scan on
// mobile stayed on the cyan anatomical "alien" floor with
// "Loading 3D avatar from your scan. This outline is not your body."
// No live WebGL mesh. Permanent loading-role floor with Ready data = FAIL.
//
// Contract:
//   A. Ready scan with BF must leave the loading floor after first paint.
//   B. Permanent loading-role floor with Ready data is FAIL.
//   C. Live mesh path stamps data-surface=formavision3d data-morph=applied.
//   D. If 3D never paints, caption must flip to hard unavailable — never
//      infinite Loading.
//   E. Live canvas stays compositable (morph3d > 0) while the floor shrouds
//      the first frame — opacity:0 on the r3f mount deadlocks phone WebKit.

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { BodyCompositionAvatar } from '@/components/formavision/BodyCompositionAvatar';
import { FormaVisionPlateNotice } from '@/components/formavision/FormaVisionPlateNotice';
import { FormaVisionAnatomicalFloor } from '@/components/formavision/FormaVisionAnatomicalFloor';
import { estimateCircumferencesFromComposition } from '@/lib/body-tracker/composition/estimateCircumferencesFromComposition';
import { snapshotFromPhotoScanSummary } from '@/lib/body-tracker/composition/snapshotFromScanResult';
import { buildAvatarMorphStamp } from '@/lib/formavision/morph/avatarMorphStamp';
import { resolveFloor3dCrossfade } from '@/lib/formavision/motion/floorMotionSpec';
import {
  FIRST_PAINT_DEADLINE_MS,
  FORMAVISION_FIRST_PAINT_TIMEOUT_MESSAGE,
  decideFirstPaintDeadlineAction,
  decideRestoreSpinAction,
  frameloopAfterDeadline,
  shouldTreatPresentReadyMeshAsPainted,
} from '@/lib/formavision/gl/webglContextRecovery';
import {
  formatPlateDiagnostics,
  hasReadyScanData,
  isAlienFloorReadySuccessFail,
  isPermanentLoadingRoleFail,
  resolvePlatePresentation,
  resolveReadyPlatePresentation,
} from '@/lib/formavision/tier/readyPlateContract';
import {
  FORMAVISION_FLOOR_LOADING_COPY,
  FORMAVISION_FLOOR_UNAVAILABLE_COPY,
} from '@/lib/formavision/tier/floorRoleCopy';

const webRoot = process.cwd();

function src(rel: string): string {
  return readFileSync(join(webRoot, rel), 'utf8');
}

function garyReadyScan() {
  return snapshotFromPhotoScanSummary({
    id: 'prod-ready-182',
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

describe('Production FAIL #182: Ready scan must leave the loading floor', () => {
  it('Gary Ready BF 30–36% is Ready scan data and applies a live-mesh morph stamp', () => {
    const scan = garyReadyScan();
    const circumferences = estimateCircumferencesFromComposition(scan, 'male', 'in');
    expect(hasReadyScanData(scan)).toBe(true);
    const stamp = buildAvatarMorphStamp({
      scan,
      circumferences,
      sex: 'male',
      unit: 'in',
      source: 'estimate',
    });
    expect(stamp.morph).toBe('applied');
    expect(stamp.bf).toBe('33.0');
    expect(stamp.source).toBe('estimate');
  });

  it('SSR Ready plate mounts 3D with morph=applied and no anatomical outline', () => {
    const markup = renderReadyPlate();
    expect(markup).toContain('data-surface="formavision3d"');
    expect(markup).toContain('data-morph="applied"');
    expect(markup).toContain('data-morph-bf="33.0"');
    expect(markup).toContain('data-appearance="procedural"');
    expect(markup).toContain('data-paint-state="pending"');
    expect(markup).toContain('data-floor-role="hidden"');
    expect(markup).toContain('data-result="scan-mesh"');
    expect(markup).toContain('formavision-plate-diagnostics');
    expect(markup).toContain('floor=hidden paint=pending');
    expect(markup).not.toContain('formavision-anatomical-floor');
    expect(markup).not.toContain(FORMAVISION_FLOOR_LOADING_COPY);
    expect(markup).not.toContain('formavision-picasso-plate');
    expect(markup).not.toContain('/formavision/picasso/');
    expect(markup).not.toContain('formavision-fallback-2d');
  });

  it('after first paint, Ready presentation hides the loading floor and stamps scan-mesh', () => {
    const painted = resolvePlatePresentation({
      canvasHasPainted: true,
      fellBack: false,
      recovering: false,
    });
    expect(painted.resultKind).toBe('scan-mesh');
    expect(painted.paintState).toBe('painted');
    expect(painted.floorRole).toBe('hidden');
    expect(painted.floorPresented).toBe(false);
    expect(
      isPermanentLoadingRoleFail({
        hasReadyScanData: true,
        ...painted,
      }),
    ).toBe(false);
  });

  it('permanent loading-role floor with Ready data is FAIL', () => {
    expect(
      isPermanentLoadingRoleFail({
        hasReadyScanData: true,
        floorRole: 'loading',
        resultKind: 'loading',
        paintState: 'painted',
        floorPresented: true,
      }),
    ).toBe(true);
    expect(
      isPermanentLoadingRoleFail({
        hasReadyScanData: true,
        floorRole: 'loading',
        resultKind: 'unavailable',
        paintState: 'unavailable',
        floorPresented: true,
      }),
    ).toBe(true);
    expect(
      isPermanentLoadingRoleFail({
        hasReadyScanData: true,
        floorRole: 'loading',
        resultKind: 'loading',
        paintState: 'pending',
        floorPresented: true,
      }),
    ).toBe(true);
  });

  it('Ready + missed first-paint still presents scan-mesh, never the alien', () => {
    const readyMiss = resolveReadyPlatePresentation({
      canvasHasPainted: false,
      fellBack: true,
      recovering: false,
      hasReadyScanData: true,
    });
    expect(readyMiss.resultKind).toBe('scan-mesh');
    expect(readyMiss.floorRole).toBe('hidden');
    expect(readyMiss.floorPresented).toBe(false);
    expect(
      isAlienFloorReadySuccessFail({
        hasReadyScanData: true,
        ...readyMiss,
      }),
    ).toBe(false);
    const noScan = resolveReadyPlatePresentation({
      canvasHasPainted: false,
      fellBack: true,
      recovering: false,
      hasReadyScanData: false,
    });
    expect(noScan.resultKind).toBe('unavailable');
    expect(noScan.floorRole).toBe('unavailable');
    const caption = renderToStaticMarkup(
      React.createElement(FormaVisionAnatomicalFloor, {
        sex: 'male',
        floorRole: 'unavailable',
      }),
    );
    expect(caption).toContain(FORMAVISION_FLOOR_UNAVAILABLE_COPY);
    expect(caption).not.toContain(FORMAVISION_FLOOR_LOADING_COPY);
  });
});

describe('Live canvas stays compositable under the loading shroud', () => {
  it('waiting for first paint keeps morph3d visible so phone WebKit can RAF', () => {
    const waiting = resolveFloor3dCrossfade({
      liveCanvasHasPainted: false,
      recovering: false,
      fellBack: false,
    });
    expect(waiting.floorOpacity).toBe(1);
    expect(waiting.morph3d).toBe(1);
    expect(waiting.phase).toBe('floor');
  });

  it('SSR Ready footprint does not hide the 3D mount at opacity 0', () => {
    const markup = renderReadyPlate();
    expect(markup).toContain('data-morph-3d="1"');
    expect(markup).not.toMatch(/data-testid="formavision-avatar-footprint"[^>]*data-morph-3d="0"/);
  });

  it('recover / fallback still hide a broken mesh and reverse to the floor', () => {
    const recovering = resolveFloor3dCrossfade({
      liveCanvasHasPainted: true,
      recovering: true,
      fellBack: false,
    });
    expect(recovering.morph3d).toBe(0);
    expect(recovering.floorOpacity).toBe(1);
    expect(recovering.phase).toBe('toFloor');
  });
});

describe('First-paint deadline and restore-spin latch', () => {
  it('deadline misses latch unavailable only without Ready data', () => {
    expect(decideFirstPaintDeadlineAction({ painted: false })).toBe('latch-unavailable');
    expect(decideFirstPaintDeadlineAction({ painted: true })).toBe('keep-waiting');
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
    expect(FIRST_PAINT_DEADLINE_MS).toBeGreaterThan(2000);
    expect(FORMAVISION_FIRST_PAINT_TIMEOUT_MESSAGE).toMatch(/did not present a frame/);
  });

  it('restore remounts are budgeted so a lost/restore loop cannot stay Loading', () => {
    expect(decideRestoreSpinAction({ restoreRemounts: 0 })).toBe('remount');
    expect(decideRestoreSpinAction({ restoreRemounts: 1 })).toBe('remount');
    expect(decideRestoreSpinAction({ restoreRemounts: 3 })).toBe('latch-2d');
  });

  it('BodyCompositionAvatar wires deadline + plate contract + diagnostics', () => {
    const avatar = src('src/components/formavision/BodyCompositionAvatar.tsx');
    expect(avatar).toMatch(/resolvePlatePresentation/);
    expect(avatar).toMatch(/FIRST_PAINT_DEADLINE_MS/);
    expect(avatar).toMatch(/decideFirstPaintDeadlineAction/);
    expect(avatar).toMatch(/present-ready-mesh/);
    expect(avatar).toMatch(/frameloopAfterDeadline/);
    expect(avatar).toMatch(/shouldTreatPresentReadyMeshAsPainted/);
    expect(avatar).not.toMatch(
      /action === 'present-ready-mesh'\) \{\s*handleFirstInteractive\(\)/,
    );
    expect(avatar).toMatch(/resolveReadyPlatePresentation/);
    expect(avatar).toMatch(/decideRestoreSpinAction/);
    expect(avatar).toMatch(/data-paint-state/);
    expect(avatar).toMatch(/formavision-plate-diagnostics/);
    expect(avatar).toMatch(/formatPlateDiagnostics/);
    expect(avatar).not.toMatch(/const floorRole = fellBack \? 'unavailable' : 'loading'/);
  });
});

describe('Phone-readable diagnostics', () => {
  it('formats floor role vs paint state for a screenshot / inspector', () => {
    expect(
      formatPlateDiagnostics({ floorRole: 'loading', paintState: 'pending' }),
    ).toBe('floor=loading paint=pending');
    expect(
      formatPlateDiagnostics({ floorRole: 'hidden', paintState: 'painted' }),
    ).toBe('floor=hidden paint=painted');
    expect(
      formatPlateDiagnostics({ floorRole: 'unavailable', paintState: 'unavailable' }),
    ).toBe('floor=unavailable paint=unavailable');
  });
});
