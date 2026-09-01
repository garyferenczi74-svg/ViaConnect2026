// FormaVision 4-slot order: Front → Right → Back → Left.
// Keys stay on the 209 photo-scan API (left_side / right_side).
// Missing views are omitted from analyze — never invented.

import type { PoseId } from '@/lib/arnold/types';

export type PhotoPosition = 'front' | 'back' | 'left_side' | 'right_side';

export const FORMAVISION_SLOT_ORDER: ReadonlyArray<{
  key: PhotoPosition;
  label: string;
  poseId: PoseId;
}> = [
  { key: 'front', label: 'Front', poseId: 'front' },
  { key: 'right_side', label: 'Right', poseId: 'right' },
  { key: 'back', label: 'Back', poseId: 'back' },
  { key: 'left_side', label: 'Left', poseId: 'left' },
] as const;

export const POSITION_TO_POSE_ID: Record<PhotoPosition, PoseId> = {
  front: 'front',
  back: 'back',
  left_side: 'left',
  right_side: 'right',
};

export const POSE_ID_TO_POSITION: Record<PoseId, PhotoPosition> = {
  front: 'front',
  back: 'back',
  left: 'left_side',
  right: 'right_side',
};

export function emptyFormaVisionSlots<T>(value: T): Record<PhotoPosition, T> {
  return {
    front: value,
    right_side: value,
    back: value,
    left_side: value,
  };
}
