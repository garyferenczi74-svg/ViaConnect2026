// Biometric / PII exclusion acceptance test (Prompt #171 Section 13, against the
// guarantee in Section 2.3). Companion to scan-analytics.test.ts: that file
// proves the event catalog + each emitter; THIS file is the standalone
// §13 acceptance that NO biometric or health value can reach an emitted
// analytics payload, asserted against the REAL guard in scan-analytics.ts.
//
// Reconciliation note (docs/operations/telemetry-architecture.md):
//   171 proposes PostHog as the analytics sink. PostHog is NOT wired (it is a
//   package.json / Gary-approval blocker). The same sanitizeProperties guard
//   sits in front of WHATEVER transport is installed, so this acceptance holds
//   for today's default analytics_events transport and carries over unchanged
//   when PostHog is later added. Event names are body_scan_ (not formavision_).
//
// We import the REAL exported functions and do NOT reimplement the guard.

import { describe, it, expect } from 'vitest';
import {
  sanitizeProperties,
  assertNoBiometric,
  findBiometricKeys,
  isForbiddenBiometricKey,
  ALLOWED_PROPERTY_KEYS,
  BODY_SCAN_EVENTS,
  type ScanEventProperties,
} from '@/lib/body-tracker/scan-analytics';

// ---------------------------------------------------------------------------
// The exact biometric / health keys §2.3 prohibits on any analytics payload.
// Sourced from 171 Section 2.3 (raw photos, silhouettes, avatar mesh, body
// composition, measurements in cm, weight/height, cycle, disordered-eating
// response, biological age). Every one must be absent after sanitize.
// ---------------------------------------------------------------------------
const PROHIBITED_BIOMETRIC_KEYS = [
  'body_fat_pct',
  'lean_mass_kg',
  'fat_mass_kg',
  'ffmi',
  'waist_circ_cm',
  'hip_circ_cm',
  'height_cm',
  'weight_kg',
  'silhouette_url',
  'avatar_mesh',
  'landmark_x',
  'photo_url',
  'image_data',
  'disordered_eating_response',
  'cycle_phase',
  'biological_age',
] as const;

// Genuinely-allowed metadata keys that MUST survive sanitize (from the real
// ALLOWED_PROPERTY_KEYS allow-list).
const ALLOWED_METADATA_SAMPLE = {
  tier: 'platinum_family', // real tier slug; the value rides through as a string primitive
  device_model: 'iPhone15,2',
  latency_seconds: 4.2,
  step_name: 'front',
} as const;

describe('scan-analytics PII / biometric exclusion (171 §2.3, §13 acceptance)', () => {
  // -------------------------------------------------------------------------
  // 1. sanitizeProperties STRIPS every prohibited biometric key and keeps ONLY
  //    the allow-listed metadata (the core §13 guarantee).
  // -------------------------------------------------------------------------
  describe('sanitizeProperties strips biometric/blocked keys, keeps allow-listed', () => {
    it('removes ALL §2.3 prohibited keys while preserving allowed metadata', () => {
      const payload: Record<string, unknown> = { ...ALLOWED_METADATA_SAMPLE };
      // Sneak in a representative value for every prohibited key.
      for (const k of PROHIBITED_BIOMETRIC_KEYS) {
        payload[k] = typeof k === 'string' && k.endsWith('_url') ? 'https://x/y.png' : 42;
      }

      const out = sanitizeProperties(payload);

      // The output is EXACTLY the allow-listed metadata, nothing else.
      expect(out).toEqual(ALLOWED_METADATA_SAMPLE);

      // Not one prohibited key survived.
      for (const k of PROHIBITED_BIOMETRIC_KEYS) {
        expect(k in out).toBe(false);
      }
    });

    it('every surviving key is on the real ALLOWED_PROPERTY_KEYS allow-list', () => {
      const payload: Record<string, unknown> = { ...ALLOWED_METADATA_SAMPLE };
      for (const k of PROHIBITED_BIOMETRIC_KEYS) payload[k] = 1;

      const out = sanitizeProperties(payload);
      for (const key of Object.keys(out)) {
        expect(ALLOWED_PROPERTY_KEYS).toContain(key);
      }
      // And the sanitized payload itself contains zero biometric keys.
      expect(findBiometricKeys(out)).toEqual([]);
    });

    it('each prohibited key is independently recognized as forbidden by the block-list', () => {
      // Confirms the strip is driven by the real block-list, not an accident of
      // the allow-list alone. (Belt-and-suspenders: both layers reject these.)
      for (const k of PROHIBITED_BIOMETRIC_KEYS) {
        expect(isForbiddenBiometricKey(k)).toBe(true);
        // None of them is on the allow-list either.
        expect(ALLOWED_PROPERTY_KEYS).not.toContain(k);
      }
    });
  });

  // -------------------------------------------------------------------------
  // 2. The VALUE guard: non-primitives are dropped, primitives are kept.
  // -------------------------------------------------------------------------
  describe('value guard drops non-primitives, keeps primitives', () => {
    it('drops object and array values (a biometric blob cannot ride under an allowed key)', () => {
      const out = sanitizeProperties({
        tier: 'gold', // primitive string survives
        // An object/array smuggled under ALLOWED keys: dropped by the value guard.
        new_value: { body_fat_pct: 18, lean_mass_kg: 60 } as unknown as string,
        error_code: ['waist_circ_cm', 'hip_circ_cm'] as unknown as string,
      });
      expect(out).toEqual({ tier: 'gold' });
      expect('new_value' in out).toBe(false);
      expect('error_code' in out).toBe(false);
    });

    it('keeps string, number, boolean, and null values on allowed keys', () => {
      const out = sanitizeProperties({
        tier: 'platinum', // string
        latency_seconds: 3.5, // number
        is_premium: true, // boolean
        new_value: false, // boolean false is meaningful
        consent_version: null, // null is kept
      });
      expect(out).toEqual({
        tier: 'platinum',
        latency_seconds: 3.5,
        is_premium: true,
        new_value: false,
        consent_version: null,
      });
    });
  });

  // -------------------------------------------------------------------------
  // 3. findBiometricKeys does a DEEP scan: a nested biometric key is caught.
  //    (Matches the real recursive visit() implementation in scan-analytics.ts.)
  // -------------------------------------------------------------------------
  describe('findBiometricKeys deep-scans nested structures', () => {
    it('catches a biometric key nested inside a child object (dotted path)', () => {
      const hits = findBiometricKeys({
        tier: 'free',
        result: { composition: { body_fat: 18.4 } },
      });
      expect(hits).toContain('result.composition.body_fat');
    });

    it('catches a biometric key inside an array element', () => {
      const hits = findBiometricKeys({
        scans: [{ measurement_id: 7 }, { tab_name: 'composition' }],
      });
      expect(hits.some((h) => h.includes('measurement_id'))).toBe(true);
    });

    it('returns empty for a clean, fully allow-listed payload', () => {
      expect(findBiometricKeys({ ...ALLOWED_METADATA_SAMPLE })).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // 4. assertNoBiometric THROWS on a biometric key (documented dev/test
  //    tripwire) and does NOT throw on a clean allow-listed payload.
  // -------------------------------------------------------------------------
  describe('assertNoBiometric tripwire', () => {
    it('throws when ANY prohibited biometric key is present', () => {
      for (const k of PROHIBITED_BIOMETRIC_KEYS) {
        expect(() => assertNoBiometric({ tier: 'gold', [k]: 1 })).toThrow(/biometric/i);
      }
    });

    it('throws on a nested biometric key', () => {
      expect(() =>
        assertNoBiometric({ tier: 'platinum', payload: { nested: { body_fat_pct: 18 } } }),
      ).toThrow();
    });

    it('does NOT throw on a clean, allow-listed metadata payload', () => {
      expect(() => assertNoBiometric({ ...ALLOWED_METADATA_SAMPLE })).not.toThrow();
      expect(() => assertNoBiometric({})).not.toThrow();
    });
  });

  // -------------------------------------------------------------------------
  // 5. Representative real events: a quality_check_failed and a
  //    processing_completed payload, each with legitimate metadata plus a
  //    sneaked-in body_fat_pct + a measurement value. After sanitize they are
  //    safe to transport: zero prohibited fields, only allow-listed keys.
  // -------------------------------------------------------------------------
  describe('representative real-event payloads are safe to transport after sanitize', () => {
    it('quality_check_failed: coarse error_code survives, biometrics stripped', () => {
      // Event name is the REAL body_scan_ catalog name (not formavision_).
      const eventName = BODY_SCAN_EVENTS.quality_check_failed;
      expect(eventName).toBe('quality_check_failed');

      const raw = {
        tier: 'gold',
        step_name: 'front',
        error_code: 'lighting', // coarse reason category, allowed
        // Sneaked-in prohibited values that a careless caller might attach:
        body_fat_pct: 18.4,
        waist_circ_cm: 86,
        silhouette_url: 'https://x/sil.png',
      };

      const safe: ScanEventProperties = sanitizeProperties(raw);

      expect(safe).toEqual({ tier: 'gold', step_name: 'front', error_code: 'lighting' });
      assertProhibitedAbsent(safe);
      // Provably safe to hand to a transport: the tripwire passes.
      expect(() => assertNoBiometric(safe)).not.toThrow();
    });

    it('processing_completed: latency_seconds survives, no result value leaks', () => {
      const eventName = BODY_SCAN_EVENTS.processing_completed;
      expect(eventName).toBe('processing_completed');

      const raw = {
        tier: 'platinum_family', // real tier slug
        is_premium: true,
        latency_seconds: 4.2, // a duration, allowed
        // The whole point of §2.3: NO composition result rides along.
        body_fat_pct: 17.9,
        lean_mass_kg: 61.2,
        avatar_mesh: 'base64...',
      };

      const safe = sanitizeProperties(raw);

      expect(safe).toEqual({ tier: 'platinum_family', is_premium: true, latency_seconds: 4.2 });
      assertProhibitedAbsent(safe);
      expect(() => assertNoBiometric(safe)).not.toThrow();
    });
  });
});

// Shared assertion: none of the §2.3 prohibited keys appears on a payload.
function assertProhibitedAbsent(payload: ScanEventProperties): void {
  for (const k of PROHIBITED_BIOMETRIC_KEYS) {
    expect(k in payload).toBe(false);
  }
  expect(findBiometricKeys(payload)).toEqual([]);
}
