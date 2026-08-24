// Placeholder-env honesty for FormaVision Playwright @fallback.
//
// CI wires NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co and
// has no seeded session. /body-tracker/composition is auth-gated
// (src/lib/supabase/middleware.ts 307 to /login?redirectTo=). Surface
// @fallback specs skip on that env; this file asserts the real redirect
// so the opt-in job can stay green without inventing a session.

import { test, expect } from '@playwright/test';
import {
  COMPOSITION_PATH,
  isPlaceholderSupabaseEnv,
} from './fixtures';

test.describe('FormaVision placeholder env: login redirect @fallback', () => {
  // Skip in beforeEach so Playwright never launches WebKit/Firefox.
  // The FormaVision CI job installs Chromium only; iPhone/iPad device
  // projects default to WebKit and would red-fail on browserType.launch.
  test.beforeEach(() => {
    const browserName =
      test.info().project.use.defaultBrowserType ??
      test.info().project.use.browserName;
    test.skip(
      browserName !== 'chromium',
      'CI @fallback installs Chromium only; skip WebKit device projects',
    );
    test.skip(
      !isPlaceholderSupabaseEnv(),
      'login-redirect assertion is for the placeholder CI Supabase env only',
    );
  });

  test('unauthenticated composition redirects to /login', async ({ page }) => {
    await page.goto(COMPOSITION_PATH, { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/login(\?|$)/);
  });
});
