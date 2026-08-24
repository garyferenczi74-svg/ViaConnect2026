// Prompt 210m: FormaVision control-cluster zero-overlap layout.
//
// Asserts the composed column (top row, avatar canvas, Select Body Part,
// Comparison Overlay home, Journey bar when present) has no intersecting
// bounding boxes at phone, tablet, and desktop widths. Position and stacking
// only; no renderer or behavior assertions beyond layout geometry.
//
// SELECTOR CONTRACT:
//   formavision-top-controls
//   formavision-gender-male / formavision-gender-female
//   formavision-canvas-grid
//   formavision-select-body-part-slot / select-body-part
//   comparison-overlay-home-top / comparison-overlay-home-phone
//   comparison-overlay-toggle (visible instance only; dual-home CSS)
//   journey-timeline (optional; only when history length > 1)
//
// EXECUTION: requires PLAYWRIGHT_BASE_URL with the app already listening.
// Auth-gated environments may redirect; the grid wait fails closed in that case.

import { test, expect, type Locator, type Page } from '@playwright/test';
import { FORMAVISION_PATH } from './fixtures';

type Box = { x: number; y: number; width: number; height: number };

function intersects(a: Box, b: Box): boolean {
  return !(
    a.x + a.width <= b.x ||
    b.x + b.width <= a.x ||
    a.y + a.height <= b.y ||
    b.y + b.height <= a.y
  );
}

async function boxOf(locator: Locator): Promise<Box | null> {
  const box = await locator.boundingBox();
  if (!box) return null;
  return { x: box.x, y: box.y, width: box.width, height: box.height };
}

async function gotoFormaVision(page: Page): Promise<void> {
  await page.goto(FORMAVISION_PATH, { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('formavision-canvas-grid')).toBeVisible({
    timeout: 20_000,
  });
}

async function collectControlBoxes(page: Page): Promise<Array<{ name: string; box: Box }>> {
  const named: Array<{ name: string; locator: Locator }> = [
    { name: 'gender-male', locator: page.getByTestId('formavision-gender-male') },
    { name: 'gender-female', locator: page.getByTestId('formavision-gender-female') },
    {
      name: 'unit-toggle',
      locator: page.getByTestId('formavision-top-controls').getByRole('radiogroup', {
        name: 'Measurement unit',
      }),
    },
    { name: 'select-body-part-slot', locator: page.getByTestId('formavision-select-body-part-slot') },
    {
      name: 'comparison-overlay',
      locator: page.getByTestId('comparison-overlay-toggle').filter({ visible: true }).first(),
    },
  ];

  const journey = page.getByTestId('journey-timeline');
  if (await journey.count()) {
    named.push({ name: 'journey-timeline', locator: journey });
  }

  const out: Array<{ name: string; box: Box }> = [];
  for (const entry of named) {
    if (!(await entry.locator.count())) continue;
    if (!(await entry.locator.isVisible())) continue;
    const box = await boxOf(entry.locator);
    if (box && box.width > 0 && box.height > 0) {
      out.push({ name: entry.name, box });
    }
  }
  return out;
}

function assertNoOverlaps(controls: Array<{ name: string; box: Box }>): void {
  for (let i = 0; i < controls.length; i++) {
    for (let j = i + 1; j < controls.length; j++) {
      const a = controls[i];
      const b = controls[j];
      expect(
        intersects(a.box, b.box),
        `${a.name} intersects ${b.name}: ${JSON.stringify(a.box)} vs ${JSON.stringify(b.box)}`,
      ).toBe(false);
    }
  }
}

test.describe('FormaVision control cluster layout (Prompt 210m)', () => {
  test('closed state: no control bounding boxes intersect', async ({ page }) => {
    await gotoFormaVision(page);

    const canvas = page.getByTestId('formavision-canvas-grid');
    const selectSlot = page.getByTestId('formavision-select-body-part-slot');
    await expect(selectSlot).toBeVisible();

    const canvasBox = await boxOf(canvas);
    const selectBox = await boxOf(selectSlot);
    expect(canvasBox).not.toBeNull();
    expect(selectBox).not.toBeNull();
    if (!canvasBox || !selectBox) return;

    // Select Body Part sits below the avatar canvas (centered under the feet).
    expect(
      selectBox.y,
      'Select Body Part slot must start at or below the canvas bottom',
    ).toBeGreaterThanOrEqual(canvasBox.y + canvasBox.height - 2);

    const canvasCenterX = canvasBox.x + canvasBox.width / 2;
    const selectCenterX = selectBox.x + selectBox.width / 2;
    expect(
      Math.abs(selectCenterX - canvasCenterX),
      `Select Body Part should be horizontally centered under the canvas (delta ${Math.abs(selectCenterX - canvasCenterX).toFixed(1)}px)`,
    ).toBeLessThanOrEqual(24);

    const controls = await collectControlBoxes(page);
    expect(controls.length).toBeGreaterThanOrEqual(4);
    assertNoOverlaps(controls);
  });

  test('open select: control cluster still has zero overlap', async ({ page }) => {
    await gotoFormaVision(page);

    const picker = page.getByTestId('select-body-part');
    await expect(picker).toBeVisible();
    // Open the native select (focus + keyboard) so the control is in an active
    // state. OS option chrome is not DOM-measurable; we assert the in-page
    // control boxes remain non-overlapping while the picker is focused/open.
    await picker.focus();
    await picker.selectOption({ label: 'Neck' });
    await expect(picker).toHaveValue('neck');

    const controls = await collectControlBoxes(page);
    assertNoOverlaps(controls);

    // Reset to full body so later assertions stay independent.
    await picker.selectOption({ label: 'All (full body)' });
  });

  test('Comparison Overlay home matches breakpoint', async ({ page }, testInfo) => {
    await gotoFormaVision(page);

    const homeTop = page.getByTestId('comparison-overlay-home-top');
    const homePhone = page.getByTestId('comparison-overlay-home-phone');
    const width = page.viewportSize()?.width ?? 0;

    if (width < 768) {
      await expect(homePhone).toBeVisible();
      await expect(homeTop).toBeHidden();
      testInfo.annotations.push({
        type: '210m-comparison-home',
        description: 'phone: comparison-overlay-home-phone (above Journey)',
      });
    } else {
      await expect(homeTop).toBeVisible();
      await expect(homePhone).toBeHidden();
      testInfo.annotations.push({
        type: '210m-comparison-home',
        description: 'md+: comparison-overlay-home-top (right of units)',
      });
    }

    const visibleToggle = page
      .getByTestId('comparison-overlay-toggle')
      .filter({ visible: true })
      .first();
    await expect(visibleToggle).toBeVisible();
  });

  test('top row gender and units remain distinct and unclipped', async ({ page }) => {
    await gotoFormaVision(page);

    const male = page.getByTestId('formavision-gender-male');
    const female = page.getByTestId('formavision-gender-female');
    const units = page
      .getByTestId('formavision-top-controls')
      .getByRole('radiogroup', { name: 'Measurement unit' });

    await expect(male).toBeVisible();
    await expect(female).toBeVisible();
    await expect(units).toBeVisible();

    const maleBox = await boxOf(male);
    const femaleBox = await boxOf(female);
    const unitsBox = await boxOf(units);
    expect(maleBox && femaleBox && unitsBox).toBeTruthy();
    if (!maleBox || !femaleBox || !unitsBox) return;

    expect(intersects(maleBox, femaleBox)).toBe(false);
    expect(intersects(maleBox, unitsBox)).toBe(false);
    expect(intersects(femaleBox, unitsBox)).toBe(false);

    const topBoxes: Box[] = [maleBox, femaleBox, unitsBox];

    // At md+ the Comparison toggle joins the top row; include it in the
    // unclipped / non-overlap check (busiest at tablet-768).
    const comparisonInTop = page
      .getByTestId('comparison-overlay-home-top')
      .getByTestId('comparison-overlay-toggle');
    if (await comparisonInTop.isVisible()) {
      const comparisonBox = await boxOf(comparisonInTop);
      expect(comparisonBox).not.toBeNull();
      if (comparisonBox) {
        for (const other of topBoxes) {
          expect(intersects(comparisonBox, other)).toBe(false);
        }
        topBoxes.push(comparisonBox);
      }
    }

    const viewport = page.viewportSize();
    expect(viewport).not.toBeNull();
    if (!viewport) return;
    for (const box of topBoxes) {
      expect(box.x).toBeGreaterThanOrEqual(-1);
      expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1);
    }
  });
});
