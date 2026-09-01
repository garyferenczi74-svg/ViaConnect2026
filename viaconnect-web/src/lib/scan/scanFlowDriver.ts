import type { ScanAction } from '@/hooks/scan/useScanSession';
import type { QaResult, ScanFrame } from './types';
import type { CapturedStillVerdict } from './evaluateCapturedStill';

/**
 * Prompt 231: pure helpers shared by ScanExperience for object URL
 * lifecycle and QA-result-to-action mapping. Kept out of the component so
 * the Discard/Retake/unmount revocation contract and the QA dispatch
 * mapping are unit-testable without a DOM renderer (URL.revokeObjectURL is
 * a Node-safe global to stub in tests).
 *
 * Interface contract carried from Task 5 (see progress.md): a skipped frame
 * (skipped:true) always has an empty blob and objectUrl:''. Callers MUST
 * branch on skipped first; revokeFrame below does that branch so no caller
 * has to duplicate it.
 */

/** Revoke exactly one frame's object URL. No-op for a missing, skipped, or
 * already-empty frame. */
export function revokeFrame(frame: ScanFrame | null | undefined): void {
  if (!frame || frame.skipped || !frame.objectUrl) return;
  URL.revokeObjectURL(frame.objectUrl);
}

/** Revoke every real (non-skipped) frame's object URL. Used before DISCARD,
 * before RESET, on a single-pose RETAKE, and on unmount. */
export function revokeAllFrames(frames: ReadonlyArray<ScanFrame | null>): void {
  for (const frame of frames) revokeFrame(frame);
}

/** Map a QA verdict to the reducer action that carries it forward. */
export function qaResultToAction(result: QaResult): ScanAction {
  if (result.pass) return { type: 'QA_PASS' };
  return { type: 'QA_FAIL', code: result.code };
}

/** Map still-QA (including a dead/black grab) to the reducer action. */
export function capturedStillVerdictToAction(verdict: CapturedStillVerdict): ScanAction {
  if (verdict.kind === 'camera_lost') return { type: 'CAMERA_LOST' };
  return qaResultToAction(verdict.qa);
}
