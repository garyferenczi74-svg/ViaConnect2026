// Clair Health Coming soon connector. Partner domain is wearclair.com only.
// No partner API, OAuth client, redirect, ingest, or secrets in this scaffold.
// Post-GA connect is JSON / CSV / HealthKit export per privacy policy, not an
// invented authorize URL. isClairConfigured stays false until a real export
// ingest path exists. Do not invent client ids, tokens, or Connected state.

export const CLAIR_SOURCE_ID = 'clair';
export const CLAIR_DISPLAY_NAME = 'Clair Health';
export const CLAIR_PARTNER_ORIGIN = 'https://wearclair.com';
export const CLAIR_PARTNER_HOST = 'wearclair.com';

/** Consumer-safe Coming soon honesty. No clinical or contraceptive claim. */
export const CLAIR_HONESTY_DISCLAIMER =
  'Clair is not a medical device and is not for contraception.';

export const CLAIR_COMING_SOON_NOTES =
  'Coming soon. After launch, connect with a JSON, CSV, or HealthKit export from wearclair.com. Partner OAuth is not available yet. Clair is not a medical device and is not for contraception.';

export function isClairConfigured(): boolean {
  return false;
}

export function getClairCreds(): null {
  return null;
}

function hostnameOf(value: string): string | null {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return null;
  try {
    const url = trimmed.includes('://') ? new URL(trimmed) : new URL(`https://${trimmed}`);
    return url.hostname;
  } catch {
    return null;
  }
}

/** Partner host allow-list. wearclair.com only. */
export function isAllowedClairHost(value: string): boolean {
  const host = hostnameOf(value);
  if (!host) return false;
  return host === CLAIR_PARTNER_HOST || host === `www.${CLAIR_PARTNER_HOST}`;
}
