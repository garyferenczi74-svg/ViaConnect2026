// Prompt #101 Workstream C — pure VIP exemption validation.

import {
  MAX_CONCURRENT_ACTIVE_VIP_EXEMPTIONS_PER_PRACTITIONER,
  VIP_EXEMPTION_MAX_WINDOW_DAYS,
} from './types';
import { marginPreservingFloorCents } from '@/lib/map/guardrails';

export type VIPValidationError =
  | 'VIP_INVALID_TIER'
  | 'VIP_WINDOW_INVALID'
  | 'VIP_WINDOW_EXCEEDS_MAX'
  | 'VIP_MARGIN_BREACH'
  | 'VIP_CONCURRENCY_EXCEEDED'
  | 'VIP_CUSTOMER_REQUIRED'
  | 'VIP_CUSTOMER_CONFLICT';

/** Pure: exactly one customer identity (client OR manual, not both). */
export function validateCustomerIdentity(
  customerClientId: string | null,
  manualCustomerId: string | null,
): VIPValidationError | null {
  if (!customerClientId && !manualCustomerId) return 'VIP_CUSTOMER_REQUIRED';
  if (customerClientId && manualCustomerId) return 'VIP_CUSTOMER_CONFLICT';
  return null;
}

/** Pure: window must be positive and within the 180-day cap. */
export function validateVIPWindow(startAt: Date, endAt: Date): VIPValidationError | null {
  if (endAt.getTime() <= startAt.getTime()) return 'VIP_WINDOW_INVALID';
  const maxMs = VIP_EXEMPTION_MAX_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  if (endAt.getTime() - startAt.getTime() > maxMs) return 'VIP_WINDOW_EXCEEDS_MAX';
  return null;
}

/** Pure: margin preserved at 1.72× floor. */
export function validateVIPMargin(
  exemptedPriceCents: number,
  ingredientCostFloorCents: number,
): VIPValidationError | null {
  if (ingredientCostFloorCents <= 0) return 'VIP_MARGIN_BREACH';
  if (exemptedPriceCents < marginPreservingFloorCents(ingredientCostFloorCents)) {
    return 'VIP_MARGIN_BREACH';
  }
  return null;
}

/** Pure: 6th active exemption is the concurrency breach. */
export function validateVIPConcurrency(currentActiveCount: number): VIPValidationError | null {
  if (currentActiveCount >= MAX_CONCURRENT_ACTIVE_VIP_EXEMPTIONS_PER_PRACTITIONER) {
    return 'VIP_CONCURRENCY_EXCEEDED';
  }
  return null;
}

/** Pure: URL pattern that qualifies for VIP suppression. */
export function isCustomerSpecificUrl(url: string): boolean {
  return /\/(customer|patient|member|vip)\/[a-zA-Z0-9_-]+/.test(url);
}
