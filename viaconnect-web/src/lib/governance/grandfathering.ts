// Prompt #95 Phase 5: pure grandfathering helpers.
//
// computeExpirationDate: given a policy + a base date, when does the
//   binding expire? `indefinite` returns null.
// resolveBindingApplies: given the current time + a binding's
//   binding_expires_at, is the binding still in force?

import type { GrandfatheringPolicy } from '@/types/governance';

/** Pure: compute the expiration timestamp for a new binding. Returns null
 *  for `indefinite`. `no_grandfathering` should never reach this helper
 *  (callers skip binding creation for that policy). */
export function computeExpirationDate(
  policy: GrandfatheringPolicy,
  baseDate: Date,
): Date | null {
  if (policy === 'indefinite') return null;
  if (policy === 'no_grandfathering') {
    throw new Error(
      'computeExpirationDate should not be called for no_grandfathering; the caller should skip binding creation entirely',
    );
  }
  const result = new Date(baseDate.getTime());
  switch (policy) {
    case 'twelve_months':
      result.setUTCMonth(result.getUTCMonth() + 12);
      return result;
    case 'six_months':
      result.setUTCMonth(result.getUTCMonth() + 6);
      return result;
    case 'thirty_days':
      result.setUTCDate(result.getUTCDate() + 30);
      return result;
    default:
      throw new Error(`Unknown grandfathering policy: ${policy as string}`);
  }
}

/** Pure: is the binding still in force at `now`? Returns true for
 *  indefinite bindings (expires_at === null). */
export function resolveBindingApplies(
  bindingExpiresAt: Date | string | null,
  now: Date = new Date(),
): boolean {
  if (bindingExpiresAt === null) return true;
  const exp = bindingExpiresAt instanceof Date ? bindingExpiresAt : new Date(bindingExpiresAt);
  return now.getTime() < exp.getTime();
}

export interface EffectivePriceInputs {
  hasActiveBinding: boolean;
  boundValueCents: number | null;
  boundValuePercent: number | null;
  currentListValueCents: number | null;
  currentListValuePercent: number | null;
  bindingExpiresAt: Date | string | null;
  now?: Date;
}

export interface EffectivePriceResult {
  effectiveCents: number | null;
  effectivePercent: number | null;
  isGrandfathered: boolean;
}

/** Pure: given a list price + optional binding, return the price the
 *  customer should actually pay. */
export function resolveEffectivePricePure(
  inputs: EffectivePriceInputs,
): EffectivePriceResult {
  const now = inputs.now ?? new Date();
  if (
    inputs.hasActiveBinding &&
    resolveBindingApplies(inputs.bindingExpiresAt, now)
  ) {
    return {
      effectiveCents: inputs.boundValueCents,
      effectivePercent: inputs.boundValuePercent,
      isGrandfathered: true,
    };
  }
  return {
    effectiveCents: inputs.currentListValueCents,
    effectivePercent: inputs.currentListValuePercent,
    isGrandfathered: false,
  };
}
