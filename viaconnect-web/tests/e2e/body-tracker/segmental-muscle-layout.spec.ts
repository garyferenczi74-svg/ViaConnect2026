// Prompt #153: Body Tracker Segmental Muscle layout (mirror of #153
// Composition layout assertions, scoped to ?section=muscle).
//
// The /body-tracker/muscle route redirects to
// /body-tracker/composition?section=muscle (Prompt #85b backward-compat).
// We hit the redirect target directly to bypass the 302 round-trip.
//
// The Segmental Muscle render branch shares the same data-testid hooks as
// the Body Fat branch since the layout pattern is identical: only one
// branch is mounted at a time, so testid uniqueness in the DOM holds.

import { test, expect } from '@playwright/test';

const MUSCLE_PATH = '/body-tracker/composition?section=muscle';

test.describe('Body Tracker Segmental Muscle layout (Prompt #153)', () => {
  test('desktop: avatar fills frame, metrics anchor at bottom', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-1440', 'desktop assertions only run on desktop-1440');

    await page.goto(MUSCLE_PATH, { waitUntil: 'domcontentloaded' });
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

  test('desktop: heading reads Segmental Muscle Analysis', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-1440', 'desktop assertions only run on desktop-1440');

    await page.goto(MUSCLE_PATH, { waitUntil: 'domcontentloaded' });

    const heading = page.locator('[data-testid="center-column"] h3').first();
    await expect(heading).toHaveText(/segmental muscle analysis/i);
  });

  test('mobile: avatar capped at 60vh, no horizontal overflow', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile-414', 'mobile assertions only run on mobile-414');

    await page.goto(MUSCLE_PATH, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    const avatarContainer = page.locator('[data-testid="avatar-container"]');
    const avatarBox = await avatarContainer.boundingBox();
    if (!avatarBox) throw new Error('Avatar container box failed to resolve');

    expect(
      avatarBox.height,
      `avatar should cap at ~60vh on mobile, got ${avatarBox.height.toFixed(1)}px`,
    ).toBeLessThanOrEqual(554);

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const innerWidth = await page.evaluate(() => window.innerWidth);
    expect(scrollWidth).toBeLessThanOrEqual(innerWidth);
  });
});
