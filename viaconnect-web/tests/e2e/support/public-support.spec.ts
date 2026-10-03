import { expect, test } from '@playwright/test';

// Logged-out public support page at 390px and 1280px.
// No session cookie. /support must render itself and must not land on /login.

const WIDTHS = [390, 1280] as const;

test.describe('public support page', () => {
  test.beforeEach(async ({ context }) => {
    const browserName =
      test.info().project.use.defaultBrowserType ??
      test.info().project.use.browserName;
    test.skip(browserName !== 'chromium', 'Chromium only');
    test.skip(
      test.info().project.name !== 'desktop-1440',
      'Viewports are set inside the test',
    );
    await context.clearCookies();
  });

  for (const width of WIDTHS) {
    test(`logged-out /support at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: width === 390 ? 844 : 800 });
      const response = await page.goto('/support', { waitUntil: 'domcontentloaded' });
      expect(response?.request().redirectedFrom()).toBeNull();
      expect(page.url()).not.toContain('/login');
      await expect(page.getByRole('heading', { name: 'ViaConnect support' })).toBeVisible();
      await expect(page.getByTestId('support-email')).toHaveAttribute(
        'href',
        'mailto:support@viaconnectapp.com',
      );
      await expect(page.getByTestId('info-email')).toHaveAttribute(
        'href',
        'mailto:info@viaconnectapp.com',
      );
      const main = page.getByRole('main');
      await expect(main.getByRole('link', { name: 'Privacy Policy' })).toHaveAttribute('href', '/privacy');
      await expect(main.getByRole('link', { name: 'Terms of Service' })).toHaveAttribute('href', '/terms');
      await expect(main.getByRole('link', { name: 'Delete account' })).toHaveAttribute('href', '/delete-account');
      await expect(main.getByRole('link', { name: 'Privacy request form' })).toHaveAttribute('href', '/dsar');
      await expect(
        page.getByRole('navigation', { name: 'Footer' }).getByRole('link', { name: 'Support', exact: true }),
      ).toHaveAttribute('href', '/support');
      await expect(
        page.getByText(
          'The Services are for informational and wellness purposes only. They do not provide medical advice, diagnosis, or treatment.',
        ),
      ).toBeVisible();
      const overflows = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      );
      expect(overflows).toBe(false);
      await page.screenshot({
        path: `/opt/cursor/artifacts/screenshots/support-public-${width}.png`,
        fullPage: true,
      });
    });
  }
});
