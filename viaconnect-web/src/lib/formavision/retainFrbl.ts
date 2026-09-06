// FormaVision hybrid Path 2 — opt-in retain FRBL.
// Default is still discard. History / Analyze / Ready must use these strings
// and helpers so consent, pose presence, and Ready session pick agree.

import { POSE_ORDER, type PoseId } from '@/lib/scan/poses';
import { FORMAVISION_PHOTO_PROTOCOL } from '@/lib/scan/scanProtocols';

export const RETAIN_FRBL_DEFAULT = false;

export const RETAIN_FRBL_CONSENT_LABEL =
  'Keep Front, Right, Back, and Left photos for 3D and re-measure';

export const RETAIN_FRBL_CONSENT_BODY =
  'Optional. Photos stay stored so we can build a look-alike 3D body and let you re-measure. Off by default — we discard FRBL after analysis unless you opt in.';

export const DISCARD_FRBL_SHIELD =
  'Photos are used only to calculate measurements. They are not kept as your body photos or used as the Ready 3D body.';

export const RETAIN_FRBL_SHIELD =
  'You opted in to keep Front, Right, Back, and Left for 3D and re-measure. Photos stay stored on your account.';

export const SCAN_HISTORY_PHOTOS_RETAINED = 'Photos kept for 3D and re-measure.';

export const HYBRID_COSETTLE_COPY =
  'The 3D look-alike is visual only. Muscle mass (lbs) comes from Manual, DEXA, or InBody — never from photos.';

export const READY_UNAVAILABLE_VISUAL_FAILED =
  '3D look-alike could not be built from your kept photos. Photo estimate is still saved. This is not a clinical measure.';

export function discardedFrblPoses(): Record<PoseId, boolean> {
  return { front: false, right: false, back: false, left: false };
}

export function retainedFrblPoses(
  views: ReadonlyArray<string> | null | undefined,
): Record<PoseId, boolean> {
  const set = new Set((views ?? []).filter((v) => (POSE_ORDER as readonly string[]).includes(v)));
  const poses = discardedFrblPoses();
  for (const pose of POSE_ORDER) poses[pose] = set.has(pose);
  return poses;
}

export function isRetainedFrblScan(scan: {
  protocol?: string;
  photosRetained?: boolean | null;
  poses: Record<string, boolean>;
}): boolean {
  if (scan.photosRetained !== true) return false;
  if (scan.protocol && scan.protocol !== FORMAVISION_PHOTO_PROTOCOL) return false;
  return Object.values(scan.poses).some(Boolean);
}

export function sessionIdForFrbl(scan: {
  id: string;
  frblSessionId?: string | null;
}): string {
  return typeof scan.frblSessionId === 'string' && scan.frblSessionId.length > 0
    ? scan.frblSessionId
    : scan.id;
}

export function analyzeConsentCopy(retainOptIn: boolean): string {
  return retainOptIn ? RETAIN_FRBL_SHIELD : DISCARD_FRBL_SHIELD;
}

export function historyFrblCopy(scan: {
  protocol?: string;
  photosRetained?: boolean | null;
  poses: Record<string, boolean>;
}): 'retained' | 'discarded' | 'grid' {
  if (isRetainedFrblScan(scan)) return 'retained';
  if (scan.protocol === FORMAVISION_PHOTO_PROTOCOL) return 'discarded';
  return 'grid';
}
