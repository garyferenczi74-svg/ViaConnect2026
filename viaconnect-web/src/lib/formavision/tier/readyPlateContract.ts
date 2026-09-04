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
  return {
    floorRole: 'hidden',
    resultKind: 'scan-mesh',
    paintState: 'pending',
    floorPresented: false,
    noticePresented: true,
  };
}

// Never-empty plate: a text notice while the paint stamp is missing.
// After the ~8s deadline, do not wait for canvasHasPainted to show it.
// Ready + pending without a notice is the #186 blank-navy FAIL.
export function shouldPresentPlateNotice(input: {
  canvasHasPainted: boolean;
  hasReadyScanData?: boolean;
  presentReadyWithoutPaint?: boolean;
}): boolean {
  if (input.canvasHasPainted) return false;
  if (input.presentReadyWithoutPaint) return true;
  return Boolean(input.hasReadyScanData);
}

// Blank navy chamber alone (no mesh paint, no text notice) is FAIL.
// morph3d compositable is not enough — phone WebKit can sit on
// floor=hidden paint=pending with an undrawn buffer forever.
export function isBlankOnlyPlateFail(input: {
  hasReadyScanData: boolean;
  paintState: PlatePaintState;
  noticePresented: boolean;
  presentReadyWithoutPaint?: boolean;
}): boolean {
  if (!input.hasReadyScanData) return false;
  if (input.paintState === 'painted') return false;
  if (input.noticePresented) return false;
  return true;
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
