import { describe, it, expect } from 'vitest';
import {
  COUNT_ABORT_CONSECUTIVE_FAILS,
  COUNT_ABORT_SUSTAINED_MS,
  createCountdownAbortTracker,
  noteCountdownAbortSample,
} from '../countdownAbort';

describe('countdown abort hysteresis', () => {
  it('does not abort on a single failing sample', () => {
    const first = noteCountdownAbortSample(createCountdownAbortTracker(), false, 1_000);
    expect(first.shouldAbort).toBe(false);
    expect(first.tracker.consecutiveFails).toBe(1);
  });

  it('resets the streak when a later sample passes', () => {
    let tracker = createCountdownAbortTracker();
    tracker = noteCountdownAbortSample(tracker, false, 1_000).tracker;
    tracker = noteCountdownAbortSample(tracker, false, 1_080).tracker;
    const recovered = noteCountdownAbortSample(tracker, true, 1_160);
    expect(recovered.shouldAbort).toBe(false);
    expect(recovered.tracker).toEqual(createCountdownAbortTracker());

    const nextFail = noteCountdownAbortSample(recovered.tracker, false, 1_240);
    expect(nextFail.shouldAbort).toBe(false);
    expect(nextFail.tracker.consecutiveFails).toBe(1);
  });

  it('aborts after a consecutive-fail streak (standing jitter must not reset to 5)', () => {
    let tracker = createCountdownAbortTracker();
    let shouldAbort = false;
    for (let i = 0; i < COUNT_ABORT_CONSECUTIVE_FAILS; i += 1) {
      const noted = noteCountdownAbortSample(tracker, false, 2_000 + i * 80);
      tracker = noted.tracker;
      shouldAbort = noted.shouldAbort;
      if (i < COUNT_ABORT_CONSECUTIVE_FAILS - 1) {
        expect(shouldAbort).toBe(false);
      }
    }
    expect(shouldAbort).toBe(true);
    expect(tracker.consecutiveFails).toBe(COUNT_ABORT_CONSECUTIVE_FAILS);
  });

  it('aborts after a sustained leave-frame window even with fewer samples', () => {
    const first = noteCountdownAbortSample(createCountdownAbortTracker(), false, 5_000);
    expect(first.shouldAbort).toBe(false);
    const later = noteCountdownAbortSample(
      first.tracker,
      false,
      5_000 + COUNT_ABORT_SUSTAINED_MS,
    );
    expect(later.shouldAbort).toBe(true);
  });

  it('does not abort when fail time is just under the sustained window', () => {
    const first = noteCountdownAbortSample(createCountdownAbortTracker(), false, 8_000);
    const later = noteCountdownAbortSample(
      first.tracker,
      false,
      8_000 + COUNT_ABORT_SUSTAINED_MS - 1,
    );
    expect(later.shouldAbort).toBe(false);
    expect(later.tracker.consecutiveFails).toBe(2);
  });
});
