// Prompt 231: client-direct signed-upload orchestration for the 4-pose
// scan. Supersedes the earlier shape that posted all 4 JPEGs in one
// multipart body (risked Vercel's 4.5MB request-body cap) and wrote a
// full-size copy as a fake thumb. The flow is now:
//   1. POST /api/scan/prepare (metadata only, no image bytes) - idempotent
//      on the caller-supplied scanId - returns signed UPLOAD URLs for the
//      full + thumb object of each non-skipped pose.
//   2. Upload each full + thumb blob DIRECTLY to Storage via
//      uploadToSignedUrl. Image bytes never transit this app's API routes.
//   3. POST /api/scan/finalize (metadata + the paths just uploaded to) - the
//      server re-verifies each path (pattern + existence) before recording
//      it and only reports success after capture_status='ready' confirms.
// finalize is always called, even when some uploads failed, so the session
// never gets silently stuck at 'uploading' - the server records whatever
// succeeded and marks the rest 'partial'.
//
// Object URLs for captured frames are revoked ONLY after finalize confirms
// a CONFIRMED ready result - never before, and never on a partial (the
// caller may still retry with the live blobs).
//
// persist.ts does NOT generate a thumbnail; the caller supplies both the
// full-resolution blob (ScanFrame.blob) and a REAL thumb blob
// (ScanUploadFrame.thumbBlob) and this module uploads exactly what it is
// given.

import { createClient } from '@/lib/supabase/client';
import { assertWriteConfirmed } from '@/lib/nutrition/stateContract228';
import { withTimeout } from '@/lib/utils/with-timeout';
import { SCAN_SAVING_TIMEOUT_MS } from './scanTimeouts';
import { POSE_ORDER } from './poses';
import type { PoseId } from './poses';
import type { ScanFrame } from './types';

const BUCKET = 'body-progress-photos';

/** A captured frame ready to persist: ScanFrame's existing full-resolution
 * `blob` plus a REAL thumb blob. thumbObjectUrl is optional - a caller that
 * builds the thumb via canvas.toBlob with no object URL never has to mint
 * one just to have something to revoke. */
export type ScanUploadFrame = ScanFrame & { thumbBlob: Blob; thumbObjectUrl?: string };

export interface PersistScanResult {
  ok: boolean;
  sessionId?: string;
  failedPoses?: PoseId[];
  error?: string;
  nextAction?: string;
}

interface SignedUploadTarget {
  path: string;
  token: string;
  signedUrl: string;
}

interface PrepareUpload {
  pose: PoseId;
  full: SignedUploadTarget;
  thumb: SignedUploadTarget;
}

interface PrepareResponseBody {
  ok: boolean;
  sessionId?: string;
  uploads?: PrepareUpload[];
  error?: string;
  nextAction?: string;
}

interface FinalizeResponseBody {
  ok: boolean;
  sessionId?: string;
  failedPoses?: PoseId[];
  error?: string;
  nextAction?: string;
}

function buildPosesField(frames: (ScanUploadFrame | null)[]): Array<{ pose: PoseId; skipped: boolean }> {
  return POSE_ORDER.map((pose, i) => {
    const frame = frames[i];
    return { pose, skipped: !frame || Boolean(frame.skipped) };
  });
}

async function callPrepare(
  scanId: string,
  frames: (ScanUploadFrame | null)[],
): Promise<PrepareResponseBody> {
  let response: Response;
  try {
    response = await fetch('/api/scan/prepare', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scanId, poses: buildPosesField(frames) }),
      signal: AbortSignal.timeout(SCAN_SAVING_TIMEOUT_MS),
    });
  } catch {
    return { ok: false, error: 'network_error', nextAction: 'Check your connection and try again.' };
  }

  let body: PrepareResponseBody;
  try {
    body = (await response.json()) as PrepareResponseBody;
  } catch {
    body = { ok: false, error: 'invalid_response' };
  }

  try {
    assertWriteConfirmed(response);
  } catch {
    return {
      ok: false,
      error: body.error ?? 'prepare_failed',
      nextAction: body.nextAction ?? 'Try again.',
    };
  }
  return body;
}

async function uploadOne(
  supabase: ReturnType<typeof createClient>,
  path: string,
  token: string,
  blob: Blob,
): Promise<boolean> {
  try {
    const res = await withTimeout<{ error: { message: string } | null }>(
      Promise.resolve(supabase.storage.from(BUCKET).uploadToSignedUrl(path, token, blob)) as Promise<{
        error: { message: string } | null;
      }>,
      SCAN_SAVING_TIMEOUT_MS,
      'scan.persist.uploadToSignedUrl',
    );
    return !res.error;
  } catch {
    return false;
  }
}

async function callFinalize(
  sessionId: string,
  frames: (ScanUploadFrame | null)[],
  uploadedPaths: Map<PoseId, { full: string; thumb: string }>,
): Promise<FinalizeResponseBody> {
  const framePayload = POSE_ORDER.map((pose, i) => {
    const frame = frames[i];
    const skipped = !frame || Boolean(frame.skipped);
    const paths = !skipped ? (uploadedPaths.get(pose) ?? null) : null;
    return {
      view: pose,
      skipped,
      qa: frame?.qa ?? { pass: false, code: 'NO_BODY', message: 'Missing frame', mode: 'weak' },
      capturedWidth: frame?.capturedWidth ?? 0,
      capturedHeight: frame?.capturedHeight ?? 0,
      capturedAt: frame?.capturedAt ?? new Date().toISOString(),
      retryCount: frame?.retryCount ?? 0,
      landmarks: frame?.landmarks,
      paths,
    };
  });

  let response: Response;
  try {
    response = await fetch('/api/scan/finalize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, frames: framePayload }),
      signal: AbortSignal.timeout(SCAN_SAVING_TIMEOUT_MS),
    });
  } catch {
    return { ok: false, sessionId, error: 'network_error', nextAction: 'Check your connection and try again.' };
  }

  let body: FinalizeResponseBody;
  try {
    body = (await response.json()) as FinalizeResponseBody;
  } catch {
    body = { ok: false, error: 'invalid_response' };
  }

  try {
    assertWriteConfirmed(response);
  } catch {
    return {
      ok: false,
      sessionId,
      error: body.error ?? 'finalize_failed',
      failedPoses: body.failedPoses,
      nextAction: body.nextAction ?? 'Try again.',
    };
  }
  return body;
}

/** Revokes object URLs for captured (non-skipped) frames only, once. */
function revokeFrameObjectUrls(frames: (ScanUploadFrame | null)[]): void {
  for (const frame of frames) {
    if (!frame || frame.skipped) continue;
    for (const url of [frame.objectUrl, frame.thumbObjectUrl]) {
      if (!url) continue;
      try {
        URL.revokeObjectURL(url);
      } catch {
        // Best effort; a failed revoke is not a persist failure.
      }
    }
  }
}

/**
 * Persists the captured frames via the client-direct signed-upload flow:
 * prepare -> upload each blob straight to Storage -> finalize. finalize is
 * always called, even when an upload failed, so the server can mark the
 * session 'partial' rather than leave it stuck at 'uploading'. Object URLs
 * are revoked ONLY after finalize confirms capture_status='ready'; a
 * partial or hard failure leaves the blobs live so the caller can retry.
 */
export async function persistScan(
  scanId: string,
  frames: (ScanUploadFrame | null)[],
): Promise<PersistScanResult> {
  const prepared = await callPrepare(scanId, frames);
  if (!prepared.ok || !prepared.sessionId) {
    return {
      ok: false,
      error: prepared.error ?? 'prepare_failed',
      nextAction: prepared.nextAction ?? 'Try again.',
    };
  }
  const sessionId = prepared.sessionId;
  const uploadsByPose = new Map<PoseId, PrepareUpload>((prepared.uploads ?? []).map((u) => [u.pose, u]));

  const supabase = createClient();
  const uploadedPaths = new Map<PoseId, { full: string; thumb: string }>();

  for (let i = 0; i < POSE_ORDER.length; i++) {
    const pose = POSE_ORDER[i];
    const frame = frames[i];
    if (!frame || frame.skipped) continue;
    const target = uploadsByPose.get(pose);
    if (!target) continue;

    const [fullOk, thumbOk] = await Promise.all([
      uploadOne(supabase, target.full.path, target.full.token, frame.blob),
      uploadOne(supabase, target.thumb.path, target.thumb.token, frame.thumbBlob),
    ]);
    if (fullOk && thumbOk) {
      uploadedPaths.set(pose, { full: target.full.path, thumb: target.thumb.path });
    }
  }

  const finalized = await callFinalize(sessionId, frames, uploadedPaths);
  if (finalized.ok) {
    revokeFrameObjectUrls(frames);
  }
  return {
    ok: finalized.ok,
    sessionId,
    failedPoses: finalized.failedPoses,
    error: finalized.error,
    nextAction: finalized.nextAction,
  };
}
