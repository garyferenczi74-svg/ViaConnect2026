// OBRA Brief 7: public waitlist honesty at 390 and 1280.
// Unauth /practitioner must land on /practitioners. Homepage Three-Portal
// copy must stay waitlist-honest. No auth fixture required.

import { test, expect } from '@playwright/test';

const VIEWPORTS = [
  { name: '390', width: 390, height: 844 },
  { name: '1280', width: 1280, height: 800 },
] as const;

for (const vp of VIEWPORTS) {
  test.describe(`waitlist honesty ${vp.name}`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    test(`unauth /practitioner redirects to /practitioners at ${vp.name}`, async ({ page }) => {
      await page.goto('/practitioner', { waitUntil: 'domcontentloaded' });
      await expect(page).toHaveURL(/\/practitioners\/?$/);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await expect(page.locator('body')).toContainText(/Q1 2027/);
      await expect(page.locator('body')).toContainText(/waitlist/i);
    });

    test(`/practitioners is the honest waitlist at ${vp.name}`, async ({ page }) => {
      await page.goto('/practitioners', { waitUntil: 'domcontentloaded' });
      await expect(page).toHaveURL(/\/practitioners\/?$/);
      await expect(page.locator('body')).toContainText(/Q1 2027/);
      await expect(page.locator('body')).toContainText(/waitlist/i);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(1);
    });
  });
}

test.describe('homepage Three-Portal waitlist copy', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('features intro does not claim a live clinician portal', async ({ page }) => {
    await page.goto('/#features', { waitUntil: 'domcontentloaded' });
    const features = page.getByRole('region', { name: 'ViaConnect Features' }).locator('visible=true');
    await expect(features).toContainText(/Q1 2027/);
    await expect(features).not.toContainText(/in one tap/);
  });
});
