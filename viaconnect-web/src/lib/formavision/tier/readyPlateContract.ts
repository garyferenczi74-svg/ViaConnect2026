// Ready-scan plate contract after the #182 production FAIL.
//
// Gary phone: Ready scan, BF 30–36%, Male, stayed on the labeled loading
// floor ("Loading 3D avatar…") with no live WebGL mesh. That state is
// illegal once a first frame has painted OR once 3D has confirmed it
// cannot paint. The designed outline may flash as loading or sit as
// hard-unavailable. It is never a permanent Ready result.

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
    };
  }
  if (input.recovering) {
    return {
      floorRole: 'loading',
      resultKind: 'loading',
      paintState: 'pending',
      floorPresented: true,
    };
  }
  if (input.canvasHasPainted) {
    return {
      floorRole: 'hidden',
      resultKind: 'scan-mesh',
      paintState: 'painted',
      floorPresented: false,
    };
  }
  return {
    floorRole: 'loading',
    resultKind: 'loading',
    paintState: 'pending',
    floorPresented: true,
  };
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
// Brief loading before the first painted frame is allowed.
export function isPermanentLoadingRoleFail(input: {
  hasReadyScanData: boolean;
  floorRole: PlateFloorRole;
  resultKind: PlateResultKind;
  paintState: PlatePaintState;
  floorPresented: boolean;
}): boolean {
  if (!input.hasReadyScanData) return false;
  if (
    input.paintState === 'painted' &&
    input.floorPresented &&
    input.floorRole === 'loading'
  ) {
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
