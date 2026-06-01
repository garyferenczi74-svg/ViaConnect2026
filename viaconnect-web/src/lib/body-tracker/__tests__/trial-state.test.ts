// Tests for trial-state.ts (Prompt #169f, Option C / D).
//
// Exercises the pure deriveTrialState, the read-only signal the body-scan UI
// consumes. The active-trial predicate (converted_at IS NULL AND cancelled_at IS
// NULL AND expires_at > now()) mirrors the SQL resolver + the claim functions, and
// the self-trial eligibility mirrors fn_claim_self_initiated_platinum_trial's
// preconditions (active Gold + no prior self-trial + no active trial). The claim
// function still enforces all of this authoritatively; this is the UX signal only.

import { describe, it, expect } from 'vitest';
import { deriveTrialState, type TrialRow } from '../trial-state';

// A fixed "now" so daysRemaining is deterministic.
const NOW = new Date('2026-05-31T12:00:00.000Z');
const DAY_MS = 24 * 60 * 60 * 1000;

function iso(offsetDays: number): string {
  return new Date(NOW.getTime() + offsetDays * DAY_MS).toISOString();
}

function trial(overrides: Partial<TrialRow>): TrialRow {
  return {
    trial_source: 'self_initiated',
    expires_at: iso(7),
    converted_at: null,
    cancelled_at: null,
    ...overrides,
  };
}

// ===========================================================================
// activeTrial
// ===========================================================================

describe('deriveTrialState: active trial', () => {
  it('surfaces an active self-initiated trial with source + expiresAt + daysRemaining', () => {
    const expiresAt = iso(7);
    const state = deriveTrialState([trial({ trial_source: 'self_initiated', expires_at: expiresAt })], false, NOW);
    expect(state.activeTrial).not.toBeNull();
    expect(state.activeTrial?.source).toBe('self_initiated');
    expect(state.activeTrial?.expiresAt).toBe(expiresAt);
    expect(state.activeTrial?.daysRemaining).toBe(7);
  });

  it('surfaces an active practitioner-granted trial', () => {
    const state = deriveTrialState(
      [trial({ trial_source: 'practitioner_granted', expires_at: iso(14) })],
      false,
      NOW,
    );
    expect(state.activeTrial?.source).toBe('practitioner_granted');
    expect(state.activeTrial?.daysRemaining).toBe(14);
  });

  it('floors daysRemaining at 0 for a trial expiring within 24h', () => {
    const state = deriveTrialState([trial({ expires_at: iso(0.5) })], false, NOW);
    expect(state.activeTrial?.daysRemaining).toBe(0);
  });

  it('treats an expired trial (expires_at in the past) as no active trial', () => {
    const state = deriveTrialState([trial({ expires_at: iso(-1) })], false, NOW);
    expect(state.activeTrial).toBeNull();
  });

  it('treats a converted trial as no active trial', () => {
    const state = deriveTrialState([trial({ converted_at: iso(-1), expires_at: iso(7) })], false, NOW);
    expect(state.activeTrial).toBeNull();
  });

  it('treats a cancelled trial as no active trial', () => {
    const state = deriveTrialState([trial({ cancelled_at: iso(-1), expires_at: iso(7) })], false, NOW);
    expect(state.activeTrial).toBeNull();
  });

  it('picks the latest-expiring active trial when more than one is active (ORDER BY expires_at DESC)', () => {
    const state = deriveTrialState(
      [
        trial({ trial_source: 'self_initiated', expires_at: iso(3) }),
        trial({ trial_source: 'practitioner_granted', expires_at: iso(20) }),
      ],
      false,
      NOW,
    );
    expect(state.activeTrial?.source).toBe('practitioner_granted');
    expect(state.activeTrial?.daysRemaining).toBe(20);
  });

  it('returns no active trial for an empty row set', () => {
    const state = deriveTrialState([], false, NOW);
    expect(state.activeTrial).toBeNull();
    expect(state.hasUsedSelfTrial).toBe(false);
  });
});

// ===========================================================================
// hasUsedSelfTrial
// ===========================================================================

describe('deriveTrialState: hasUsedSelfTrial', () => {
  it('is true when a self_initiated row exists in any state (even expired)', () => {
    const state = deriveTrialState([trial({ trial_source: 'self_initiated', expires_at: iso(-30) })], true, NOW);
    expect(state.hasUsedSelfTrial).toBe(true);
  });

  it('is false when only practitioner_granted rows exist', () => {
    const state = deriveTrialState(
      [trial({ trial_source: 'practitioner_granted', expires_at: iso(-30) })],
      true,
      NOW,
    );
    expect(state.hasUsedSelfTrial).toBe(false);
  });
});

// ===========================================================================
// eligibleForSelfTrial (read-side mirror of the claim function's preconditions)
// ===========================================================================

describe('deriveTrialState: eligibleForSelfTrial', () => {
  it('is true for an active Gold member with no prior self-trial and no active trial', () => {
    const state = deriveTrialState([], true, NOW);
    expect(state.eligibleForSelfTrial).toBe(true);
  });

  it('is false when the user is not Gold (even with no prior trial)', () => {
    const state = deriveTrialState([], false, NOW);
    expect(state.eligibleForSelfTrial).toBe(false);
  });

  it('is false when a prior self-trial was already used (one-time per lifetime)', () => {
    const state = deriveTrialState(
      [trial({ trial_source: 'self_initiated', expires_at: iso(-30) })],
      true,
      NOW,
    );
    expect(state.eligibleForSelfTrial).toBe(false);
  });

  it('is false when an active trial already exists (no-active-trial rule)', () => {
    // An active practitioner-granted trial blocks starting a self-trial even
    // though no self-trial was ever used.
    const state = deriveTrialState(
      [trial({ trial_source: 'practitioner_granted', expires_at: iso(10) })],
      true,
      NOW,
    );
    expect(state.activeTrial).not.toBeNull();
    expect(state.hasUsedSelfTrial).toBe(false);
    expect(state.eligibleForSelfTrial).toBe(false);
  });
});
