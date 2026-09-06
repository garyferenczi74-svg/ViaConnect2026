import type { MeshyVisualStatus } from '@/lib/formavision/meshy/types';
import { FORMAVISION_PHOTO_PROTOCOL } from '@/lib/scan/scanProtocols';
import { sessionIdForFrbl } from '@/lib/formavision/retainFrbl';

export interface HybridPlateVisual {
  glbUrl: string | null;
  status: MeshyVisualStatus;
  provider: 'tripo' | 'meshy' | null;
  failed: boolean;
}

function isGlbReady(
  status: MeshyVisualStatus,
  url: string | null,
  loadFailed: boolean,
): boolean {
  return (
    status === 'succeeded' &&
    typeof url === 'string' &&
    url.length > 0 &&
    !loadFailed
  );
}

function isTerminalFail(status: MeshyVisualStatus, url: string | null, loadFailed: boolean): boolean {
  if (loadFailed) return true;
  if (status === 'failed' || status === 'moderation_blocked' || status === 'skipped_no_key') {
    return true;
  }
  return status === 'succeeded' && !isGlbReady(status, url, loadFailed);
}

export function selectHybridPlateVisual(input: {
  tripoStatus: MeshyVisualStatus;
  tripoGlbUrl: string | null;
  meshyStatus: MeshyVisualStatus;
  meshyGlbUrl: string | null;
  glbLoadFailed?: boolean;
  preferTripo?: boolean;
}): HybridPlateVisual {
  const loadFailed = input.glbLoadFailed === true;
  const preferTripo = input.preferTripo !== false;

  if (preferTripo && isGlbReady(input.tripoStatus, input.tripoGlbUrl, loadFailed)) {
    return { glbUrl: input.tripoGlbUrl, status: input.tripoStatus, provider: 'tripo', failed: false };
  }
  if (isGlbReady(input.meshyStatus, input.meshyGlbUrl, loadFailed)) {
    return { glbUrl: input.meshyGlbUrl, status: input.meshyStatus, provider: 'meshy', failed: false };
  }
  if (isGlbReady(input.tripoStatus, input.tripoGlbUrl, loadFailed)) {
    return { glbUrl: input.tripoGlbUrl, status: input.tripoStatus, provider: 'tripo', failed: false };
  }

  const tripoInFlight =
    input.tripoStatus === 'pending' || input.tripoStatus === 'in_progress' || input.tripoStatus === 'idle';
  const meshyInFlight =
    input.meshyStatus === 'pending' || input.meshyStatus === 'in_progress' || input.meshyStatus === 'idle';

  if (preferTripo && tripoInFlight) {
    return { glbUrl: null, status: input.tripoStatus, provider: 'tripo', failed: false };
  }
  if (meshyInFlight) {
    return { glbUrl: null, status: input.meshyStatus, provider: 'meshy', failed: false };
  }
  if (tripoInFlight) {
    return { glbUrl: null, status: input.tripoStatus, provider: 'tripo', failed: false };
  }

  const tripoFailed = isTerminalFail(input.tripoStatus, input.tripoGlbUrl, loadFailed);
  const meshyFailed = isTerminalFail(input.meshyStatus, input.meshyGlbUrl, loadFailed);
  return {
    glbUrl: null,
    status: preferTripo ? input.tripoStatus : input.meshyStatus,
    provider: preferTripo ? 'tripo' : 'meshy',
    failed: tripoFailed || meshyFailed,
  };
}

type ScanLike = {
  id: string;
  protocol: string;
  captureStatus: string | null;
  poses: Record<string, boolean>;
  photosRetained?: boolean | null;
  frblSessionId?: string | null;
};

function hasPose(scan: ScanLike): boolean {
  return Object.values(scan.poses).some(Boolean);
}

export function pickReadyMeshySessionId(
  scans: ReadonlyArray<ScanLike> | null,
  guidedProtocol = '4pose_v1',
): string | null {
  if (!scans) return null;
  const withFrbl = scans.filter((scan) => scan.protocol === guidedProtocol && hasPose(scan));
  if (withFrbl.length === 0) return null;
  const ready = withFrbl.find((scan) => scan.captureStatus === 'ready');
  return sessionIdForFrbl(ready ?? withFrbl[0]);
}

export function pickReadyTripoSessionId(scans: ReadonlyArray<ScanLike> | null): string | null {
  if (!scans) return null;
  const retained = scans.filter(
    (scan) =>
      scan.photosRetained === true &&
      scan.protocol === FORMAVISION_PHOTO_PROTOCOL &&
      hasPose(scan),
  );
  if (retained.length === 0) return null;
  const ready = retained.find((scan) => scan.captureStatus === 'ready');
  return sessionIdForFrbl(ready ?? retained[0]);
}
