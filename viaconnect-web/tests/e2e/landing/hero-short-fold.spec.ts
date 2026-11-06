// Desktop hero fits in one viewport. Card numbers stay inside the cards,
// card text is not clipped, and the CTAs sit above the ticker.

import { expect, test, type Page } from '@playwright/test';

const FOLDS = [
  { width: 1007, height: 560 },
  { width: 1280, height: 720 },
  { width: 1366, height: 768 },
  { width: 1440, height: 900 },
] as const;

async function heroFits(page: Page, height: number) {
  const viewportHeight = page.viewportSize()?.height ?? height;
  const pieces = ['hero-headline', 'hero-tagline', 'hero-ctas', 'hero-ticker'] as const;
  for (const id of pieces) {
    const box = await page.getByTestId(id).boundingBox();
    expect(box, id).not.toBeNull();
    if (!box) continue;
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.y + box.height).toBeLessThanOrEqual(viewportHeight + 1);
  }

  const screen = await page.locator('.hero-screen').boundingBox();
  expect(screen).not.toBeNull();
  if (screen) {
    expect(screen.height).toBeLessThanOrEqual(viewportHeight + 1);
  }

  const cards = page.locator('[data-testid="hero-pillars-desktop-grid"] article');
  const count = await cards.count();
  expect(count).toBe(3);
  const tagline = await page.getByTestId('hero-tagline').boundingBox();
  const ctas = await page.getByTestId('hero-ctas').boundingBox();
  const ticker = await page.getByTestId('hero-ticker').boundingBox();
  expect(tagline).not.toBeNull();
  expect(ctas).not.toBeNull();
  expect(ticker).not.toBeNull();
  if (!tagline || !ctas || !ticker) return;
  expect(ctas.y).toBeGreaterThanOrEqual(tagline.y + tagline.height - 1);
  expect(ticker.y).toBeGreaterThanOrEqual(ctas.y + ctas.height - 1);

  for (let i = 0; i < count; i++) {
    const card = cards.nth(i);
    const box = await card.boundingBox();
    expect(box).not.toBeNull();
    if (!box) continue;
    expect(box.y + box.height).toBeLessThanOrEqual(tagline.y + 1);
    expect(box.y + box.height).toBeLessThanOrEqual(viewportHeight + 1);

    const numeral = card.locator('.pillar-numeral');
    const numeralBox = await numeral.boundingBox();
    expect(numeralBox).not.toBeNull();
    if (numeralBox) {
      expect(numeralBox.x).toBeGreaterThanOrEqual(box.x - 1);
      expect(numeralBox.y).toBeGreaterThanOrEqual(box.y - 1);
      expect(numeralBox.x + numeralBox.width).toBeLessThanOrEqual(box.x + box.width + 1);
      expect(numeralBox.y + numeralBox.height).toBeLessThanOrEqual(box.y + box.height + 1);
    }

    const texts = card.locator('h3, p');
    const textCount = await texts.count();
    expect(textCount).toBeGreaterThan(0);
    for (let j = 0; j < textCount; j++) {
      const node = texts.nth(j);
      const clipped = await node.evaluate((el) => el.scrollHeight - el.clientHeight);
      expect(clipped).toBeLessThanOrEqual(1);
      const textBox = await node.boundingBox();
      expect(textBox).not.toBeNull();
      if (!textBox) continue;
      expect(textBox.y + textBox.height).toBeLessThanOrEqual(box.y + box.height + 1);
    }
  }
}

test.describe('landing hero one viewport', () => {
  for (const { width, height } of FOLDS) {
    test(`hero fits without vertical overflow at ${width}x${height}`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.goto('/');
      await page.getByTestId('hero-headline').waitFor({ state: 'visible' });

      const headline = await page.getByTestId('hero-headline').boundingBox();
      const nav = await page.locator('header nav').boundingBox();
      expect(headline).not.toBeNull();
      expect(nav).not.toBeNull();
      if (headline && nav) {
        expect(headline.y).toBeGreaterThanOrEqual(nav.y + nav.height + 4);
      }

      await heroFits(page, height);

      if (width === 1007 && height === 560) {
        const bodySize = await page.locator('.pillar-body').first().evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
        expect(bodySize).toBeGreaterThanOrEqual(13);
        expect(bodySize).toBeLessThanOrEqual(14.5);
      }

      const ticker = await page.getByTestId('hero-ticker').boundingBox();
      expect(ticker).not.toBeNull();
      if (ticker) {
        const viewportHeight = page.viewportSize()?.height ?? height;
        expect(viewportHeight - (ticker.y + ticker.height)).toBeGreaterThanOrEqual(-1);
        expect(viewportHeight - (ticker.y + ticker.height)).toBeLessThanOrEqual(2);
      }

      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
    });
  }
});
