/**
 * Prompt 228 Section 8: My Nutrition state contract helpers.
 *
 * Rule 1: no transitional state without a timeout
 * Rule 2: no success without confirmation
 * Rule 3: no silent alteration
 * Rule 4: no dead affordances
 * Rule 5: every failure names the next action
 * Rule 6: permission-dependent features check permission first
 */

export const NUTRIVISION_START_STREAM_TIMEOUT_MS = 8000;
/** Native / plugin camera capture safety timeout. Gallery picks are not timed. */
export const NUTRIVISION_CAMERA_CAPTURE_TIMEOUT_MS = 15000;

export type NutriVisionCapturePhase =
  | 'idle'
  | 'requesting_permission'
  | 'permission_denied'
  | 'permission_granted'
  | 'starting_stream'
  | 'stream_failed'
  | 'timed_out'
  | 'preview_active'
  | 'captured'
  | 'uploading'
  | 'upload_failed'
  | 'analyzing'
  | 'analysis_failed'
  | 'confirming'
  | 'saved';

export const TRANSITIONAL_CAPTURE_PHASES: readonly NutriVisionCapturePhase[] = [
  'requesting_permission',
  'permission_granted',
  'starting_stream',
  'uploading',
  'analyzing',
] as const;

export function isTransitionalCapturePhase(
  phase: NutriVisionCapturePhase,
): boolean {
  return (TRANSITIONAL_CAPTURE_PHASES as readonly string[]).includes(phase);
}

/** Fail loudly if a write response is not confirmed success. */
export function assertWriteConfirmed(res: {
  ok: boolean;
  status: number;
}): void {
  if (!res.ok) {
    throw new Error(`Write not confirmed (HTTP ${res.status})`);
  }
}
