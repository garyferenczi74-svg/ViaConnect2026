import type { MeshyErrorCode, MeshyVisualStatus } from '@/lib/formavision/meshy/types';
import {
  isMeshyVisualGlbReady,
  isTerminalMeshyWithoutGlb,
} from './selectReadyViewer';

// Arnold #192 www FAIL: parked Ready had no Meshy/paint deadline, so idle
// or pending stayed on "Loading 3D avatar" + paint=pending forever.
// Meshy textured GLB can take a couple of minutes; this is a hard bound
// so the plate becomes an honest notice instead of a navy Loading shroud.
export const MESHY_READY_WAIT_MS = 120_000;
export const MESHY_PAINT_WAIT_MS = 12_000;

export interface MeshyReadyWaitInput {
  meshyStatus: MeshyVisualStatus;
  meshyGlbUrl: string | null;
  glbLoadFailed?: boolean;
  waitExpired?: boolean;
  historyResolved?: boolean;
  sessionId?: string | null;
}

export function hasMeshySessionId(sessionId: string | null | undefined): boolean {
  return typeof sessionId === 'string' && sessionId.length > 0;
}

export function shouldTreatMeshyAsUnavailable(input: MeshyReadyWaitInput): boolean {
  if (isMeshyVisualGlbReady(input)) return false;
  if (isTerminalMeshyWithoutGlb(input)) return true;
  if (input.glbLoadFailed) return true;
  if (input.waitExpired) return true;
  if (input.historyResolved === true && !hasMeshySessionId(input.sessionId)) {
    return true;
  }
  return false;
}

export function decideReadyNoticeKind(
  input: MeshyReadyWaitInput,
): 'loading' | 'unavailable' {
  return shouldTreatMeshyAsUnavailable(input) ? 'unavailable' : 'loading';
}

export function meshyStatusAfterWaitExpired(
  current: MeshyVisualStatus,
): MeshyVisualStatus {
  if (current === 'succeeded') return 'succeeded';
  if (
    current === 'failed' ||
    current === 'moderation_blocked' ||
    current === 'skipped_no_key'
  ) {
    return current;
  }
  return 'failed';
}

export function meshyErrorAfterWaitExpired(
  current: MeshyErrorCode | null,
): MeshyErrorCode {
  return current ?? 'timeout';
}

export function shouldMarkMeshyCreateAttempted(
  body: Record<string, unknown> | null,
): boolean {
  if (!body) return false;
  if (body.ok === true || body.skipped === true) return true;
  const visual = body.visual;
  if (!visual || typeof visual !== 'object') return false;
  const rec = visual as Record<string, unknown>;
  const status = rec.status;
  const taskId = rec.taskId;
  if (typeof taskId === 'string' && taskId.length > 0) return true;
  return (
    status === 'pending' ||
    status === 'in_progress' ||
    status === 'succeeded' ||
    status === 'failed' ||
    status === 'moderation_blocked' ||
    status === 'skipped_no_key'
  );
}

export function visualFromMeshyPollBody(
  body: Record<string, unknown> | null,
): {
  status: MeshyVisualStatus | null;
  glbPath: string | null;
  signedUrl: string | null;
  errorCode: MeshyErrorCode | null;
  terminalWithoutVisual: boolean;
} {
  if (!body) {
    return {
      status: null,
      glbPath: null,
      signedUrl: null,
      errorCode: null,
      terminalWithoutVisual: false,
    };
  }
  const signedUrl = typeof body.signedUrl === 'string' ? body.signedUrl : null;
  const visual = body.visual;
  if (visual && typeof visual === 'object') {
    const rec = visual as Record<string, unknown>;
    const status = rec.status;
    return {
      status:
        status === 'idle' ||
        status === 'pending' ||
        status === 'in_progress' ||
        status === 'succeeded' ||
        status === 'failed' ||
        status === 'moderation_blocked' ||
        status === 'skipped_no_key'
          ? status
          : null,
      glbPath: typeof rec.glbPath === 'string' ? rec.glbPath : null,
      signedUrl,
      errorCode: typeof rec.errorCode === 'string' ? (rec.errorCode as MeshyErrorCode) : null,
      terminalWithoutVisual: false,
    };
  }
  const error = body.error;
  if (error === 'not_found' || error === 'Unauthorized' || error === 'unauthorized') {
    return {
      status: 'failed',
      glbPath: null,
      signedUrl: null,
      errorCode: error === 'not_found' ? 'not_found' : 'unauthorized',
      terminalWithoutVisual: true,
    };
  }
  return {
    status: null,
    glbPath: null,
    signedUrl,
    errorCode: null,
    terminalWithoutVisual: false,
  };
}
