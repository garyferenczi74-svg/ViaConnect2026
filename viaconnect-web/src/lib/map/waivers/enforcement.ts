// Prompt #101 Workstream B — pure suppression logic.
// Mirrors detect_map_violations() suppression semantics so client code
// can preview whether an observation would suppress without a DB call.

import type { MAPSeverity } from '@/lib/map/types';
import { classifyMAPSeverity } from '@/lib/map/severity';
import { observationInWaiverScope } from './validation';

export interface ActiveWaiverSummary {
  waiverId: string;
  productId: string;
  waivedPriceCents: number;
  scopeUrls: string[];
  waiverStartAt: string;
  waiverEndAt: string;
}

export interface ActiveVIPSummary {
  vipExemptionId: string;
  productId: string;
  exemptionStartAt: string;
  exemptionEndAt: string;
}

export interface ObservationInput {
  productId: string;
  observedPriceCents: number;
  observedAt: string;
  sourceUrl: string;
  mapPriceCents: number;
  ingredientCostFloorCents: number;
  isFlashSale?: boolean;
  flashSaleEndsAt?: string | null;
}

export type SuppressionReason =
  | 'flash_sale'
  | 'waiver'
  | 'vip_customer_url'
  | 'exemption_window';

export interface SuppressionOutcome {
  severity: MAPSeverity | null;
  suppressedBy: SuppressionReason | null;
}

function isCustomerSpecificUrl(url: string): boolean {
  return /\/(customer|patient|member|vip)\/[a-zA-Z0-9_-]+/.test(url);
}

function withinWindow(observedAt: string, startAt: string, endAt: string): boolean {
  const t = new Date(observedAt).getTime();
  return t >= new Date(startAt).getTime() && t <= new Date(endAt).getTime();
}

/** Pure: determine whether an observation would trigger a violation,
 *  factoring waiver suppression, VIP suppression, and flash-sale fairness.
 *  Returns the severity that would be recorded, or null if suppressed. */
export function resolveObservationSeverity(
  observation: ObservationInput,
  activeWaivers: ActiveWaiverSummary[],
  activeVIPs: ActiveVIPSummary[],
): SuppressionOutcome {
  // Flash-sale fairness: suppress entirely during active window.
  if (observation.isFlashSale && observation.flashSaleEndsAt) {
    if (new Date(observation.flashSaleEndsAt).getTime() > new Date(observation.observedAt).getTime()) {
      return { severity: null, suppressedBy: 'flash_sale' };
    }
  }

  // Absolute margin floor beats every suppression mechanism.
  const absoluteFloorCents = Math.ceil(observation.ingredientCostFloorCents * 1.72);
  if (observation.observedPriceCents < absoluteFloorCents) {
    return { severity: 'black', suppressedBy: null };
  }

  // VIP suppression: customer-specific URL + active exemption.
  if (isCustomerSpecificUrl(observation.sourceUrl)) {
    const vipHit = activeVIPs.find(
      (v) =>
        v.productId === observation.productId &&
        withinWindow(observation.observedAt, v.exemptionStartAt, v.exemptionEndAt),
    );
    if (vipHit) return { severity: null, suppressedBy: 'vip_customer_url' };
  }

  // Waiver suppression: scope match + observed >= waived price.
  const waiver = activeWaivers.find(
    (w) =>
      w.productId === observation.productId &&
      withinWindow(observation.observedAt, w.waiverStartAt, w.waiverEndAt) &&
      observationInWaiverScope(observation.sourceUrl, w.scopeUrls),
  );
  if (waiver) {
    if (observation.observedPriceCents >= waiver.waivedPriceCents) {
      return { severity: null, suppressedBy: 'waiver' };
    }
  }

  // Standard severity.
  const severity = classifyMAPSeverity({
    observedPriceCents: observation.observedPriceCents,
    mapPriceCents: observation.mapPriceCents,
    ingredientCostFloorCents: observation.ingredientCostFloorCents,
  });
  return { severity, suppressedBy: null };
}
