// Client-safe scan list types. Keep this file free of server imports so
// 'use client' history UI can type the /api/scan/history payload.

import { POSE_ORDER, type PoseId } from '@/lib/scan/poses';
import { FORMAVISION_PHOTO_PROTOCOL } from '@/lib/scan/scanProtocols';

export type ScanCaptureStatus = 'uploading' | 'ready' | 'partial' | 'delete_pending' | 'deleted';

export interface ScanSummary {
  id: string;
  date: string;
  protocol: string;
  captureStatus: ScanCaptureStatus | null;
  poses: Record<PoseId, boolean>;
}

export function hasAnyPresentPose(poses: Record<PoseId, boolean>): boolean {
  return POSE_ORDER.some((pose) => poses[pose]);
}

/**
 * SSOT: formavision_photo never shows the FRBL grid (photos discarded after
 * analyze). No ImageOff, no signed-URL chase, no pose-present mapping.
 * Guided 4pose_v1 always uses the grid.
 */
export function scanHistoryShowsFrblGrid(scan: Pick<ScanSummary, 'protocol'>): boolean {
  return scan.protocol !== FORMAVISION_PHOTO_PROTOCOL;
}
