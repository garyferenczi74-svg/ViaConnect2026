/**
 * Prompt 172e Phase F Workstream 3: telemetry privacy invariants + volume
 * bucket math.
 *
 * Phase F extends the existing 170o hydration_log_sessions telemetry table
 * (20pct sample rate; service role inserts only; metadata only) with three
 * append only columns that surface catalog adoption coarsely without
 * leaking the spec section 12 forbidden signals (safety mode clinical
 * inference, raw caffeine mg, raw sodium mg, user identity beyond the
 * existing user_hash).
 *
 * This file pins:
 *   1. the volume bucket function maps the 5 spec ranges correctly at
 *      every boundary (the buckets ride on telemetry rows, never on user
 *      facing copy, so the function is a small pure helper)
 *   2. the caffeine contributed flag is true exactly when the route would
 *      have attributed caffeine to meal_items.caffeine_mg (the only
 *      catalog adoption signal that reflects 171b integration)
 *   3. the telemetry insert payload shape never contains the section 12
 *      forbidden fields, even when the catalog row carries caffeine,
 *      sodium, and the user is in safety mode
 *
 * The route integration test in
 * src/app/api/nutrition/hydration/quick-log/__tests__/phase-f.test.ts
 * exercises the wiring end to end; this file pins the helpers + the
 * privacy invariant.
 */

import { describe, it, expect } from 'vitest';
import {
  computeEffectiveVolumeBucket,
  computeCaffeineContributedFlag,
  buildPhaseFTelemetryFields,
  TELEMETRY_FORBIDDEN_FIELDS,
} from '@/lib/nutrition/hydration/phase-f-telemetry';

describe('Phase F: computeEffectiveVolumeBucket boundary math', () => {
  it('maps 0 ml to the 0-100ml bucket', () => {
    expect(computeEffectiveVolumeBucket(0)).toBe('0-100ml');
  });

  it('maps a small sip just above zero to the 0-100ml bucket', () => {
    expect(computeEffectiveVolumeBucket(1)).toBe('0-100ml');
  });

  it('maps 99 ml to the 0-100ml bucket (upper open boundary)', () => {
    expect(computeEffectiveVolumeBucket(99)).toBe('0-100ml');
  });

  it('maps exactly 100 ml to the 100-250ml bucket (lower closed boundary)', () => {
    expect(computeEffectiveVolumeBucket(100)).toBe('100-250ml');
  });

  it('maps a standard espresso shot 30 ml to the 0-100ml bucket', () => {
    expect(computeEffectiveVolumeBucket(30)).toBe('0-100ml');
  });

  it('maps a typical glass 240 ml to the 100-250ml bucket', () => {
    expect(computeEffectiveVolumeBucket(240)).toBe('100-250ml');
  });

  it('maps exactly 250 ml to the 250-500ml bucket (lower closed boundary)', () => {
    expect(computeEffectiveVolumeBucket(250)).toBe('250-500ml');
  });

  it('maps a 355 ml can to the 250-500ml bucket', () => {
    expect(computeEffectiveVolumeBucket(355)).toBe('250-500ml');
  });

  it('maps exactly 500 ml to the 500-750ml bucket (lower closed boundary)', () => {
    expect(computeEffectiveVolumeBucket(500)).toBe('500-750ml');
  });

  it('maps a 750 ml bottle threshold to the 750+ml bucket (lower closed)', () => {
    expect(computeEffectiveVolumeBucket(750)).toBe('750+ml');
  });

  it('maps an extreme 2000 ml jug to the 750+ml bucket', () => {
    expect(computeEffectiveVolumeBucket(2000)).toBe('750+ml');
  });

  it('returns null for negative ml (defensive; not expected in production)', () => {
    expect(computeEffectiveVolumeBucket(-1)).toBeNull();
  });

  it('returns null for NaN volume', () => {
    expect(computeEffectiveVolumeBucket(Number.NaN)).toBeNull();
  });

  it('returns null for non finite volume', () => {
    expect(computeEffectiveVolumeBucket(Number.POSITIVE_INFINITY)).toBeNull();
  });
});

describe('Phase F: computeCaffeineContributedFlag truth table', () => {
  it('is true when catalog caffeine attribution would write a positive caffeine_mg', () => {
    expect(
      computeCaffeineContributedFlag({
        effective_caffeine_mg: 95,
        attribute_caffeine: true,
      }),
    ).toBe(true);
  });

  it('is false when effective caffeine is zero (herbal tea, water, juice)', () => {
    expect(
      computeCaffeineContributedFlag({
        effective_caffeine_mg: 0,
        attribute_caffeine: true,
      }),
    ).toBe(false);
  });

  it('is false when attribution was skipped (dedup guard or non catalog path)', () => {
    expect(
      computeCaffeineContributedFlag({
        effective_caffeine_mg: 95,
        attribute_caffeine: false,
      }),
    ).toBe(false);
  });

  it('is false for negative effective caffeine (defensive)', () => {
    expect(
      computeCaffeineContributedFlag({
        effective_caffeine_mg: -10,
        attribute_caffeine: true,
      }),
    ).toBe(false);
  });
});

describe('Phase F: buildPhaseFTelemetryFields privacy invariant', () => {
  it('returns the three Phase F fields when a catalog row drives the log', () => {
    const fields = buildPhaseFTelemetryFields({
      beverage_slug: 'coffee_drip',
      volume_ml: 240,
      effective_caffeine_mg: 95,
      attribute_caffeine: true,
    });
    expect(fields.beverage_catalog_slug).toBe('coffee_drip');
    expect(fields.effective_volume_bucket).toBe('100-250ml');
    expect(fields.caffeine_contributed_flag).toBe(true);
  });

  it('returns nullable slug and bucket but always sets the flag when no slug present', () => {
    const fields = buildPhaseFTelemetryFields({
      beverage_slug: null,
      volume_ml: 240,
      effective_caffeine_mg: 0,
      attribute_caffeine: false,
    });
    expect(fields.beverage_catalog_slug).toBeNull();
    // Legacy 170o quick log button paths still get a bucket so the analytics
    // surface can see catalog vs non catalog distribution. Only the slug is
    // a true catalog adoption signal.
    expect(fields.effective_volume_bucket).toBe('100-250ml');
    expect(fields.caffeine_contributed_flag).toBe(false);
  });

  it('never includes any of the spec section 12 forbidden fields in its output keys', () => {
    const fields = buildPhaseFTelemetryFields({
      beverage_slug: 'coffee_drip',
      volume_ml: 240,
      effective_caffeine_mg: 95,
      attribute_caffeine: true,
    });
    const keys = Object.keys(fields);
    for (const forbidden of TELEMETRY_FORBIDDEN_FIELDS) {
      expect(keys).not.toContain(forbidden);
    }
  });

  it('TELEMETRY_FORBIDDEN_FIELDS pins the spec section 12 forbidden list', () => {
    // The constant exists so a regression that adds raw mg or safety mode
    // state to telemetry trips this assertion at build time. Any addition
    // here is a spec contract change that requires Kelsey re review.
    expect(TELEMETRY_FORBIDDEN_FIELDS).toContain('safety_mode_enabled');
    expect(TELEMETRY_FORBIDDEN_FIELDS).toContain('caffeine_mg');
    expect(TELEMETRY_FORBIDDEN_FIELDS).toContain('sodium_mg');
    expect(TELEMETRY_FORBIDDEN_FIELDS).toContain('potassium_mg');
    expect(TELEMETRY_FORBIDDEN_FIELDS).toContain('magnesium_mg');
    expect(TELEMETRY_FORBIDDEN_FIELDS).toContain('sugar_g');
    expect(TELEMETRY_FORBIDDEN_FIELDS).toContain('kcal_per_serving');
    expect(TELEMETRY_FORBIDDEN_FIELDS).toContain('user_id');
  });
});
