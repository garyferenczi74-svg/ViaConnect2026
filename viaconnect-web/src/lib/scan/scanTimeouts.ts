// Prompt 231: transitional-state timeouts (228 Rule 1: no transitional state
// without a timeout + a named next action). Camera-open reuses the 219b/228
// NutriVision constant rather than inventing a second number for the same
// getUserMedia call shape.
import { NUTRIVISION_START_STREAM_TIMEOUT_MS, assertWriteConfirmed } from '@/lib/nutrition/stateContract228';

export { assertWriteConfirmed };

/** "Opening camera..." watchdog. Next action on expiry: camera.error / permission surface. */
export const SCAN_OPEN_CAMERA_TIMEOUT_MS = NUTRIVISION_START_STREAM_TIMEOUT_MS;

/** ARMED live pre-check watchdog. Until Task 11 wires MediaPipe this always
 * resolves pass; the timeout still bounds the wait so ARMED never hangs.
 * Next action on expiry: proceed to COUNT anyway (weak mode has no signal
 * to fail on). */
export const SCAN_PRECHECK_TIMEOUT_MS = 600;

/** "Checking pose..." watchdog around grabStill + QA. Distinct from the
 * MediaPipe 8s init timeout (that is Task 11's concern). Next action on
 * expiry: CAMERA_LOST (a hung grab means the capture pipeline is broken,
 * not that the pose failed QA). */
export const SCAN_CHECKING_POSE_TIMEOUT_MS = 4000;

/** "Saving..." watchdog for the eventual Task 13 submit call. Next action
 * on expiry: return to Review with an error naming Retry. */
export const SCAN_SAVING_TIMEOUT_MS = 15000;

/** Pose title card display duration before ARMED begins. */
export const SCAN_POSE_TITLE_MS = 2000;
