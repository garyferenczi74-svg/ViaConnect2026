import type { PlateMeshSource, PlateMeshSourceInput } from './types';
import { sessionIdForFrbl } from '@/lib/formavision/retainFrbl';

/**
 * Ready plate mesh picker. Meshy GLB swaps in only when we have OUR stored
 * signed URL and the load did not fail. Picasso is never a source.
 */
export function selectPlateMeshSource(input: PlateMeshSourceInput): PlateMeshSource {
  if (
    input.meshyStatus === 'succeeded' &&
    typeof input.meshyGlbUrl === 'string' &&
    input.meshyGlbUrl.length > 0 &&
    !input.glbLoadFailed
  ) {
    return 'meshy-glb';
  }
  return 'parametric';
}

export function pickReadyFrblSessionId(
  scans: ReadonlyArray<{
    id: string;
    protocol: string;
    captureStatus: string | null;
    poses: Record<string, boolean>;
    photosRetained?: boolean | null;
    frblSessionId?: string | null;
  }> | null,
  guidedProtocol = '4pose_v1',
): string | null {
  if (!scans) return null;
  // Meshy / Tripo read body_photo_sessions pose paths. Discarded
  // formavision_photo rows keep poses.all false and must not be posted.
  // Retained photo rows set poses.any and frblSessionId.
  const withFrbl = scans.filter((scan) => Object.values(scan.poses).some(Boolean));
  if (withFrbl.length === 0) return null;
  const readyGuided = withFrbl.find(
    (scan) => scan.protocol === guidedProtocol && scan.captureStatus === 'ready',
  );
  if (readyGuided) return sessionIdForFrbl(readyGuided);
  const readyRetained = withFrbl.find(
    (scan) => scan.photosRetained === true && scan.captureStatus === 'ready',
  );
  if (readyRetained) return sessionIdForFrbl(readyRetained);
  const readyAny = withFrbl.find((scan) => scan.captureStatus === 'ready');
  if (readyAny) return sessionIdForFrbl(readyAny);
  const guided = withFrbl.find((scan) => scan.protocol === guidedProtocol);
  return sessionIdForFrbl(guided ?? withFrbl[0]);
}
