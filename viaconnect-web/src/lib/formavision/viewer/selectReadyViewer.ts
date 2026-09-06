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

// Gary 2026-09-06 Michelangelo standing rule: park R3F on Ready for every
// host (phone + desktop + unknown). Also park while scan data is still
// hydrating so the parametric cyan wireframe cannot flash, then unmount
// into a blank navy plate (#191 on e0aa44c5).
//
// R3F stays in FormaVision3DAvatar as a documented non-success fallback
// only. This selector never returns 'r3f' for the product Ready plate.
export function shouldParkR3fReady(_input?: {
  host?: ReadyViewerHost;
  hasReadyScanData?: boolean;
}): boolean {
  return true;
}

/** @deprecated Use shouldParkR3fReady. Phone-only park caused the #191 FAIL. */
export function shouldParkPhoneR3fReady(input: {
  host: ReadyViewerHost;
  hasReadyScanData: boolean;
}): boolean {
  return shouldParkR3fReady(input);
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

export function isParametricReadyViewerFail(input: {
  hasReadyScanData: boolean;
  readyViewer: ReadyViewerKind;
}): boolean {
  return input.hasReadyScanData && input.readyViewer === 'r3f';
}

export function selectReadyViewer(input: SelectReadyViewerInput): ReadyViewerKind {
  if (isMeshyVisualGlbReady(input)) return 'model-viewer';
  return 'notice';
}
