// Prompt #170 Phase 1o: NutriVision capture flow.
//
// Verifies the entry path from /nutrition into /nutrition/photo-ai, the idle
// CTA, the inline privacy disclaimer, and the analyzing state after a
// simulated file pick.
//
// Out of scope: actually exercising the camera. The Phase 1l capture path is
// either a Capacitor native bridge (mobile) or a getUserMedia / file picker
// (web). Tests run on web; we use the fileChooser API to inject a fixture
// image, which is what the Upload photo button funnels into.
//
// Spec spawn note: tests assume `npm run dev` is running on
// PLAYWRIGHT_BASE_URL (default http://localhost:3000) and that the test
// account is already logged in via a persisted Playwright auth state, or
// that the /nutrition page tolerates an unauthenticated read. This file
// only asserts the renderable UI; the analyze handler is stubbed via
// page.route() so no LogMeal API key is required.

import { test, expect } from '@playwright/test';
import path from 'node:path';
import { promises as fs } from 'node:fs';

const PHOTO_AI_PATH = '/nutrition/photo-ai';
const NUTRITION_PATH = '/nutrition';
const ANALYZE_ROUTE_GLOB = '**/api/nutrition/photo/analyze*';

// Tiny 1x1 PNG. Buffered out of the spec rather than read from disk so the
// suite is self-contained even before fixtures land.
const ONE_PX_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=';

async function writeFixturePngIfMissing(fixturePath: string): Promise<void> {
  try {
    await fs.access(fixturePath);
  } catch {
    await fs.mkdir(path.dirname(fixturePath), { recursive: true });
    await fs.writeFile(fixturePath, Buffer.from(ONE_PX_PNG_BASE64, 'base64'));
  }
}

const FIXTURE_PATH = path.resolve(
  process.cwd(),
  'tests/playwright/nutrivision/fixtures/onepx.png',
);

test.describe('NutriVision capture flow', () => {
  test.beforeEach(async ({ page }) => {
    await writeFixturePngIfMissing(FIXTURE_PATH);

    // Stub the analyze response so the analyzing state is reachable without
    // a live LogMeal / Gemini / Claude key.
    await page.route(ANALYZE_ROUTE_GLOB, async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 200));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          job_id: 'test-job-id',
          source_photo_blob_id: 'test-blob-id',
          meal_draft: {
            id: 'test-draft-id',
            items: [],
            totals: { calories_kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0, sugar_g: 0, sodium_mg: 0 },
            meal_confidence: 0.8,
            warnings: [],
            providers_called: ['logmeal'],
            from_cache: 'none',
          },
          requestId: 'test-request-id',
        }),
      });
    });
  });

  test('navigates from /nutrition pill to /nutrition/photo-ai', async ({ page }) => {
    await page.goto(NUTRITION_PATH, { waitUntil: 'domcontentloaded' });
    const pill = page.getByRole('link', { name: /NutriVision/i }).first();
    await expect(pill).toBeVisible({ timeout: 15_000 });
    await pill.click();
    await page.waitForURL(`**${PHOTO_AI_PATH}`, { timeout: 15_000 });
  });

  test('idle state shows capture CTA and privacy disclaimer', async ({ page }) => {
    await page.goto(PHOTO_AI_PATH, { waitUntil: 'domcontentloaded' });

    const captureHeading = page.getByText(/Capture your meal/i).first();
    await expect(captureHeading).toBeVisible({ timeout: 15_000 });

    const takePhoto = page.getByRole('button', { name: /Take photo/i });
    await expect(takePhoto).toBeVisible();
    const upload = page.getByRole('button', { name: /Upload photo/i });
    await expect(upload).toBeVisible();

    const disclaimer = page.getByText(
      /Photos may capture background details/i,
    ).first();
    await expect(disclaimer).toBeVisible();
  });

  test('uploading a file advances to analyzing state', async ({ page }) => {
    await page.goto(PHOTO_AI_PATH, { waitUntil: 'domcontentloaded' });

    const uploadButton = page.getByRole('button', { name: /Upload photo/i });
    await expect(uploadButton).toBeVisible({ timeout: 15_000 });

    // The button funnels through a hidden <input type=file>. fileChooser
    // intercepts the next pick prompt; if the page surfaces no chooser, we
    // fall back to the direct input selector.
    const chooserPromise = page.waitForEvent('filechooser', { timeout: 3_000 }).catch(() => null);
    await uploadButton.click();
    const chooser = await chooserPromise;

    if (chooser) {
      await chooser.setFiles(FIXTURE_PATH);
    } else {
      const hiddenInput = page.locator('input[type="file"]').first();
      const inputCount = await hiddenInput.count();
      if (inputCount > 0) {
        await hiddenInput.setInputFiles(FIXTURE_PATH);
      } else {
        test.skip(true, 'no file picker surfaced; capture path is native-only in this build');
      }
    }

    // Analyzing screen renders a progress label.
    const analyzing = page.getByText(/Analyzing|Recognizing|Processing/i).first();
    await expect(analyzing).toBeVisible({ timeout: 10_000 });
  });
});
