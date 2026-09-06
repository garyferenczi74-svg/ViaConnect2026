import type { MeshyVisualStatus } from '@/lib/formavision/meshy/types';
import type { ReadyViewerHost } from './detectReadyViewerHost';

export type ReadyViewerKind = 'model-viewer' | 'notice' | 'r3f';

export interface SelectReadyViewerInput {
  host: ReadyViewerHost;
  hasReadyScanData: boolean;
  meshyStatus: MeshyVisualStatus;
  meshyGlbUrl: string | null;
  glbLoadFailed?: boolean;
}

export function isMeshyVisualGlbReady(input: {
  meshyStatus: MeshyVisualStatus;
  meshyGlbUrl: string | null;
  glbLoadFailed?: boolean;
}): boolean {
  return (
    input.meshyStatus === 'succeeded' &&
    typeof input.meshyGlbUrl === 'string' &&
    input.meshyGlbUrl.length > 0 &&
    !input.glbLoadFailed
  );
}

// Sherlock A+C+D / Jeffery lock: park R3F only on Safari phone Ready
// (and unknown SSR so iPhone cannot hydrate the #190 paint-pending canvas).
// Desktop Ready is out of this spike — keep the existing R3F plate.
export function shouldParkPhoneR3fReady(input: {
  host: ReadyViewerHost;
  hasReadyScanData: boolean;
}): boolean {
  if (!input.hasReadyScanData) return false;
  return input.host === 'phone' || input.host === 'unknown';
}

export function isTerminalMeshyWithoutGlb(input: {
  meshyStatus: MeshyVisualStatus;
  meshyGlbUrl: string | null;
  glbLoadFailed?: boolean;
}): boolean {
  if (input.glbLoadFailed) return true;
  if (input.meshyStatus === 'failed') return true;
  if (input.meshyStatus === 'moderation_blocked') return true;
  if (input.meshyStatus === 'skipped_no_key') return true;
  if (input.meshyStatus === 'succeeded' && !isMeshyVisualGlbReady(input)) return true;
  return false;
}

export function selectReadyViewer(input: SelectReadyViewerInput): ReadyViewerKind {
  if (!input.hasReadyScanData) return 'r3f';
  if (!shouldParkPhoneR3fReady(input)) return 'r3f';
  if (isMeshyVisualGlbReady(input)) return 'model-viewer';
  return 'notice';
}
