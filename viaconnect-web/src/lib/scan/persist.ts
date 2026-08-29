// Prompt 231: client orchestration for POST /api/scan/submit. Builds the
// multipart request from the captured ScanFrame[], surfaces a partial
// (some poses failed to upload) distinctly from a hard failure, and only
// revokes each frame's object URL after a CONFIRMED result - never before,
// and never on a partial (the caller may still retry with the live blobs).

import { assertWriteConfirmed } from '@/lib/nutrition/stateContract228';
import { SCAN_SAVING_TIMEOUT_MS } from './scanTimeouts';
import type { ScanFrame } from './types';
import type { PoseId } from './poses';

export interface SubmitScanResult {
  ok: boolean;
  sessionId?: string;
  failedPoses?: PoseId[];
  error?: string;
  nextAction?: string;
}

function buildSubmitFormData(frames: (ScanFrame | null)[]): FormData {
  const formData = new FormData();
  const meta = frames.map((frame) => {
    if (!frame) {
      return {
        view: undefined,
        skipped: true,
        qa: { pass: false, code: 'NO_BODY', message: 'Missing frame', mode: 'weak' },
        capturedWidth: 0,
        capturedHeight: 0,
        capturedAt: new Date().toISOString(),
        retryCount: 0,
      };
    }
    if (!frame.skipped) {
      formData.set(`frame_${frame.pose}`, frame.blob, `${frame.pose}.jpg`);
    }
    return {
      view: frame.pose,
      skipped: Boolean(frame.skipped),
      qa: frame.qa,
      capturedWidth: frame.capturedWidth,
      capturedHeight: frame.capturedHeight,
      capturedAt: frame.capturedAt,
      retryCount: frame.retryCount,
      landmarks: frame.landmarks,
    };
  });
  formData.set('frames', JSON.stringify(meta));
  return formData;
}

/** Revokes object URLs for captured (non-skipped) frames only, once. */
function revokeFrameObjectUrls(frames: (ScanFrame | null)[]): void {
  for (const frame of frames) {
    if (frame && !frame.skipped && frame.objectUrl) {
      try {
        URL.revokeObjectURL(frame.objectUrl);
      } catch {
        // Best effort; a failed revoke is not a submit failure.
      }
    }
  }
}

/**
 * Posts the captured frames to /api/scan/submit. Revokes object URLs ONLY
 * after the server confirms success (ok:true); a partial or hard failure
 * leaves the blobs live so the caller can retry.
 */
export async function submitScan(frames: (ScanFrame | null)[]): Promise<SubmitScanResult> {
  const formData = buildSubmitFormData(frames);

  let response: Response;
  try {
    response = await fetch('/api/scan/submit', {
      method: 'POST',
      body: formData,
      signal: AbortSignal.timeout(SCAN_SAVING_TIMEOUT_MS),
    });
  } catch {
    return { ok: false, error: 'network_error', nextAction: 'Check your connection and try again.' };
  }

  let body: SubmitScanResult;
  try {
    body = (await response.json()) as SubmitScanResult;
  } catch {
    body = { ok: false, error: 'invalid_response' };
  }

  try {
    assertWriteConfirmed(response);
  } catch {
    return {
      ok: false,
      error: body.error ?? 'submit_failed',
      failedPoses: body.failedPoses,
      sessionId: body.sessionId,
      nextAction: body.nextAction ?? 'Try again.',
    };
  }

  if (body.ok) {
    revokeFrameObjectUrls(frames);
  }
  return body;
}
