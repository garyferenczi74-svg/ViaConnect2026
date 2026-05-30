// Tests for caq-freshness.ts (Prompt #169b, Task 17, spec section 10).
//
// These exercise the REAL decision logic behind the pre capture CAQ freshness
// step, which prevents a stale self reported weight/height from silently
// corrupting the body composition estimate:
//   decideStatFreshness         >60 days -> confirm; <=60 -> skip; unknown/missing
//                               -> confirm
//   ageInDays                   the freshness signal age helper
//   resolveStatSource           caq_phase_1 (unchanged) vs pre_scan_update (changed)
//   buildProfileMasterPatch     update master ONLY on opt in, only changed fields
//   buildDemographicsUpdatePayload + buildSessionStatPatch  audit + per scan pin
//   selectFreshnessGateRender   the gate render (loading / confirm / children)
//   weight/height unit round trips
//
// Node environment pure logic tests (project convention).

import { describe, it, expect } from 'vitest';
import {
  decideStatFreshness,
  ageInDays,
  resolveStatSource,
  isStatChanged,
  buildDemographicsUpdatePayload,
  buildSessionStatPatch,
  buildProfileMasterPatch,
  selectFreshnessGateRender,
  weightKgToDisplay,
  displayWeightToKg,
  heightCmToDisplay,
  displayHeightToCm,
  STALENESS_THRESHOLD_DAYS,
  WEIGHT_UNCHANGED_EPSILON_KG,
  HEIGHT_UNCHANGED_EPSILON_CM,
} from '@/lib/body-tracker/caq-freshness';

// ===========================================================================
// Staleness decision (section 10): >60 -> confirm; <=60 -> skip; unknown -> confirm
// ===========================================================================

describe('decideStatFreshness (section 10)', () => {
  const fresh = { weightKg: 80, heightCm: 180 };

  it('age within threshold -> no confirm (fresh)', () => {
    expect(decideStatFreshness({ ...fresh, ageDays: 0 })).toEqual({ needsConfirm: false, reason: 'fresh' });
    expect(decideStatFreshness({ ...fresh, ageDays: 30 })).toEqual({ needsConfirm: false, reason: 'fresh' });
  });

  it('age exactly at the threshold (60) -> no confirm (boundary is inclusive of fresh)', () => {
    expect(decideStatFreshness({ ...fresh, ageDays: STALENESS_THRESHOLD_DAYS })).toEqual({
      needsConfirm: false,
      reason: 'fresh',
    });
  });

  it('age one day past the threshold (61) -> confirm (stale)', () => {
    expect(decideStatFreshness({ ...fresh, ageDays: STALENESS_THRESHOLD_DAYS + 1 })).toEqual({
      needsConfirm: true,
      reason: 'stale',
    });
  });

  it('clearly old (365 days) -> confirm (stale)', () => {
    expect(decideStatFreshness({ ...fresh, ageDays: 365 })).toEqual({ needsConfirm: true, reason: 'stale' });
  });

  it('unknown age (null) -> confirm (unknown_age), e.g. first ever scan', () => {
    expect(decideStatFreshness({ ...fresh, ageDays: null })).toEqual({
      needsConfirm: true,
      reason: 'unknown_age',
    });
  });

  it('non finite age -> confirm (unknown_age)', () => {
    expect(decideStatFreshness({ ...fresh, ageDays: Number.NaN })).toEqual({
      needsConfirm: true,
      reason: 'unknown_age',
    });
  });

  it('future dated entry (negative age) is clamped to 0 -> fresh, not stale', () => {
    expect(decideStatFreshness({ ...fresh, ageDays: -5 })).toEqual({ needsConfirm: false, reason: 'fresh' });
  });

  it('missing weight -> confirm (missing_stat), even if height is present and recent', () => {
    expect(decideStatFreshness({ weightKg: null, heightCm: 180, ageDays: 1 })).toEqual({
      needsConfirm: true,
      reason: 'missing_stat',
    });
  });

  it('missing height -> confirm (missing_stat)', () => {
    expect(decideStatFreshness({ weightKg: 80, heightCm: null, ageDays: 1 })).toEqual({
      needsConfirm: true,
      reason: 'missing_stat',
    });
  });

  it('missing_stat takes precedence over unknown age', () => {
    expect(decideStatFreshness({ weightKg: null, heightCm: null, ageDays: null })).toEqual({
      needsConfirm: true,
      reason: 'missing_stat',
    });
  });

  it('honors a custom threshold parameter', () => {
    expect(decideStatFreshness({ ...fresh, ageDays: 10 }, 7)).toEqual({ needsConfirm: true, reason: 'stale' });
    expect(decideStatFreshness({ ...fresh, ageDays: 5 }, 7)).toEqual({ needsConfirm: false, reason: 'fresh' });
  });
});

describe('ageInDays', () => {
  const now = Date.parse('2026-05-30T12:00:00Z');

  it('returns whole days for a past ISO date', () => {
    expect(ageInDays('2026-05-20T12:00:00Z', now)).toBe(10);
  });

  it('accepts a DATE (no time component), matching entry_date', () => {
    // 2026-03-31 to 2026-05-30 == 60 days.
    expect(ageInDays('2026-03-31', Date.parse('2026-05-30T00:00:00Z'))).toBe(60);
  });

  it('returns null for missing or unparseable input (treated as unknown age)', () => {
    expect(ageInDays(null, now)).toBeNull();
    expect(ageInDays(undefined, now)).toBeNull();
    expect(ageInDays('not-a-date', now)).toBeNull();
  });

  it('returns a negative number for a future date (decision clamps it)', () => {
    expect(ageInDays('2026-06-10T12:00:00Z', now)).toBeLessThan(0);
  });
});

// ===========================================================================
// Source resolution: caq_phase_1 (unchanged) vs pre_scan_update (changed)
// ===========================================================================

describe('resolveStatSource (section 10)', () => {
  it('unchanged value (within epsilon) -> caq_phase_1', () => {
    expect(resolveStatSource(80, 80, WEIGHT_UNCHANGED_EPSILON_KG)).toBe('caq_phase_1');
    expect(resolveStatSource(80, 80.03, WEIGHT_UNCHANGED_EPSILON_KG)).toBe('caq_phase_1');
  });

  it('changed value (beyond epsilon) -> pre_scan_update', () => {
    expect(resolveStatSource(80, 82, WEIGHT_UNCHANGED_EPSILON_KG)).toBe('pre_scan_update');
    expect(resolveStatSource(180, 181, HEIGHT_UNCHANGED_EPSILON_CM)).toBe('pre_scan_update');
  });

  it('null existing value -> any supplied value is a pre_scan_update', () => {
    expect(resolveStatSource(null, 80, WEIGHT_UNCHANGED_EPSILON_KG)).toBe('pre_scan_update');
  });

  it('isStatChanged mirrors the pre_scan_update decision', () => {
    expect(isStatChanged(80, 80, WEIGHT_UNCHANGED_EPSILON_KG)).toBe(false);
    expect(isStatChanged(80, 85, WEIGHT_UNCHANGED_EPSILON_KG)).toBe(true);
    expect(isStatChanged(null, 80, WEIGHT_UNCHANGED_EPSILON_KG)).toBe(true);
  });
});

// ===========================================================================
// Update master ONLY on opt in (and only changed fields)
// ===========================================================================

describe('buildProfileMasterPatch (opt in only)', () => {
  it('opt out -> null (master left undisturbed), even when values changed', () => {
    expect(
      buildProfileMasterPatch({
        updateMaster: false,
        weightChanged: true,
        heightChanged: true,
        weightKg: 82,
        heightCm: 181,
      }),
    ).toBeNull();
  });

  it('opt in + both changed -> patch both fields', () => {
    expect(
      buildProfileMasterPatch({
        updateMaster: true,
        weightChanged: true,
        heightChanged: true,
        weightKg: 82,
        heightCm: 181,
      }),
    ).toEqual({ weight_kg: 82, height_cm: 181 });
  });

  it('opt in + only weight changed -> patch only weight (does not rewrite unchanged height)', () => {
    expect(
      buildProfileMasterPatch({
        updateMaster: true,
        weightChanged: true,
        heightChanged: false,
        weightKg: 82,
        heightCm: 180,
      }),
    ).toEqual({ weight_kg: 82 });
  });

  it('opt in but nothing changed -> null (no needless master write)', () => {
    expect(
      buildProfileMasterPatch({
        updateMaster: true,
        weightChanged: false,
        heightChanged: false,
        weightKg: 80,
        heightCm: 180,
      }),
    ).toBeNull();
  });
});

describe('buildDemographicsUpdatePayload (audit trail)', () => {
  it('records the field, prior + new value, source, and the master flag (opt in)', () => {
    expect(
      buildDemographicsUpdatePayload({
        field: 'weight_kg',
        oldValue: 80,
        newValue: 82.5,
        source: 'pre_scan_update',
        updatedCaqMaster: true,
      }),
    ).toEqual({
      field: 'weight_kg',
      old_value: 80,
      new_value: 82.5,
      source: 'pre_scan_update',
      updated_caq_master: true,
    });
  });

  it('updated_caq_master defaults to a strict boolean false on opt out', () => {
    const payload = buildDemographicsUpdatePayload({
      field: 'height_cm',
      oldValue: null,
      newValue: 181,
      source: 'pre_scan_update',
      updatedCaqMaster: false,
    });
    expect(payload.updated_caq_master).toBe(false);
    expect(payload.old_value).toBeNull();
  });
});

describe('buildSessionStatPatch (per scan pin)', () => {
  it('pins both confirmed values + provenance onto the session row', () => {
    expect(
      buildSessionStatPatch({
        weightKg: 82.123,
        heightCm: 181.0,
        weightSource: 'pre_scan_update',
        heightSource: 'caq_phase_1',
      }),
    ).toEqual({
      weight_kg_at_scan: 82.12,
      weight_kg_source: 'pre_scan_update',
      height_cm_at_scan: 181,
      height_cm_source: 'caq_phase_1',
    });
  });
});

// ===========================================================================
// Gate render decision
// ===========================================================================

describe('selectFreshnessGateRender', () => {
  it('loading -> guard the entry (no children flash)', () => {
    expect(selectFreshnessGateRender(true, true)).toBe('loading');
    expect(selectFreshnessGateRender(true, false)).toBe('loading');
  });

  it('resolved + needs confirm -> confirm step', () => {
    expect(selectFreshnessGateRender(false, true)).toBe('confirm');
  });

  it('resolved + fresh -> children (gate open)', () => {
    expect(selectFreshnessGateRender(false, false)).toBe('children');
  });
});

// ===========================================================================
// Unit round trips (respect the user's unit system)
// ===========================================================================

describe('weight unit conversion', () => {
  it('metric is identity (kg)', () => {
    expect(weightKgToDisplay(80, 'metric')).toBe(80);
    expect(displayWeightToKg(80, 'metric')).toBe(80);
  });

  it('imperial round trips kg <-> lbs', () => {
    const lbs = weightKgToDisplay(80, 'imperial');
    expect(lbs).toBeCloseTo(176.37, 1);
    expect(displayWeightToKg(lbs as number, 'imperial')).toBeCloseTo(80, 1);
  });

  it('null in -> null out', () => {
    expect(weightKgToDisplay(null, 'imperial')).toBeNull();
  });
});

describe('height unit conversion', () => {
  it('metric is identity (cm)', () => {
    expect(heightCmToDisplay(180, 'metric')).toBe(180);
    expect(displayHeightToCm(180, 'metric')).toBe(180);
  });

  it('imperial round trips cm <-> total inches', () => {
    const inches = heightCmToDisplay(180, 'imperial');
    expect(inches).toBeCloseTo(70.87, 1);
    expect(displayHeightToCm(inches as number, 'imperial')).toBeCloseTo(180, 1);
  });
});
