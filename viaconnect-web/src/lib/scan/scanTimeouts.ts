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

/** "Saving..." watchdog, reused as the per-call timeout inside persistScan
 * (prepare fetch, each pose's uploadToSignedUrl, finalize fetch - see
 * persist.ts). Next action on expiry of any one call: persistScan returns
 * ok:false with a nextAction string; ScanExperience turns that into
 * SUBMIT_FAIL, returning to Review with Retry named, never a false
 * success. */
export const SCAN_SAVING_TIMEOUT_MS = 15000;

/** Outer backstop for the whole Submit flow (prepare + up to 4 pose
 * upload-pairs + finalize, each already individually bounded by
 * SCAN_SAVING_TIMEOUT_MS inside persistScan). persistScan is designed to
 * never hang - every await it makes is already time-boxed - so this is
 * defense in depth against a hang somewhere in that chain, not expected to
 * fire before persistScan's own internal timeouts have already resolved
 * it. Next action on expiry: return to Review with Retry, never a false
 * success (228 Rule 1). */
export const SCAN_SUBMIT_WATCHDOG_MS = SCAN_SAVING_TIMEOUT_MS * 6 + 5000;

/** Pose title card display duration before ARMED begins. */
export const SCAN_POSE_TITLE_MS = 2000;
