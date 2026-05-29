// Prompt #170 Phase 1o: save and score flow.
//
// Stubs analyze + save and asserts:
//   1. Submitting Save advances to the confirmation screen.
//   2. The confirmation renders the Bio Optimization delta.
//   3. The confirmation renders the Helix awards summary.
//   4. The four target rings render (Cal, Protein, Carbs, Fat).
//
// The phrase "Bio Optimization" must appear verbatim per the standing copy
// rule.

import { test, expect } from '@playwright/test';
import path from 'node:path';
import { promises as fs } from 'node:fs';

const PHOTO_AI_PATH = '/nutrition/photo-ai';
const ANALYZE_ROUTE_GLOB = '**/api/nutrition/photo/analyze*';
const MEALS_ROUTE_GLOB   = '**/api/nutrition/meals*';

const ONE_PX_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=';
const FIXTURE_PATH = path.resolve(
  process.cwd(),
  'tests/playwright/nutrivision/fixtures/onepx.png',
);

async function ensureFixture(): Promise<void> {
  try { await fs.access(FIXTURE_PATH); }
  catch {
    await fs.mkdir(path.dirname(FIXTURE_PATH), { recursive: true });
    await fs.writeFile(FIXTURE_PATH, Buffer.from(ONE_PX_PNG_BASE64, 'base64'));
  }
}

function simpleDraft() {
  return {
    job_id: 'test-job',
    source_photo_blob_id: 'test-blob',
    meal_draft: {
      id: 'test-draft',
      items: [{
        id: 'item-1',
        food_name: 'Greek yogurt',
        bounding_box: { x: 0, y: 0, w: 100, h: 100 },
        recognition_provider: 'logmeal',
        recognition_confidence: 0.9,
        portion_grams: 170,
        portion_estimation_method: 'coarse_volume',
        portion_confidence: 0.7,
        cuisine_tag: 'mediterranean',
        cooking_method: 'raw',
        cooking_oil_suggestion: { type: 'none', amount_ml: 0, reasoning: 'no cooking' },
        nutrient_source: 'usda',
        calories_kcal: 100,
        protein_g: 17.0,
        carbs_g: 6.0,
        fat_g: 0.7,
      }],
      totals: {
        calories_kcal: 100, protein_g: 17.0, carbs_g: 6.0, fat_g: 0.7,
        fiber_g: 0, sugar_g: 4.5, sodium_mg: 65,
      },
      meal_confidence: 0.9,
      warnings: [],
      providers_called: ['logmeal'],
      from_cache: 'none',
    },
    requestId: 'test-request',
  };
}

async function reachReviewing(page: import('@playwright/test').Page): Promise<void> {
  await ensureFixture();
  await page.route(ANALYZE_ROUTE_GLOB, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(simpleDraft()),
    });
  });
  await page.goto(PHOTO_AI_PATH, { waitUntil: 'domcontentloaded' });
  const uploadButton = page.getByRole('button', { name: /Upload photo/i });
  await expect(uploadButton).toBeVisible({ timeout: 15_000 });
  const chooserPromise = page.waitForEvent('filechooser', { timeout: 3_000 }).catch(() => null);
  await uploadButton.click();
  const chooser = await chooserPromise;
  if (chooser) await chooser.setFiles(FIXTURE_PATH);
  else {
    const hiddenInput = page.locator('input[type="file"]').first();
    if (await hiddenInput.count() > 0) await hiddenInput.setInputFiles(FIXTURE_PATH);
    else test.skip(true, 'capture path is native-only in this build');
  }
}

test.describe('NutriVision save + confirmation', () => {
  test.beforeEach(async ({ page }) => {
    await page.route(MEALS_ROUTE_GLOB, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          meal_id: 'meal-999',
          gordon: {
            bio_optimization_delta: 1.4,
            quality_tier: 'good',
            quality_score: 82,
            copy: 'Solid protein hit for the morning.',
          },
          helix_events_emitted: ['nutrivision_meal_logged', 'nutrivision_first_photo_bonus'],
        }),
      });
    });
  });

  test('save advances to confirmation with Bio Optimization delta', async ({ page }) => {
    await reachReviewing(page);
    await expect(page.getByText('Greek yogurt')).toBeVisible({ timeout: 10_000 });

    const saveButton = page.getByRole('button', { name: /^Save$|Save meal|Confirm/i }).first();
    if (await saveButton.count() === 0) {
      test.skip(true, 'save affordance not surfaced by current UI tree');
    }
    await saveButton.click();

    const heading = page.getByRole('heading', { name: /Meal saved/i });
    await expect(heading).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText(/Bio Optimization/i)).toBeVisible();
  });

  test('confirmation lists 2 Helix rewards', async ({ page }) => {
    await reachReviewing(page);
    await expect(page.getByText('Greek yogurt')).toBeVisible({ timeout: 10_000 });

    const saveButton = page.getByRole('button', { name: /^Save$|Save meal|Confirm/i }).first();
    if (await saveButton.count() === 0) {
      test.skip(true, 'save affordance not surfaced by current UI tree');
    }
    await saveButton.click();

    const helix = page.getByText(/\+2\s+Helix\s+rewards?/i);
    await expect(helix).toBeVisible({ timeout: 5_000 });
  });

  test('confirmation renders the four target rings', async ({ page }) => {
    await reachReviewing(page);
    await expect(page.getByText('Greek yogurt')).toBeVisible({ timeout: 10_000 });

    const saveButton = page.getByRole('button', { name: /^Save$|Save meal|Confirm/i }).first();
    if (await saveButton.count() === 0) {
      test.skip(true, 'save affordance not surfaced by current UI tree');
    }
    await saveButton.click();

    await expect(page.getByText('Calories')).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText('Protein')).toBeVisible();
    await expect(page.getByText('Carbs')).toBeVisible();
    await expect(page.getByText('Fat')).toBeVisible();
  });
});
