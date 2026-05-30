/**
 * Prompt 170l Phase 1a: three nested kill switches for barcode scanning per
 * spec §13.4. Master switch defaults false at launch per spec. All env-var
 * driven; mirrors the voice/feature-flags.ts pattern from 170j.
 *
 * Gate 4: 10% telemetry sampling matches 170j convention.
 * Gate 4: 200 OFF lookups/user/day enforced server-side via user_off_lookups.
 *
 * Defaults at launch:
 *   BARCODE_SCAN_ENABLED                            = false (master)
 *   BARCODE_OFF_API_FALLBACK_TO_PHOTO_ENABLED       = true
 *   BARCODE_MULTI_PRODUCT_MEAL_ENABLED              = true
 *
 * Hannah's UX defaults (Gate 3) live on user_nutrivision_settings columns,
 * not env vars (per-user preference, not platform kill switches).
 */

export interface BarcodeFeatureFlags {
  barcodeScanEnabled: boolean;
  offApiFallbackToPhotoEnabled: boolean;
  multiProductMealEnabled: boolean;
}

const TRUE_VALUES = new Set(['true', '1', 'yes', 'on']);

function readBooleanEnv(key: string, defaultValue: boolean): boolean {
  const raw = process.env[key];
  if (raw === undefined) return defaultValue;
  return TRUE_VALUES.has(raw.trim().toLowerCase());
}

export function readBarcodeFeatureFlags(): BarcodeFeatureFlags {
  return {
    barcodeScanEnabled: readBooleanEnv('BARCODE_SCAN_ENABLED', false),
    offApiFallbackToPhotoEnabled: readBooleanEnv(
      'BARCODE_OFF_API_FALLBACK_TO_PHOTO_ENABLED',
      true,
    ),
    multiProductMealEnabled: readBooleanEnv(
      'BARCODE_MULTI_PRODUCT_MEAL_ENABLED',
      true,
    ),
  };
}

// Telemetry sampling: 10% per Gate 4 (matches 170j voice convention).
export const BARCODE_TELEMETRY_SAMPLE_RATE = 0.10;

// OFF rate limit: 200 lookups per user per day per spec §3.5.
export const BARCODE_OFF_LOOKUPS_PER_DAY_LIMIT = 200;

// Cache TTLs per spec §3.4.
export const BARCODE_OFF_CACHE_TTL_DAYS = 7;
export const BARCODE_OFF_CACHE_COLD_PURGE_DAYS = 90;

// Multi-product soft cap per Hannah §11.7. No hard block.
export const BARCODE_MULTI_PRODUCT_SOFT_CAP = 8;

// Server-side OFF fetch budget per spec §3.5.
export const BARCODE_OFF_FETCH_TIMEOUT_MS = 4000;

// User-Agent identification per ODbL §3.6 + OFF citizenship.
export const BARCODE_OFF_USER_AGENT =
  'ViaConnect-NutriVision/1.0 (contact@farmceutica.com)';
