// Production FAIL after PR #184 (09c78a1a / dpl_7aZPwLz7FuUAseXqa5uU1PBHfJKh):
// Gary iPhone Ready scan (Sep 1, BF 30.0–36.0%, Male) still showed the teal
// 2D alien + "FormaVision 3D did not present a frame". That latch is FAIL.
//
// Contract:
//   A. Ready + morph never selects the alien page-floor as the success result.
//   B. First-paint deadline on Ready presents the live mesh, does not latch.
//   C. Signed Meshy GLB is preferred; Picasso is never a source.
//   D. Existing FRBL sessionId kicks Meshy create.

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { snapshotFromPhotoScanSummary } from '@/lib/body-tracker/composition/snapshotFromScanResult';
import { estimateCircumferencesFromComposition } from '@/lib/body-tracker/composition/estimateCircumferencesFromComposition';
import { buildAvatarMorphStamp } from '@/lib/formavision/morph/avatarMorphStamp';
import {
  decideFirstPaintDeadlineAction,
  frameloopUntilFirstPaint,
  shouldLatchHonestFloor,
} from '@/lib/formavision/gl/webglContextRecovery';
import { resolveFloor3dCrossfade } from '@/lib/formavision/motion/floorMotionSpec';
import { selectAvatarSurface } from '@/lib/formavision/tier/avatarSurfaceDecision';
import {
  hasReadyScanData,
  isAlienFloorReadySuccessFail,
  resolveReadyPlatePresentation,
} from '@/lib/formavision/tier/readyPlateContract';
import { pickReadyFrblSessionId, selectPlateMeshSource } from '@/lib/formavision/meshy/selectPlateMeshSource';
import { shouldKickMeshyCreate } from '@/hooks/formavision/useMeshyVisual';

const webRoot = process.cwd();

function src(rel: string): string {
  return readFileSync(join(webRoot, rel), 'utf8');
}

function garyReadyScan() {
  return snapshotFromPhotoScanSummary({
    id: 'prod-ready-184',
    date: '2026-09-01',
    estimatedBodyFatMin: 30,
    estimatedBodyFatMax: 36,
    estimatedWhrMin: 0.84,
    estimatedWhrMax: 0.88,
  });
}

describe('Production FAIL #184: Ready morph never selects the alien floor', () => {
  it('Gary Ready BF 30–36% is Ready data with an applied morph stamp', () => {
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
  });

  it('Ready + missed first-paint presents scan-mesh, not unavailable alien', () => {
    const presented = resolveReadyPlatePresentation({
      canvasHasPainted: false,
      fellBack: true,
      recovering: false,
      hasReadyScanData: true,
    });
    expect(presented.resultKind).toBe('scan-mesh');
    expect(presented.floorRole).toBe('hidden');
    expect(presented.floorPresented).toBe(false);
    expect(
      isAlienFloorReadySuccessFail({
        hasReadyScanData: true,
        ...presented,
      }),
    ).toBe(false);
    expect(
      isAlienFloorReadySuccessFail({
        hasReadyScanData: true,
        resultKind: 'unavailable',
        floorRole: 'unavailable',
        floorPresented: true,
      }),
    ).toBe(true);
  });

  it('deadline on Ready presents the mesh; only no-scan data latches alien', () => {
    expect(
      decideFirstPaintDeadlineAction({ painted: false, hasReadyScanData: true }),
    ).toBe('present-ready-mesh');
    expect(decideFirstPaintDeadlineAction({ painted: false })).toBe('latch-unavailable');
    expect(shouldLatchHonestFloor({ hasReadyScanData: true })).toBe(false);
    expect(frameloopUntilFirstPaint(false)).toBe('always');
  });

  it('Ready confirmed-failure still mounts 3D and keeps morph3d compositable', () => {
    expect(
      selectAvatarSurface({
        renderTier: 'cinematic',
        confirmedFailure: true,
        webgl: 'unavailable',
        hasReadyScanData: true,
      }),
    ).toBe('formavision3d');
    const fade = resolveFloor3dCrossfade({
      liveCanvasHasPainted: false,
      recovering: false,
      fellBack: true,
      hasReadyScanData: true,
    });
    expect(fade.morph3d).toBe(1);
    expect(fade.floorOpacity).toBe(0);
  });

  it('page floor is not the Ready success surface', () => {
    const page = src('src/app/(app)/(consumer)/body-tracker/formavision/page.tsx');
    expect(page).toMatch(/formavision-plate-floor/);
    expect(page).toMatch(/plateFloorMotion\.floorOpacity/);
    expect(page).toMatch(/floorRoleForAnatomicalFloor\(plateFloorMotion\.floorRole\)/);
    expect(page).toMatch(/useMeshyVisual\(readyFrblSessionId\)/);
    expect(page).toMatch(/meshyGlbUrl=\{meshyVisual\.glbUrl\}/);
    expect(page).not.toMatch(/picassoPack/);
    expect(page).not.toMatch(/formavision\/picasso/);
    const avatar = src('src/components/formavision/BodyCompositionAvatar.tsx');
    expect(avatar).toMatch(/hasReadyScanData: readyLive/);
    expect(avatar).toMatch(/present-ready-mesh/);
    expect(avatar).toMatch(/frameloopUntilFirstPaint/);
    expect(avatar).not.toMatch(/picassoPack/);
  });
});

describe('Meshy create + GLB preference; Picasso never selected', () => {
  it('existing sessionId triggers create', () => {
    expect(shouldKickMeshyCreate('sess-ready', null)).toBe(true);
    expect(shouldKickMeshyCreate('sess-ready', 'sess-ready')).toBe(false);
    expect(shouldKickMeshyCreate(null, null)).toBe(false);
    const hook = src('src/hooks/formavision/useMeshyVisual.ts');
    expect(hook).toMatch(/shouldKickMeshyCreate\(sessionId, createdForRef\.current\)/);
    expect(hook).toMatch(/method: 'POST'/);
    expect(hook).toMatch(/\/api\/formavision\/meshy/);
  });

  it('signed GLB is preferred when the URL exists and load did not fail', () => {
    expect(
      selectPlateMeshSource({
        meshyGlbUrl: 'https://storage.example/u/s/meshy/visual.glb?token=1',
        meshyStatus: 'succeeded',
        glbLoadFailed: false,
      }),
    ).toBe('meshy-glb');
    expect(
      pickReadyFrblSessionId([
        {
          id: 'photo-no-frbl',
          protocol: 'formavision_photo',
          captureStatus: 'ready',
          poses: { front: false, right: false, back: false, left: false },
        },
        {
          id: 'existing-frbl',
          protocol: '4pose_v1',
          captureStatus: 'ready',
          poses: { front: true, right: true, back: false, left: false },
        },
      ]),
    ).toBe('existing-frbl');
  });

  it('Picasso is never a plate mesh source', () => {
    expect(selectPlateMeshSource.toString()).not.toMatch(/picasso/i);
    const states = [
      selectPlateMeshSource({ meshyGlbUrl: null, meshyStatus: 'idle', glbLoadFailed: false }),
      selectPlateMeshSource({
        meshyGlbUrl: 'https://example/broken.glb',
        meshyStatus: 'succeeded',
        glbLoadFailed: true,
      }),
      selectPlateMeshSource({
        meshyGlbUrl: null,
        meshyStatus: 'skipped_no_key',
        glbLoadFailed: false,
      }),
    ];
    expect(states.every((source) => source === 'parametric')).toBe(true);
    expect(JSON.stringify(states)).not.toMatch(/picasso/i);
    const canvas = src('src/components/formavision/FormaVisionCanvas.tsx');
    expect(canvas).toContain('selectPlateMeshSource');
    expect(canvas).not.toMatch(/formavision\/picasso/);
    expect(canvas).not.toMatch(/picassoPack/);
  });
});
