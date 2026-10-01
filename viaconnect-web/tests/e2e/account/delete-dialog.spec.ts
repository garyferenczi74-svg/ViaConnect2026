import { expect, test } from '@playwright/test';

// Dialog check for both account pages at 390px and 1280px.
// The dev server must use the local auth stand-in (tests/e2e/account/auth-stand-in.mjs).
// This spec never submits the dialog, so it does not call the deletion route.

const WIDTHS = [390, 1280] as const;
const PAGES = ['/account/profile', '/profile'] as const;
const USER_ID = '00000000-0000-4000-8000-000000000001';

function base64url(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64url');
}

function sessionCookieValue(): string {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = base64url(JSON.stringify({
    sub: USER_ID,
    aud: 'authenticated',
    role: 'authenticated',
    email: 'reviewer@example.com',
    exp: now + 60 * 60,
    iat: now,
  }));
  const accessToken = `${header}.${payload}.sig`;
  const session = {
    access_token: accessToken,
    refresh_token: 'stand-in-refresh',
    expires_in: 3600,
    expires_at: now + 3600,
    token_type: 'bearer',
    user: {
      id: USER_ID,
      aud: 'authenticated',
      role: 'authenticated',
      email: 'reviewer@example.com',
      app_metadata: { provider: 'email' },
      user_metadata: {},
      identities: [],
    },
  };
  return `base64-${base64url(JSON.stringify(session))}`;
}

test.describe('account deletion dialog', () => {
  test.beforeEach(async ({ context, baseURL }) => {
    const browserName =
      test.info().project.use.defaultBrowserType ??
      test.info().project.use.browserName;
    test.skip(browserName !== 'chromium', 'Chromium only');
    test.skip(
      test.info().project.name !== 'desktop-1440',
      'Viewports are set inside the test',
    );
    await context.addCookies([
      {
        name: 'sb-127-auth-token',
        value: sessionCookieValue(),
        url: baseURL ?? 'http://127.0.0.1:3456',
      },
    ]);
  });

  for (const width of WIDTHS) {
    test(`public deletion page at ${width}px names ViaConnect`, async ({ page }) => {
      await page.setViewportSize({ width, height: width === 390 ? 844 : 800 });
      await page.goto('/delete-account', { waitUntil: 'domcontentloaded' });
      await expect(page.getByRole('heading', { name: 'Delete your ViaConnect account' })).toBeVisible();
      await expect(page.getByText('It does not delete the account by itself.')).toBeVisible();
      await expect(page.getByRole('link', { name: 'Open the privacy request form' })).toHaveAttribute('href', '/dsar');
      await page.screenshot({
        path: `/opt/cursor/artifacts/screenshots/delete-account-public-${width}.png`,
        fullPage: true,
      });
    });
  }

  for (const width of WIDTHS) {
    for (const path of PAGES) {
      test(`opens the delete dialog on ${path} at ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: width === 390 ? 844 : 800 });
        await page.goto(path, { waitUntil: 'domcontentloaded' });
        const opener = page.getByTestId('delete-account-open');
        await expect(opener).toBeVisible();
        await opener.click();
        const dialog = page.getByTestId('delete-account-dialog');
        await expect(dialog).toBeVisible();
        await expect(dialog).toContainText('Delete your ViaConnect account?');
        await expect(dialog).toContainText('This permanently deletes your ViaConnect account');
        await expect(dialog).toContainText('This cannot be undone.');
        await expect(page.getByTestId('delete-account-confirm-input')).toBeVisible();
        await expect(page.getByTestId('delete-account-submit')).toBeDisabled();
        await page.getByTestId('delete-account-confirm-input').fill('DELETE');
        await expect(page.getByTestId('delete-account-submit')).toBeEnabled();
        const slug = path.replace(/\//g, '-').replace(/^-/, '');
        await page.screenshot({
          path: `/opt/cursor/artifacts/screenshots/delete-dialog-${slug}-${width}.png`,
          fullPage: false,
        });
        // Do not submit. Submission would call the deletion route.
      });
    }
  }
});
