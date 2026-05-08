// Prompt #85n v3: smoke tests for the avatar oval status indicators.
// The avatar carries 12 small green / yellow / red ovals positioned
// over each body part; the test user has no DB rows so every oval
// falls through to the neutral yellow color and only the structural
// + legend assertions are exercised here.

import { test, expect } from '@playwright/test';

const COMPOSITION_PATH = '/body-tracker/composition';
const MUSCLE_PATH = '/body-tracker/composition?section=muscle';

const REGION_IDS = [
  'neck', 'shoulders', 'chest', 'waist',
  'r_bicep', 'l_bicep', 'r_forearm', 'l_forearm',
  'r_quad', 'l_quad', 'r_calf', 'l_calf',
] as const;

test.describe('Body Tracker avatar indicators (Prompt #85n v3)', () => {
  test('Composition fat tab: avatar renders all 12 oval indicators', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-1440', 'indicators smoke runs on desktop-1440');

    await page.goto(COMPOSITION_PATH, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    const avatar = page.locator('[data-testid="body-avatar-indicators"]');
    await expect(avatar).toBeVisible();

    for (const id of REGION_IDS) {
      await expect(
        avatar.locator(`[data-region="${id}"]`),
        `oval indicator [data-region="${id}"] should exist`,
      ).toBeAttached();
    }
  });

  test('Composition fat tab: legend reads Fat Loss / No Change / Fat Gain', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-1440', 'legend label check runs on desktop-1440');

    await page.goto(COMPOSITION_PATH, { waitUntil: 'domcontentloaded' });
    const legend = page.locator('[data-testid="heatmap-legend"]');
    await expect(legend).toBeVisible();
    await expect(legend).toContainText(/Fat Loss/i);
    await expect(legend).toContainText(/No Change/i);
    await expect(legend).toContainText(/Fat Gain/i);
  });

  test('Segmental Muscle tab: legend reads Muscle Gain / No Change / Muscle Loss', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-1440', 'legend label check runs on desktop-1440');

    await page.goto(MUSCLE_PATH, { waitUntil: 'domcontentloaded' });
    const legend = page.locator('[data-testid="heatmap-legend"]');
    await expect(legend).toBeVisible();
    await expect(legend).toContainText(/Muscle Gain/i);
    await expect(legend).toContainText(/No Change/i);
    await expect(legend).toContainText(/Muscle Loss/i);
  });

  test('Segmental Muscle tab: avatar renders all 12 oval indicators', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-1440', 'indicators smoke runs on desktop-1440');

    await page.goto(MUSCLE_PATH, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    const avatar = page.locator('[data-testid="body-avatar-indicators"]');
    for (const id of REGION_IDS) {
      await expect(avatar.locator(`[data-region="${id}"]`)).toBeAttached();
    }
  });

  test('avatar swaps img src when gender toggles', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-1440', 'gender toggle runs on desktop-1440');

    await page.goto(COMPOSITION_PATH, { waitUntil: 'domcontentloaded' });
    await page.click('[data-testid="gender-toggle-male"]');
    await page.waitForLoadState('networkidle');
    const maleSrc = await page
      .locator('[data-testid="body-avatar-indicators"] img')
      .first()
      .getAttribute('src');

    await page.click('[data-testid="gender-toggle-female"]');
    await page.waitForLoadState('networkidle');
    const femaleSrc = await page
      .locator('[data-testid="body-avatar-indicators"] img')
      .first()
      .getAttribute('src');

    expect(femaleSrc).not.toBe(maleSrc);
  });
});
