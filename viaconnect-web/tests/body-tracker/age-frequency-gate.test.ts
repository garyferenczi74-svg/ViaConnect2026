// Tests for age-frequency-gate.ts (Prompt #169b, spec section 4 age gate +
// section 3.2.3 frequency limiter).
//
// These exercise the REAL decision logic that both the client age-gate card
// (BodyScanAgeGate) and the server finalize path (body-scan-analyze) consume.
// The Deno edge function re-implements the same pure decisions (Deno cannot
// import the Next.js tree); these tests are the canonical coverage and the two
// implementations are kept in sync by construction.
//
// The project's vitest config runs node-environment .test.ts only, so the
// testable contract lives in the pure functions. This mirrors the existing
// scan-gate.test.ts pattern.

import { describe, it, expect } from 'vitest';
import {
  computeAgeYears,
  decideAgeGate,
  decideAgeGateWithOverride,
  decideScanFrequency,
  shouldShowSlowDownBanner,
  BODY_SCAN_MIN_AGE,
  SCAN_FREQUENCY_WINDOW_MS,
} from '@/lib/body-tracker/age-frequency-gate';

// A fixed "now" so every age/window assertion is deterministic.
const NOW = new Date('2026-05-29T12:00:00.000Z');

// Build an ISO date string for someone who turns `age` exactly on `NOW`'s date.
function dobForExactAge(age: number): string {
  const d = new Date(NOW);
  d.setFullYear(d.getFullYear() - age);
  return d.toISOString().slice(0, 10);
}

// ===========================================================================
// computeAgeYears  (calendar-correct whole-years age)
// ===========================================================================

describe('computeAgeYears', () => {
  it('returns null for a missing DOB (missing is NOT zero age)', () => {
    expect(computeAgeYears(null, NOW)).toBeNull();
    expect(computeAgeYears(undefined, NOW)).toBeNull();
    expect(computeAgeYears('', NOW)).toBeNull();
  });

  it('returns null for an unparseable DOB', () => {
    expect(computeAgeYears('not-a-date', NOW)).toBeNull();
  });

  it('counts a user on their 18th birthday as exactly 18 (not 17)', () => {
    expect(computeAgeYears(dobForExactAge(18), NOW)).toBe(18);
  });

  it('counts the day before the 18th birthday as 17', () => {
    const d = new Date(NOW);
    d.setFullYear(d.getFullYear() - 18);
    d.setDate(d.getDate() + 1); // birthday is tomorrow
    expect(computeAgeYears(d.toISOString().slice(0, 10), NOW)).toBe(17);
  });

  it('does not over-count when the birthday is later this year', () => {
    // Born 2000-12-31; as of 2026-05-29 they are 25, not 26.
    expect(computeAgeYears('2000-12-31', NOW)).toBe(25);
  });

  it('clamps a future DOB to 0 rather than returning negative', () => {
    expect(computeAgeYears('2030-01-01', NOW)).toBe(0);
  });
});

// ===========================================================================
// decideAgeGate  (consumer-facing, section 4; no override)
// ===========================================================================

describe('decideAgeGate (client card decision, spec section 4)', () => {
  it('missing DOB -> dob_missing (prompt CAQ Phase 1)', () => {
    const d = decideAgeGate(null, NOW);
    expect(d.status).toBe('dob_missing');
    expect(d.ageYears).toBeNull();
  });

  it('under 18 -> under_age (hide entry, show wait card)', () => {
    const d = decideAgeGate(dobForExactAge(17), NOW);
    expect(d.status).toBe('under_age');
    expect(d.ageYears).toBe(17);
  });

  it('exactly 18 -> allowed', () => {
    const d = decideAgeGate(dobForExactAge(18), NOW);
    expect(d.status).toBe('allowed');
    expect(d.ageYears).toBe(18);
  });

  it('well over 18 -> allowed', () => {
    const d = decideAgeGate(dobForExactAge(42), NOW);
    expect(d.status).toBe('allowed');
    expect(d.ageYears).toBe(42);
  });

  it('uses BODY_SCAN_MIN_AGE as the threshold', () => {
    expect(decideAgeGate(dobForExactAge(BODY_SCAN_MIN_AGE - 1), NOW).status).toBe('under_age');
    expect(decideAgeGate(dobForExactAge(BODY_SCAN_MIN_AGE), NOW).status).toBe('allowed');
  });
});

// ===========================================================================
// decideAgeGateWithOverride  (server, section 4 + 4.3 practitioner override)
// ===========================================================================

describe('decideAgeGateWithOverride (server gate + practitioner override, spec 4.3)', () => {
  const VERIFIED = (reason: string | null | undefined) => ({
    practitionerManaged: true,
    clinicalOverrideReason: reason,
  });
  const NO_PRACTITIONER = (reason: string | null | undefined) => ({
    practitionerManaged: false,
    clinicalOverrideReason: reason,
  });

  it('adult -> allowed, no override needed', () => {
    const d = decideAgeGateWithOverride(dobForExactAge(30), NO_PRACTITIONER(undefined), NOW);
    expect(d.allowed).toBe(true);
    expect(d.overrodeMinor).toBe(false);
    expect(d.overrideReason).toBeNull();
  });

  it('minor + NO override -> blocked', () => {
    const d = decideAgeGateWithOverride(dobForExactAge(15), NO_PRACTITIONER(undefined), NOW);
    expect(d.allowed).toBe(false);
    expect(d.overrodeMinor).toBe(false);
    expect(d.overrideReason).toBeNull();
  });

  it('minor + verified practitioner + reason -> allowed via override, reason recorded', () => {
    const d = decideAgeGateWithOverride(
      dobForExactAge(16),
      VERIFIED('Clinical eval, supervised by Dr X'),
      NOW,
    );
    expect(d.allowed).toBe(true);
    expect(d.overrodeMinor).toBe(true);
    expect(d.overrideReason).toBe('Clinical eval, supervised by Dr X');
  });

  it('minor + verified practitioner + BLANK reason -> blocked (reason mandatory)', () => {
    expect(decideAgeGateWithOverride(dobForExactAge(16), VERIFIED('   '), NOW).allowed).toBe(false);
    expect(decideAgeGateWithOverride(dobForExactAge(16), VERIFIED(''), NOW).allowed).toBe(false);
    expect(decideAgeGateWithOverride(dobForExactAge(16), VERIFIED(null), NOW).allowed).toBe(false);
  });

  it('minor + reason but NOT a verified practitioner -> blocked (consumer cannot self-grant)', () => {
    const d = decideAgeGateWithOverride(
      dobForExactAge(15),
      NO_PRACTITIONER('I am actually an adult'),
      NOW,
    );
    expect(d.allowed).toBe(false);
    expect(d.overrodeMinor).toBe(false);
  });

  it('trims the recorded override reason', () => {
    const d = decideAgeGateWithOverride(dobForExactAge(16), VERIFIED('  reason  '), NOW);
    expect(d.overrideReason).toBe('reason');
  });

  it('missing DOB server-side -> allowed (cannot prove a minor; do not hard-block adults)', () => {
    const d = decideAgeGateWithOverride(null, NO_PRACTITIONER(undefined), NOW);
    expect(d.allowed).toBe(true);
    expect(d.overrodeMinor).toBe(false);
  });
});

// ===========================================================================
// decideScanFrequency  (24h limiter, section 3.2.3)
// ===========================================================================

describe('decideScanFrequency (24h limiter, spec 3.2.3)', () => {
  it('no prior completed scan -> allowed', () => {
    expect(decideScanFrequency(null, NOW).allowed).toBe(true);
    expect(decideScanFrequency(undefined, NOW).allowed).toBe(true);
  });

  it('last completed scan 25h ago -> allowed', () => {
    const last = new Date(NOW.getTime() - 25 * 60 * 60 * 1000).toISOString();
    expect(decideScanFrequency(last, NOW).allowed).toBe(true);
  });

  it('last completed scan exactly 24h ago -> allowed (boundary inclusive)', () => {
    const last = new Date(NOW.getTime() - SCAN_FREQUENCY_WINDOW_MS).toISOString();
    expect(decideScanFrequency(last, NOW).allowed).toBe(true);
  });

  it('last completed scan 1h ago -> blocked with ~23h remaining', () => {
    const last = new Date(NOW.getTime() - 1 * 60 * 60 * 1000).toISOString();
    const d = decideScanFrequency(last, NOW);
    expect(d.allowed).toBe(false);
    expect(d.msUntilAllowed).toBe(23 * 60 * 60 * 1000);
  });

  it('last completed scan just now -> blocked with ~24h remaining', () => {
    const d = decideScanFrequency(NOW.toISOString(), NOW);
    expect(d.allowed).toBe(false);
    expect(d.msUntilAllowed).toBe(SCAN_FREQUENCY_WINDOW_MS);
  });

  it('unparseable timestamp -> allowed (does not block indefinitely)', () => {
    expect(decideScanFrequency('garbage', NOW).allowed).toBe(true);
  });

  it('accepts a Date as well as a string', () => {
    const last = new Date(NOW.getTime() - 2 * 60 * 60 * 1000);
    expect(decideScanFrequency(last, NOW).allowed).toBe(false);
  });
});

// ===========================================================================
// shouldShowSlowDownBanner  (3-in-7 advisory, section 3.2.3)
// ===========================================================================

describe('shouldShowSlowDownBanner (3+ attempts in 7 days, spec 3.2.3)', () => {
  function daysAgo(n: number): string {
    return new Date(NOW.getTime() - n * 24 * 60 * 60 * 1000).toISOString();
  }

  it('0 attempts -> no banner', () => {
    expect(shouldShowSlowDownBanner([], NOW)).toBe(false);
  });

  it('2 attempts in the window -> no banner (below threshold)', () => {
    expect(shouldShowSlowDownBanner([daysAgo(1), daysAgo(3)], NOW)).toBe(false);
  });

  it('exactly 3 attempts in the window -> banner', () => {
    expect(shouldShowSlowDownBanner([daysAgo(0), daysAgo(2), daysAgo(5)], NOW)).toBe(true);
  });

  it('4 attempts in the window -> banner', () => {
    expect(shouldShowSlowDownBanner([daysAgo(0), daysAgo(1), daysAgo(2), daysAgo(6)], NOW)).toBe(true);
  });

  it('3 attempts but one is older than 7 days -> no banner (only 2 in window)', () => {
    expect(shouldShowSlowDownBanner([daysAgo(1), daysAgo(2), daysAgo(8)], NOW)).toBe(false);
  });

  it('ignores null / unparseable timestamps', () => {
    expect(
      shouldShowSlowDownBanner([daysAgo(1), null, 'garbage', daysAgo(2), daysAgo(3)], NOW),
    ).toBe(true);
    expect(
      shouldShowSlowDownBanner([daysAgo(1), null, 'garbage'], NOW),
    ).toBe(false);
  });

  it('ignores future-dated attempts (clock skew)', () => {
    const future = new Date(NOW.getTime() + 24 * 60 * 60 * 1000).toISOString();
    expect(shouldShowSlowDownBanner([future, future, future], NOW)).toBe(false);
  });
});
