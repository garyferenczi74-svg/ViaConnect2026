// Brief 65 smoke — Ready Wireframe build + fail-reason diagnostics.
// SUCCESS is processSilhouette mask/contour → dense cyan cage only.
// Fail stays on the Wireframe chamber with Lex honesty. Never a
// parametric mannequin, floor plate, Picasso pack, or Meshy-Tripo GLB.

import {
  awaitSelfieSegmenterSettled,
  processSilhouette,
} from '@/lib/arnold/scanning/silhouetteProcessor';
import type { PoseSilhouette } from '@/lib/arnold/scanning/types';
import type { PoseId } from '@/lib/scan/poses';
import { isTimeoutError, withTimeout } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';
import {
  buildDenseCageFromMask,
  silhouetteMaskIsBodyMatched,
  type FrblWireframeCageSpec,
} from '@/lib/formavision/viewer/frblWireframeCage';
import { fetchSignedFullBlob } from '@/lib/formavision/viewer/signedFullUrlCache';

const LOG_SCOPE = 'formavision.frblReadyWireframe';

/** Single cage-build budget — applied once, to processSilhouette only. */
export const FRBL_WIREFRAME_BUILD_TIMEOUT_MS = 20000;

/**
 * Fail-open leftover TFJS init. Shorter than the cage budget so blob +
 * prewarm cannot alone force a false `timeout` before seg starts.
 */
export const FRBL_WIREFRAME_PREWARM_TIMEOUT_MS = 8000;

export const FRBL_WIREFRAME_FAIL_REASONS = [
  'blob',
  'seg',
  'match',
  'cage',
  'timeout',
  'abort',
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
    return String((error as { name: unknown }).name) === 'AbortError';
  }
  return false;
}

export function classifyWireframeThrow(
  error: unknown,
  signal?: AbortSignal,
): Extract<FrblWireframeFailReason, 'timeout' | 'abort' | 'unknown'> {
  if (isTimeoutError(error)) return 'timeout';
  if (typeof error === 'object' && error !== null && 'name' in error) {
    if (String((error as { name: unknown }).name) === 'TimeoutError') return 'timeout';
  }
  if (isAbortLike(error, signal)) return 'abort';
  return 'unknown';
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
  timeoutMs?: number;
  prewarmTimeoutMs?: number;
  fetchBlob?: (
    sessionId: string,
    view: PoseId,
    signal?: AbortSignal,
  ) => Promise<Blob | null>;
  segment?: typeof processSilhouette;
  prewarm?: () => Promise<boolean>;
}): Promise<FrblReadyWireframeBuildResult> {
  const fetchBlob = input.fetchBlob ?? fetchSignedFullBlob;
  const segment = input.segment ?? processSilhouette;
  const prewarm = input.prewarm ?? awaitSelfieSegmenterSettled;
  const timeoutMs = input.timeoutMs ?? FRBL_WIREFRAME_BUILD_TIMEOUT_MS;
  const prewarmTimeoutMs = input.prewarmTimeoutMs ?? FRBL_WIREFRAME_PREWARM_TIMEOUT_MS;
  const { sessionId, side, signal } = input;

  try {
    if (signal?.aborted) {
      logFrblWireframeFail('abort', { poseId: side });
      return { ok: false, reason: 'abort' };
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
      logFrblWireframeFail('abort', { poseId: side });
      return { ok: false, reason: 'abort' };
    }
    if (!blob) {
      logFrblWireframeFail('blob', { poseId: side });
      return { ok: false, reason: 'blob' };
    }

    try {
      await withTimeout(prewarm(), prewarmTimeoutMs, `${LOG_SCOPE}.prewarm`);
    } catch (error) {
      if (isAbortLike(error, signal)) {
        logFrblWireframeFail('abort', { poseId: side, error });
        return { ok: false, reason: 'abort' };
      }
      // Fail-open — leftover TFJS init / short prewarm cap must not
      // classify the cage as timeout before processSilhouette runs.
      safeLog.warn(LOG_SCOPE, 'selfie prewarm failed (fail-open)', {
        poseId: side,
        error: error instanceof Error ? error.message : String(error),
      });
    }
    if (signal?.aborted) {
      logFrblWireframeFail('abort', { poseId: side });
      return { ok: false, reason: 'abort' };
    }

    let silhouette: PoseSilhouette;
    try {
      silhouette = await withTimeout(
        segment({
          blob,
          poseId: side,
          userHeightCm: null,
          landmarks: {},
          includeMask: true,
        }),
        timeoutMs,
        `${LOG_SCOPE}.processSilhouette`,
      );
    } catch (error) {
      const reason = isTimeoutError(error)
        ? 'timeout'
        : isAbortLike(error, signal)
          ? 'abort'
          : 'seg';
      logFrblWireframeFail(reason, { poseId: side, error });
      return { ok: false, reason };
    }
    if (signal?.aborted) {
      logFrblWireframeFail('abort', { poseId: side });
      return { ok: false, reason: 'abort' };
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
  } catch (error) {
    const reason = classifyWireframeThrow(error, signal);
    logFrblWireframeFail(reason, { poseId: side, error });
    return { ok: false, reason };
  }
}
