import type { PlateMeshSource, PlateMeshSourceInput } from './types';

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
  }> | null,
  guidedProtocol = '4pose_v1',
): string | null {
  if (!scans) return null;
  // Meshy reads body_photo_sessions pose paths. Photo-analyze rows
  // (formavision_photo) discard images and must not be posted as sessionId.
  const withFrbl = scans.filter((scan) => Object.values(scan.poses).some(Boolean));
  if (withFrbl.length === 0) return null;
  const readyGuided = withFrbl.find(
    (scan) => scan.protocol === guidedProtocol && scan.captureStatus === 'ready',
  );
  if (readyGuided) return readyGuided.id;
  const readyAny = withFrbl.find((scan) => scan.captureStatus === 'ready');
  if (readyAny) return readyAny.id;
  const guided = withFrbl.find((scan) => scan.protocol === guidedProtocol);
  return guided?.id ?? withFrbl[0]?.id ?? null;
}
