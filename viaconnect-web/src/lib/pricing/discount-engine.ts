// Prompt #90 Phase 2: Supplement discount calculation engine.
//
// The heavy lifting is a pure function `computeDiscount` that takes
// user context + price + loaded rules and returns the deterministic
// discount result. A thin DB-backed wrapper loads the rules from
// Supabase and caches them in-process. Business logic and DB access
// are split so tests do not need a Supabase mock.

import type {
  DiscountCalculationResult,
  DiscountRuleId,
  SupplementDiscountRule,
  UserPricingContext,
} from '@/types/pricing';
import type { PricingSupabaseClient } from './supabase-types';

const MAX_DISCOUNT_PERCENT = 25;

// ----- Pure logic ------------------------------------------------------------

export interface ComputeDiscountOptions {
  isSubscriptionPurchase: boolean;
  isAnnualPrepay?: boolean;
}

/** Given loaded rules, compute the discount result. No DB access. */
export function computeDiscount(
  originalPriceCents: number,
  context: UserPricingContext,
  rules: SupplementDiscountRule[],
  options: ComputeDiscountOptions,
): DiscountCalculationResult {
  if (originalPriceCents <= 0) return zero(originalPriceCents);

  const nonBonus = rules.filter((r) => !r.is_annual_prepay_bonus);
  const bonus = rules.find((r) => r.is_annual_prepay_bonus) ?? null;

  // Highest rule_priority wins among non-bonus rules the user qualifies for.
  const sortedNonBonus = [...nonBonus].sort((a, b) => b.rule_priority - a.rule_priority);
  const qualifying = sortedNonBonus.find((r) => qualifies(r, context, options)) ?? null;
  const baseDiscount = qualifying?.discount_percent ?? 0;

  const applyBonus = Boolean(
    options.isAnnualPrepay &&
    options.isSubscriptionPurchase &&
    bonus &&
    qualifying,
  );
  const bonusPercent = applyBonus ? (bonus?.discount_percent ?? 0) : 0;

  const uncapped = baseDiscount + bonusPercent;
  const total = Math.min(uncapped, MAX_DISCOUNT_PERCENT);
  const savings = Math.round(originalPriceCents * (total / 100));

  return {
    originalPriceCents,
    appliedDiscountPercent: total,
    appliedRuleId: (qualifying?.id ?? null) as DiscountRuleId | null,
    annualPrepayBonusApplied: applyBonus,
    finalPriceCents: originalPriceCents - savings,
    savingsCents: savings,
    breakdown: {
      baseDiscount,
      annualBonus: bonusPercent,
      totalDiscount: total,
    },
  };
}

function qualifies(
  rule: SupplementDiscountRule,
  context: UserPricingContext,
  options: ComputeDiscountOptions,
): boolean {
  if (rule.requires_subscription && !options.isSubscriptionPurchase) return false;
  if (rule.requires_genex360_any && !context.ownsAnyGeneX360) return false;
  if (rule.requires_genex360_complete && !context.ownsGeneX360Complete) return false;
  if (rule.requires_active_protocol && !context.hasActiveProtocol) return false;
  return true;
}

function zero(priceCents: number): DiscountCalculationResult {
  return {
    originalPriceCents: priceCents,
    appliedDiscountPercent: 0,
    appliedRuleId: null,
    annualPrepayBonusApplied: false,
    finalPriceCents: priceCents,
    savingsCents: 0,
    breakdown: { baseDiscount: 0, annualBonus: 0, totalDiscount: 0 },
  };
}

// ----- DB-backed wrapper with cache -----------------------------------------

let cachedRules: SupplementDiscountRule[] | null = null;

export async function loadDiscountRules(client: PricingSupabaseClient): Promise<SupplementDiscountRule[]> {
  if (cachedRules) return cachedRules;
  const { data, error } = await client
    .from('supplement_discount_rules')
    .select('*')
    .eq('is_active', true)
    .order('rule_priority', { ascending: false });
  if (error) throw new Error(`Failed to load discount rules: ${error.message}`);
  cachedRules = (data ?? []) as SupplementDiscountRule[];
  return cachedRules;
}

export function clearDiscountRulesCache(): void {
  cachedRules = null;
}

export async function calculateSupplementDiscount(
  client: PricingSupabaseClient,
  originalPriceCents: number,
  context: UserPricingContext,
  options: ComputeDiscountOptions,
): Promise<DiscountCalculationResult> {
  const rules = await loadDiscountRules(client);
  return computeDiscount(originalPriceCents, context, rules, options);
}

export { MAX_DISCOUNT_PERCENT };
