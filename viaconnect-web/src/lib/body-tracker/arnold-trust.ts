// DISPLAY-layer trust lookup. Reads Arnold's live table.
// Does not change reconciler engine rules or the Bio Optimization Score formula.

import { ARNOLD_DEFAULT_TRUST_SCORES } from './arnold-reconciler';

export type WearableVendor =
  | 'whoop'
  | 'oura'
  | 'hume'
  | 'apple_health'
  | 'apple_watch'
  | 'manual';

/** Fallback only when Arnold's table has no key for the source. */
const SILENT_TABLE_FALLBACK: Record<string, number> = {
  manual: 1,
  'wearable:apple_watch': 0.85,
  'wearable:whoop': 0.85,
  'wearable:oura': 0.85,
  'wearable:hume_body_pod': 0.8,
  'plugin:apple_health': 0.75,
};

export const ARNOLD_SOURCE_KEYS = {
  manual: 'manual',
  whoop: 'wearable:whoop',
  oura: 'wearable:oura',
  hume: 'wearable:hume_body_pod',
  apple_watch: 'wearable:apple_watch',
  apple_health: 'plugin:apple_health',
} as const;

/** No Arnold activity→strain map exists. Do not invent one. */
export const ARNOLD_MAPS_ACTIVITY_TO_STRAIN = false;

export function isAppleWatchNative(sourceApp?: string | null): boolean {
  return /apple\s*watch/i.test(sourceApp ?? '');
}

export function arnoldSourceForVendor(vendor: WearableVendor): string {
  return ARNOLD_SOURCE_KEYS[vendor];
}

export function resolveArnoldTrust(
  arnoldSource: string,
  overrides?: Record<string, number> | null,
): number {
  const over = overrides?.[arnoldSource];
  if (typeof over === 'number' && Number.isFinite(over)) return over;
  const live = ARNOLD_DEFAULT_TRUST_SCORES[arnoldSource];
  if (typeof live === 'number' && Number.isFinite(live)) return live;
  const fallback = SILENT_TABLE_FALLBACK[arnoldSource];
  if (typeof fallback === 'number') return fallback;
  return 0.5;
}

export function vendorFromIngest(input: {
  provider: string;
  sourceApp?: string | null;
  hume?: boolean;
  manual?: boolean;
}): { vendor: WearableVendor; arnoldSource: string; shortLabel: string } {
  if (input.manual) {
    return { vendor: 'manual', arnoldSource: ARNOLD_SOURCE_KEYS.manual, shortLabel: 'Manual' };
  }
  if (input.hume) {
    return { vendor: 'hume', arnoldSource: ARNOLD_SOURCE_KEYS.hume, shortLabel: 'Hume' };
  }
  if (input.provider === 'whoop') {
    return { vendor: 'whoop', arnoldSource: ARNOLD_SOURCE_KEYS.whoop, shortLabel: 'Whoop' };
  }
  if (input.provider === 'oura') {
    return { vendor: 'oura', arnoldSource: ARNOLD_SOURCE_KEYS.oura, shortLabel: 'Oura' };
  }
  if (isAppleWatchNative(input.sourceApp)) {
    return {
      vendor: 'apple_watch',
      arnoldSource: ARNOLD_SOURCE_KEYS.apple_watch,
      shortLabel: 'Apple Watch',
    };
  }
  return {
    vendor: 'apple_health',
    arnoldSource: ARNOLD_SOURCE_KEYS.apple_health,
    shortLabel: 'Apple Health',
  };
}

export function parseTrustOverrides(raw: unknown): Record<string, number> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out: Record<string, number> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof value === 'number' && Number.isFinite(value)) out[key] = value;
  }
  return out;
}
