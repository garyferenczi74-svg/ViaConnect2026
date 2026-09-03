// Honest 2D-floor roles. The designed anatomical outline may paint only as
// a loading shroud or a hard-failure floor. It is never the user's Ready
// scan result and must never be a third-party stock body.

export type AnatomicalFloorRole = 'loading' | 'unavailable';

export const FORMAVISION_FLOOR_LOADING_COPY =
  'Loading 3D avatar from your scan. This outline is not your body.';

export const FORMAVISION_FLOOR_UNAVAILABLE_COPY =
  '3D avatar unavailable. This outline is not your scan.';

export function floorRoleCopy(role: AnatomicalFloorRole): string {
  return role === 'unavailable'
    ? FORMAVISION_FLOOR_UNAVAILABLE_COPY
    : FORMAVISION_FLOOR_LOADING_COPY;
}
