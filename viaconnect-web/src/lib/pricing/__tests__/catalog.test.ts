import { describe, it, expect } from 'vitest';
import {
  buildPricingPlanCards,
  featuresForTier,
  isHelixConsumerPerk,
  parsePricingCatalog,
  parsePublicMembershipTier,
  parsePublicPricingFeature,
  resolveRecommendedTierId,
  type PublicMembershipTier,
  type PublicPricingFeature,
} from '@/lib/pricing/catalog';

const EM_DASH = String.fromCharCode(0x2014);
const EN_DASH = String.fromCharCode(0x2013);

function goldTier(overrides: Partial<PublicMembershipTier> = {}): PublicMembershipTier {
  return {
    id: 'gold',
    display_name: 'Gold',
    tier_level: 1,
    monthly_price_cents: 888,
    annual_price_cents: 8800,
    annual_savings_cents: 1856,
    description: 'Gold consumer plan',
    is_family_tier: false,
    base_adults_included: 1,
    base_children_included: 0,
    max_adults_allowed: 1,
    additional_adult_price_cents: null,
    additional_children_chunk_price_cents: null,
    children_chunk_size: null,
    sort_order: 1,
    ...overrides,
  };
}

function platinumTier(overrides: Partial<PublicMembershipTier> = {}): PublicMembershipTier {
  return {
    id: 'platinum',
    display_name: 'Platinum',
    tier_level: 2,
    monthly_price_cents: 2888,
    annual_price_cents: 28800,
    annual_savings_cents: 5856,
    description: 'Platinum consumer plan',
    is_family_tier: false,
    base_adults_included: 1,
    base_children_included: 0,
    max_adults_allowed: 1,
    additional_adult_price_cents: null,
    additional_children_chunk_price_cents: null,
    children_chunk_size: null,
    sort_order: 2,
    ...overrides,
  };
}

function familyTier(overrides: Partial<PublicMembershipTier> = {}): PublicMembershipTier {
  return {
    id: 'platinum_family',
    display_name: 'Platinum+ Family',
    tier_level: 3,
    monthly_price_cents: 4888,
    annual_price_cents: 48888,
    annual_savings_cents: 9768,
    description: 'Family plan',
    is_family_tier: true,
    base_adults_included: 2,
    base_children_included: 2,
    max_adults_allowed: 4,
    additional_adult_price_cents: 888,
    additional_children_chunk_price_cents: 888,
    children_chunk_size: 2,
    sort_order: 3,
    ...overrides,
  };
}

describe('parsePublicMembershipTier', () => {
  it('accepts a live membership_tiers row', () => {
    expect(parsePublicMembershipTier(goldTier())?.monthly_price_cents).toBe(888);
  });

  it('rejects invented or unreadable prices', () => {
    expect(parsePublicMembershipTier(goldTier({ monthly_price_cents: Number.NaN }))).toBeNull();
    expect(parsePublicMembershipTier({ ...goldTier(), monthly_price_cents: '888' })).toBeNull();
    expect(parsePublicMembershipTier(goldTier({ id: '' }))).toBeNull();
  });
});

describe('parsePublicPricingFeature', () => {
  it('drops kill-switched or inactive rows', () => {
    const live = {
      id: 'helix_rewards_basic',
      display_name: 'Helix Rewards Earning & Redemption',
      category: 'rewards',
      minimum_tier_level: 1,
      requires_family_tier: false,
      is_active: true,
      kill_switch_engaged: false,
    };
    expect(parsePublicPricingFeature(live)?.id).toBe('helix_rewards_basic');
    expect(parsePublicPricingFeature({ ...live, kill_switch_engaged: true })).toBeNull();
    expect(parsePublicPricingFeature({ ...live, is_active: false })).toBeNull();
  });
});

describe('parsePricingCatalog', () => {
  it('keeps only valid live rows and sorts by sort_order', () => {
    const catalog = parsePricingCatalog({
      tiers: [familyTier(), goldTier(), { id: 'broken' }],
      features: [],
    });
    expect(catalog.tiers.map((t) => t.id)).toEqual(['gold', 'platinum_family']);
  });
});

describe('family cents are not Gold or Platinum stickers', () => {
  it('does not recommend family when add-on cents equal Gold monthly cents', () => {
    const tiers = [goldTier(), platinumTier(), familyTier()];
    expect(resolveRecommendedTierId(tiers)).toBe('platinum');
  });

  it('family card keeps family base cents, not the Gold-looking add-on', () => {
    const cards = buildPricingPlanCards({
      tiers: [goldTier(), platinumTier(), familyTier()],
      features: [],
    });
    const family = cards.find((card) => card.isFamilyTier);
    const gold = cards.find((card) => card.id === 'gold');
    expect(family?.monthlyPriceCents).toBe(4888);
    expect(family?.monthlyPriceCents).not.toBe(gold?.monthlyPriceCents);
    expect(family?.familyAddOn?.additionalAdultPriceCents).toBe(888);
    expect(family?.isRecommended).toBe(false);
    expect(gold?.isRecommended).toBe(false);
  });

  it('never infers Gold identity from family add-on cents', () => {
    const cards = buildPricingPlanCards({
      tiers: [familyTier()],
      features: [],
    });
    expect(cards).toHaveLength(1);
    expect(cards[0]?.id).toBe('platinum_family');
    expect(cards[0]?.displayName).not.toBe('Gold');
    expect(cards[0]?.displayName).not.toBe('Platinum');
    expect(cards[0]?.isRecommended).toBe(false);
  });
});

describe('Helix consumer perk only if the API already says so', () => {
  const helix: PublicPricingFeature = {
    id: 'helix_rewards_basic',
    display_name: 'Helix Rewards Earning & Redemption',
    category: 'rewards',
    minimum_tier_level: 1,
    requires_family_tier: false,
  };
  const hannah: PublicPricingFeature = {
    id: 'hannah_unlimited',
    display_name: 'Unlimited Hannah Interactions',
    category: 'ai_coaching',
    minimum_tier_level: 1,
    requires_family_tier: false,
  };

  it('detects live rewards-category Helix rows', () => {
    expect(isHelixConsumerPerk(helix)).toBe(true);
    expect(isHelixConsumerPerk(hannah)).toBe(false);
  });

  it('omits Helix when the features payload has no Helix row', () => {
    const names = featuresForTier(goldTier(), [hannah]);
    expect(names.join(' ')).not.toMatch(/helix/i);
    expect(names).toContain('Unlimited Hannah Interactions');
  });

  it('includes Helix on Gold only when the live features row is present', () => {
    const names = featuresForTier(goldTier(), [hannah, helix]);
    expect(names).toContain('Helix Rewards Earning & Redemption');
  });

  it('does not copy Gold Helix onto a family card', () => {
    const names = featuresForTier(familyTier(), [helix]);
    expect(names).not.toContain('Helix Rewards Earning & Redemption');
  });
});

describe('buildPricingPlanCards', () => {
  it('uses live display names and prices with no invented dollars', () => {
    const cards = buildPricingPlanCards({
      tiers: [
        {
          ...goldTier(),
          id: 'free',
          display_name: 'Free',
          tier_level: 0,
          monthly_price_cents: 0,
          annual_price_cents: 0,
          annual_savings_cents: 0,
          sort_order: 0,
        },
        goldTier(),
      ],
      features: [],
    });
    expect(cards.map((c) => c.monthlyPriceCents)).toEqual([0, 888]);
  });

  it('source strings contain no em or en dashes', () => {
    const cards = buildPricingPlanCards({
      tiers: [goldTier(), familyTier()],
      features: [],
    });
    const blob = JSON.stringify(cards);
    expect(blob).not.toContain(EM_DASH);
    expect(blob).not.toContain(EN_DASH);
  });
});
