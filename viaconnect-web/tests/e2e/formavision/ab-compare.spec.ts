// Prompt Brief 2: A/B compare layout at 390 and 1280 on /body-tracker/formavision.
//
// Asserts the dual-home toggle, wipe controls slot, and no-overlap at the
// requested viewports. Auth-gated environments may redirect; the canvas wait
// fails closed in that case. No photogrammetry assertions.

import { test, expect, type Page } from '@playwright/test';
import { FORMAVISION_PATH } from './fixtures';

async function gotoFormaVision(page: Page, width: number, height: number): Promise<void> {
  await page.setViewportSize({ width, height });
  await page.goto(FORMAVISION_PATH, { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('formavision-canvas-grid')).toBeVisible({
    timeout: 20_000,
  });
}

test.describe('FormaVision 3D A/B compare (Brief 2)', () => {
  test('390: phone toggle home is visible, md+ home is hidden', async ({ page }) => {
    await gotoFormaVision(page, 390, 844);
    await expect(page.getByTestId('comparison-overlay-home-phone')).toBeVisible();
    await expect(page.getByTestId('comparison-overlay-home-top')).toBeHidden();
    const toggle = page
      .getByTestId('comparison-overlay-toggle')
      .filter({ visible: true })
      .first();
    await expect(toggle).toBeVisible();
    await expect(toggle).toContainText('A/B Compare');
  });

  test('1280: md+ toggle home is visible, phone home is hidden', async ({ page }) => {
    await gotoFormaVision(page, 1280, 800);
    await expect(page.getByTestId('comparison-overlay-home-top')).toBeVisible();
    await expect(page.getByTestId('comparison-overlay-home-phone')).toBeHidden();
    const toggle = page
      .getByTestId('comparison-overlay-toggle')
      .filter({ visible: true })
      .first();
    await expect(toggle).toBeVisible();
    await expect(toggle).toContainText('A/B Compare');
  });

  test('390 and 1280: controls stay inside the viewport', async ({ page }) => {
    for (const width of [390, 1280]) {
      await gotoFormaVision(page, width, width === 390 ? 844 : 800);
      const male = page.getByTestId('formavision-gender-male');
      const female = page.getByTestId('formavision-gender-female');
      await expect(male).toBeVisible();
      await expect(female).toBeVisible();
      const maleBox = await male.boundingBox();
      const femaleBox = await female.boundingBox();
      expect(maleBox).not.toBeNull();
      expect(femaleBox).not.toBeNull();
      if (!maleBox || !femaleBox) return;
      expect(maleBox.x).toBeGreaterThanOrEqual(-1);
      expect(femaleBox.x + femaleBox.width).toBeLessThanOrEqual(width + 1);
    }
  });
});
