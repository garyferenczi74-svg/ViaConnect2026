// Prompt #85n fix: smoke tests for the avatar heat-map overlay rebuilt on
// CSS mask-image instead of inline SVG paths. The overlay now layers a
// masked div containing 5 colored zone bands over the avatar img; the
// mask clips the band colors to the body silhouette so the visual hugs
// every contour without per-region path coordinates.
//
// The test user has no DB rows, so every zone falls through to the
// neutral yellow fill and only the structural assertions and legend
// labels are asserted here.

import { test, expect } from '@playwright/test';

const COMPOSITION_PATH = '/body-tracker/composition';
const MUSCLE_PATH = '/body-tracker/composition?section=muscle';

const ZONE_IDS = [
  'head',
  'upper_body',
  'mid_body',
  'upper_legs',
  'lower_legs',
] as const;

test.describe('Body Tracker heat-map overlay (Prompt #85n fix)', () => {
  test('Composition fat tab: overlay renders the masked layer with all 5 zone bands', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-1440', 'overlay smoke runs on desktop-1440');

    await page.goto(COMPOSITION_PATH, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    const overlay = page.locator('[data-testid="body-avatar-heatmap"]');
    await expect(overlay).toBeVisible();

    const maskLayer = overlay.locator('[data-testid="heatmap-mask-layer"]');
    await expect(maskLayer).toBeAttached();

    for (const id of ZONE_IDS) {
      await expect(
        maskLayer.locator(`[data-zone="${id}"]`),
        `zone band [data-zone="${id}"] should exist`,
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

  test('Segmental Muscle tab: overlay renders the masked layer with all 5 zone bands', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-1440', 'overlay smoke runs on desktop-1440');

    await page.goto(MUSCLE_PATH, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    const overlay = page.locator('[data-testid="body-avatar-heatmap"]');
    await expect(overlay).toBeVisible();

    const maskLayer = overlay.locator('[data-testid="heatmap-mask-layer"]');
    for (const id of ZONE_IDS) {
      await expect(maskLayer.locator(`[data-zone="${id}"]`)).toBeAttached();
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
