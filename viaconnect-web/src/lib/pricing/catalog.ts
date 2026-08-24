// Live membership catalog for public /pricing.
// Prices and Helix perks come only from membership_tiers + features.
// Identity is id / tier_level / is_family_tier, never cents matching.

import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';
import type { PricingSupabaseClient } from './supabase-types';

export const PRICING_CATALOG_TIMEOUT_MS = 8000;

export const MEMBERSHIP_TIER_CATALOG_COLUMNS =
  'id, display_name, tier_level, monthly_price_cents, annual_price_cents, annual_savings_cents, description, is_family_tier, base_adults_included, base_children_included, max_adults_allowed, additional_adult_price_cents, additional_children_chunk_price_cents, children_chunk_size, sort_order';

export const FEATURE_CATALOG_COLUMNS =
  'id, display_name, category, minimum_tier_level, requires_family_tier, is_active, kill_switch_engaged';

export interface PublicMembershipTier {
  id: string;
  display_name: string;
  tier_level: number;
  monthly_price_cents: number;
  annual_price_cents: number;
  annual_savings_cents: number | null;
  description: string | null;
  is_family_tier: boolean;
  base_adults_included: number;
  base_children_included: number;
  max_adults_allowed: number;
  additional_adult_price_cents: number | null;
  additional_children_chunk_price_cents: number | null;
  children_chunk_size: number | null;
  sort_order: number;
}

export interface PublicPricingFeature {
  id: string;
  display_name: string;
  category: string;
  minimum_tier_level: number;
  requires_family_tier: boolean;
}

export interface PricingCatalog {
  tiers: PublicMembershipTier[];
  features: PublicPricingFeature[];
}

export interface FamilyAddOnDisplay {
  baseAdultsIncluded: number;
  baseChildrenIncluded: number;
  additionalAdultPriceCents: number | null;
  additionalChildrenChunkPriceCents: number | null;
  childrenChunkSize: number | null;
  maxAdultsAllowed: number;
}

export interface PricingPlanCardModel {
  id: string;
  displayName: string;
  description: string | null;
  monthlyPriceCents: number;
  annualPriceCents: number;
  annualSavingsCents: number;
  isFamilyTier: boolean;
  isRecommended: boolean;
  includedFeatures: string[];
  familyAddOn: FamilyAddOnDisplay | null;
}

export type PricingCatalogLoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'empty' }
  | { status: 'ready'; catalog: PricingCatalog };

export class PricingCatalogError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'PricingCatalogError';
    this.status = status;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFiniteInt(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && Number.isInteger(value);
}

function isNonNegativeInt(value: unknown): value is number {
  return isFiniteInt(value) && value >= 0;
}

function readOptionalInt(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (!isFiniteInt(value)) return null;
  return value;
}

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

export function isHelixConsumerPerk(feature: PublicPricingFeature): boolean {
  if (feature.category === 'rewards') return true;
  if (feature.id.toLowerCase().startsWith('helix_')) return true;
  return /helix/i.test(feature.display_name);
}

export function parsePublicMembershipTier(value: unknown): PublicMembershipTier | null {
  if (!isRecord(value)) return null;
  const id = readString(value.id);
  const display_name = readString(value.display_name);
  if (!id || !display_name) return null;
  if (!isFiniteInt(value.tier_level) || value.tier_level < 0) return null;
  if (!isNonNegativeInt(value.monthly_price_cents)) return null;
  if (!isNonNegativeInt(value.annual_price_cents)) return null;
  if (!isFiniteInt(value.sort_order)) return null;
  if (typeof value.is_family_tier !== 'boolean') return null;
  if (!isFiniteInt(value.base_adults_included) || value.base_adults_included < 0) return null;
  if (!isFiniteInt(value.base_children_included) || value.base_children_included < 0) return null;
  if (!isFiniteInt(value.max_adults_allowed) || value.max_adults_allowed < 1) return null;

  const description = value.description === null || value.description === undefined
    ? null
    : readString(value.description);

  return {
    id,
    display_name,
    tier_level: value.tier_level,
    monthly_price_cents: value.monthly_price_cents,
    annual_price_cents: value.annual_price_cents,
    annual_savings_cents: readOptionalInt(value.annual_savings_cents),
    description,
    is_family_tier: value.is_family_tier,
    base_adults_included: value.base_adults_included,
    base_children_included: value.base_children_included,
    max_adults_allowed: value.max_adults_allowed,
    additional_adult_price_cents: readOptionalInt(value.additional_adult_price_cents),
    additional_children_chunk_price_cents: readOptionalInt(value.additional_children_chunk_price_cents),
    children_chunk_size: readOptionalInt(value.children_chunk_size),
    sort_order: value.sort_order,
  };
}

export function parsePublicPricingFeature(value: unknown): PublicPricingFeature | null {
  if (!isRecord(value)) return null;
  if (value.is_active === false) return null;
  if (value.kill_switch_engaged === true) return null;
  const id = readString(value.id);
  const display_name = readString(value.display_name);
  const category = readString(value.category);
  if (!id || !display_name || !category) return null;
  if (!isFiniteInt(value.minimum_tier_level) || value.minimum_tier_level < 0) return null;
  if (typeof value.requires_family_tier !== 'boolean') return null;
  return {
    id,
    display_name,
    category,
    minimum_tier_level: value.minimum_tier_level,
    requires_family_tier: value.requires_family_tier,
  };
}

export function parsePricingCatalog(value: unknown): PricingCatalog {
  if (!isRecord(value)) {
    throw new PricingCatalogError('Live membership catalog was empty or unreadable.', 502);
  }
  const rawTiers = Array.isArray(value.tiers) ? value.tiers : null;
  const rawFeatures = Array.isArray(value.features) ? value.features : null;
  if (!rawTiers || !rawFeatures) {
    throw new PricingCatalogError('Live membership catalog was empty or unreadable.', 502);
  }
  const tiers = rawTiers
    .map(parsePublicMembershipTier)
    .filter((row): row is PublicMembershipTier => row !== null)
    .sort((a, b) => a.sort_order - b.sort_order);
  const features = rawFeatures
    .map(parsePublicPricingFeature)
    .filter((row): row is PublicPricingFeature => row !== null);
  return { tiers, features };
}

export function readCatalogErrorMessage(value: unknown, fallback: string): string {
  if (!isRecord(value)) return fallback;
  const message = readString(value.error);
  return message ?? fallback;
}

export function resolveRecommendedTierId(tiers: PublicMembershipTier[]): string | null {
  const paidConsumer = tiers
    .filter((tier) => !tier.is_family_tier && tier.monthly_price_cents > 0)
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order);
  if (paidConsumer.length === 0) return null;
  return paidConsumer[paidConsumer.length - 1]!.id;
}

export function featuresForTier(
  tier: PublicMembershipTier,
  features: PublicPricingFeature[],
): string[] {
  return features
    .filter((feature) => {
      if (feature.minimum_tier_level !== tier.tier_level) return false;
      if (feature.requires_family_tier && !tier.is_family_tier) return false;
      return true;
    })
    .slice()
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((feature) => feature.display_name);
}

function familyAddOnFor(tier: PublicMembershipTier): FamilyAddOnDisplay | null {
  if (!tier.is_family_tier) return null;
  return {
    baseAdultsIncluded: tier.base_adults_included,
    baseChildrenIncluded: tier.base_children_included,
    additionalAdultPriceCents: tier.additional_adult_price_cents,
    additionalChildrenChunkPriceCents: tier.additional_children_chunk_price_cents,
    childrenChunkSize: tier.children_chunk_size,
    maxAdultsAllowed: tier.max_adults_allowed,
  };
}

export function buildPricingPlanCards(catalog: PricingCatalog): PricingPlanCardModel[] {
  const recommendedId = resolveRecommendedTierId(catalog.tiers);
  return catalog.tiers.map((tier) => ({
    id: tier.id,
    displayName: tier.display_name,
    description: tier.description,
    monthlyPriceCents: tier.monthly_price_cents,
    annualPriceCents: tier.annual_price_cents,
    annualSavingsCents: Math.max(0, tier.annual_savings_cents ?? 0),
    isFamilyTier: tier.is_family_tier,
    isRecommended: recommendedId !== null && tier.id === recommendedId,
    includedFeatures: featuresForTier(tier, catalog.features),
    familyAddOn: familyAddOnFor(tier),
  }));
}

interface CatalogQueryResult {
  data: unknown[] | null;
  error: { message: string } | null;
}

function readCatalogQueryResult(value: unknown): CatalogQueryResult {
  if (!isRecord(value)) {
    return { data: null, error: { message: 'Malformed catalog query result' } };
  }
  const errorValue = value.error;
  const error =
    isRecord(errorValue) && typeof errorValue.message === 'string'
      ? { message: errorValue.message }
      : null;
  const data = Array.isArray(value.data) ? value.data : null;
  return { data, error };
}

export async function loadPricingCatalog(
  client: PricingSupabaseClient,
  timeoutMs: number = PRICING_CATALOG_TIMEOUT_MS,
): Promise<PricingCatalog> {
  const tiersQuery = client
    .from('membership_tiers')
    .select(MEMBERSHIP_TIER_CATALOG_COLUMNS)
    .eq('is_active', true)
    .order('sort_order');

  const featuresQuery = client
    .from('features')
    .select(FEATURE_CATALOG_COLUMNS)
    .eq('is_active', true);

  let tiersResult: CatalogQueryResult;
  let featuresResult: CatalogQueryResult;
  try {
    const settled = await Promise.all([
      withTimeout(tiersQuery, timeoutMs, 'pricing.catalog.membership_tiers'),
      withTimeout(featuresQuery, timeoutMs, 'pricing.catalog.features'),
    ]);
    tiersResult = readCatalogQueryResult(settled[0]);
    featuresResult = readCatalogQueryResult(settled[1]);
  } catch (error) {
    if (isTimeoutError(error)) {
      throw new PricingCatalogError(
        'Live membership prices took too long to load. Please try again.',
        503,
      );
    }
    throw error;
  }

  if (tiersResult.error) {
    safeLog.error('pricing.catalog', 'membership_tiers read failed', {
      error: tiersResult.error,
    });
    throw new PricingCatalogError(
      'We could not load live membership prices. Please try again.',
      500,
    );
  }

  let featureRows: unknown[] = [];
  if (featuresResult.error) {
    safeLog.error('pricing.catalog', 'features read failed; rendering tiers without perk list', {
      error: featuresResult.error,
    });
  } else {
    featureRows = featuresResult.data ?? [];
  }

  return parsePricingCatalog({
    tiers: tiersResult.data ?? [],
    features: featureRows,
  });
}

export function isPricingCatalogError(error: unknown): error is PricingCatalogError {
  return error instanceof PricingCatalogError;
}
