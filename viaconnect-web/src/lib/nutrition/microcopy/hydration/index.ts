// Prompt 172e Phase B: hydration picker microcopy public surface.
//
// Exports the typed getHydrationMicrocopy() lookup, the readonly
// HYDRATION_MICROCOPY_KEYS array so vitest can enumerate every key for the
// clinical claim lint sweep, and the underlying string map for downstream
// tests that need full access.
//
// Hard rules honored: no em or en dashes, no emojis, no any.

import { HYDRATION_MICROCOPY_STRINGS } from './strings';
import type { HydrationMicrocopyKey, HydrationMicrocopyVariant } from './types';

export type {
  HydrationMicrocopyKey,
  HydrationMicrocopyVariant,
  HydrationMicrocopyEntry,
  HydrationMicrocopyMap,
} from './types';
export { HYDRATION_MICROCOPY_STRINGS } from './strings';

/**
 * Readonly list of every hydration microcopy key. Used by the build time
 * clinical claim lint sweep and by any downstream test that needs to iterate
 * the full set of keys without coupling to the string map's internal
 * ordering.
 */
export const HYDRATION_MICROCOPY_KEYS: ReadonlyArray<HydrationMicrocopyKey> = Object.freeze(
  Object.keys(HYDRATION_MICROCOPY_STRINGS) as HydrationMicrocopyKey[],
);

/**
 * Look up a hydration microcopy string by key + variant. Variant defaults to
 * normal so existing call sites do not have to thread the safety mode flag
 * through everywhere; the BeveragePicker orchestrator reads useSafetyMode at
 * the boundary and only passes the safety_mode variant when enabled is true.
 */
export function getHydrationMicrocopy(
  key: HydrationMicrocopyKey,
  variant: HydrationMicrocopyVariant = 'normal',
): string {
  return HYDRATION_MICROCOPY_STRINGS[key][variant];
}
