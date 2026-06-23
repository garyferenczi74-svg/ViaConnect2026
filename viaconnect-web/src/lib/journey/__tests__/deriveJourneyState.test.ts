/**
 * src/lib/journey/__tests__/deriveJourneyState.test.ts
 *
 * Unit tests for deriveJourneyState (Prompt 208c, Phase 1, Task P1-T1).
 * Tests are written first (TDD RED -> GREEN flow).
 *
 * No DB, no React, no Supabase. Pure deterministic logic only.
 * No em/en-dashes. No emojis.
 */

import { describe, it, expect } from 'vitest';
import {
  deriveJourneyState,
  goalPhraseFor,
  type JourneySignals,
} from '../deriveJourneyState';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSignals(overrides: Partial<JourneySignals> = {}): JourneySignals {
  return {
    caqComplete: true,
    hasProtocol: true,
    recentTrackingDays: 0,
    retestDue: false,
    adjustPending: false,
    retestsCompleted: 0,
    goals: [],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Phase derivation
// ---------------------------------------------------------------------------

describe('deriveJourneyState - phase', () => {
  it('returns Baseline when caqComplete is false', () => {
    const result = deriveJourneyState(makeSignals({ caqComplete: false }));
    expect(result.phase).toBe('Baseline');
  });

  it('returns Baseline when hasProtocol is false even if caqComplete is true', () => {
    const result = deriveJourneyState(makeSignals({ hasProtocol: false }));
    expect(result.phase).toBe('Baseline');
  });

  it('returns Baseline and nextAction "Complete your wellness assessment" when caqComplete false', () => {
    const result = deriveJourneyState(makeSignals({ caqComplete: false, hasProtocol: false }));
    expect(result.phase).toBe('Baseline');
    expect(result.nextAction).toBe('Complete your wellness assessment');
  });

  it('returns Baseline and nextAction "Upload your genetics to deepen your protocol" when caqComplete true but hasProtocol false', () => {
    const result = deriveJourneyState(makeSignals({ caqComplete: true, hasProtocol: false }));
    expect(result.phase).toBe('Baseline');
    expect(result.nextAction).toBe('Upload your genetics to deepen your protocol');
  });

  it('returns Adjust when adjustPending is true (caq+protocol present)', () => {
    const result = deriveJourneyState(makeSignals({ adjustPending: true }));
    expect(result.phase).toBe('Adjust');
  });

  it('returns Re-test when retestDue true and adjustPending false', () => {
    const result = deriveJourneyState(makeSignals({ retestDue: true, adjustPending: false }));
    expect(result.phase).toBe('Re-test');
  });

  it('returns Tracking when recentTrackingDays > 0 and no retest/adjust flags', () => {
    const result = deriveJourneyState(makeSignals({ recentTrackingDays: 3 }));
    expect(result.phase).toBe('Tracking');
  });

  it('returns Protocol when caq+protocol present, no tracking, no retest, no adjust', () => {
    const result = deriveJourneyState(makeSignals());
    expect(result.phase).toBe('Protocol');
  });
});

// ---------------------------------------------------------------------------
// Phase priority order
// ---------------------------------------------------------------------------

describe('deriveJourneyState - phase priority', () => {
  it('adjustPending wins over retestDue', () => {
    const result = deriveJourneyState(makeSignals({ adjustPending: true, retestDue: true }));
    expect(result.phase).toBe('Adjust');
  });

  it('retestDue wins over recentTrackingDays > 0', () => {
    const result = deriveJourneyState(makeSignals({ retestDue: true, recentTrackingDays: 5 }));
    expect(result.phase).toBe('Re-test');
  });

  it('Baseline guard wins even when all other flags are set', () => {
    const result = deriveJourneyState(
      makeSignals({
        caqComplete: false,
        adjustPending: true,
        retestDue: true,
        recentTrackingDays: 7,
      }),
    );
    expect(result.phase).toBe('Baseline');
  });
});

// ---------------------------------------------------------------------------
// nextAction per phase
// ---------------------------------------------------------------------------

describe('deriveJourneyState - nextAction', () => {
  it('Protocol -> Activate your foundation stack', () => {
    const result = deriveJourneyState(makeSignals());
    expect(result.nextAction).toBe('Activate your foundation stack');
  });

  it('Tracking -> Log today to keep your momentum', () => {
    const result = deriveJourneyState(makeSignals({ recentTrackingDays: 2 }));
    expect(result.nextAction).toBe('Log today to keep your momentum');
  });

  it('Re-test -> Schedule your re-test', () => {
    const result = deriveJourneyState(makeSignals({ retestDue: true }));
    expect(result.nextAction).toBe('Schedule your re-test');
  });

  it('Adjust -> Review your updated protocol', () => {
    const result = deriveJourneyState(makeSignals({ adjustPending: true }));
    expect(result.nextAction).toBe('Review your updated protocol');
  });
});

// ---------------------------------------------------------------------------
// Cycle
// ---------------------------------------------------------------------------

describe('deriveJourneyState - cycle', () => {
  it('cycle is 1 when retestsCompleted is 0', () => {
    const result = deriveJourneyState(makeSignals({ retestsCompleted: 0 }));
    expect(result.cycle).toBe(1);
  });

  it('cycle is 3 when retestsCompleted is 2', () => {
    const result = deriveJourneyState(makeSignals({ retestsCompleted: 2 }));
    expect(result.cycle).toBe(3);
  });

  it('cycle is floored at 1 even for negative retestsCompleted', () => {
    const result = deriveJourneyState(makeSignals({ retestsCompleted: -5 }));
    expect(result.cycle).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// goalPhraseFor
// ---------------------------------------------------------------------------

describe('goalPhraseFor', () => {
  it('maps build_lean_mass -> building lean mass', () => {
    expect(goalPhraseFor(['build_lean_mass'])).toBe('building lean mass');
  });

  it('maps "Improve Energy" (mixed case with space) -> improving your energy', () => {
    expect(goalPhraseFor(['Improve Energy'])).toBe('improving your energy');
  });

  it('maps improve_energy -> improving your energy', () => {
    expect(goalPhraseFor(['improve_energy'])).toBe('improving your energy');
  });

  it('maps manage_weight -> managing your weight', () => {
    expect(goalPhraseFor(['manage_weight'])).toBe('managing your weight');
  });

  it('maps support_longevity -> supporting longevity', () => {
    expect(goalPhraseFor(['support_longevity'])).toBe('supporting longevity');
  });

  it('maps longevity -> supporting longevity', () => {
    expect(goalPhraseFor(['longevity'])).toBe('supporting longevity');
  });

  it('maps sharpen_focus -> sharpening your focus', () => {
    expect(goalPhraseFor(['sharpen_focus'])).toBe('sharpening your focus');
  });

  it('maps focus -> sharpening your focus', () => {
    expect(goalPhraseFor(['focus'])).toBe('sharpening your focus');
  });

  it('maps optimize_wellness -> optimizing your wellness', () => {
    expect(goalPhraseFor(['optimize_wellness'])).toBe('optimizing your wellness');
  });

  it('returns "supporting your wellness" for empty goals array', () => {
    expect(goalPhraseFor([])).toBe('supporting your wellness');
  });

  it('returns a non-empty phrase for an unmapped goal', () => {
    const phrase = goalPhraseFor(['some_unknown_goal_xyz']);
    expect(typeof phrase).toBe('string');
    expect(phrase.length).toBeGreaterThan(0);
  });

  it('returns "supporting your wellness" for undefined-like empty input', () => {
    expect(goalPhraseFor([])).toBe('supporting your wellness');
  });

  it('never throws for any input', () => {
    expect(() => goalPhraseFor([])).not.toThrow();
    expect(() => goalPhraseFor(['build_lean_mass', 'focus', 'unknown_xyz'])).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// goalPhrase is embedded in JourneyState
// ---------------------------------------------------------------------------

describe('deriveJourneyState - goalPhrase field', () => {
  it('goalPhrase reflects the first mapped goal', () => {
    const result = deriveJourneyState(makeSignals({ goals: ['manage_weight'] }));
    expect(result.goalPhrase).toBe('managing your weight');
  });

  it('goalPhrase is supporting your wellness when goals is empty', () => {
    const result = deriveJourneyState(makeSignals({ goals: [] }));
    expect(result.goalPhrase).toBe('supporting your wellness');
  });

  it('goalPhrase is non-empty for an unmapped goal', () => {
    const result = deriveJourneyState(makeSignals({ goals: ['some_random_goal'] }));
    expect(typeof result.goalPhrase).toBe('string');
    expect(result.goalPhrase.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Never throws guarantee
// ---------------------------------------------------------------------------

describe('deriveJourneyState - never throws', () => {
  it('does not throw for a fully populated signals object', () => {
    expect(() =>
      deriveJourneyState({
        caqComplete: true,
        hasProtocol: true,
        recentTrackingDays: 5,
        retestDue: true,
        adjustPending: false,
        retestsCompleted: 3,
        goals: ['improve_energy', 'focus'],
      }),
    ).not.toThrow();
  });

  it('does not throw for a minimal signals object with all falsy values', () => {
    expect(() =>
      deriveJourneyState({
        caqComplete: false,
        hasProtocol: false,
        recentTrackingDays: 0,
        retestDue: false,
        adjustPending: false,
        retestsCompleted: 0,
        goals: [],
      }),
    ).not.toThrow();
  });
});
