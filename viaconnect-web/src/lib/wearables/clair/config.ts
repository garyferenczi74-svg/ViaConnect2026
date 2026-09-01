// Clair Health Coming soon connector. Partner domain is wearclair.com only.
// No OAuth, ingest, or secrets in this scaffold. isClairConfigured stays
// false until real CLAIR_* secrets and a partner contract exist. Do not
// invent client ids, tokens, or Connected state.

export const CLAIR_SOURCE_ID = 'clair';
export const CLAIR_DISPLAY_NAME = 'Clair Health';
export const CLAIR_PARTNER_ORIGIN = 'https://wearclair.com';
export const CLAIR_PARTNER_HOST = 'wearclair.com';

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
