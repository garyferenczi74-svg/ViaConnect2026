// =============================================================================
// Biometric consent: pure, I/O-free decision logic.
// (Prompt #169b, Task 16, spec section 2.)
//
// This module holds the testable contract behind the biometric-consent
// mechanism: which consent_version is current, the "does this user have a
// CURRENT consent on file" decision, the retention-preference options, and the
// client-side IP-hash boundary marker. The React screen (BodyScanConsentScreen)
// and the hook (useBiometricConsent) are thin I/O wrappers over these.
//
// The COPY for the consent itself lives in body-scan-copy-slots.ts (counsel-
// gated placeholders); this module contains NO user-facing legal copy.
//
// REAL SCHEMA (migration 20260516000070): biometric_consents is append-only
// (owner SELECT + INSERT only; no UPDATE/DELETE). Columns: user_id,
// consent_version, consented_at, ip_address (stored HASHED), user_agent,
// retention_preference_days, model_improvement_opt_in. A user "has current
// consent" when their MOST RECENT consent row matches CURRENT_CONSENT_VERSION.
// =============================================================================

// ---------------------------------------------------------------------------
// Consent version
// ---------------------------------------------------------------------------

// The consent version currently in force. Bumping this string (when counsel
// approves new consent copy) invalidates prior consents: a user whose latest
// consent row is an older version is treated as NOT currently consented and is
// re-prompted. Kept as a plain semver-ish string to match the TEXT column.
//
// NOTE: this is a VERSION IDENTIFIER, not user-facing copy. The actual consent
// wording for this version lives in body-scan-copy-slots.ts and is counsel-
// gated. Coordinate any bump with a copy review.
export const CURRENT_CONSENT_VERSION = '2026-05-169b.1';

// ---------------------------------------------------------------------------
// Retention preference options (section 2.2.1)
// ---------------------------------------------------------------------------

// The retention window, in days, the user may choose for their biometric scan
// data. 0 is the DEFAULT (keep only as long as needed to produce the result,
// i.e. do not retain beyond the session per the consent copy); the user may
// OPT IN to a longer window. `indefiniteDays` is null (no automatic deletion).
export interface RetentionOption {
  // Stable machine value persisted to biometric_consents.retention_preference_days.
  // null means "indefinite" (no scheduled destruction).
  days: number | null;
  // Stable id for React keys / analytics. NOT user-facing copy; the human label
  // is rendered by the screen and is not legally sensitive (it is a duration),
  // but the SURROUNDING retention explanation is a counsel-gated copy slot.
  id: string;
}

export const RETENTION_OPTIONS: readonly RetentionOption[] = [
  { id: 'session_only', days: 0 },     // default
  { id: 'days_30', days: 30 },
  { id: 'days_90', days: 90 },
  { id: 'days_365', days: 365 },
  { id: 'indefinite', days: null },
] as const;

// The default retention preference (section 2.2.1: 0, i.e. session-only; the
// user must actively opt in to longer retention).
export const DEFAULT_RETENTION_DAYS = 0;

// The default model-improvement opt-in (section 2.2.1: OFF; must be actively
// turned on, and is a SEPARATE acknowledgement from accepting consent).
export const DEFAULT_MODEL_IMPROVEMENT_OPT_IN = false;

/**
 * Whether a chosen retention value is one of the allowed options. Defensive
 * validation before a consent write (the column is a free INTEGER).
 */
export function isValidRetentionDays(days: number | null): boolean {
  return RETENTION_OPTIONS.some((o) => o.days === days);
}

// ---------------------------------------------------------------------------
// "Has current consent" decision
// ---------------------------------------------------------------------------

// The minimal shape of a biometric_consents row this decision needs. Mirrors
// the real table; only the fields the decision reads are declared.
export interface BiometricConsentRow {
  consent_version: string;
  consented_at: string; // ISO-8601 timestamptz
}

export interface CurrentConsentDecision {
  // True when the user has a CURRENT consent on file (latest row's version
  // equals the expected version). This is the client gate the capture entry
  // composes with the age + premium gates.
  hasCurrentConsent: boolean;
  // The version of the user's most recent consent, or null when they have none.
  latestVersion: string | null;
  // When the user has consented but to an OLDER version (re-consent required).
  needsReconsent: boolean;
}

/**
 * Decide whether a user currently has biometric consent (spec section 2).
 *
 * Rules:
 *   no consent rows at all                 -> hasCurrentConsent=false, no reconsent
 *   latest row version == expectedVersion  -> hasCurrentConsent=true
 *   latest row version != expectedVersion  -> hasCurrentConsent=false, needsReconsent
 *
 * "Latest" is the row with the greatest consented_at. Rows with an unparseable
 * timestamp are ignored. `expectedVersion` defaults to CURRENT_CONSENT_VERSION
 * but is a parameter so the decision is trivially testable.
 *
 * Pure: takes the already-fetched rows (the hook does the RLS-scoped read).
 */
export function decideCurrentConsent(
  rows: readonly BiometricConsentRow[] | null | undefined,
  expectedVersion: string = CURRENT_CONSENT_VERSION,
): CurrentConsentDecision {
  if (!rows || rows.length === 0) {
    return { hasCurrentConsent: false, latestVersion: null, needsReconsent: false };
  }

  let latest: BiometricConsentRow | null = null;
  let latestMs = Number.NEGATIVE_INFINITY;
  for (const row of rows) {
    if (!row || typeof row.consented_at !== 'string') continue;
    const ms = Date.parse(row.consented_at);
    if (Number.isNaN(ms)) continue;
    if (ms > latestMs) {
      latestMs = ms;
      latest = row;
    }
  }

  if (!latest) {
    // Rows existed but none had a usable timestamp: treat as no current consent.
    return { hasCurrentConsent: false, latestVersion: null, needsReconsent: false };
  }

  const hasCurrentConsent = latest.consent_version === expectedVersion;
  return {
    hasCurrentConsent,
    latestVersion: latest.consent_version,
    needsReconsent: !hasCurrentConsent,
  };
}

// ---------------------------------------------------------------------------
// IP hashing boundary
// ---------------------------------------------------------------------------

// The schema stores biometric_consents.ip_address HASHED, not raw. The app is
// responsible for hashing the client IP before insert. This module marks that
// boundary and provides a hash helper the consent-write path uses.
//
// IMPORTANT: hashing happens where the raw IP is actually available. In this
// codebase the consent is written from the CLIENT (mirroring the other
// body-tracker profile writes), which does NOT see a trustworthy client IP; the
// authoritative IP is seen by the server. The recorded value in the client
// path is therefore a non-identifying placeholder marker ('client_unhashed'),
// and the field is intended to be populated with a SERVER-side salted hash if/
// when the consent write is moved server-side. Either way, a RAW IP is never
// written. See useBiometricConsent for where this is applied.
export const CLIENT_IP_HASH_PLACEHOLDER = 'client_no_ip';

/**
 * SHA-256 hash of an IP string using the Web Crypto API, hex-encoded. Used to
 * avoid persisting a raw IP. Returns CLIENT_IP_HASH_PLACEHOLDER when no IP is
 * available or crypto.subtle is unavailable (so the column is never raw and the
 * write never throws on environments without subtle crypto).
 *
 * A salt SHOULD be prepended when this is moved server-side; the salt is not
 * available client-side, hence the server-hash intent noted above.
 */
export async function hashIpAddress(
  ip: string | null | undefined,
  salt = '',
): Promise<string> {
  if (!ip) return CLIENT_IP_HASH_PLACEHOLDER;
  try {
    const subtle = (globalThis.crypto as Crypto | undefined)?.subtle;
    if (!subtle) return CLIENT_IP_HASH_PLACEHOLDER;
    const data = new TextEncoder().encode(`${salt}${ip}`);
    const digest = await subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  } catch {
    return CLIENT_IP_HASH_PLACEHOLDER;
  }
}

// ---------------------------------------------------------------------------
// Consent write payload
// ---------------------------------------------------------------------------

// The exact, append-only insert payload for biometric_consents. Built by a pure
// function so the recorded shape is testable and the defaults (retention 0,
// model-improvement off) are enforced in one place.
export interface ConsentWriteInput {
  retentionDays: number | null;
  modelImprovementOptIn: boolean;
  ipHash: string;        // already hashed (or CLIENT_IP_HASH_PLACEHOLDER)
  userAgent: string | null;
  consentVersion?: string;
}

export interface ConsentInsertPayload {
  consent_version: string;
  ip_address: string;            // HASHED value; never raw
  user_agent: string | null;
  retention_preference_days: number | null;
  model_improvement_opt_in: boolean;
}

/**
 * Build the append-only biometric_consents insert payload. Coerces an invalid
 * retention value back to the default, and the opt-in to a strict boolean (so a
 * truthy-but-non-boolean can never silently enable model improvement). user_id
 * and consented_at are set by RLS/default at insert time and are not included.
 */
export function buildConsentInsertPayload(input: ConsentWriteInput): ConsentInsertPayload {
  const retention = isValidRetentionDays(input.retentionDays)
    ? input.retentionDays
    : DEFAULT_RETENTION_DAYS;
  return {
    consent_version: input.consentVersion ?? CURRENT_CONSENT_VERSION,
    ip_address: input.ipHash || CLIENT_IP_HASH_PLACEHOLDER,
    user_agent: input.userAgent,
    retention_preference_days: retention,
    model_improvement_opt_in: input.modelImprovementOptIn === true,
  };
}
