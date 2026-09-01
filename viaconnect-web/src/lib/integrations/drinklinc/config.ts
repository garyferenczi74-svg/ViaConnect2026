/**
 * DrinkLinc / LINC partner connector config.
 *
 * Audit (2026-09-01): no public DrinkLinc or LINC API, OAuth URLs, SDK, or
 * developer portal exist. drinklinc.com is a Webflow marketing site. /api,
 * /developers, /docs, /privacy, and /terms all 404. Early-access waitlist
 * only. Do not invent endpoints.
 *
 * Placeholder env names (unread until partner docs exist):
 *   DRINKLINC_CLIENT_ID
 *   DRINKLINC_CLIENT_SECRET
 *   DRINKLINC_REDIRECT_URI
 *
 * isDrinkLincConfigured() stays false until real base URLs and secrets exist.
 * No hardcoded auth or token URLs.
 *
 * All comments use hyphens only. No em-dashes or en-dashes.
 */

export const DRINKLINC_SLUG = 'drinklinc';
export const DRINKLINC_DISPLAY_NAME = 'LINC';
export const DRINKLINC_BRAND = 'LINC';
export const DRINKLINC_SITE = 'https://www.drinklinc.com';

/** Placeholder names only. Values are not read until a partner API ships. */
export const DRINKLINC_ENV_NAMES = {
  clientId: 'DRINKLINC_CLIENT_ID',
  clientSecret: 'DRINKLINC_CLIENT_SECRET',
  redirectUri: 'DRINKLINC_REDIRECT_URI',
} as const;

export const DRINKLINC_COMING_SOON_MESSAGE =
  'LINC partner API is not public yet. Connect is not available.';

/**
 * Always false until DrinkLinc publishes partner API base URLs and ViaConnect
 * provisions matching secrets. Env presence alone is not enough.
 */
export function isDrinkLincConfigured(): boolean {
  return false;
}

export function drinkLincComingSoonBody(): {
  status: 'coming_soon';
  connected: false;
  configured: false;
  slug: typeof DRINKLINC_SLUG;
  displayName: typeof DRINKLINC_DISPLAY_NAME;
  message: string;
} {
  return {
    status: 'coming_soon',
    connected: false,
    configured: false,
    slug: DRINKLINC_SLUG,
    displayName: DRINKLINC_DISPLAY_NAME,
    message: DRINKLINC_COMING_SOON_MESSAGE,
  };
}
