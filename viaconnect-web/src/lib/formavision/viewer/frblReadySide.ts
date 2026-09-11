import { POSE_ORDER, type PoseId } from '@/lib/scan/poses';

export const FRBL_SIDE_ORDER: readonly PoseId[] = POSE_ORDER;

export const FRBL_SIDE_LABELS: Record<PoseId, string> = {
  front: 'Front',
  right: 'Right',
  back: 'Back',
  left: 'Left',
};

export const FRBL_SIDE_UNAVAILABLE_HELPER =
  'This side was not kept. Choose another Ready photo.';

export function hasRetainedFrblReady(input: {
  photosRetained?: boolean | null;
  frblPoses?: Record<string, boolean> | null;
  frblSessionId?: string | null;
}): boolean {
  if (input.photosRetained !== true) return false;
  if (typeof input.frblSessionId !== 'string' || input.frblSessionId.length === 0) {
    return false;
  }
  return hasAnyFrblSide(input.frblPoses);
}

export function hasAnyFrblSide(
  poses: Record<string, boolean> | null | undefined,
): boolean {
  if (!poses) return false;
  return FRBL_SIDE_ORDER.some((side) => poses[side] === true);
}

export function isFrblSidePresent(
  poses: Record<string, boolean> | null | undefined,
  side: PoseId,
): boolean {
  return poses?.[side] === true;
}

/**
 * Default Ready side: Front when that pose was kept; otherwise the first
 * available pose in Front · Right · Back · Left order.
 */
export function defaultFrblReadySide(
  poses: Record<string, boolean> | null | undefined,
): PoseId | null {
  if (isFrblSidePresent(poses, 'front')) return 'front';
  return FRBL_SIDE_ORDER.find((side) => isFrblSidePresent(poses, side)) ?? null;
}

export function frblSideToggleState(
  poses: Record<string, boolean> | null | undefined,
): Record<PoseId, { present: boolean; disabled: boolean }> {
  return {
    front: { present: isFrblSidePresent(poses, 'front'), disabled: !isFrblSidePresent(poses, 'front') },
    right: { present: isFrblSidePresent(poses, 'right'), disabled: !isFrblSidePresent(poses, 'right') },
    back: { present: isFrblSidePresent(poses, 'back'), disabled: !isFrblSidePresent(poses, 'back') },
    left: { present: isFrblSidePresent(poses, 'left'), disabled: !isFrblSidePresent(poses, 'left') },
  };
}
