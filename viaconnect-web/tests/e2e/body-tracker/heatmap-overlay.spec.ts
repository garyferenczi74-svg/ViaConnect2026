// Prompt #85n: smoke tests for the avatar heat-map overlay.
//
// Asserts that on both Composition (fat) and Segmental Muscle tabs the
// avatar SVG overlay renders all 12 region paths and the legend strip is
// visible with the correct metric-aware labels. Real change data is not
// asserted here since the test user has no DB rows; the overlay should
// render with the neutral yellow fill across all regions and the callout
// trend rows should be absent or surface a "first entry" hint per the
// component logic.

import { test, expect } from '@playwright/test';

const COMPOSITION_PATH = '/body-tracker/composition';
const MUSCLE_PATH = '/body-tracker/composition?section=muscle';

const NEUTRAL_FILL = 'rgba(255, 200, 50, 0.3)';

const REGION_IDS = [
  'neck', 'shoulders', 'chest', 'waist',
  'l_bicep', 'r_bicep', 'l_forearm', 'r_forearm',
  'l_quad', 'r_quad', 'l_calf', 'r_calf',
] as const;

test.describe('Body Tracker heat-map overlay (Prompt #85n)', () => {
  test('Composition fat tab: overlay renders all 12 regions with neutral yellow fill', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-1440', 'overlay smoke runs on desktop-1440');

    await page.goto(COMPOSITION_PATH, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    const overlay = page.locator('[data-testid="body-avatar-heatmap"]');
    await expect(overlay).toBeVisible();

    const svg = overlay.locator('svg').first();
    await expect(svg).toBeVisible();

    for (const id of REGION_IDS) {
      const path = svg.locator(`path[data-region="${id}"]`);
      await expect(path, `region path[data-region="${id}"] should exist`).toBeAttached();
    }

    const fill = await svg.locator(`path[data-region="chest"]`).getAttribute('fill');
    expect(fill, 'no DB rows means neutral fill on every region').toBe(NEUTRAL_FILL);
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

  test('Segmental Muscle tab: overlay renders all 12 regions', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-1440', 'overlay smoke runs on desktop-1440');

    await page.goto(MUSCLE_PATH, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    const overlay = page.locator('[data-testid="body-avatar-heatmap"]');
    await expect(overlay).toBeVisible();

    const svg = overlay.locator('svg').first();
    for (const id of REGION_IDS) {
      const path = svg.locator(`path[data-region="${id}"]`);
      await expect(path).toBeAttached();
    }
  });

  test('overlay swaps malePath / femalePath when gender toggles', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-1440', 'gender toggle runs on desktop-1440');

    await page.goto(COMPOSITION_PATH, { waitUntil: 'domcontentloaded' });
    await page.click('[data-testid="gender-toggle-male"]');
    await page.waitForLoadState('networkidle');
    const maleD = await page.locator('svg path[data-region="chest"]').first().getAttribute('d');

    await page.click('[data-testid="gender-toggle-female"]');
    await page.waitForLoadState('networkidle');
    const femaleD = await page.locator('svg path[data-region="chest"]').first().getAttribute('d');

    expect(femaleD).not.toBe(maleD);
  });
});
