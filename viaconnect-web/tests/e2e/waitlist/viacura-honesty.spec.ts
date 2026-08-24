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

test.describe('signup clinician waitlist', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('practitioner role joins the Q1 2027 waitlist instead of a portal', async ({ page }) => {
    await page.goto('/signup', { waitUntil: 'domcontentloaded' });
    await page.locator('#email').fill('jane@clinic.com');
    await page.locator('#password').fill('password1');
    await page.locator('#confirmPassword').fill('password1');
    await page.locator('#consent').check();
    await page.getByRole('button', { name: 'Continue' }).click();

    const practitioner = page.getByRole('button', { name: /Practitioner/i });
    await expect(practitioner).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('body')).toContainText(/Join the ViaCura waitlist/);
    await expect(page.locator('body')).toContainText(/Waitlist Q1 2027/);
    await expect(page.locator('body')).not.toContainText(/Patient management portal/);

    await practitioner.click();
    await page.getByRole('button', { name: 'Join the waitlist' }).click();
    await expect(page).toHaveURL(/\/practitioners/);
    await expect(page.locator('body')).toContainText(/Q1 2027/);
  });
});

test.describe('homepage Three-Portal waitlist copy', () => {
  for (const vp of VIEWPORTS) {
    test(`features intro stays waitlist-honest at ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/#features', { waitUntil: 'domcontentloaded' });
      const features = page.getByRole('region', { name: 'ViaConnect Features' }).locator('visible=true');
      await expect(features).toContainText(/Q1 2027/);
      await expect(features).not.toContainText(/in one tap/);
    });
  }
});
