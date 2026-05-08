// Prompt #85n v2: smoke tests for the per-region avatar heat-map. Each
// of 12 body parts now ships its own clip-path + mask-image overlay
// keyed by data-region; the prior 5-band masked layer (data-zone) is
// retired. The test user has no DB rows, so every region falls through
// to the neutral yellow fill and only the structural assertions and
// legend labels are asserted here.

import { test, expect } from '@playwright/test';

const COMPOSITION_PATH = '/body-tracker/composition';
const MUSCLE_PATH = '/body-tracker/composition?section=muscle';

const REGION_IDS = [
  'neck', 'shoulders', 'chest', 'waist',
  'r_bicep', 'l_bicep', 'r_forearm', 'l_forearm',
  'r_quad', 'l_quad', 'r_calf', 'l_calf',
] as const;

test.describe('Body Tracker heat-map overlay (Prompt #85n v2)', () => {
  test('Composition fat tab: overlay renders all 12 region overlays', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-1440', 'overlay smoke runs on desktop-1440');

    await page.goto(COMPOSITION_PATH, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    const overlay = page.locator('[data-testid="body-avatar-heatmap"]');
    await expect(overlay).toBeVisible();

    for (const id of REGION_IDS) {
      await expect(
        overlay.locator(`[data-region="${id}"]`),
        `region overlay [data-region="${id}"] should exist`,
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

  test('Segmental Muscle tab: overlay renders all 12 region overlays', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-1440', 'overlay smoke runs on desktop-1440');

    await page.goto(MUSCLE_PATH, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    const overlay = page.locator('[data-testid="body-avatar-heatmap"]');
    for (const id of REGION_IDS) {
      await expect(overlay.locator(`[data-region="${id}"]`)).toBeAttached();
    }
  });

  test('overlay swaps avatar src when gender toggles', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-1440', 'gender toggle runs on desktop-1440');

    await page.goto(COMPOSITION_PATH, { waitUntil: 'domcontentloaded' });
    await page.click('[data-testid="gender-toggle-male"]');
    await page.waitForLoadState('networkidle');
    const maleSrc = await page
      .locator('[data-testid="body-avatar-heatmap"] img')
      .first()
      .getAttribute('src');

    await page.click('[data-testid="gender-toggle-female"]');
    await page.waitForLoadState('networkidle');
    const femaleSrc = await page
      .locator('[data-testid="body-avatar-heatmap"] img')
      .first()
      .getAttribute('src');

    expect(femaleSrc).not.toBe(maleSrc);
  });
});
