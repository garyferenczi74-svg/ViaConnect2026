// Capture pose-count selection (Prompt #169e Phase 1 section 3.1).
//
// PURE helper, no I/O. The body_photo_sessions.capture_pose_count column records
// how many distinct poses a capture run used. The schema CHECK constrains it to
// exactly 2 or 4 (a future two-view express flow, or the standard four-view flow).
//
// The four-view flow (front, back, left, right) always records 4. This helper is
// the single source of truth the persist path and the schema test both read, so
// the value written can never drift from the allowed set.

/** The pose counts body_photo_sessions.capture_pose_count permits. */
export type CapturePoseCount = 2 | 4;

/** The capture modes Phase 1 ships. 'four_view' is the standard flow. */
export type CaptureMode = 'four_view' | 'two_view';

/**
 * Map a capture mode to its valid pose count. The four-view flow records 4; the
 * (reserved) two-view express flow records 2. Returns a value guaranteed to
 * satisfy the capture_pose_count CHECK (2 or 4).
 */
export function selectCapturePoseCount(mode: CaptureMode): CapturePoseCount {
  return mode === 'two_view' ? 2 : 4;
}

/** The pose count the standard four-view capture flow persists. */
export const FOUR_VIEW_POSE_COUNT: CapturePoseCount = selectCapturePoseCount('four_view');
