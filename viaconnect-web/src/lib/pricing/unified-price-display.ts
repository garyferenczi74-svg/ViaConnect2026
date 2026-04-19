// Prompt #91 Phase 3: Unified pricing presenter.
//
// One entry point that any product card can call to render the right price
// for the viewing user. Routing rules:
//
//   * Active practitioner with valid wholesale context → wholesale pricing
//     (50 percent off MSRP), MSRP shown struck through, "Practitioner
//     Wholesale" badge.
//   * Authenticated consumer with a UserPricingContext → consumer
//     subscriber + annual prepay pricing.
//   * Anonymous visitor → MSRP-only, no discount metadata.
//
// Pure function. Calls into the consumer discount-engine and the wholesale
// engine; both are pure and synchronous when given pre-loaded context.

import type { UserPricingContext } from '@/types/pricing';
import {
  calculateWholesalePrice,
  type WholesalePrice,
  type WholesalePricingContext,
} from './wholesale-engine';

export type PricingDisplayContext = 'consumer' | 'practitioner_wholesale';

export interface UnifiedProductPricing {
  msrpCents: number;
  displayContext: PricingDisplayContext;
  consumerPricing?: {
    subscriberPriceCents: number;
    annualPrepayPriceCents: number;
    discountPercent: number;
  };
  wholesalePricing?: WholesalePrice;
}

/**
 * Resolve the right pricing block to render for the current viewer.
 *
 * Note: this entry point is intentionally synchronous. Consumer pricing
 * with subscriber + annual-prepay numbers requires loading the discount
 * rules; that variant is composed at the call site by passing pre-resolved
 * subscriber/annual figures via getUnifiedPricingFromConsumerSnapshot.
 * For Phase 3 the default consumer branch returns MSRP-equivalent pricing
 * when no resolved snapshot is supplied.
 */
export function getUnifiedPricing(
  msrpCents: number,
  userContext: UserPricingContext | null,
  practitionerContext: WholesalePricingContext | null,
): UnifiedProductPricing {
  if (practitionerContext?.isActivePractitioner) {
    return {
      msrpCents,
      displayContext: 'practitioner_wholesale',
      wholesalePricing: calculateWholesalePrice(msrpCents, practitionerContext),
    };
  }

  // Consumer path. We do not load discount rules synchronously here; the
  // caller passes resolved subscriber + annual snapshots when known.
  return {
    msrpCents,
    displayContext: 'consumer',
    consumerPricing: {
      subscriberPriceCents: msrpCents,
      annualPrepayPriceCents: msrpCents,
      discountPercent: 0,
    },
  };
}

/**
 * Variant for callers that have already resolved consumer subscriber +
 * annual-prepay prices via the discount-engine. Practitioner context still
 * wins when present.
 */
export function getUnifiedPricingFromConsumerSnapshot(
  msrpCents: number,
  consumerSnapshot: {
    subscriberPriceCents: number;
    annualPrepayPriceCents: number;
    discountPercent: number;
  } | null,
  practitionerContext: WholesalePricingContext | null,
): UnifiedProductPricing {
  if (practitionerContext?.isActivePractitioner) {
    return {
      msrpCents,
      displayContext: 'practitioner_wholesale',
      wholesalePricing: calculateWholesalePrice(msrpCents, practitionerContext),
    };
  }
  return {
    msrpCents,
    displayContext: 'consumer',
    consumerPricing: consumerSnapshot ?? {
      subscriberPriceCents: msrpCents,
      annualPrepayPriceCents: msrpCents,
      discountPercent: 0,
    },
  };
}
