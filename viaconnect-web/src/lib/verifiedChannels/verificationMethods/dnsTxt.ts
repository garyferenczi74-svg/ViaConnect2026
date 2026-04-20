// Prompt #102 Workstream A — DNS TXT record verification (pure logic).

import { DNS_PROPAGATION_RETRY_WINDOW_HOURS } from '../types';

/** Pure: the DNS record name the practitioner creates under their
 *  own domain. They paste this into their DNS provider's UI. */
export function dnsRecordName(domain: string): string {
  // Strip https://, trailing slash, www. for a clean apex.
  const apex = domain
    .replace(/^https?:\/\//i, '')
    .replace(/\/$/, '')
    .replace(/^www\./i, '');
  return `_viaconnect-verification.${apex}`;
}

/** Pure: the TXT record value the practitioner creates. */
export function dnsRecordValue(token: string): string {
  return token;
}

/** Pure: whether a collection of TXT values from the domain contains
 *  our issued token. DNS providers often return TXT records wrapped
 *  in extra quotes or split across segments; handle both. */
export function dnsRecordMatches(records: readonly string[], issuedToken: string): boolean {
  for (const record of records) {
    const cleaned = record.replace(/^"|"$/g, '').trim();
    if (cleaned === issuedToken) return true;
    // DNS TXT may be segmented at 255-char boundaries and re-joined.
    if (cleaned.split(/"\s*"/).join('').replace(/"/g, '') === issuedToken) return true;
  }
  return false;
}

/** Pure: decide whether enough time has passed since the attempt
 *  started to count as a definitive failure, or whether the caller
 *  should keep retrying (propagation grace). */
export function shouldRetryAfterPropagationWindow(
  attemptCreatedAt: Date,
  now: Date = new Date(),
): boolean {
  const elapsedMs = now.getTime() - attemptCreatedAt.getTime();
  const maxMs = DNS_PROPAGATION_RETRY_WINDOW_HOURS * 60 * 60 * 1000;
  return elapsedMs < maxMs;
}
