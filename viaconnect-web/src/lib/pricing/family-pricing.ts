// Prompt #90 Phase 2: Family pricing calculator.
// Same pattern as discount engine: pure `computeFamilyPricing` function
// for testing, plus a DB-backed wrapper for the app.

import type { FamilyPricingBreakdown, MembershipTier } from '@/types/pricing';
import type { PricingSupabaseClient } from './supabase-types';

export interface FamilyPricingInputs {
  totalAdults: number;
  totalChildren: number;
  billingCycle: 'monthly' | 'annual';
}

/** Pure computation: given tier config + family size + cycle, return breakdown.
 *  Throws on invalid inputs (too few / too many adults, negative children). */
export function computeFamilyPricing(
  inputs: FamilyPricingInputs,
  tier: MembershipTier,
): FamilyPricingBreakdown {
  if (inputs.totalAdults < 1) {
    throw new Error('Family tier requires at least 1 adult (the primary)');
  }
  const maxAdults = tier.max_adults_allowed ?? 4;
  if (inputs.totalAdults > maxAdults) {
    throw new Error(`Maximum ${maxAdults} adults allowed in Family tier`);
  }
  if (inputs.totalChildren < 0) {
    throw new Error('Children count cannot be negative');
  }

  const baseAdultsIncluded = tier.base_adults_included ?? 2;
  const baseChildrenIncluded = tier.base_children_included ?? 2;
  const addAdultPriceCents = tier.additional_adult_price_cents ?? 888;
  const addChildChunkCents = tier.additional_children_chunk_price_cents ?? 888;
  const childChunkSize = tier.children_chunk_size ?? 2;

  const additionalAdultCount = Math.max(0, inputs.totalAdults - baseAdultsIncluded);
  const additionalAdultCostCentsMonthly = additionalAdultCount * addAdultPriceCents;

  const childrenBeyondBase = Math.max(0, inputs.totalChildren - baseChildrenIncluded);
  const additionalChildrenChunks = Math.ceil(childrenBeyondBase / childChunkSize);
  const additionalChildrenCostCentsMonthly = additionalChildrenChunks * addChildChunkCents;

  const basePriceCents =
    inputs.billingCycle === 'monthly' ? tier.monthly_price_cents : tier.annual_price_cents;

  // Annual applies 12x to the monthly add-ons (preserves .88 convention)
  const multiplier = inputs.billingCycle === 'annual' ? 12 : 1;
  const totalAddOnsCents =
    (additionalAdultCostCentsMonthly + additionalChildrenCostCentsMonthly) * multiplier;

  const totalPrice = basePriceCents + totalAddOnsCents;

  // Monthly-equivalent display (divide annual by 12)
  const totalMonthlyCents =
    inputs.billingCycle === 'annual' ? Math.round(totalPrice / 12) : totalPrice;

  // Annual-equivalent display (multiply monthly by 12)
  const totalAnnualCents =
    inputs.billingCycle === 'annual' ? totalPrice : totalPrice * 12;

  // Annual savings: what you would pay month-to-month for 12 months minus the annual plan price.
  const monthToMonthFor12 =
    (tier.monthly_price_cents + additionalAdultCostCentsMonthly + additionalChildrenCostCentsMonthly) * 12;
  const annualSavings =
    inputs.billingCycle === 'annual' ? monthToMonthFor12 - totalPrice : 0;

  return {
    basePriceCents,
    additionalAdultCount,
    additionalAdultCostCents: additionalAdultCostCentsMonthly * multiplier,
    additionalChildrenChunks,
    additionalChildrenCostCents: additionalChildrenCostCentsMonthly * multiplier,
    totalMonthlyCents,
    totalAnnualCents,
    annualSavingsCents: annualSavings,
  };
}

// ----- DB-backed wrapper ----------------------------------------------------

let cachedFamilyTier: MembershipTier | null = null;

export async function loadFamilyTier(client: PricingSupabaseClient): Promise<MembershipTier> {
  if (cachedFamilyTier) return cachedFamilyTier;
  const { data, error } = await client
    .from('membership_tiers')
    .select('*')
    .eq('id', 'platinum_family')
    .single();
  if (error || !data) throw new Error('Platinum+ Family tier not found');
  cachedFamilyTier = data as MembershipTier;
  return cachedFamilyTier;
}

export function clearFamilyTierCache(): void {
  cachedFamilyTier = null;
}

export async function calculateFamilyPricing(
  client: PricingSupabaseClient,
  inputs: FamilyPricingInputs,
): Promise<FamilyPricingBreakdown> {
  const tier = await loadFamilyTier(client);
  return computeFamilyPricing(inputs, tier);
}
