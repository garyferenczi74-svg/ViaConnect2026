// Prompt #153: Body Tracker avatar frame fit + bottom row alignment.
//
// Asserts the Composition tab (default section=fat) renders a center column
// where the avatar fills 60%+ of column height on desktop and the bottom
// metrics row anchors within 24px of the column bottom edge. Mobile caps
// the avatar at 60vh and prevents horizontal overflow.
//
// SELECTOR STRATEGY:
//   data-testid hooks added in #153 on composition/page.tsx:
//     body-tracker-grid, center-column, avatar-container,
//     bottom-metrics-row, gender-toggle-male, gender-toggle-female.
//
// VIEWPORT STRATEGY:
//   Each assertion runs on a single playwright.config project so the test
//   executes once at the intended viewport. Desktop checks use desktop-1440
//   (1440x900); mobile checks use mobile-414 (414x896).

import { test, expect } from '@playwright/test';

const COMPOSITION_PATH = '/body-tracker/composition';

test.describe('Body Tracker composition layout (Prompt #153)', () => {
  test('desktop female: avatar fills frame, metrics anchor at bottom', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-1440', 'desktop assertions only run on desktop-1440');

    await page.goto(COMPOSITION_PATH, { waitUntil: 'domcontentloaded' });
    await page.click('[data-testid="gender-toggle-female"]');
    await page.waitForLoadState('networkidle');

    const centerColumn = page.locator('[data-testid="center-column"]');
    const avatarContainer = page.locator('[data-testid="avatar-container"]');
    const metricsRow = page.locator('[data-testid="bottom-metrics-row"]');

    await expect(centerColumn).toBeVisible();
    await expect(avatarContainer).toBeVisible();
    await expect(metricsRow).toBeVisible();

    const columnBox = await centerColumn.boundingBox();
    const avatarBox = await avatarContainer.boundingBox();
    const metricsBox = await metricsRow.boundingBox();
    if (!columnBox || !avatarBox || !metricsBox) throw new Error('Bounding boxes failed to resolve');

    const ratio = avatarBox.height / columnBox.height;
    expect(ratio, `avatar/column ratio ${ratio.toFixed(2)} should exceed 0.60`).toBeGreaterThan(0.60);

    const distanceFromBottom = (columnBox.y + columnBox.height) - (metricsBox.y + metricsBox.height);
    expect(
      distanceFromBottom,
      `metrics row should sit within 24px of column bottom, got ${distanceFromBottom.toFixed(1)}px`,
    ).toBeLessThanOrEqual(24);
  });

  test('desktop male: avatar fills frame, metrics anchor at bottom', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-1440', 'desktop assertions only run on desktop-1440');

    await page.goto(COMPOSITION_PATH, { waitUntil: 'domcontentloaded' });
    await page.click('[data-testid="gender-toggle-male"]');
    await page.waitForLoadState('networkidle');

    const centerColumn = page.locator('[data-testid="center-column"]');
    const avatarContainer = page.locator('[data-testid="avatar-container"]');
    const metricsRow = page.locator('[data-testid="bottom-metrics-row"]');

    const columnBox = await centerColumn.boundingBox();
    const avatarBox = await avatarContainer.boundingBox();
    const metricsBox = await metricsRow.boundingBox();
    if (!columnBox || !avatarBox || !metricsBox) throw new Error('Bounding boxes failed to resolve');

    const ratio = avatarBox.height / columnBox.height;
    expect(ratio, `avatar/column ratio ${ratio.toFixed(2)} should exceed 0.60`).toBeGreaterThan(0.60);

    const distanceFromBottom = (columnBox.y + columnBox.height) - (metricsBox.y + metricsBox.height);
    expect(distanceFromBottom).toBeLessThanOrEqual(24);
  });

  test('mobile: avatar capped at 60vh, no horizontal overflow', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile-414', 'mobile assertions only run on mobile-414');

    await page.goto(COMPOSITION_PATH, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    const avatarContainer = page.locator('[data-testid="avatar-container"]');
    const avatarBox = await avatarContainer.boundingBox();
    if (!avatarBox) throw new Error('Avatar container box failed to resolve');

    // 60vh of 896 (mobile-414 viewport) = 537.6; allow 16px tolerance.
    expect(
      avatarBox.height,
      `avatar should cap at ~60vh on mobile, got ${avatarBox.height.toFixed(1)}px`,
    ).toBeLessThanOrEqual(554);

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const innerWidth = await page.evaluate(() => window.innerWidth);
    expect(
      scrollWidth,
      `document scrollWidth ${scrollWidth} should not exceed innerWidth ${innerWidth}`,
    ).toBeLessThanOrEqual(innerWidth);
  });
});
