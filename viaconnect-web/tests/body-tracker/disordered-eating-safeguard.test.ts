// Tests for disordered-eating-safeguard.ts (Prompt #169b, Task 16, section 3).
//
// These exercise the REAL decision logic behind the disordered-eating safeguard:
//   responseAdaptiveDefaults    each of the 4 responses -> the correct defaults
//   decideResourceCard          each of the 4 trigger conditions independently
//                               fires; none fires in the clear case
//   isBodyFatAtOrBelowClinicalThreshold   sex-banded clinical floor
//   assertResponseNotInPractitionerPayload  the response is absent from any
//                               practitioner-facing payload shape (privacy)
//   assertNoCompositionInLeaderboardRow     §3.2.6 leaderboard composition guard
//
// The project's vitest config runs node-environment .test.ts only, so the
// testable contract lives in the pure module (the React components are thin
// wrappers). Mirrors the existing scan-gate.test.ts / numbers-optional.test.ts.

import { describe, it, expect } from 'vitest';
import {
  responseAdaptiveDefaults,
  decideResourceCard,
  isBodyFatAtOrBelowClinicalThreshold,
  isRapidBodyFatLossOver3Scans,
  assertResponseNotInPractitionerPayload,
  assertNoCompositionInLeaderboardRow,
  findForbiddenKeys,
  isDisorderedEatingResponse,
  DISORDERED_EATING_RESPONSES,
  ESSENTIAL_FAT_THRESHOLD_PCT,
  RAPID_BODY_FAT_DROP_PCT_OVER_3_SCANS,
  type DisorderedEatingResponse,
} from '@/lib/body-tracker/disordered-eating-safeguard';

// ===========================================================================
// Response-adaptive defaults (section 3.2.2): each of the 4 responses.
// ===========================================================================

describe('responseAdaptiveDefaults (section 3.2.2)', () => {
  it('"currently" -> numbers-optional ON, 14-day suggestion, persistent card, body fat hidden', () => {
    expect(responseAdaptiveDefaults('currently')).toEqual({
      numbersOptionalDefault: true,
      scanFrequencySuggestionDays: 14,
      resourceCardPersistence: 'persistent',
      bodyFatHiddenByDefault: true,
    });
  });

  it('"in_the_past" -> softer: 7-day suggestion, dismissible card, numbers-optional OFF', () => {
    expect(responseAdaptiveDefaults('in_the_past')).toEqual({
      numbersOptionalDefault: false,
      scanFrequencySuggestionDays: 7,
      resourceCardPersistence: 'dismissible',
      bodyFatHiddenByDefault: false,
    });
  });

  it('"prefer_not_to_say" -> same softer defaults as in_the_past', () => {
    expect(responseAdaptiveDefaults('prefer_not_to_say')).toEqual(
      responseAdaptiveDefaults('in_the_past'),
    );
  });

  it('"no" -> standard: 7-day suggestion, no resource card, nothing hidden', () => {
    expect(responseAdaptiveDefaults('no')).toEqual({
      numbersOptionalDefault: false,
      scanFrequencySuggestionDays: 7,
      resourceCardPersistence: 'none',
      bodyFatHiddenByDefault: false,
    });
  });

  it('an unknown value falls back to the standard ("no") profile, never the strictest', () => {
    const unknown = 'something_else' as DisorderedEatingResponse;
    expect(responseAdaptiveDefaults(unknown)).toEqual(responseAdaptiveDefaults('no'));
  });

  it('covers every declared response value', () => {
    for (const r of DISORDERED_EATING_RESPONSES) {
      expect(() => responseAdaptiveDefaults(r)).not.toThrow();
    }
  });
});

// ===========================================================================
// isDisorderedEatingResponse type guard
// ===========================================================================

describe('isDisorderedEatingResponse', () => {
  it('accepts the four valid values and rejects anything else', () => {
    expect(isDisorderedEatingResponse('currently')).toBe(true);
    expect(isDisorderedEatingResponse('in_the_past')).toBe(true);
    expect(isDisorderedEatingResponse('no')).toBe(true);
    expect(isDisorderedEatingResponse('prefer_not_to_say')).toBe(true);
    expect(isDisorderedEatingResponse('maybe')).toBe(false);
    expect(isDisorderedEatingResponse(null)).toBe(false);
    expect(isDisorderedEatingResponse(undefined)).toBe(false);
    expect(isDisorderedEatingResponse(3)).toBe(false);
  });
});

// ===========================================================================
// Body-fat clinical threshold (section 3.2.5 condition 3)
// ===========================================================================

describe('isBodyFatAtOrBelowClinicalThreshold (section 3.2.5)', () => {
  it('male: at/below the male essential-fat floor triggers, above does not', () => {
    expect(isBodyFatAtOrBelowClinicalThreshold(ESSENTIAL_FAT_THRESHOLD_PCT.male, 'male')).toBe(true);
    expect(isBodyFatAtOrBelowClinicalThreshold(ESSENTIAL_FAT_THRESHOLD_PCT.male - 1, 'male')).toBe(true);
    expect(isBodyFatAtOrBelowClinicalThreshold(ESSENTIAL_FAT_THRESHOLD_PCT.male + 1, 'male')).toBe(false);
  });

  it('female: at/below the female essential-fat floor triggers, above does not', () => {
    expect(isBodyFatAtOrBelowClinicalThreshold(ESSENTIAL_FAT_THRESHOLD_PCT.female, 'female')).toBe(true);
    expect(isBodyFatAtOrBelowClinicalThreshold(ESSENTIAL_FAT_THRESHOLD_PCT.female - 2, 'female')).toBe(true);
    expect(isBodyFatAtOrBelowClinicalThreshold(ESSENTIAL_FAT_THRESHOLD_PCT.female + 2, 'female')).toBe(false);
  });

  it('fails safe on missing body fat or unknown sex (does not trigger)', () => {
    expect(isBodyFatAtOrBelowClinicalThreshold(null, 'male')).toBe(false);
    expect(isBodyFatAtOrBelowClinicalThreshold(undefined, 'female')).toBe(false);
    expect(isBodyFatAtOrBelowClinicalThreshold(NaN, 'male')).toBe(false);
    expect(isBodyFatAtOrBelowClinicalThreshold(4, null)).toBe(false);
    expect(isBodyFatAtOrBelowClinicalThreshold(4, undefined)).toBe(false);
  });
});

// ===========================================================================
// Rapid body-fat loss over 3 scans (section 3.2.5 condition 1)
// ===========================================================================

describe('isRapidBodyFatLossOver3Scans (section 3.2.5)', () => {
  it('triggers when the first-to-last drop across the last 3 is >= threshold', () => {
    // 25 -> 19 over three scans is a 6pt drop (>= 5).
    expect(isRapidBodyFatLossOver3Scans([25, 22, 19])).toBe(true);
  });

  it('uses only the most recent 3 values', () => {
    // First two are old; last three are 30,28,24 -> 6pt drop, triggers.
    expect(isRapidBodyFatLossOver3Scans([18, 18, 30, 28, 24])).toBe(true);
  });

  it('does not trigger on a small drop', () => {
    expect(isRapidBodyFatLossOver3Scans([22, 21, 20])).toBe(false); // 2pt < 5
  });

  it('needs at least 3 numeric values; nulls are ignored', () => {
    expect(isRapidBodyFatLossOver3Scans([25, null, 19])).toBe(false); // only 2 numbers
    expect(isRapidBodyFatLossOver3Scans([30])).toBe(false);
    expect(isRapidBodyFatLossOver3Scans(undefined)).toBe(false);
    expect(isRapidBodyFatLossOver3Scans([])).toBe(false);
  });

  it('the threshold constant is the documented value', () => {
    expect(RAPID_BODY_FAT_DROP_PCT_OVER_3_SCANS).toBe(5);
  });
});

// ===========================================================================
// decideResourceCard: each condition fires independently; clear case is silent.
// ===========================================================================

describe('decideResourceCard (section 3.2.5)', () => {
  it('condition 1 alone: rapid body-fat loss triggers the card', () => {
    const r = decideResourceCard({ recentBodyFatPctOldestFirst: [25, 22, 19] });
    expect(r.show).toBe(true);
    expect(r.reasons).toEqual({
      rapidBodyFatLoss: true,
      scanFrequencyAttempts: false,
      bodyFatBelowThreshold: false,
      pastDisorderedEatingHistory: false,
    });
  });

  it('condition 2 alone: repeated scan-frequency attempts triggers the card', () => {
    const r = decideResourceCard({ scanFrequencyAttemptsInWindow: 3 });
    expect(r.show).toBe(true);
    expect(r.reasons.scanFrequencyAttempts).toBe(true);
    expect(r.reasons.rapidBodyFatLoss).toBe(false);
    expect(r.reasons.bodyFatBelowThreshold).toBe(false);
    expect(r.reasons.pastDisorderedEatingHistory).toBe(false);
  });

  it('condition 3 alone: body fat at/below clinical threshold triggers the card', () => {
    const r = decideResourceCard({ latestBodyFatPct: 3, sex: 'male' });
    expect(r.show).toBe(true);
    expect(r.reasons.bodyFatBelowThreshold).toBe(true);
    expect(r.reasons.rapidBodyFatLoss).toBe(false);
    expect(r.reasons.scanFrequencyAttempts).toBe(false);
    expect(r.reasons.pastDisorderedEatingHistory).toBe(false);
  });

  it('condition 4 alone: past disordered-eating history triggers the card', () => {
    const past = decideResourceCard({ disorderedEatingResponse: 'in_the_past' });
    expect(past.show).toBe(true);
    expect(past.reasons.pastDisorderedEatingHistory).toBe(true);

    const current = decideResourceCard({ disorderedEatingResponse: 'currently' });
    expect(current.show).toBe(true);
    expect(current.reasons.pastDisorderedEatingHistory).toBe(true);
  });

  it('clear case: none of the four conditions fires (card hidden)', () => {
    const r = decideResourceCard({
      recentBodyFatPctOldestFirst: [22, 21, 20],   // small drop
      scanFrequencyAttemptsInWindow: 1,             // below 3
      latestBodyFatPct: 20,                          // healthy
      sex: 'male',
      disorderedEatingResponse: 'no',               // no history
    });
    expect(r.show).toBe(false);
    expect(r.reasons).toEqual({
      rapidBodyFatLoss: false,
      scanFrequencyAttempts: false,
      bodyFatBelowThreshold: false,
      pastDisorderedEatingHistory: false,
    });
  });

  it('"prefer_not_to_say" + "no" do NOT count as a history trigger', () => {
    expect(decideResourceCard({ disorderedEatingResponse: 'prefer_not_to_say' }).reasons.pastDisorderedEatingHistory).toBe(false);
    expect(decideResourceCard({ disorderedEatingResponse: 'no' }).reasons.pastDisorderedEatingHistory).toBe(false);
  });

  it('empty input never throws and hides the card', () => {
    expect(decideResourceCard({}).show).toBe(false);
  });
});

// ===========================================================================
// Privacy: the disordered-eating response is absent from practitioner payloads.
// ===========================================================================

describe('assertResponseNotInPractitionerPayload (section 3 privacy)', () => {
  it('passes for a clean practitioner-shaped payload', () => {
    const payload = {
      patientDisplayName: 'Patient',
      scanCount: 3,
      latestScanDate: '2026-05-01',
      trend: [{ sessionId: 's1', date: '2026-05-01', bodyFatPct: 18 }],
      engagement: { score: 80, periodStart: null, periodEnd: null },
    };
    expect(() => assertResponseNotInPractitionerPayload(payload)).not.toThrow();
  });

  it('throws if a disordered-eating key leaks in (any casing / nesting)', () => {
    expect(() => assertResponseNotInPractitionerPayload({ body_scan_de_response: 'currently' }))
      .toThrow(/leaked/i);
    expect(() => assertResponseNotInPractitionerPayload({ nested: { eatingDisorderHistory: true } }))
      .toThrow(/leaked/i);
    expect(() => assertResponseNotInPractitionerPayload({ disordered_eating: 'x' }))
      .toThrow(/leaked/i);
  });

  it('findForbiddenKeys reports the exact offending path', () => {
    const hits = findForbiddenKeys({ a: { disordered_eating_response: 'x' } }, ['disordered_eating']);
    expect(hits).toContain('a.disordered_eating_response');
  });
});

// ===========================================================================
// §3.2.6: body composition is never present on a Helix leaderboard row.
// ===========================================================================

describe('assertNoCompositionInLeaderboardRow (section 3.2.6)', () => {
  it('passes for the existing composition-free leaderboard row shape', () => {
    // Mirrors LeaderboardBarProps (rank/name/initials/helix/...): no composition.
    const row = { rank: 2, name: 'You', initials: 'GF', helix: 4350, color: '#2DA5A0', isYou: true };
    expect(() => assertNoCompositionInLeaderboardRow(row)).not.toThrow();
  });

  it('throws if any body-composition field is added to a leaderboard row', () => {
    expect(() => assertNoCompositionInLeaderboardRow({ rank: 1, helix: 10, body_fat_pct: 18 }))
      .toThrow(/composition/i);
    expect(() => assertNoCompositionInLeaderboardRow({ rank: 1, helix: 10, leanMassKg: 60 }))
      .toThrow(/composition/i);
    expect(() => assertNoCompositionInLeaderboardRow({ rank: 1, helix: 10, visceralFatIndex: 4 }))
      .toThrow(/composition/i);
  });
});
