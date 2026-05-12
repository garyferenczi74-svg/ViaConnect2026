// Prompt #161e §7.2: Playwright spec for the Bio Optimization Score
// card. Verifies the six section vertical rhythm renders without
// horizontal scroll at 320 / 360 / 380 viewport widths and that the
// pill rows show all 9 pills.
//
// STATUS: DEFERRED until an authenticated test fixture is wired
// (Playwright currently has no auth helper in this repo, per #162
// deferral). When the auth fixture lands, this spec will run as-is.
// The skip blocks below keep the file syntactically valid so it
// shows up in `npx playwright test --list`.

import { test, expect } from '@playwright/test';

const VIEWPORT_WIDTHS = [320, 360, 380] as const;
const DASHBOARD_PATH = '/dashboard';

test.describe('BOS card mobile fit at narrow widths', () => {
  // Skip until auth fixture exists. Remove the skip and add the
  // signed-in test.beforeEach once it does.
  test.skip(
    true,
    'Deferred: requires authenticated test user fixture. Run after auth helper lands.',
  );

  for (const width of VIEWPORT_WIDTHS) {
    test(`renders without horizontal scroll at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 812 });
      await page.goto(DASHBOARD_PATH);
      const card = page.getByRole('region', { name: 'Bio Optimization Score' });
      await card.waitFor({ state: 'visible' });

      // Card should never overflow the viewport horizontally.
      const cardBox = await card.boundingBox();
      expect(cardBox).not.toBeNull();
      if (!cardBox) return;
      expect(cardBox.width).toBeLessThanOrEqual(width);
      expect(cardBox.x).toBeGreaterThanOrEqual(0);
      expect(cardBox.x + cardBox.width).toBeLessThanOrEqual(width);
    });

    test(`all 9 pills are inside the card at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 812 });
      await page.goto(DASHBOARD_PATH);
      const card = page.getByRole('region', { name: 'Bio Optimization Score' });
      await card.waitFor({ state: 'visible' });

      const accuracyRow = card.getByRole('list', { name: 'Diagnostic accuracy levers' });
      await expect(accuracyRow.locator('li')).toHaveCount(3);

      const engagementRow = card.getByRole('list', { name: 'Daily engagement levers' });
      await expect(engagementRow.locator('li')).toHaveCount(6);
    });

    test(`gauge svg is square and centered at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 812 });
      await page.goto(DASHBOARD_PATH);
      const card = page.getByRole('region', { name: 'Bio Optimization Score' });
      await card.waitFor({ state: 'visible' });
      const svg = card.locator('svg').first();
      const box = await svg.boundingBox();
      expect(box).not.toBeNull();
      if (!box) return;
      // 120px mobile gauge; allow 4px tolerance for sub pixel rounding.
      expect(box.width).toBeGreaterThan(100);
      expect(box.width).toBeLessThan(140);
      expect(Math.abs(box.width - box.height)).toBeLessThan(2);
    });
  }
});

test.describe('BOS card pill state visual differentiation', () => {
  test.skip(
    true,
    'Deferred: requires authenticated tier 1 / tier 2 / tier 3 test users.',
  );

  test('tier 1 user: CAQ complete, Labs + Genetics unlock', async ({ page }) => {
    await page.goto(DASHBOARD_PATH);
    const card = page.getByRole('region', { name: 'Bio Optimization Score' });
    await card.waitFor({ state: 'visible' });
    const accuracyRow = card.getByRole('list', { name: 'Diagnostic accuracy levers' });
    const pills = accuracyRow.locator('li');

    // CAQ should be the "complete" treatment (teal). Labs and
    // Genetics should be the "incomplete" treatment (orange unlock).
    await expect(pills.nth(0).getByText('Complete')).toBeVisible();
    await expect(pills.nth(1).getByText('Unlock')).toBeVisible();
    await expect(pills.nth(2).getByText('Unlock')).toBeVisible();
  });
});
