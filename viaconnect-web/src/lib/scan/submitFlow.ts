// Prompt 231: Submit-button orchestration for ScanExperience, extracted to
// a plain module so it is unit-testable under vitest's node environment
// (no jsdom/canvas here - see thumbnail.ts and persist.ts, both DOM/network
// dependent and injected as mocks in this module's own tests rather than
// exercised for real). Builds the ScanUploadFrame[] persistScan expects
// (a real thumbBlob per non-skipped frame; null for a skipped/missing pose
// - the fixed 4-slot positional convention persist.ts's own doc comment
// describes and already treats that way), calls persistScan, and turns
// the result into the
// SUBMIT_OK/SUBMIT_FAIL dispatch. Never dispatches SUBMIT_OK unless
// persistScan itself returned ok:true with a confirmed sessionId
// (condition 24c: no false success, ever).

import type { Dispatch } from 'react';
import type { ScanAction } from '@/hooks/scan/useScanSession';
import type { ScanFrame } from './types';
import { persistScan, type PersistScanResult, type ScanUploadFrame } from './persist';
import { generateThumbnail } from './thumbnail';
import { POSE_ORDER, type PoseId } from './poses';

export type ThumbnailGenerator = (blob: Blob) => Promise<Blob>;
export type PersistScanFn = (
  scanId: string,
  frames: (ScanUploadFrame | null)[],
) => Promise<PersistScanResult>;

/** Default thumbnail generator ScanExperience uses in production - a thin
 * adapter over generateThumbnail's (source, maxEdge, quality) signature so
 * this module's injection point stays a simple (blob) => Promise<Blob>. */
export const defaultGenerateThumbnail: ThumbnailGenerator = (blob) => generateThumbnail(blob);

/**
 * Converts captured frames into the ScanUploadFrame[] persistScan expects.
 * A skipped or missing pose becomes null - persist.ts's buildPosesField /
 * callFinalize already treat a null slot as skipped, matching the fixed
 * 4-slot positional convention persist.ts's own doc comment describes (a
 * frame's own `skipped:true` placeholder object is a reducer/UI-display
 * concern only, never sent up this path). A non-skipped frame gets a real
 * thumbBlob generated from its full-resolution blob.
 */
export async function buildUploadFrames(
  frames: ReadonlyArray<ScanFrame | null>,
  generateThumb: ThumbnailGenerator = defaultGenerateThumbnail,
): Promise<(ScanUploadFrame | null)[]> {
  const out: (ScanUploadFrame | null)[] = [];
  for (let i = 0; i < POSE_ORDER.length; i++) {
    const frame = frames[i];
    if (!frame || frame.skipped) {
      out.push(null);
      continue;
    }
    const thumbBlob = await generateThumb(frame.blob);
    out.push({ ...frame, thumbBlob });
  }
  return out;
}

const POSE_LABEL: Record<PoseId, string> = {
  front: 'front',
  right: 'right',
  back: 'back',
  left: 'left',
};

/** Builds the Review-screen error message for a failed/partial persist,
 * naming the failed pose(s) so the subject knows what to retry. Falls back
 * to the server's own nextAction copy, then a generic retry line. Never
 * claims success. */
export function buildSubmitErrorMessage(result: PersistScanResult): string {
  const failed = result.failedPoses ?? [];
  if (failed.length > 0) {
    const names = failed.map((p) => POSE_LABEL[p]).join(', ');
    return `Upload failed for: ${names}. ${result.nextAction ?? 'Retry to try again.'}`;
  }
  return result.nextAction ?? 'Saving failed. Retry to try again.';
}

/**
 * Runs the full Submit flow: dispatches SUBMIT (-> UPLOADING), builds the
 * upload frames (real thumbnails included), calls persistScan, then
 * dispatches SUBMIT_OK (only on a confirmed ok:true, carrying the
 * server-confirmed sessionId) or SUBMIT_FAIL (with a message naming the
 * failed pose(s) and a retry next action). The reducer only accepts
 * SUBMIT_OK/SUBMIT_FAIL while in UPLOADING, so a stray dispatch after a
 * later retry has already moved the phase on is a harmless no-op.
 */
export async function runSubmit(
  dispatch: Dispatch<ScanAction>,
  scanId: string,
  frames: ReadonlyArray<ScanFrame | null>,
  deps: { persistScanFn?: PersistScanFn; generateThumb?: ThumbnailGenerator } = {},
): Promise<PersistScanResult> {
  const doPersist = deps.persistScanFn ?? persistScan;
  const doThumb = deps.generateThumb ?? defaultGenerateThumbnail;

  dispatch({ type: 'SUBMIT' });

  let result: PersistScanResult;
  try {
    const uploadFrames = await buildUploadFrames(frames, doThumb);
    result = await doPersist(scanId, uploadFrames);
  } catch {
    result = { ok: false, error: 'unexpected_error', nextAction: 'Retry to try again.' };
  }

  if (result.ok && result.sessionId) {
    dispatch({ type: 'SUBMIT_OK', scanId: result.sessionId });
  } else {
    dispatch({ type: 'SUBMIT_FAIL', error: buildSubmitErrorMessage(result) });
  }
  return result;
}
