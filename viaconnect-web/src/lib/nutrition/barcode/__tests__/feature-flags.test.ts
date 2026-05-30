// Prompt 170l Phase 1c-4: tests for the barcode feature flag readers.
//
// Three kill switches per spec §13.4. Env-var driven; case insensitive on
// the truthy whitelist {true, 1, yes, on}.

import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import {
  readBarcodeFeatureFlags,
  BARCODE_TELEMETRY_SAMPLE_RATE,
  BARCODE_OFF_LOOKUPS_PER_DAY_LIMIT,
  BARCODE_OFF_CACHE_TTL_DAYS,
  BARCODE_OFF_CACHE_COLD_PURGE_DAYS,
  BARCODE_MULTI_PRODUCT_SOFT_CAP,
  BARCODE_OFF_FETCH_TIMEOUT_MS,
  BARCODE_OFF_USER_AGENT,
} from '../feature-flags';

const KEYS = [
  'BARCODE_SCAN_ENABLED',
  'BARCODE_OFF_API_FALLBACK_TO_PHOTO_ENABLED',
  'BARCODE_MULTI_PRODUCT_MEAL_ENABLED',
];

describe('readBarcodeFeatureFlags', () => {
  const originalEnv: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const k of KEYS) {
      originalEnv[k] = process.env[k];
      delete process.env[k];
    }
  });

  afterEach(() => {
    for (const k of KEYS) {
      if (originalEnv[k] === undefined) {
        delete process.env[k];
      } else {
        process.env[k] = originalEnv[k];
      }
    }
  });

  it('defaults to master off, fallback on, multi-product on when env unset', () => {
    const flags = readBarcodeFeatureFlags();
    expect(flags.barcodeScanEnabled).toBe(false);
    expect(flags.offApiFallbackToPhotoEnabled).toBe(true);
    expect(flags.multiProductMealEnabled).toBe(true);
  });

  it.each(['true', '1', 'yes', 'on', 'TRUE', 'Yes'])(
    'treats %p as enabled',
    (value) => {
      process.env.BARCODE_SCAN_ENABLED = value;
      expect(readBarcodeFeatureFlags().barcodeScanEnabled).toBe(true);
    },
  );

  it.each(['false', '0', 'no', 'off', 'maybe', '', '  '])(
    'treats %p as disabled',
    (value) => {
      process.env.BARCODE_SCAN_ENABLED = value;
      expect(readBarcodeFeatureFlags().barcodeScanEnabled).toBe(false);
    },
  );

  it('allows fallback and multi-product to be flipped off independently', () => {
    process.env.BARCODE_OFF_API_FALLBACK_TO_PHOTO_ENABLED = 'false';
    process.env.BARCODE_MULTI_PRODUCT_MEAL_ENABLED = '0';
    const flags = readBarcodeFeatureFlags();
    expect(flags.offApiFallbackToPhotoEnabled).toBe(false);
    expect(flags.multiProductMealEnabled).toBe(false);
  });

  it('trims surrounding whitespace on truthy detection', () => {
    process.env.BARCODE_SCAN_ENABLED = '  true  ';
    expect(readBarcodeFeatureFlags().barcodeScanEnabled).toBe(true);
  });
});

describe('exported constants (smoke)', () => {
  it('telemetry sample rate is 10pct (matches 170j voice convention)', () => {
    expect(BARCODE_TELEMETRY_SAMPLE_RATE).toBe(0.10);
  });

  it('OFF lookup cap is 200 per day per spec 3.5', () => {
    expect(BARCODE_OFF_LOOKUPS_PER_DAY_LIMIT).toBe(200);
  });

  it('cache TTL 7 days; cold purge 90 days', () => {
    expect(BARCODE_OFF_CACHE_TTL_DAYS).toBe(7);
    expect(BARCODE_OFF_CACHE_COLD_PURGE_DAYS).toBe(90);
  });

  it('multi-product soft cap is 8 items per Hannah 11.7', () => {
    expect(BARCODE_MULTI_PRODUCT_SOFT_CAP).toBe(8);
  });

  it('OFF fetch timeout is in single-digit seconds', () => {
    expect(BARCODE_OFF_FETCH_TIMEOUT_MS).toBeGreaterThanOrEqual(2000);
    expect(BARCODE_OFF_FETCH_TIMEOUT_MS).toBeLessThanOrEqual(10000);
  });

  it('User-Agent identifies ViaConnect for OFF rate-limit etiquette', () => {
    expect(BARCODE_OFF_USER_AGENT).toMatch(/ViaConnect/);
    expect(BARCODE_OFF_USER_AGENT).toMatch(/@farmceutica/);
  });
});
