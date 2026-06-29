// src/lib/formavision/telemetry/__tests__/avatarQualitySignals.test.ts
//
// Prompt 210b P8-T1c: TDD tests for the avatar render-quality signals logic.
//
// Tests cover:
//   - buildAvatarQualitySnapshot: fields included/omitted correctly
//   - stepDownCount counter model (mirrors BodyCompositionAvatar ref logic)
//   - errorCount counter model
//   - timeToFirstInteractive delta calculation
//   - fallback_tier_served snapshot for: no-step-down, lite (count 1),
//     2d after lite (count 2), render-error path (errorCount 1, tier '2d')
//
// No React, no DOM. Pure logic tests.

import { describe, it, expect } from 'vitest';
import { buildAvatarQualitySnapshot } from '../avatarTelemetry';

// ---------------------------------------------------------------------------
// buildAvatarQualitySnapshot: field inclusion / omission
// ---------------------------------------------------------------------------

describe('buildAvatarQualitySnapshot: field inclusion', () => {
  it('always includes tierServed', () => {
    const snap = buildAvatarQualitySnapshot('lite', 1, 0, null);
    expect(snap.tierServed).toBe('lite');
  });

  it('always includes stepDownCount', () => {
    const snap = buildAvatarQualitySnapshot('lite', 1, 0, null);
    expect(snap.stepDownCount).toBe(1);
  });

  it('always includes errorCount', () => {
    const snap = buildAvatarQualitySnapshot('lite', 1, 0, null);
    expect(snap.errorCount).toBe(0);
  });

  it('includes timeToFirstInteractiveMs when a measurement is provided', () => {
    const snap = buildAvatarQualitySnapshot('2d', 2, 0, 420);
    expect(snap.timeToFirstInteractiveMs).toBe(420);
  });

  it('omits timeToFirstInteractiveMs when null', () => {
    const snap = buildAvatarQualitySnapshot('lite', 1, 0, null);
    expect('timeToFirstInteractiveMs' in snap).toBe(false);
  });

  it('always omits frameRateBucket (un-measured, never fabricated)', () => {
    const snap = buildAvatarQualitySnapshot('cinematic', 0, 0, null);
    expect('frameRateBucket' in snap).toBe(false);
  });

  it('reflects all three tier values correctly', () => {
    expect(buildAvatarQualitySnapshot('cinematic', 0, 0, null).tierServed).toBe('cinematic');
    expect(buildAvatarQualitySnapshot('lite', 0, 0, null).tierServed).toBe('lite');
    expect(buildAvatarQualitySnapshot('2d', 0, 0, null).tierServed).toBe('2d');
  });
});

// ---------------------------------------------------------------------------
// Counter model - mirrors BodyCompositionAvatar ref + effect logic (pure)
// The component uses refs; we model that with plain variables for testability.
// ---------------------------------------------------------------------------

interface CounterModel {
  stepDownCount: number;
  errorCount: number;
  firedState: 'none' | 'lite' | '2d';
}

type StepResult =
  | { fired: false }
  | { fired: true; tier: 'lite' | '2d'; snapshot: ReturnType<typeof buildAvatarQualitySnapshot> };

function makeCounterModel(): {
  state: CounterModel;
  stepDownToLite: () => StepResult;
  stepDownTo2D: () => StepResult;
  onRenderError: () => StepResult;
} {
  const state: CounterModel = { stepDownCount: 0, errorCount: 0, firedState: 'none' };

  function stepDownToLite(): StepResult {
    if (state.firedState === 'none') {
      state.firedState = 'lite';
      state.stepDownCount += 1;
      return {
        fired: true,
        tier: 'lite',
        snapshot: buildAvatarQualitySnapshot('lite', state.stepDownCount, state.errorCount, null),
      };
    }
    return { fired: false };
  }

  function stepDownTo2D(): StepResult {
    if (state.firedState !== '2d') {
      state.firedState = '2d';
      state.stepDownCount += 1;
      return {
        fired: true,
        tier: '2d',
        snapshot: buildAvatarQualitySnapshot('2d', state.stepDownCount, state.errorCount, null),
      };
    }
    return { fired: false };
  }

  function onRenderError(): StepResult {
    state.errorCount += 1;
    return stepDownTo2D();
  }

  return { state, stepDownToLite, stepDownTo2D, onRenderError };
}

// ---------------------------------------------------------------------------
// no-step-down: event not fired
// ---------------------------------------------------------------------------

describe('step-down counter: no-step-down', () => {
  it('starts with stepDownCount = 0 and firedState = none', () => {
    const m = makeCounterModel();
    expect(m.state.stepDownCount).toBe(0);
    expect(m.state.firedState).toBe('none');
  });
});

// ---------------------------------------------------------------------------
// step-down to lite: count 1
// ---------------------------------------------------------------------------

describe('step-down counter: step-down to lite', () => {
  it('fires with tier = lite and stepDownCount = 1', () => {
    const m = makeCounterModel();
    const result = m.stepDownToLite();
    expect(result.fired).toBe(true);
    if (result.fired) {
      expect(result.tier).toBe('lite');
      expect(result.snapshot.stepDownCount).toBe(1);
      expect(result.snapshot.tierServed).toBe('lite');
      expect(result.snapshot.errorCount).toBe(0);
    }
  });

  it('does not fire a second lite event on a repeated call', () => {
    const m = makeCounterModel();
    m.stepDownToLite();
    const second = m.stepDownToLite();
    expect(second.fired).toBe(false);
    expect(m.state.stepDownCount).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// step-down to 2d after lite: count 2
// ---------------------------------------------------------------------------

describe('step-down counter: step-down to 2d after lite', () => {
  it('stepDownCount reaches 2 and tier is 2d', () => {
    const m = makeCounterModel();
    m.stepDownToLite();
    const result = m.stepDownTo2D();
    expect(result.fired).toBe(true);
    if (result.fired) {
      expect(result.tier).toBe('2d');
      expect(result.snapshot.stepDownCount).toBe(2);
      expect(result.snapshot.tierServed).toBe('2d');
      expect(result.snapshot.errorCount).toBe(0);
    }
  });

  it('does not fire again after reaching 2d', () => {
    const m = makeCounterModel();
    m.stepDownToLite();
    m.stepDownTo2D();
    const third = m.stepDownTo2D();
    expect(third.fired).toBe(false);
    expect(m.state.stepDownCount).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// render-error path: errorCount 1, tier '2d'
// ---------------------------------------------------------------------------

describe('step-down counter: render-error path', () => {
  it('errorCount = 1, tier = 2d, stepDownCount = 1 when error fires without prior step-down', () => {
    const m = makeCounterModel();
    const result = m.onRenderError();
    expect(result.fired).toBe(true);
    if (result.fired) {
      expect(result.tier).toBe('2d');
      expect(result.snapshot.errorCount).toBe(1);
      expect(result.snapshot.stepDownCount).toBe(1);
      expect(result.snapshot.tierServed).toBe('2d');
    }
  });

  it('errorCount = 1, stepDownCount = 2 when error fires after a lite step-down', () => {
    const m = makeCounterModel();
    m.stepDownToLite();
    const result = m.onRenderError();
    expect(result.fired).toBe(true);
    if (result.fired) {
      expect(result.snapshot.errorCount).toBe(1);
      expect(result.snapshot.stepDownCount).toBe(2);
      expect(result.snapshot.tierServed).toBe('2d');
    }
  });

  it('does not fire again after 2d is already reached', () => {
    const m = makeCounterModel();
    m.onRenderError();
    const second = m.onRenderError();
    expect(second.fired).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// timeToFirstInteractive delta
// ---------------------------------------------------------------------------

describe('timeToFirstInteractive delta', () => {
  it('computes a positive delta from mount time to first-interactive callback', () => {
    const mountTime = 1000;
    const interactiveTime = 1350;
    const delta = Math.round(interactiveTime - mountTime);
    expect(delta).toBe(350);
  });

  it('is included in the snapshot when a measured value is provided', () => {
    const snap = buildAvatarQualitySnapshot('lite', 1, 0, 350);
    expect(snap.timeToFirstInteractiveMs).toBe(350);
  });

  it('is omitted when the value is null (not yet measured)', () => {
    const snap = buildAvatarQualitySnapshot('lite', 1, 0, null);
    expect('timeToFirstInteractiveMs' in snap).toBe(false);
  });
});
