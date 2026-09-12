// Brief 65 smoke — Ready Wireframe build + fail-reason diagnostics.
// SUCCESS is processSilhouette mask/contour → dense cyan cage only.
// Fail stays on the Wireframe chamber with Lex honesty. Never a
// parametric mannequin, floor plate, Picasso pack, or Meshy-Tripo GLB.

import { processSilhouette } from '@/lib/arnold/scanning/silhouetteProcessor';
import type { PoseSilhouette } from '@/lib/arnold/scanning/types';
import type { PoseId } from '@/lib/scan/poses';
import { safeLog } from '@/lib/utils/safe-log';
import {
  buildDenseCageFromMask,
  silhouetteMaskIsBodyMatched,
  type FrblWireframeCageSpec,
} from '@/lib/formavision/viewer/frblWireframeCage';
import { fetchSignedFullBlob } from '@/lib/formavision/viewer/signedFullUrlCache';

const LOG_SCOPE = 'formavision.frblReadyWireframe';

export const FRBL_WIREFRAME_FAIL_REASONS = [
  'blob',
  'seg',
  'match',
  'cage',
  'timeout',
  'unknown',
] as const;

export type FrblWireframeFailReason = (typeof FRBL_WIREFRAME_FAIL_REASONS)[number];

export type FrblReadyWireframeBuildResult =
  | { ok: true; spec: FrblWireframeCageSpec }
  | { ok: false; reason: FrblWireframeFailReason };

export function isFrblWireframeFailReason(
  value: unknown,
): value is FrblWireframeFailReason {
  return (
    typeof value === 'string' &&
    (FRBL_WIREFRAME_FAIL_REASONS as readonly string[]).includes(value)
  );
}

export function isAbortLike(error: unknown, signal?: AbortSignal): boolean {
  if (signal?.aborted) return true;
  if (typeof error === 'object' && error !== null && 'name' in error) {
    const name = String((error as { name: unknown }).name);
    if (name === 'AbortError' || name === 'TimeoutError') return true;
  }
  return false;
}

export function classifyWireframeThrow(
  error: unknown,
  signal?: AbortSignal,
): Extract<FrblWireframeFailReason, 'timeout' | 'unknown'> {
  return isAbortLike(error, signal) ? 'timeout' : 'unknown';
}

/**
 * Packed mask must be read in the same w×h as packBinaryMask (maskImage).
 * Prefer maskDimensions; fall back to imageWidth/Height when the packed
 * length matches that area (legacy callers).
 */
export function resolveFrblWireframeMaskFrame(silhouette: {
  mask?: Uint8Array;
  imageWidth: number;
  imageHeight: number;
  maskDimensions?: { width: number; height: number };
  contour?: PoseSilhouette['contour'];
}): {
  mask?: Uint8Array;
  width: number;
  height: number;
  contour?: PoseSilhouette['contour'];
} {
  const dimW = silhouette.maskDimensions?.width;
  const dimH = silhouette.maskDimensions?.height;
  const dimArea =
    typeof dimW === 'number' && typeof dimH === 'number' ? dimW * dimH : -1;
  const imageArea = silhouette.imageWidth * silhouette.imageHeight;
  const packed = silhouette.mask;

  if (packed && dimArea > 0 && packed.length === dimArea) {
    return {
      mask: packed,
      width: dimW as number,
      height: dimH as number,
      contour: silhouette.contour,
    };
  }
  if (packed && packed.length === imageArea) {
    return {
      mask: packed,
      width: silhouette.imageWidth,
      height: silhouette.imageHeight,
      contour: silhouette.contour,
    };
  }
  return {
    mask: packed,
    width: typeof dimW === 'number' && dimW > 0 ? dimW : silhouette.imageWidth,
    height: typeof dimH === 'number' && dimH > 0 ? dimH : silhouette.imageHeight,
    contour: silhouette.contour,
  };
}

export function logFrblWireframeFail(
  reason: FrblWireframeFailReason,
  extra?: { poseId?: PoseId; error?: unknown },
): void {
  safeLog.warn(LOG_SCOPE, 'Ready Wireframe failed — stay on Wireframe chamber', {
    reason,
    poseId: extra?.poseId,
    error:
      extra?.error instanceof Error
        ? extra.error.message
        : extra?.error != null
          ? String(extra.error)
          : undefined,
  });
}

export async function runFrblReadyWireframeBuild(input: {
  sessionId: string;
  side: PoseId;
  signal?: AbortSignal;
  fetchBlob?: (
    sessionId: string,
    view: PoseId,
    signal?: AbortSignal,
  ) => Promise<Blob | null>;
  segment?: typeof processSilhouette;
}): Promise<FrblReadyWireframeBuildResult> {
  const fetchBlob = input.fetchBlob ?? fetchSignedFullBlob;
  const segment = input.segment ?? processSilhouette;
  const { sessionId, side, signal } = input;

  if (signal?.aborted) {
    logFrblWireframeFail('timeout', { poseId: side });
    return { ok: false, reason: 'timeout' };
  }

  let blob: Blob | null;
  try {
    blob = await fetchBlob(sessionId, side, signal);
  } catch (error) {
    const reason = classifyWireframeThrow(error, signal);
    logFrblWireframeFail(reason, { poseId: side, error });
    return { ok: false, reason };
  }
  if (signal?.aborted) {
    logFrblWireframeFail('timeout', { poseId: side });
    return { ok: false, reason: 'timeout' };
  }
  if (!blob) {
    logFrblWireframeFail('blob', { poseId: side });
    return { ok: false, reason: 'blob' };
  }

  let silhouette: PoseSilhouette;
  try {
    silhouette = await segment({
      blob,
      poseId: side,
      userHeightCm: null,
      landmarks: {},
      includeMask: true,
    });
  } catch (error) {
    const reason = isAbortLike(error, signal) ? 'timeout' : 'seg';
    logFrblWireframeFail(reason, { poseId: side, error });
    return { ok: false, reason };
  }
  if (signal?.aborted) {
    logFrblWireframeFail('timeout', { poseId: side });
    return { ok: false, reason: 'timeout' };
  }

  const frame = resolveFrblWireframeMaskFrame(silhouette);
  const matched = silhouetteMaskIsBodyMatched({
    mask: frame.mask,
    width: frame.width,
    height: frame.height,
    contour: frame.contour,
  });
  if (!matched || !frame.mask) {
    logFrblWireframeFail('match', { poseId: side });
    return { ok: false, reason: 'match' };
  }

  const cage = buildDenseCageFromMask(
    frame.mask,
    frame.width,
    frame.height,
    frame.contour ?? [],
  );
  if (!cage) {
    logFrblWireframeFail('cage', { poseId: side });
    return { ok: false, reason: 'cage' };
  }

  return { ok: true, spec: cage };
}
