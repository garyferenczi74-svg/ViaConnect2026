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
  test('unauthenticated composition redirects to /login', async ({ page }) => {
    test.skip(
      !isPlaceholderSupabaseEnv(),
      'login-redirect assertion is for the placeholder CI Supabase env only',
    );

    await page.goto(COMPOSITION_PATH, { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/login(\?|$)/);
  });
});
