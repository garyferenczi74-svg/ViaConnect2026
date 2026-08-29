/**
 * Prompt 231 Section 8: exact user-facing strings for the camera / countdown
 * chrome around capture (QA-code strings live in qa.ts, one message per
 * QaCode). Every string here is dash-free and Marshall-reviewed.
 */
export const WALK_IN_COACHING = 'Walk to the mark';
export const ARMED_COACHING = 'Hold still until 0';
export const CHECKING_POSE = 'Checking pose...';
export const POSE_GUIDE_UNAVAILABLE = 'Pose guide unavailable. Stand in the outline.';
export const CAMERA_LOST_MESSAGE = 'Camera disconnected. Tap Start scan to try again.';
export const CAMERA_BLOCKED_MESSAGE =
  'Camera access is blocked. Allow camera access in Settings, then return here.';

/** Coaching line shown under the countdown digit, per Section 8. */
export function coachingForCount(count: number): string {
  if (count >= 4) return 'Fill the outline';
  if (count >= 2) return 'Arms off your sides';
  return 'Hold still';
}
