import type { Landmark, QaResult } from './types';
import type { PoseId } from './poses';
import type { FrameMetrics } from './frameMetrics';
import { evaluatePose, evaluateWeakFrame } from './qa';

/**
 * Live ARMED/COUNT precheck waives blur (LIVE_PRECHECK_BLUR_SCORE = Infinity)
 * so a JPEG Laplacian dip at shutter cannot silently QA_FAIL → same-pose COUNT.
 * Still-only BLURRY is kept as a pass; other still gates stay hard fails.
 */
export function softenStillOnlyBlur(qa: QaResult): QaResult {
  if (qa.code !== 'BLURRY') return qa;
  return { pass: true, code: 'PASS', message: '', mode: qa.mode };
}

/**
 * Still-QA after shutter. VIDEO-mode detectForVideo on a JPEG canvas often
 * returns null/throws even when the live ARMED/COUNT precheck just saw a
 * body. evaluatePose(null) is hard NO_BODY and silently re-COUNTS the same
 * pose. This helper keeps a usable still (live-video landmarks or weak-frame
 * metrics) or flags a dead/black grab as camera_lost instead of looping.
 * Still-only BLURRY is softened to pass so live-waived blur cannot recycle
 * the same pose into a silent countdown.
 */

/** Mean luma at or below ~5/255. A live room photo is well above this. */
export const NEAR_BLACK_EXPOSURE_MAX = 0.02;
/** Flat-field variance. A body in frame has edges well above this. */
export const NEAR_BLACK_LUMINANCE_VARIANCE_MAX = 4;

export type CapturedStillVerdict =
  | { kind: 'camera_lost' }
  | { kind: 'qa'; qa: QaResult; landmarks?: Landmark[] };

export function isNearBlackStill(metrics: Pick<FrameMetrics, 'exposure' | 'luminanceVariance'>): boolean {
  return (
    metrics.exposure <= NEAR_BLACK_EXPOSURE_MAX &&
    metrics.luminanceVariance <= NEAR_BLACK_LUMINANCE_VARIANCE_MAX
  );
}

export function evaluateCapturedStill(input: {
  stillLandmarks: Landmark[] | null;
  liveLandmarks: Landmark[] | null;
  metrics: FrameMetrics;
  pose: PoseId;
  frameWidth: number;
  frameHeight: number;
}): CapturedStillVerdict {
  if (isNearBlackStill(input.metrics)) {
    return { kind: 'camera_lost' };
  }

  const landmarks = input.stillLandmarks?.length ? input.stillLandmarks : input.liveLandmarks?.length ? input.liveLandmarks : null;

  if (landmarks) {
    return {
      kind: 'qa',
      qa: softenStillOnlyBlur(
        evaluatePose({
          landmarks,
          pose: input.pose,
          frameWidth: input.frameWidth,
          frameHeight: input.frameHeight,
          blurScore: input.metrics.blurScore,
        }),
      ),
      landmarks,
    };
  }

  return { kind: 'qa', qa: softenStillOnlyBlur(evaluateWeakFrame(input.metrics)) };
}
