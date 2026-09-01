/**
 * COUNT live-abort hysteresis. A single landmarker miss (standing jitter,
 * one bad detect) must not reset the 5→1 countdown. Abort only after a
 * short consecutive-fail streak or a sustained leave-frame window.
 */

export const COUNT_ABORT_CONSECUTIVE_FAILS = 4;
export const COUNT_ABORT_SUSTAINED_MS = 400;

export type CountdownAbortTracker = {
  consecutiveFails: number;
  failStartedAtMs: number | null;
};

export function createCountdownAbortTracker(): CountdownAbortTracker {
  return { consecutiveFails: 0, failStartedAtMs: null };
}

export function noteCountdownAbortSample(
  tracker: CountdownAbortTracker,
  passed: boolean,
  nowMs: number,
): { tracker: CountdownAbortTracker; shouldAbort: boolean } {
  if (passed) {
    return { tracker: createCountdownAbortTracker(), shouldAbort: false };
  }

  const failStartedAtMs = tracker.failStartedAtMs ?? nowMs;
  const consecutiveFails = tracker.consecutiveFails + 1;
  const next = { consecutiveFails, failStartedAtMs };
  const shouldAbort =
    consecutiveFails >= COUNT_ABORT_CONSECUTIVE_FAILS ||
    nowMs - failStartedAtMs >= COUNT_ABORT_SUSTAINED_MS;
  return { tracker: next, shouldAbort };
}
