// Prompt 172 Phase 1B (172a): meal card microcopy public surface.
//
// Exports the typed getMicrocopy() lookup, the readonly MICROCOPY_KEYS array
// so vitest can enumerate every key for the clinical claim lint sweep, and
// the underlying string map for downstream tests that need full access.
//
// Hard rules honored: no em or en dashes, no emojis, no any.

import { MICROCOPY_STRINGS } from './strings';
import type { MicrocopyKey, MicrocopyVariant } from './types';

export type { MicrocopyKey, MicrocopyVariant, MicrocopyEntry, MicrocopyMap } from './types';
export { MICROCOPY_STRINGS } from './strings';

/**
 * Readonly list of every microcopy key. Used by the build time clinical
 * claim lint sweep and by any downstream test that needs to iterate the
 * full set of keys without coupling to the string map's internal ordering.
 */
export const MICROCOPY_KEYS: ReadonlyArray<MicrocopyKey> = Object.freeze(
  Object.keys(MICROCOPY_STRINGS) as MicrocopyKey[],
);

/**
 * Look up a microcopy string by key + variant. Variant defaults to normal so
 * existing call sites do not have to thread the safety mode flag through
 * everywhere; the orchestrator reads useSafetyMode at the boundary and only
 * passes the safety_mode variant when enabled is true.
 */
export function getMicrocopy(
  key: MicrocopyKey,
  variant: MicrocopyVariant = 'normal',
): string {
  return MICROCOPY_STRINGS[key][variant];
}
