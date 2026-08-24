import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '..', 'src');

function read(rel: string): string {
  return readFileSync(resolve(ROOT, rel), 'utf-8');
}

describe('pricing UI: live catalog only, no invented dollars', () => {
  const grid = read('components/pricing/PricingTierGrid.tsx');
  const body = read('components/pricing/PricingCatalogBody.tsx');
  const card = read('components/pricing/TierCard.tsx');
  const family = read('components/pricing/FamilyConfigurator.tsx');
  const page = read('app/pricing/page.tsx');
  const route = read('app/api/pricing/catalog/route.ts');

  it('fetches the live catalog API instead of embedding plan dollars in JS', () => {
    expect(grid).toContain('/api/pricing/catalog');
    expect(grid).toContain('PRICING_CATALOG_TIMEOUT_MS');
    expect(grid).not.toContain('TIER_FEATURES');
    expect(grid).not.toContain("from('membership_tiers')");
  });

  it('catalog route loads membership_tiers through the shared loader', () => {
    expect(route).toContain('loadPricingCatalog');
    expect(route).toContain('PRICING_CATALOG_TIMEOUT_MS');
  });

  it('pricing surface files do not hardcode Gold or Platinum dollar amounts', () => {
    for (const src of [grid, body, card, family, page, route]) {
      expect(src).not.toMatch(/\$8\.88/);
      expect(src).not.toMatch(/\$28\.88/);
      expect(src).not.toMatch(/\$48\.88/);
      expect(src).not.toContain('formatPriceFromCents(888)');
    }
  });

  it('practitioner panel has Coming Soon, waitlist, and no Helix medals', () => {
    expect(body).toContain('Coming Soon');
    expect(body).toContain('/practitioners');
    expect(body).toContain('Join the waitlist');
    expect(body).not.toMatch(/helix/i);
    expect(body).not.toMatch(/medal/i);
    expect(body).not.toContain('#FFD700');
  });

  it('page keeps the existing logo and palette tokens', () => {
    expect(page).toContain('ViaConnectLogo');
    expect(page).toContain('bg-[#0B1520]');
    expect(page).toContain('text-[#2DA5A0]');
  });
});
