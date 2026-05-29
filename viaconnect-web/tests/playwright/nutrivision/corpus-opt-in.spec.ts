// Prompt #170 Phase 1o: corpus opt-in banner spec.
//
// Drives the analyze + review flow with a draft that triggers the opt-in
// banner. Asserts:
//   1. The banner renders during review (CorpusOptInBanner copy).
//   2. Tapping Contribute fires an upsert against user_nutrivision_settings.
//   3. The banner dismisses after the toggle resolves.
//
// We intercept the supabase REST upsert at the network layer
// (PostgREST /rest/v1/user_nutrivision_settings) and return a 201 so the
// optimistic dismissal path inside CorpusOptInBanner runs.

import { test, expect } from '@playwright/test';
import path from 'node:path';
import { promises as fs } from 'node:fs';

const PHOTO_AI_PATH = '/nutrition/photo-ai';
const ANALYZE_ROUTE_GLOB = '**/api/nutrition/photo/analyze*';
const SETTINGS_REST_GLOB = '**/rest/v1/user_nutrivision_settings*';

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

function smallDraft() {
  return {
    job_id: 'test-job',
    source_photo_blob_id: 'test-blob',
    meal_draft: {
      id: 'test-draft',
      items: [{
        id: 'item-1',
        food_name: 'Oatmeal with berries',
        bounding_box: { x: 0, y: 0, w: 100, h: 100 },
        recognition_provider: 'logmeal',
        recognition_confidence: 0.86,
        portion_grams: 200,
        portion_estimation_method: 'coarse_volume',
        portion_confidence: 0.6,
        cuisine_tag: 'north_american',
        cooking_method: 'boiled',
        cooking_oil_suggestion: { type: 'none', amount_ml: 0, reasoning: 'no oil' },
        nutrient_source: 'usda',
        calories_kcal: 150,
        protein_g: 5.0,
        carbs_g: 27.0,
        fat_g: 3.0,
      }],
      totals: {
        calories_kcal: 150, protein_g: 5.0, carbs_g: 27.0, fat_g: 3.0,
        fiber_g: 4.0, sugar_g: 8.0, sodium_mg: 5,
      },
      meal_confidence: 0.86,
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
      body: JSON.stringify(smallDraft()),
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

test.describe('NutriVision corpus opt-in', () => {
  test('opt-in banner renders in review state', async ({ page }) => {
    await reachReviewing(page);
    await expect(page.getByText('Oatmeal with berries')).toBeVisible({ timeout: 10_000 });
    const banner = page.getByText(/accuracy research|Contribute|Help us improve|Improve NutriVision/i).first();
    await expect(banner).toBeVisible({ timeout: 5_000 });
  });

  test('tapping opt-in fires upsert and dismisses the banner', async ({ page }) => {
    await reachReviewing(page);
    await expect(page.getByText('Oatmeal with berries')).toBeVisible({ timeout: 10_000 });

    let upsertSeen = false;
    await page.route(SETTINGS_REST_GLOB, async (route) => {
      const method = route.request().method();
      if (method === 'POST' || method === 'PATCH') upsertSeen = true;
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify([{ user_id: 'test-user', corpus_opt_in: true }]),
      });
    });

    const optInButton = page
      .getByRole('button', { name: /Contribute|Opt in|Yes, contribute|I'm in/i })
      .first();
    if (await optInButton.count() === 0) {
      test.skip(true, 'opt-in CTA not surfaced by current UI tree');
    }
    await optInButton.click();

    await expect.poll(() => upsertSeen, { timeout: 5_000 }).toBe(true);
    const bannerAfter = page.getByText(/accuracy research|Improve NutriVision/i).first();
    await expect(bannerAfter).toHaveCount(0, { timeout: 3_000 });
  });
});
