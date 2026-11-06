// Short-laptop hero: the headline stays under the fixed bar, the headline
// and CTAs end inside a 560px fold, the tagline sits on its own row above
// the marquee, and every card's text stays inside the card. Cards may
// spill below the fold.

import { expect, test, type Page } from '@playwright/test';

const FOLDS = [
  { width: 1007, height: 560 },
  { width: 1366, height: 768 },
] as const;

async function cardTextStaysInside(page: Page) {
  const cards = page.locator('[data-testid="hero-pillars-desktop-grid"] article');
  const count = await cards.count();
  expect(count).toBeGreaterThan(0);
  for (let i = 0; i < count; i++) {
    const card = cards.nth(i);
    const box = await card.boundingBox();
    expect(box).not.toBeNull();
    if (!box || box.height < 1) continue;
    const texts = card.locator('h3, p');
    const textCount = await texts.count();
    expect(textCount).toBeGreaterThan(0);
    for (let j = 0; j < textCount; j++) {
      const node = texts.nth(j);
      const textBox = await node.boundingBox();
      expect(textBox).not.toBeNull();
      if (!textBox) continue;
      expect(textBox.x).toBeGreaterThanOrEqual(box.x - 1);
      expect(textBox.y).toBeGreaterThanOrEqual(box.y - 1);
      expect(textBox.x + textBox.width).toBeLessThanOrEqual(box.x + box.width + 1);
      expect(textBox.y + textBox.height).toBeLessThanOrEqual(box.y + box.height + 1);
      const clipped = await node.evaluate((el) => el.scrollHeight - el.clientHeight);
      expect(clipped).toBeLessThanOrEqual(1);
    }
  }
}

test.describe('landing hero short fold', () => {
  for (const { width, height } of FOLDS) {
    test(`cards, headline, and ticker rows fit at ${width}x${height}`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.goto('/');
      await page.getByTestId('hero-headline').waitFor({ state: 'visible' });

      const headline = await page.getByTestId('hero-headline').boundingBox();
      const nav = await page.locator('header nav').boundingBox();
      expect(headline).not.toBeNull();
      expect(nav).not.toBeNull();
      if (!headline || !nav) return;
      expect(headline.y).toBeGreaterThanOrEqual(nav.y + nav.height + 12);

      const ctas = await page.getByTestId('hero-ctas').boundingBox();
      expect(ctas).not.toBeNull();
      if (width === 1007 && height === 560 && ctas) {
        expect(headline.y + headline.height).toBeLessThanOrEqual(height);
        expect(ctas.y + ctas.height).toBeLessThanOrEqual(height);
      }

      await cardTextStaysInside(page);

      const tagline = await page.getByTestId('hero-tagline').boundingBox();
      const ticker = await page.getByTestId('hero-ticker').boundingBox();
      expect(tagline).not.toBeNull();
      expect(ticker).not.toBeNull();
      if (!tagline || !ticker) return;
      expect(tagline.y + tagline.height).toBeLessThanOrEqual(ticker.y - 1);
      const viewportHeight = page.viewportSize()?.height ?? height;
      expect(viewportHeight - (ticker.y + ticker.height)).toBeGreaterThanOrEqual(-1);
      expect(viewportHeight - (ticker.y + ticker.height)).toBeLessThanOrEqual(24);

      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
    });
  }
});
