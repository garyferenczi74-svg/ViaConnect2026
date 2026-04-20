// Prompt #101 Workstream B — waiver validation tests.

import { describe, it, expect } from 'vitest';
import {
  observationInWaiverScope,
  validateConcurrency,
  validateJustification,
  validateWaiverDiscountDepth,
  validateWaiverMargin,
  validateWaiverWindow,
} from '@/lib/map/waivers/validation';
import { WAIVER_TYPE_RULES, type MAPWaiverType } from '@/lib/map/waivers/types';

const DAY = 24 * 60 * 60 * 1000;

describe('validateWaiverWindow', () => {
  it('rejects negative duration', () => {
    const r = validateWaiverWindow({
      waiverType: 'seasonal_promotion',
      startAt: new Date('2026-05-01'),
      endAt: new Date('2026-04-30'),
    });
    expect(r).toBe('MAP_WAIVER_WINDOW_INVALID');
  });

  it('rejects zero duration', () => {
    const d = new Date('2026-05-01');
    expect(validateWaiverWindow({ waiverType: 'seasonal_promotion', startAt: d, endAt: d })).toBe(
      'MAP_WAIVER_WINDOW_INVALID',
    );
  });

  it.each<{ type: MAPWaiverType; days: number; ok: boolean }>([
    { type: 'seasonal_promotion', days: 60, ok: true },
    { type: 'seasonal_promotion', days: 61, ok: false },
    { type: 'charity_event', days: 14, ok: true },
    { type: 'charity_event', days: 15, ok: false },
    { type: 'clinic_in_person_only', days: 90, ok: true },
    { type: 'clinic_in_person_only', days: 91, ok: false },
    { type: 'clinical_study_recruitment', days: 180, ok: true },
    { type: 'clinical_study_recruitment', days: 181, ok: false },
    { type: 'new_patient_onboarding', days: 30, ok: true },
    { type: 'new_patient_onboarding', days: 31, ok: false },
  ])('$type at $days days: ok=$ok', ({ type, days, ok }) => {
    const r = validateWaiverWindow({
      waiverType: type,
      startAt: new Date('2026-04-01'),
      endAt: new Date(new Date('2026-04-01').getTime() + days * DAY),
    });
    expect(r === null).toBe(ok);
  });
});

describe('validateWaiverMargin', () => {
  it('passes at the 1.72x threshold', () => {
    expect(validateWaiverMargin(172, 100)).toBeNull();
  });
  it('fails below threshold', () => {
    expect(validateWaiverMargin(171, 100)).toBe('MAP_WAIVER_MARGIN_BREACH');
  });
  it('fails for zero floor', () => {
    expect(validateWaiverMargin(200, 0)).toBe('MAP_WAIVER_MARGIN_BREACH');
  });
});

describe('validateWaiverDiscountDepth', () => {
  it.each<{ type: MAPWaiverType; mapCents: number; waivedCents: number; ok: boolean }>([
    { type: 'seasonal_promotion', mapCents: 10000, waivedCents: 7500, ok: true },  // 25%
    { type: 'seasonal_promotion', mapCents: 10000, waivedCents: 7400, ok: false }, // 26%
    { type: 'charity_event', mapCents: 10000, waivedCents: 5000, ok: true },       // 50%
    { type: 'charity_event', mapCents: 10000, waivedCents: 4900, ok: false },      // 51%
    { type: 'clinic_in_person_only', mapCents: 10000, waivedCents: 7000, ok: true }, // 30%
    { type: 'clinic_in_person_only', mapCents: 10000, waivedCents: 6900, ok: false }, // 31%
    { type: 'new_patient_onboarding', mapCents: 10000, waivedCents: 8000, ok: true }, // 20%
    { type: 'new_patient_onboarding', mapCents: 10000, waivedCents: 7900, ok: false }, // 21%
  ])('$type: waived=$waivedCents map=$mapCents → ok=$ok', ({ type, mapCents, waivedCents, ok }) => {
    const r = validateWaiverDiscountDepth(type, waivedCents, mapCents);
    expect(r === null).toBe(ok);
  });

  it('passes when waived >= map (no discount)', () => {
    expect(validateWaiverDiscountDepth('seasonal_promotion', 10000, 10000)).toBeNull();
    expect(validateWaiverDiscountDepth('seasonal_promotion', 11000, 10000)).toBeNull();
  });
});

describe('validateJustification', () => {
  it('rejects too short', () => {
    expect(validateJustification('a'.repeat(99))).toBe('MAP_WAIVER_JUSTIFICATION_TOO_SHORT');
  });
  it('accepts 100', () => {
    expect(validateJustification('a'.repeat(100))).toBeNull();
  });
  it('accepts 2000', () => {
    expect(validateJustification('a'.repeat(2000))).toBeNull();
  });
  it('rejects 2001', () => {
    expect(validateJustification('a'.repeat(2001))).toBe('MAP_WAIVER_JUSTIFICATION_TOO_LONG');
  });
});

describe('validateConcurrency', () => {
  it('allows 1st-3rd active waivers', () => {
    expect(validateConcurrency(0)).toBeNull();
    expect(validateConcurrency(2)).toBeNull();
  });
  it('rejects 4th active waiver', () => {
    expect(validateConcurrency(3)).toBe('MAP_WAIVER_CONCURRENCY_EXCEEDED');
  });
});

describe('observationInWaiverScope', () => {
  it('empty scope matches everything', () => {
    expect(observationInWaiverScope('https://example.com/shop', [])).toBe(true);
  });
  it('exact URL match', () => {
    expect(observationInWaiverScope('https://example.com/shop', ['https://example.com/shop'])).toBe(true);
  });
  it('prefix match allowed', () => {
    expect(
      observationInWaiverScope('https://example.com/shop/widget', ['https://example.com/shop']),
    ).toBe(true);
  });
  it('out-of-scope URL rejected', () => {
    expect(
      observationInWaiverScope('https://other.com/shop', ['https://example.com/shop']),
    ).toBe(false);
  });
});

describe('WAIVER_TYPE_RULES coverage', () => {
  it('all 5 waiver types present', () => {
    expect(Object.keys(WAIVER_TYPE_RULES).sort()).toEqual([
      'charity_event',
      'clinic_in_person_only',
      'clinical_study_recruitment',
      'new_patient_onboarding',
      'seasonal_promotion',
    ]);
  });
  it('only new_patient_onboarding is auto-approvable for Platinum/Gold', () => {
    expect(WAIVER_TYPE_RULES.new_patient_onboarding.autoApproveForTiers).toEqual(['Platinum', 'Gold']);
    expect(WAIVER_TYPE_RULES.seasonal_promotion.autoApproveForTiers).toBeUndefined();
  });
  it('clinical_study_recruitment requires medical director', () => {
    expect(WAIVER_TYPE_RULES.clinical_study_recruitment.requiresMedicalDirector).toBe(true);
  });
  it('charity_event requires compliance officer', () => {
    expect(WAIVER_TYPE_RULES.charity_event.requiresComplianceOfficer).toBe(true);
  });
});
