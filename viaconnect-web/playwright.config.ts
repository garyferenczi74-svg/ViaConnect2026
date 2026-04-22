// Photo Sync prompt #110 §5.6: Playwright configuration.
//
// First Playwright config in the repo. Kept minimal. When additional E2E
// specs appear, extend this rather than adding per-project configs.
//
// Invocation:
//   npx playwright install        (one-time; downloads browsers)
//   npx playwright test           (runs everything under tests/e2e/)
//   npx playwright test --ui      (interactive mode)
//
// Local dev-server expectation: `npm run dev` must already be running at
// PLAYWRIGHT_BASE_URL (default http://localhost:3000). Tests do not spawn
// the dev server to avoid polluting the .next cache (memory rule).

import { defineConfig, devices } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },

  // Responsive coverage per Prompt #110 §5.6: 375 / 414 / 768 / 1024 / 1440.
  // Each viewport gets its own project so Playwright parallelizes across
  // breakpoints and per-SKU failures attribute to the correct viewport.
  projects: [
    { name: 'mobile-375',   use: { ...devices['iPhone SE (2nd generation)'],    viewport: { width: 375,  height: 812  } } },
    { name: 'mobile-414',   use: { ...devices['iPhone 11'],                     viewport: { width: 414,  height: 896  } } },
    { name: 'tablet-768',   use: { ...devices['iPad (gen 7) landscape'],        viewport: { width: 768,  height: 1024 } } },
    { name: 'laptop-1024',  use: { ...devices['Desktop Chrome'],                viewport: { width: 1024, height: 768  } } },
    { name: 'desktop-1440', use: { ...devices['Desktop Chrome'],                viewport: { width: 1440, height: 900  } } },
  ],
});
