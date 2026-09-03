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
  const match = scans.find((scan) => {
    if (scan.protocol !== guidedProtocol) return false;
    if (scan.captureStatus !== 'ready') return false;
    return Object.values(scan.poses).some(Boolean);
  });
  return match?.id ?? null;
}
