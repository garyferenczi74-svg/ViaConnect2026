import { createElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect, vi } from 'vitest';

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    className,
  }: {
    href: string;
    children?: ReactNode;
    className?: string;
  }) => createElement('a', { href, className }, children),
}));
import {
  PractitionerComingSoonPanel,
  PricingCatalogBody,
} from '../PricingCatalogBody';
import { TierCard } from '../TierCard';
import type { PricingCatalog, PricingPlanCardModel } from '@/lib/pricing/catalog';
import { buildPricingPlanCards, PLANS_LOAD_FROM_CATALOG_COPY } from '@/lib/pricing/catalog';

const EM_DASH = String.fromCharCode(0x2014);
const EN_DASH = String.fromCharCode(0x2013);

const LIVE_CATALOG: PricingCatalog = {
  tiers: [
    {
      id: 'free',
      display_name: 'Free',
      tier_level: 0,
      monthly_price_cents: 0,
      annual_price_cents: 0,
      annual_savings_cents: 0,
      description: 'CAQ assessment',
      is_family_tier: false,
      base_adults_included: 1,
      base_children_included: 0,
      max_adults_allowed: 1,
      additional_adult_price_cents: null,
      additional_children_chunk_price_cents: null,
      children_chunk_size: null,
      sort_order: 0,
    },
    {
      id: 'gold',
      display_name: 'Gold',
      tier_level: 1,
      monthly_price_cents: 888,
      annual_price_cents: 8800,
      annual_savings_cents: 1856,
      description: 'Full platform access',
      is_family_tier: false,
      base_adults_included: 1,
      base_children_included: 0,
      max_adults_allowed: 1,
      additional_adult_price_cents: null,
      additional_children_chunk_price_cents: null,
      children_chunk_size: null,
      sort_order: 1,
    },
    {
      id: 'platinum',
      display_name: 'Platinum',
      tier_level: 2,
      monthly_price_cents: 2888,
      annual_price_cents: 28800,
      annual_savings_cents: 5856,
      description: 'Complete platform',
      is_family_tier: false,
      base_adults_included: 1,
      base_children_included: 0,
      max_adults_allowed: 1,
      additional_adult_price_cents: null,
      additional_children_chunk_price_cents: null,
      children_chunk_size: null,
      sort_order: 2,
    },
    {
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
    },
  ],
  features: [
    {
      id: 'helix_rewards_basic',
      display_name: 'Helix Rewards Earning & Redemption',
      category: 'rewards',
      minimum_tier_level: 1,
      requires_family_tier: false,
    },
  ],
};

const noop = () => undefined;

function renderBody(
  overrides: Partial<Parameters<typeof PricingCatalogBody>[0]> = {},
) {
  return renderToStaticMarkup(
    createElement(PricingCatalogBody, {
      loadState: { status: 'loading' },
      billingCycle: 'annual',
      onBillingCycleChange: noop,
      currentTierId: null,
      onSelectPlan: noop,
      onRetry: noop,
      showFamilyConfig: false,
      familyPlan: null,
      practitionerToggleId: 'prac-toggle',
      practitionerRegionId: 'prac-region',
      isPractitionerOpen: false,
      onPractitionerToggle: noop,
      ...overrides,
    }),
  );
}

describe('PricingCatalogBody load states', () => {
  it('keeps the billing toggle and a labeled loading panel, not a spinner alone', () => {
    const html = renderBody({ loadState: { status: 'loading' } });
    expect(html).toContain('Monthly');
    expect(html).toContain('Annual');
    expect(html).toContain('pricing-catalog-loading');
    expect(html).toContain('Loading live membership plans');
    expect(html).not.toContain('pricing-catalog-plans');
  });

  it('shows an error panel so the toggle is never the only content', () => {
    const html = renderBody({
      loadState: { status: 'error', message: 'Live membership prices took too long to load. Please try again.' },
    });
    expect(html).toContain('Monthly');
    expect(html).toContain('pricing-catalog-error');
    expect(html).toContain('Try again');
    expect(html).toContain('Live membership prices took too long');
  });

  it('shows an empty panel when the live catalog has no tiers', () => {
    const html = renderBody({ loadState: { status: 'empty' } });
    expect(html).toContain('pricing-catalog-empty');
    expect(html).toContain(PLANS_LOAD_FROM_CATALOG_COPY);
    expect(html).not.toContain('No membership plans to show');
    expect(html).toContain('Refresh catalog');
  });

  it('renders live plan names and prices from the catalog', () => {
    const html = renderBody({
      loadState: { status: 'ready', catalog: LIVE_CATALOG },
      billingCycle: 'monthly',
    });
    expect(html).toContain('pricing-catalog-plans');
    expect(html).toContain('Gold');
    expect(html).toContain('Platinum');
    expect(html).toContain('$8.88');
    expect(html).toContain('$28.88');
    expect(html).toContain('$48.88');
    expect(html).toContain('Helix Rewards Earning &amp; Redemption');
  });

  it('does not treat family add-on cents as a Gold sticker', () => {
    const html = renderBody({ loadState: { status: 'ready', catalog: LIVE_CATALOG } });
    expect(html).toContain('Additional adult $8.88 / month');
    expect(html).toContain('Platinum+ Family');
    const familyIndex = html.indexOf('Platinum+ Family');
    const goldHeadingAfterFamily = html.slice(familyIndex).includes('>Gold<');
    expect(goldHeadingAfterFamily).toBe(false);
  });

  it('contains no em or en dashes', () => {
    const html = renderBody({ loadState: { status: 'ready', catalog: LIVE_CATALOG } });
    expect(html).not.toContain(EM_DASH);
    expect(html).not.toContain(EN_DASH);
  });
});

describe('PractitionerComingSoonPanel', () => {
  it('offers Coming Soon and waitlist with no Helix medals or invented dollars', () => {
    const html = renderToStaticMarkup(createElement(PractitionerComingSoonPanel));
    expect(html).toContain('Coming Soon');
    expect(html).toContain('Join the waitlist');
    expect(html).toContain('/practitioners');
    expect(html.toLowerCase()).not.toContain('helix');
    expect(html.toLowerCase()).not.toContain('medal');
    expect(html).not.toContain('$');
    expect(html).not.toContain('#FFD700');
  });
});

describe('TierCard family add-on labeling', () => {
  it('labels 888 family cents as an additional adult, not Gold', () => {
    const family = buildPricingPlanCards(LIVE_CATALOG).find((plan) => plan.isFamilyTier) as PricingPlanCardModel;
    const html = renderToStaticMarkup(
      createElement(TierCard, { plan: family, billingCycle: 'monthly' }),
    );
    expect(html).toContain('$48.88');
    expect(html).toContain('Additional adult $8.88 / month');
    expect(html).not.toContain('Gold');
    expect(html).not.toContain('medal');
  });
});
