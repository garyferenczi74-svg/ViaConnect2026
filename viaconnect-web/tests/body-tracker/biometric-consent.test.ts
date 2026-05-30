// Tests for biometric-consent.ts (Prompt #169b, Task 16, section 2).
//
// These exercise the REAL decision logic behind the biometric-consent gate:
//   decideCurrentConsent      the "has current consent" decision the capture
//                             entry composes with the age + premium gates
//   isValidRetentionDays      retention option validation
//   buildConsentInsertPayload the append-only insert shape + default enforcement
//   hashIpAddress             never persists a raw IP
//
// Node-environment pure-logic tests (project convention).

import { describe, it, expect } from 'vitest';
import {
  decideCurrentConsent,
  isValidRetentionDays,
  buildConsentInsertPayload,
  hashIpAddress,
  selectConsentGateRender,
  CURRENT_CONSENT_VERSION,
  RETENTION_OPTIONS,
  DEFAULT_RETENTION_DAYS,
  DEFAULT_MODEL_IMPROVEMENT_OPT_IN,
  CLIENT_IP_HASH_PLACEHOLDER,
  type BiometricConsentRow,
} from '@/lib/body-tracker/biometric-consent';

// ===========================================================================
// "Has current consent" decision (section 2)
// ===========================================================================

describe('decideCurrentConsent (section 2)', () => {
  it('no rows -> no current consent, no reconsent', () => {
    expect(decideCurrentConsent([])).toEqual({
      hasCurrentConsent: false,
      latestVersion: null,
      needsReconsent: false,
    });
    expect(decideCurrentConsent(null)).toEqual({
      hasCurrentConsent: false,
      latestVersion: null,
      needsReconsent: false,
    });
    expect(decideCurrentConsent(undefined)).toEqual({
      hasCurrentConsent: false,
      latestVersion: null,
      needsReconsent: false,
    });
  });

  it('latest row matching the current version -> has current consent', () => {
    const rows: BiometricConsentRow[] = [
      { consent_version: CURRENT_CONSENT_VERSION, consented_at: '2026-05-20T10:00:00Z' },
    ];
    const d = decideCurrentConsent(rows);
    expect(d.hasCurrentConsent).toBe(true);
    expect(d.needsReconsent).toBe(false);
    expect(d.latestVersion).toBe(CURRENT_CONSENT_VERSION);
  });

  it('picks the MOST RECENT row by consented_at, not input order', () => {
    const rows: BiometricConsentRow[] = [
      { consent_version: 'old-1', consented_at: '2025-01-01T00:00:00Z' },
      { consent_version: CURRENT_CONSENT_VERSION, consented_at: '2026-05-20T10:00:00Z' },
      { consent_version: 'old-2', consented_at: '2024-01-01T00:00:00Z' },
    ];
    const d = decideCurrentConsent(rows);
    expect(d.hasCurrentConsent).toBe(true);
    expect(d.latestVersion).toBe(CURRENT_CONSENT_VERSION);
  });

  it('latest row is an OLDER version -> needs reconsent (not current)', () => {
    const rows: BiometricConsentRow[] = [
      { consent_version: CURRENT_CONSENT_VERSION, consented_at: '2025-01-01T00:00:00Z' },
      { consent_version: 'superseded-version', consented_at: '2026-05-20T10:00:00Z' },
    ];
    const d = decideCurrentConsent(rows);
    expect(d.hasCurrentConsent).toBe(false);
    expect(d.needsReconsent).toBe(true);
    expect(d.latestVersion).toBe('superseded-version');
  });

  it('honors an explicit expectedVersion override', () => {
    const rows: BiometricConsentRow[] = [
      { consent_version: 'v2', consented_at: '2026-05-20T10:00:00Z' },
    ];
    expect(decideCurrentConsent(rows, 'v2').hasCurrentConsent).toBe(true);
    expect(decideCurrentConsent(rows, 'v3').hasCurrentConsent).toBe(false);
  });

  it('ignores rows with an unparseable timestamp', () => {
    const rows: BiometricConsentRow[] = [
      { consent_version: CURRENT_CONSENT_VERSION, consented_at: 'not-a-date' },
    ];
    expect(decideCurrentConsent(rows).hasCurrentConsent).toBe(false);
  });
});

// ===========================================================================
// Consent gate render decision (loading-window guard + post-accept transition)
// ===========================================================================

describe('selectConsentGateRender (section 2 gate)', () => {
  it('while loading -> loader, NOT the children (guards the load window)', () => {
    // The capture entry must not be reachable during the consent-load moment,
    // because the server enforcement is deferred to launch.
    expect(selectConsentGateRender(true, false)).toBe('loading');
    expect(selectConsentGateRender(true, true)).toBe('loading');
  });

  it('resolved + no current consent -> consent screen', () => {
    expect(selectConsentGateRender(false, false)).toBe('consent');
  });

  it('resolved + current consent -> children (gate open)', () => {
    expect(selectConsentGateRender(false, true)).toBe('children');
  });

  it('post-accept transition flips consent -> children with no remount', () => {
    // Before accept: resolved, no consent -> the screen is shown.
    expect(selectConsentGateRender(false, false)).toBe('consent');
    // A successful accept refreshes the hoisted hook so hasCurrentConsent
    // becomes true; the SAME gate instance now renders its children. Modeled
    // here by feeding the post-write hook state into the same pure decision.
    expect(selectConsentGateRender(false, true)).toBe('children');
  });

  it('never renders children before the consent state resolves', () => {
    // The pre-fix bug was rendering children while loading. Assert the guard:
    // for every consent value, the loading state yields the loader.
    for (const has of [true, false]) {
      expect(selectConsentGateRender(true, has)).toBe('loading');
    }
  });
});

// ===========================================================================
// Retention options
// ===========================================================================

describe('retention options (section 2.2.1)', () => {
  it('the default is 0 (session-only)', () => {
    expect(DEFAULT_RETENTION_DAYS).toBe(0);
    expect(RETENTION_OPTIONS.some((o) => o.days === 0)).toBe(true);
  });

  it('offers the opt-in windows 30 / 90 / 365 / indefinite', () => {
    const days = RETENTION_OPTIONS.map((o) => o.days);
    expect(days).toContain(30);
    expect(days).toContain(90);
    expect(days).toContain(365);
    expect(days).toContain(null); // indefinite
  });

  it('isValidRetentionDays accepts options and rejects others', () => {
    expect(isValidRetentionDays(0)).toBe(true);
    expect(isValidRetentionDays(30)).toBe(true);
    expect(isValidRetentionDays(null)).toBe(true);
    expect(isValidRetentionDays(45)).toBe(false);
    expect(isValidRetentionDays(-1)).toBe(false);
  });
});

// ===========================================================================
// Consent insert payload shaping (append-only; default enforcement)
// ===========================================================================

describe('buildConsentInsertPayload (section 2.2.1)', () => {
  it('defaults: retention 0, model-improvement OFF', () => {
    expect(DEFAULT_MODEL_IMPROVEMENT_OPT_IN).toBe(false);
    const payload = buildConsentInsertPayload({
      retentionDays: DEFAULT_RETENTION_DAYS,
      modelImprovementOptIn: DEFAULT_MODEL_IMPROVEMENT_OPT_IN,
      ipHash: CLIENT_IP_HASH_PLACEHOLDER,
      userAgent: 'ua',
    });
    expect(payload.retention_preference_days).toBe(0);
    expect(payload.model_improvement_opt_in).toBe(false);
    expect(payload.consent_version).toBe(CURRENT_CONSENT_VERSION);
  });

  it('coerces an invalid retention value back to the default', () => {
    const payload = buildConsentInsertPayload({
      retentionDays: 45, // not an option
      modelImprovementOptIn: true,
      ipHash: 'abc',
      userAgent: null,
    });
    expect(payload.retention_preference_days).toBe(DEFAULT_RETENTION_DAYS);
  });

  it('records an explicit opt-in only when strictly true', () => {
    expect(buildConsentInsertPayload({
      retentionDays: 90, modelImprovementOptIn: true, ipHash: 'h', userAgent: null,
    }).model_improvement_opt_in).toBe(true);

    // A truthy-but-not-boolean can never silently enable model improvement.
    expect(buildConsentInsertPayload({
      retentionDays: 90,
      modelImprovementOptIn: 'yes' as unknown as boolean,
      ipHash: 'h',
      userAgent: null,
    }).model_improvement_opt_in).toBe(false);
  });

  it('never carries a raw ip: stores the supplied hash (or placeholder)', () => {
    expect(buildConsentInsertPayload({
      retentionDays: 0, modelImprovementOptIn: false, ipHash: '', userAgent: null,
    }).ip_address).toBe(CLIENT_IP_HASH_PLACEHOLDER);

    expect(buildConsentInsertPayload({
      retentionDays: 0, modelImprovementOptIn: false, ipHash: 'deadbeef', userAgent: null,
    }).ip_address).toBe('deadbeef');
  });

  it('does NOT include user_id or consented_at (set by RLS/default at insert)', () => {
    const payload = buildConsentInsertPayload({
      retentionDays: 0, modelImprovementOptIn: false, ipHash: 'h', userAgent: null,
    });
    expect(payload).not.toHaveProperty('user_id');
    expect(payload).not.toHaveProperty('consented_at');
  });
});

// ===========================================================================
// IP hashing: never persists a raw IP
// ===========================================================================

describe('hashIpAddress', () => {
  it('returns the placeholder for a missing IP', async () => {
    expect(await hashIpAddress(null)).toBe(CLIENT_IP_HASH_PLACEHOLDER);
    expect(await hashIpAddress(undefined)).toBe(CLIENT_IP_HASH_PLACEHOLDER);
    expect(await hashIpAddress('')).toBe(CLIENT_IP_HASH_PLACEHOLDER);
  });

  it('hashes a present IP to a non-raw hex digest (node 20 has webcrypto)', async () => {
    const hashed = await hashIpAddress('203.0.113.7');
    // Either a hex digest (subtle available) or the placeholder (not available);
    // in both cases the RAW ip must never be returned.
    expect(hashed).not.toBe('203.0.113.7');
    if (hashed !== CLIENT_IP_HASH_PLACEHOLDER) {
      expect(hashed).toMatch(/^[0-9a-f]{64}$/);
    }
  });
});
