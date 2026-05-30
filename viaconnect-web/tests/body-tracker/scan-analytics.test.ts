// Tests for scan-analytics.ts (Prompt #169b, Task 21, spec section 14:
// Body Scan analytics events catalog).
//
// These exercise the REAL contract behind "events carry metadata only, never
// biometric data":
//   * the EVENT-NAME catalog matches section 14 exactly (no missing, no extra);
//   * the SANITIZER / allow-list: a clean metadata payload passes through
//     unchanged; a payload carrying a biometric field (body_fat_pct, weight_kg,
//     measurements, avatar params, the disordered-eating response, cycle phase,
//     ...) has that field STRIPPED; a nested object / array value under an
//     allowed key is dropped (no biometric blob can ride under an allowed name);
//   * the loud BLOCK-LIST tripwire (assertNoBiometric) rejects a biometric key;
//   * each EMITTER routes through the injected transport and shapes ONLY allowed
//     properties (and the disordered-eating emitter NEVER carries the response);
//   * the disordered_eating_question_answered emitter sends answered:true only.
//
// Node environment pure logic tests (project convention). No Supabase, no DOM:
// the emit transport is swapped for an in-test spy.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  // catalog
  BODY_SCAN_EVENTS,
  BODY_SCAN_EVENT_NAMES,
  // sanitizer + guard
  ALLOWED_PROPERTY_KEYS,
  FORBIDDEN_BIOMETRIC_KEY_FRAGMENTS,
  isForbiddenBiometricKey,
  findBiometricKeys,
  assertNoBiometric,
  sanitizeProperties,
  // transport
  setScanAnalyticsTransport,
  resetScanAnalyticsTransport,
  type ScanAnalyticsTransport,
  // emitters
  scanAnalytics,
  trackDisorderedEatingAnswered,
  trackConsentAccepted,
  trackResultsTabViewed,
  trackSettingsChanged,
  trackProcessingCompleted,
} from '@/lib/body-tracker/scan-analytics';

// ===========================================================================
// 1. The event-name catalog matches section 14 EXACTLY
// ===========================================================================

// The authoritative list from spec section 14. If section 14 changes, THIS list
// changes and the catalog must follow; the test fails loudly on any drift.
const SECTION_14_EVENTS = [
  'body_scan_dashboard_card_viewed',
  'onboarding_started',
  'onboarding_completed',
  'biometric_consent_viewed',
  'biometric_consent_accepted',
  'biometric_consent_declined',
  'disordered_eating_question_answered',
  'capture_started',
  'calibration_completed',
  'capture_step_completed',
  'capture_abandoned',
  'capture_retake',
  'quality_check_failed',
  'processing_started',
  'processing_completed',
  'processing_failed',
  'results_viewed',
  'results_tab_viewed',
  'compare_used',
  'pdf_export',
  'practitioner_share_enabled',
  'premium_paywall_shown',
  'premium_upgrade_clicked',
  'premium_upgrade_completed',
  'helix_event_emitted',
  'resource_card_viewed',
  'settings_changed',
  'inclusivity_waitlist_joined',
] as const;

describe('event-name catalog (section 14)', () => {
  it('exposes exactly the section 14 event set (no missing, no extra)', () => {
    expect(new Set(BODY_SCAN_EVENT_NAMES)).toEqual(new Set(SECTION_14_EVENTS));
    expect(BODY_SCAN_EVENT_NAMES).toHaveLength(SECTION_14_EVENTS.length);
  });

  it('every BODY_SCAN_EVENTS value equals its key (no typo in the constant)', () => {
    for (const [key, value] of Object.entries(BODY_SCAN_EVENTS)) {
      expect(value).toBe(key);
    }
  });

  it('has no duplicate event names', () => {
    expect(new Set(BODY_SCAN_EVENT_NAMES).size).toBe(BODY_SCAN_EVENT_NAMES.length);
  });
});

// ===========================================================================
// 2. The sanitizer / allow-list (the privacy crux)
// ===========================================================================

describe('sanitizeProperties (allow-list + value guard)', () => {
  it('passes a clean metadata payload through unchanged', () => {
    const clean = {
      tier: 1,
      is_premium: true,
      has_used_teaser: false,
      capture_mode: 'auto',
      device_model: 'iPhone',
      step_name: 'front',
      duration_seconds: 12,
      latency_seconds: 3,
      error_code: 'lighting',
      tab_name: 'composition',
      scan_count: 4,
      resource_type: 'frequency',
      setting_name: 'numbers_optional',
      new_value: true,
      consent_version: '2026-05-169b.1',
      model_improvement_opt_in: false,
      event_type: 'scan_complete',
      sku: 'premium_monthly',
      trigger_point: 'dashboard',
      requested_capability: 'seated',
      for_audience: 'consumer',
      answered: true,
      enabled: false,
    };
    expect(sanitizeProperties(clean)).toEqual(clean);
  });

  it('STRIPS a biometric field (body_fat_pct) from an otherwise clean payload', () => {
    const dirty = { tier: 1, tab_name: 'composition', body_fat_pct: 18.4 };
    const out = sanitizeProperties(dirty);
    expect(out).toEqual({ tier: 1, tab_name: 'composition' });
    expect('body_fat_pct' in out).toBe(false);
  });

  it('STRIPS weight/height/measurement/avatar/cycle/disordered-eating fields', () => {
    const dirty = {
      tier: 1,
      weight_kg: 80,
      height_cm: 180,
      waist_circ_cm: 86,
      lean_mass_kg: 60,
      visceral_fat_index: 7,
      avatar_parameters: 'x',
      cycle_phase: 'luteal',
      disordered_eating_response: 'currently',
      de_response: 'in_the_past',
      health_score: 72,
      biological_age: 40,
    };
    expect(sanitizeProperties(dirty)).toEqual({ tier: 1 });
  });

  it('drops any key NOT on the allow-list even if it is not a known biometric term', () => {
    const out = sanitizeProperties({ tier: 1, user_email: 'a@b.com', random_field: 'x' });
    expect(out).toEqual({ tier: 1 });
  });

  it('drops object / array values under an ALLOWED key (no biometric blob can ride in)', () => {
    const out = sanitizeProperties({
      tier: 1,
      new_value: { body_fat_pct: 18 } as unknown as string, // object under an allowed key
      error_code: [1, 2, 3] as unknown as string,           // array under an allowed key
    });
    expect(out).toEqual({ tier: 1 });
    expect('new_value' in out).toBe(false);
    expect('error_code' in out).toBe(false);
  });

  it('keeps null and boolean false (meaningful metadata), drops undefined', () => {
    const out = sanitizeProperties({ tier: null, is_premium: false, sku: undefined });
    expect(out).toEqual({ tier: null, is_premium: false });
    expect('sku' in out).toBe(false);
  });

  it('returns an empty object for undefined / empty input', () => {
    expect(sanitizeProperties(undefined)).toEqual({});
    expect(sanitizeProperties({})).toEqual({});
  });

  it('the sanitized result only ever has allow-listed keys', () => {
    const out = sanitizeProperties({
      tier: 1,
      body_fat_pct: 18,
      foo: 'bar',
      tab_name: 'measurements',
    });
    for (const key of Object.keys(out)) {
      expect(ALLOWED_PROPERTY_KEYS).toContain(key);
    }
  });
});

describe('isForbiddenBiometricKey / findBiometricKeys (block-list)', () => {
  it('flags a top-level biometric key (case-insensitive)', () => {
    expect(isForbiddenBiometricKey('body_fat_pct')).toBe(true);
    expect(isForbiddenBiometricKey('BodyFatPct')).toBe(true);
    expect(isForbiddenBiometricKey('weight_kg_at_scan')).toBe(true);
    expect(isForbiddenBiometricKey('waistCircCm')).toBe(true);
  });

  it('does NOT flag an allowed metadata key', () => {
    expect(isForbiddenBiometricKey('tier')).toBe(false);
    expect(isForbiddenBiometricKey('tab_name')).toBe(false);
    expect(isForbiddenBiometricKey('consent_version')).toBe(false);
  });

  it('finds a NESTED biometric key (deep scan)', () => {
    const hits = findBiometricKeys({ tier: 1, payload: { nested: { body_fat_pct: 18 } } });
    expect(hits).toContain('payload.nested.body_fat_pct');
  });

  it('finds a biometric key inside an array element', () => {
    const hits = findBiometricKeys({ scans: [{ measurement_id: 1 }] });
    expect(hits.some((h) => h.includes('measurement_id'))).toBe(true);
  });

  it('returns empty for a clean metadata payload', () => {
    expect(findBiometricKeys({ tier: 1, tab_name: 'composition', is_premium: true })).toEqual([]);
  });

  it('every forbidden fragment is itself detected as a forbidden key', () => {
    for (const frag of FORBIDDEN_BIOMETRIC_KEY_FRAGMENTS) {
      expect(isForbiddenBiometricKey(frag)).toBe(true);
    }
  });
});

describe('assertNoBiometric (loud tripwire)', () => {
  it('throws when a biometric field is present', () => {
    expect(() => assertNoBiometric({ tier: 1, body_fat_pct: 18 })).toThrow(/biometric/i);
  });

  it('throws on the disordered-eating response key', () => {
    expect(() => assertNoBiometric({ disordered_eating_response: 'currently' })).toThrow();
    expect(() => assertNoBiometric({ de_response: 'no' })).toThrow();
  });

  it('does NOT throw on a clean metadata payload', () => {
    expect(() => assertNoBiometric({ tier: 1, tab_name: 'composition' })).not.toThrow();
    expect(() => assertNoBiometric({})).not.toThrow();
  });
});

// ===========================================================================
// 3. Emitters route through the transport and shape only allowed metadata
// ===========================================================================

describe('emitters (route through the existing framework, metadata only)', () => {
  let calls: Array<{ event: string; props: Record<string, unknown> | undefined }>;
  let prev: ScanAnalyticsTransport;

  beforeEach(() => {
    calls = [];
    prev = setScanAnalyticsTransport((event, props) => {
      calls.push({ event, props });
    });
  });

  afterEach(() => {
    setScanAnalyticsTransport(prev);
    resetScanAnalyticsTransport();
    vi.restoreAllMocks();
  });

  it('disordered_eating_question_answered emits ONLY answered:true (never the response)', () => {
    trackDisorderedEatingAnswered();
    expect(calls).toHaveLength(1);
    expect(calls[0].event).toBe('disordered_eating_question_answered');
    expect(calls[0].props).toEqual({ answered: true });
    // The response value is not even a parameter; assert nothing response-like leaked.
    expect(findBiometricKeys(calls[0].props)).toEqual([]);
  });

  it('consent_accepted carries consent_version + model_improvement_opt_in only', () => {
    trackConsentAccepted({ consent_version: 'v1', model_improvement_opt_in: true });
    expect(calls[0].event).toBe('biometric_consent_accepted');
    expect(calls[0].props).toEqual({ consent_version: 'v1', model_improvement_opt_in: true });
  });

  it('results_tab_viewed carries only tab_name', () => {
    trackResultsTabViewed({ tab_name: 'composition' });
    expect(calls[0].event).toBe('results_tab_viewed');
    expect(calls[0].props).toEqual({ tab_name: 'composition' });
  });

  it('processing_completed carries a latency duration but NO result value', () => {
    // Even if a caller tried to pass a body-fat value, it is stripped.
    trackProcessingCompleted({ tier: 1, latency_seconds: 4, body_fat_pct: 18 } as never);
    expect(calls[0].event).toBe('processing_completed');
    expect(calls[0].props).toEqual({ tier: 1, latency_seconds: 4 });
    expect('body_fat_pct' in (calls[0].props ?? {})).toBe(false);
  });

  it('settings_changed for a sensitive toggle carries name + coarse enabled only', () => {
    trackSettingsChanged({ setting_name: 'cycle_phase_annotation_opt_in', enabled: true });
    expect(calls[0].event).toBe('settings_changed');
    expect(calls[0].props).toEqual({ setting_name: 'cycle_phase_annotation_opt_in', enabled: true });
  });

  it('settings_changed STRIPS a sensitive value passed as new_value if it is an object', () => {
    trackSettingsChanged({
      setting_name: 'numbers_optional',
      new_value: { cycle_phase: 'luteal' } as unknown as string,
    });
    expect(calls[0].props).toEqual({ setting_name: 'numbers_optional' });
  });

  it('the namespaced scanAnalytics object emits the same events', () => {
    scanAnalytics.dashboardCardViewed({ tier: 1, is_premium: false, has_used_teaser: false });
    scanAnalytics.captureStarted({ tier: 1, capture_mode: 'auto', device_model: 'Pixel' });
    scanAnalytics.pdfExport({ trigger_point: 'results_panel' });
    scanAnalytics.inclusivityWaitlistJoined({ requested_capability: 'seated' });
    expect(calls.map((c) => c.event)).toEqual([
      'body_scan_dashboard_card_viewed',
      'capture_started',
      'pdf_export',
      'inclusivity_waitlist_joined',
    ]);
    // No biometric key in any emitted payload.
    for (const c of calls) expect(findBiometricKeys(c.props)).toEqual([]);
  });

  it('EVERY emitter, fed a biometric field, never emits it (sanitized away)', () => {
    const biometricSpray = {
      tier: 1,
      body_fat_pct: 18,
      weight_kg: 80,
      height_cm: 180,
      waist_circ_cm: 86,
      avatar_parameters: 'x',
      cycle_phase: 'luteal',
      disordered_eating_response: 'currently',
    } as never;

    const emitters: Array<() => void> = [
      () => scanAnalytics.dashboardCardViewed(biometricSpray),
      () => scanAnalytics.onboardingStarted(biometricSpray),
      () => scanAnalytics.onboardingCompleted(biometricSpray),
      () => scanAnalytics.consentViewed(biometricSpray),
      () => scanAnalytics.consentAccepted(biometricSpray),
      () => scanAnalytics.consentDeclined(biometricSpray),
      () => scanAnalytics.disorderedEatingAnswered(),
      () => scanAnalytics.captureStarted(biometricSpray),
      () => scanAnalytics.calibrationCompleted(biometricSpray),
      () => scanAnalytics.captureStepCompleted(biometricSpray),
      () => scanAnalytics.captureAbandoned(biometricSpray),
      () => scanAnalytics.captureRetake(biometricSpray),
      () => scanAnalytics.qualityCheckFailed(biometricSpray),
      () => scanAnalytics.processingStarted(biometricSpray),
      () => scanAnalytics.processingCompleted(biometricSpray),
      () => scanAnalytics.processingFailed(biometricSpray),
      () => scanAnalytics.resultsViewed(biometricSpray),
      () => scanAnalytics.resultsTabViewed(biometricSpray),
      () => scanAnalytics.compareUsed(biometricSpray),
      () => scanAnalytics.pdfExport(biometricSpray),
      () => scanAnalytics.practitionerShareEnabled(biometricSpray),
      () => scanAnalytics.premiumPaywallShown(biometricSpray),
      () => scanAnalytics.premiumUpgradeClicked(biometricSpray),
      () => scanAnalytics.premiumUpgradeCompleted(biometricSpray),
      () => scanAnalytics.helixEventEmitted(biometricSpray),
      () => scanAnalytics.resourceCardViewed(biometricSpray),
      () => scanAnalytics.settingsChanged(biometricSpray),
      () => scanAnalytics.inclusivityWaitlistJoined(biometricSpray),
    ];

    for (const run of emitters) run();

    // One call per emitter, and NOT ONE carries a biometric key.
    expect(calls).toHaveLength(emitters.length);
    for (const c of calls) {
      expect(findBiometricKeys(c.props)).toEqual([]);
      // Every emitted key is allow-listed.
      for (const key of Object.keys(c.props ?? {})) {
        expect(ALLOWED_PROPERTY_KEYS).toContain(key);
      }
    }
  });

  it('analytics never throws even if the transport throws (infallible)', () => {
    setScanAnalyticsTransport(() => {
      throw new Error('transport down');
    });
    expect(() => scanAnalytics.resultsViewed({ tier: 1 })).not.toThrow();
  });
});
