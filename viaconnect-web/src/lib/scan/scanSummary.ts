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
 * Arnold FRBL preference: show the 4-pose grid when a photo scan has real
 * present views / storage thumbs. Otherwise hide the grid (no ImageOff).
 * Guided 4pose_v1 always uses the grid.
 */
export function scanHistoryShowsFrblGrid(scan: Pick<ScanSummary, 'protocol' | 'poses'>): boolean {
  if (scan.protocol !== FORMAVISION_PHOTO_PROTOCOL) return true;
  return hasAnyPresentPose(scan.poses);
}
