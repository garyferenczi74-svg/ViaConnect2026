// Prompt #90 Phase 2: GeneX360 purchase lifecycle orchestrator.
// Lab operations walk a purchase through states; reaching
// `results_delivered` with a timestamp triggers the gift membership
// via the DB trigger `trigger_activate_genex360_gift`.

import type { GeneX360ProductId, Genex360LifecycleStatus } from '@/types/pricing';
import type { PricingSupabaseClient } from './supabase-types';

export interface LifecycleUpdateInput {
  purchaseId: string;
  newStatus: Genex360LifecycleStatus;
  kitTrackingNumber?: string;
  sampleReceivedAt?: Date;
  labProcessingStartedAt?: Date;
  testResultsDeliveredAt?: Date;
}

export async function updateGeneX360Lifecycle(
  client: PricingSupabaseClient,
  input: LifecycleUpdateInput,
): Promise<void> {
  const updates: Record<string, unknown> = {
    lifecycle_status: input.newStatus,
    updated_at: new Date().toISOString(),
  };

  if (input.newStatus === 'kit_shipped') {
    updates.kit_shipped_at = new Date().toISOString();
    if (input.kitTrackingNumber) updates.kit_tracking_number = input.kitTrackingNumber;
  }
  if (input.newStatus === 'sample_received' && input.sampleReceivedAt) {
    updates.sample_received_at = input.sampleReceivedAt.toISOString();
  }
  if (input.newStatus === 'processing' && input.labProcessingStartedAt) {
    updates.lab_processing_started_at = input.labProcessingStartedAt.toISOString();
  }
  if (input.newStatus === 'results_delivered' && input.testResultsDeliveredAt) {
    // Firing this column update invokes the DB trigger that creates the gift membership.
    updates.test_results_delivered_at = input.testResultsDeliveredAt.toISOString();
  }

  const { error } = await client
    .from('genex360_purchases')
    .update(updates)
    .eq('id', input.purchaseId);
  if (error) throw new Error(`Failed to update GeneX360 lifecycle: ${error.message}`);
}

export interface FamilyMemberPricingResult {
  priceCents: number;
  discountAppliedPercent: number;
}

/** Pure: given product + whether this is the first family member's panel,
 *  compute the price. First member pays full price; subsequent members get
 *  the family discount. */
export function computeFamilyMemberPrice(params: {
  productPriceCents: number;
  familyDiscountPercent: number;
  isFirstPanelForFamily: boolean;
}): FamilyMemberPricingResult {
  if (params.isFirstPanelForFamily) {
    return { priceCents: params.productPriceCents, discountAppliedPercent: 0 };
  }
  const discountAmount = Math.round(params.productPriceCents * (params.familyDiscountPercent / 100));
  return {
    priceCents: params.productPriceCents - discountAmount,
    discountAppliedPercent: params.familyDiscountPercent,
  };
}

export async function calculateFamilyMemberGeneX360Price(
  client: PricingSupabaseClient,
  productId: GeneX360ProductId,
  isFirstPanelForFamily: boolean,
): Promise<FamilyMemberPricingResult> {
  const { data, error } = await client
    .from('genex360_products')
    .select('price_cents, family_member_discount_percent')
    .eq('id', productId)
    .single();
  if (error || !data) throw new Error(`GeneX360 product ${productId} not found`);
  const row = data as { price_cents: number; family_member_discount_percent: number };
  return computeFamilyMemberPrice({
    productPriceCents: row.price_cents,
    familyDiscountPercent: row.family_member_discount_percent,
    isFirstPanelForFamily,
  });
}
