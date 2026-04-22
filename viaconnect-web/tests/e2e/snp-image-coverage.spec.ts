// Photo Sync prompt #110 §5.6: SNP + GeneX360 image-coverage E2E.
//
// Asserts that every Methylation / GeneX360 product card on /shop renders
// a real image (naturalWidth > 0, not the <ProductImageFallback />) at
// each responsive viewport. Failure modes: 404 bucket object, stale DB
// URL, broken-image browser glyph, fallback component rendered.
//
// Runs only under Playwright (`npx playwright test`). Vitest never picks
// this file up because it sits under tests/e2e/ and vitest.config.ts
// limits its include glob to tests/*.test.ts (not e2e/*).
//
// SELECTOR STRATEGY:
//   Primary loose check — all <img> elements inside the product grid have
//   naturalWidth > 0 OR a matching fallback component visible. Robust to
//   DOM structure changes.
//   Secondary per-SKU check — data-testid="product-card-{short_code}"
//   anchored on each card. If /shop's DOM doesn't yet emit that testid,
//   the per-SKU check falls back to matching the display-name text inside
//   the card. Once the DOM stabilizes, tighten these selectors.

import { test, expect, type Page, type Locator } from '@playwright/test';
import { SNP_TARGETS, SERVICE_TARGETS } from '../../src/lib/photoSync/snpTargets';

const SHOP_PATH = '/shop';
const FALLBACK_CAPTION = 'Image coming soon';

// Wait for the category badge / heading that ships the 20-product count.
// Prompt #110 §12 calls the "20 products" badge the single most visible
// health signal — we use it to gate the assertion so we don't assert
// against a half-hydrated page.
async function waitForMethylationCategory(page: Page): Promise<void> {
  await page.goto(SHOP_PATH, { waitUntil: 'domcontentloaded' });
  // Scroll until the Methylation / GeneX360 section is in view.
  // Prefer heading text; fall back to loose heading search if the copy changes.
  const heading = page.getByRole('heading', { name: /methylation|genex360/i }).first();
  await heading.scrollIntoViewIfNeeded();
  await heading.waitFor({ state: 'visible', timeout: 15_000 });
}

async function findCardForDisplay(page: Page, display: string): Promise<Locator> {
  // Prefer explicit testid. Once /shop starts emitting them, this is
  // exact; until then, fall back to text-anchored locator scoped to the
  // shop grid.
  const byTestId = page.locator(`[data-testid^="product-card-"]:has-text(${JSON.stringify(display)})`);
  if (await byTestId.count() > 0) return byTestId.first();
  return page.locator('article, [role="article"], .product-card', { hasText: display }).first();
}

async function assertCardHasLoadedImage(card: Locator, display: string): Promise<void> {
  await card.scrollIntoViewIfNeeded();
  const img = card.locator('img').first();
  await expect(img, `missing <img> in card for ${display}`).toBeVisible({ timeout: 10_000 });

  // naturalWidth > 0 is the definitive "image actually loaded" signal.
  // A broken image renders with naturalWidth 0 even when the <img> is visible.
  const naturalWidth = await img.evaluate((el) => (el as HTMLImageElement).naturalWidth);
  expect(naturalWidth, `${display} image did not load (naturalWidth == 0 → broken)`).toBeGreaterThan(0);

  // Defense in depth: fallback component must NOT be visible inside the card.
  const fallback = card.getByText(FALLBACK_CAPTION, { exact: true });
  await expect(fallback, `${display} rendered <ProductImageFallback />`).toBeHidden();
}

test.describe('SNP + GeneX360 image coverage on /shop', () => {
  test.beforeEach(async ({ page }) => {
    await waitForMethylationCategory(page);
  });

  for (const target of SNP_TARGETS) {
    test(`SNP: ${target.display_name} renders`, async ({ page }) => {
      const card = await findCardForDisplay(page, target.display_name);
      await assertCardHasLoadedImage(card, target.display_name);
    });
  }

  for (const service of SERVICE_TARGETS) {
    test(`Service: ${service.display_name} renders`, async ({ page }) => {
      const card = await findCardForDisplay(page, service.display_name);
      await assertCardHasLoadedImage(card, service.display_name);
    });
  }

  test('no broken <img> anywhere in the product grid', async ({ page }) => {
    // Loose sweep: every image under /shop must have naturalWidth > 0.
    // Catches regressions in SKUs not explicitly in SNP_TARGETS or SERVICE_TARGETS.
    const brokenDetails = await page.$$eval('img', (imgs) => imgs
      .filter((el) => (el as HTMLImageElement).naturalWidth === 0 && (el as HTMLImageElement).complete)
      .map((el) => ({ src: (el as HTMLImageElement).src, alt: (el as HTMLImageElement).alt })),
    );
    expect(brokenDetails, `broken images on /shop: ${JSON.stringify(brokenDetails)}`).toEqual([]);
  });

  test('category badge shows the expected product count', async ({ page }) => {
    // §12: "Confirm the Methylation/GeneX360™ category badge on /shop reads
    //       '20 products' with all 20 rendering — this is the single most
    //       visible health signal for this prompt's success."
    const badge = page.getByText(/\b20\s+products\b/i).first();
    await expect(badge, 'Methylation/GeneX360 category badge should display "20 products"').toBeVisible();
  });
});

test.describe('Visual regression screenshots', () => {
  // Captures full-page screenshots at 375 (mobile) and 1440 (desktop) so
  // before/after deltas are attachable to the PR per §5.7.
  // The project config (playwright.config.ts) supplies the viewport — we
  // only capture here on the mobile-375 and desktop-1440 projects.
  test('capture /shop screenshot', async ({ page }, testInfo) => {
    test.skip(!['mobile-375', 'desktop-1440'].includes(testInfo.project.name), 'only mobile-375 and desktop-1440 capture');
    await waitForMethylationCategory(page);
    // Override via PLAYWRIGHT_CAPTURE_PHASE=before (or anything non-default)
    // when capturing the pre-remediation state for a before/after delta.
    const phase = process.env.PLAYWRIGHT_CAPTURE_PHASE === 'before' ? 'before' : 'after';
    await page.screenshot({
      path: `tests/e2e/__screenshots__/snp-coverage/${phase}/${testInfo.project.name}-shop.png`,
      fullPage: true,
    });
  });
});
