// Ready-scan plate contract after the #182 / #183 / #184 production FAILs.
//
// Gary phone: Ready scan, BF 30–36%, Male. #182 stayed on Loading. #183
// latched hard-unavailable ("FormaVision 3D did not present a frame")
// because canvasHasPainted never fired, then unmounted the mesh. The
// designed outline may flash as loading. It is never the Ready result.
// Honest unavailable is only when there is no Ready scan data.

import type { AnatomicalFloorRole } from './floorRoleCopy';

export type PlatePaintState = 'pending' | 'painted' | 'unavailable';

export type PlateResultKind = 'loading' | 'scan-mesh' | 'unavailable';

export type PlateFloorRole = AnatomicalFloorRole | 'hidden';

export interface PlatePresentationInput {
  canvasHasPainted: boolean;
  fellBack: boolean;
  recovering: boolean;
}

export interface PlatePresentation {
  floorRole: PlateFloorRole;
  resultKind: PlateResultKind;
  paintState: PlatePaintState;
  floorPresented: boolean;
  // Text-only notice. Required while paint is pending so the plate is
  // never a blank navy chamber. Independent of canvasHasPainted after
  // the first-paint deadline (#186 phone FAIL).
  noticePresented: boolean;
}

export function resolvePlatePresentation(
  input: PlatePresentationInput,
): PlatePresentation {
  if (input.fellBack) {
    return {
      floorRole: 'unavailable',
      resultKind: 'unavailable',
      paintState: 'unavailable',
      floorPresented: true,
      noticePresented: true,
    };
  }
  if (input.recovering) {
    return {
      floorRole: 'loading',
      resultKind: 'loading',
      paintState: 'pending',
      floorPresented: true,
      noticePresented: true,
    };
  }
  if (input.canvasHasPainted) {
    return {
      floorRole: 'hidden',
      resultKind: 'scan-mesh',
      paintState: 'painted',
      floorPresented: false,
      noticePresented: false,
    };
  }
  return {
    floorRole: 'loading',
    resultKind: 'loading',
    paintState: 'pending',
    floorPresented: true,
    noticePresented: true,
  };
}

export interface ReadyPlatePresentationInput extends PlatePresentationInput {
  hasReadyScanData: boolean;
  // Set after the first-paint deadline presents the Ready mesh without
  // stamping canvasHasPainted. The labeled outline must already be hidden.
  presentReadyWithoutPaint?: boolean;
}

// Ready + BF/girths never presents the labeled alien — not as loading,
// unavailable, Ready, or a flash. Navy + live mesh (or text-only notice).
export function resolveReadyPlatePresentation(
  input: ReadyPlatePresentationInput,
): PlatePresentation {
  if (!input.hasReadyScanData) {
    return resolvePlatePresentation(input);
  }
  if (input.canvasHasPainted) {
    return {
      floorRole: 'hidden',
      resultKind: 'scan-mesh',
      paintState: 'painted',
      floorPresented: false,
      noticePresented: false,
    };
  }
  if (input.presentReadyWithoutPaint) {
    return {
      floorRole: 'hidden',
      resultKind: 'scan-mesh',
      paintState: 'pending',
      floorPresented: false,
      // Mesh is mounted after the deadline. Holding the loading caption
      // forever is the #189 phone FAIL (Gary stuck on Loading, F3 gone).
      noticePresented: false,
    };
  }
  return {
    floorRole: 'hidden',
    resultKind: 'scan-mesh',
    paintState: 'pending',
    floorPresented: false,
    noticePresented: true,
  };
}

// Never-empty plate: a text notice while the paint stamp is missing AND
// the Ready mesh is not yet mounted. After the ~8s deadline the holographic
// mesh stays compositable — do not require canvasHasPainted, and do not
// keep the Loading caption over Ready. Do not fake the paint stamp.
export function shouldPresentPlateNotice(input: {
  canvasHasPainted: boolean;
  hasReadyScanData?: boolean;
  presentReadyWithoutPaint?: boolean;
}): boolean {
  if (input.canvasHasPainted) return false;
  if (input.presentReadyWithoutPaint) return false;
  return Boolean(input.hasReadyScanData);
}

// Blank navy chamber alone (no mesh paint, no text notice, no mounted mesh)
// is FAIL. After the deadline a mounted F3 path is never-empty even when
// the paint stamp lags.
export function isBlankOnlyPlateFail(input: {
  hasReadyScanData: boolean;
  paintState: PlatePaintState;
  noticePresented: boolean;
  presentReadyWithoutPaint?: boolean;
}): boolean {
  if (!input.hasReadyScanData) return false;
  if (input.paintState === 'painted') return false;
  if (input.noticePresented) return false;
  if (input.presentReadyWithoutPaint) return false;
  return true;
}

// #189: honesty notice permanently covering a mounted Ready mesh is FAIL.
export function isNoticeCoveringMountedReadyFail(input: {
  hasReadyScanData: boolean;
  presentReadyWithoutPaint: boolean;
  noticePresented: boolean;
}): boolean {
  return input.hasReadyScanData && input.presentReadyWithoutPaint && input.noticePresented;
}

// Alien / designed outline presented as the Ready success surface is FAIL.
export function isAlienFloorReadySuccessFail(input: {
  hasReadyScanData: boolean;
  resultKind: PlateResultKind;
  floorRole: PlateFloorRole;
  floorPresented: boolean;
}): boolean {
  if (!input.hasReadyScanData) return false;
  if (input.resultKind === 'unavailable' && input.floorPresented) return true;
  if (
    input.floorPresented &&
    input.resultKind === 'scan-mesh' &&
    (input.floorRole === 'unavailable' || input.floorRole === 'loading')
  ) {
    return true;
  }
  return false;
}

export function floorRoleForAnatomicalFloor(
  role: PlateFloorRole,
): AnatomicalFloorRole {
  return role === 'unavailable' ? 'unavailable' : 'loading';
}

export function hasReadyScanData(
  scan: {
    totalBodyFatPct?: number | null;
    estimatedBodyFatMin?: number | null;
    estimatedBodyFatMax?: number | null;
  } | null,
): boolean {
  if (!scan) return false;
  if (typeof scan.totalBodyFatPct === 'number' && Number.isFinite(scan.totalBodyFatPct)) {
    return scan.totalBodyFatPct > 0;
  }
  return (
    typeof scan.estimatedBodyFatMin === 'number' &&
    typeof scan.estimatedBodyFatMax === 'number' &&
    Number.isFinite(scan.estimatedBodyFatMin) &&
    Number.isFinite(scan.estimatedBodyFatMax)
  );
}

// Permanent loading-role floor with Ready data is FAIL.
// Gary 2026-09-03: even a brief loading outline on Ready is FAIL.
export function isPermanentLoadingRoleFail(input: {
  hasReadyScanData: boolean;
  floorRole: PlateFloorRole;
  resultKind: PlateResultKind;
  paintState: PlatePaintState;
  floorPresented: boolean;
}): boolean {
  if (!input.hasReadyScanData) return false;
  if (input.floorPresented && input.floorRole === 'loading') {
    return true;
  }
  if (input.paintState === 'unavailable' && input.floorRole === 'loading') {
    return true;
  }
  if (
    input.resultKind === 'scan-mesh' &&
    input.floorPresented &&
    input.floorRole === 'loading'
  ) {
    return true;
  }
  return false;
}

export function formatPlateDiagnostics(
  presentation: Pick<PlatePresentation, 'floorRole' | 'paintState'>,
): string {
  return `floor=${presentation.floorRole} paint=${presentation.paintState}`;
}

// Ready success look. Brief 60 / Gary F3 lock: designed holographic grid.
// Additive shards are Picasso — FAIL. Opaque solid-human is no longer the
// parametric Ready stamp (#188 anti-shards, superseded so F3 can land).
export type ReadyParametricLook = 'holographic' | 'solid' | 'wireframe';

export type ReadySuccessLook =
  | 'holographic-f3'
  | 'solid-human'
  | 'meshy-glb'
  | 'wireframe-picasso';

export const READY_PARAMETRIC_SUCCESS_LOOK = 'holographic-f3' as const;

export function resolveReadySuccessLook(input: {
  meshSource: 'parametric' | 'meshy-glb';
  parametricLook: ReadyParametricLook;
}): ReadySuccessLook {
  if (input.meshSource === 'meshy-glb') return 'meshy-glb';
  if (input.parametricLook === 'holographic') return 'holographic-f3';
  if (input.parametricLook === 'solid') return 'solid-human';
  return 'wireframe-picasso';
}

export function isAllowedReadySuccessLook(look: ReadySuccessLook): boolean {
  return look === 'holographic-f3' || look === 'meshy-glb';
}

// Painted or pending Ready must not treat a wireframe/Picasso shard field
// as the success surface. Honest notice is allowed while paint is pending;
// the mesh under it still cannot be the additive shard look.
export function isPicassoWireframeSuccessFail(input: {
  hasReadyScanData: boolean;
  look: ReadySuccessLook;
}): boolean {
  return input.hasReadyScanData && input.look === 'wireframe-picasso';
}

// #188 solid-human as the parametric Ready stamp kills Frame 3. Meshy GLB
// remains an allowed mesh source; ghost overlays may still request solid.
export function isSolidOnlyReadySuccessFail(input: {
  hasReadyScanData: boolean;
  look: ReadySuccessLook;
  meshSource: 'parametric' | 'meshy-glb';
}): boolean {
  return input.hasReadyScanData && input.meshSource === 'parametric' && input.look === 'solid-human';
}

export function isHumanShapedBodyBounds(input: {
  min: { x: number; y: number; z: number };
  max: { x: number; y: number; z: number };
}): boolean {
  const height = input.max.y - input.min.y;
  const width = input.max.x - input.min.x;
  const depth = input.max.z - input.min.z;
  if (!Number.isFinite(height) || !Number.isFinite(width) || !Number.isFinite(depth)) {
    return false;
  }
  if (height < 1.0 || height > 2.6) return false;
  if (width <= 0 || depth <= 0) return false;
  if (width > height * 0.95) return false;
  if (depth > height * 0.85) return false;
  return true;
}
