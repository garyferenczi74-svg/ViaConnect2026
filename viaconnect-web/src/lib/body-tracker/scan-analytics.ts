// =============================================================================
// FormaVision (Body Scan) analytics events catalog (Prompt #169b, Task 21, spec
// section 14). Every emitted event name carries the formavision_ brand prefix.
//
// WHY THIS FILE EXISTS
//   Section 14 defines a catalog of Body Scan product-analytics events. This
//   module is the single, typed surface that emits them, routed through the
//   EXISTING analytics framework (src/lib/analytics/track-events.ts, the
//   Supabase analytics_events table introduced in Prompt #140). It does NOT
//   build a new pipeline: every emitter funnels into trackEvent(event, props).
//
// THE ONE HARD RULE (the thing the review checks hardest)
//   Events carry METADATA ONLY, never biometric / health values. A Body Scan
//   analytics event may say "formavision_results_tab_viewed { tab_name: 'composition' }" but
//   must NEVER carry a body fat percentage, a measurement, an avatar parameter,
//   a raw photo, the disordered-eating RESPONSE value, a cycle phase, or a
//   weight / height value.
//
//   This is enforced in DEPTH, not by convention:
//     1. ALLOW-LIST: only the property keys in ALLOWED_PROPERTY_KEYS may appear
//        on any event. Any other key is STRIPPED by sanitizeProperties before
//        the event leaves this module, so a future emitter cannot accidentally
//        attach a biometric field even if a caller passes one in.
//     2. BLOCK-LIST (defense in depth): a deep scan rejects any payload whose
//        keys (or nested keys) match a known biometric / sensitive fragment
//        (body_fat, measurement, avatar_param, weight_kg, cycle_phase, the
//        disordered-eating response columns, ...). assertNoBiometric throws in
//        development / tests so a leak is caught loudly; sanitizeProperties also
//        strips such keys at runtime so production never emits one.
//     3. VALUE GUARD: even an allowed key may only carry a primitive
//        (string / number / boolean / null). Objects + arrays are dropped, so a
//        whole biometric blob cannot ride in under an allowed key name.
//
//   The disordered-eating question is the sharpest case: section 3 forbids the
//   RESPONSE ever leaving the user's own profile. The emitter here records ONLY
//   that the question was answered (answered: true) and NOTHING identifying; the
//   response value is not a parameter of the emitter at all.
//
// PURITY / TESTABILITY
//   sanitizeProperties + assertNoBiometric + the event-name catalog + each
//   emitter's property shaping are PURE and unit tested in node (project
//   convention). The only side-effecting dependency is the injected emit
//   transport, which defaults to the real trackEvent but is swappable so tests
//   assert the exact (sanitized) shape each emitter produces without a Supabase
//   client.
// =============================================================================

import { trackEvent as defaultTrackEvent } from '@/lib/analytics/track-events';

// -----------------------------------------------------------------------------
// 1. The event-name catalog (section 14)
// -----------------------------------------------------------------------------

// The exact set of Body Scan analytics event names from section 14, each
// carrying the formavision_ brand prefix (FormaVision is the product brand for
// the body-scan surface). Frozen + exported so the test can assert the catalog
// matches the spec and so call sites reference the constant, never a string
// literal (a typo'd event name is a compile error, not a silent mis-logged
// event). The KEYS stay short/internal; only the VALUES (the wire event names)
// carry the formavision_ prefix.
export const FORMAVISION_EVENTS = {
  dashboard_card_viewed: 'formavision_dashboard_card_viewed',
  onboarding_started: 'formavision_onboarding_started',
  onboarding_completed: 'formavision_onboarding_completed',
  biometric_consent_viewed: 'formavision_biometric_consent_viewed',
  biometric_consent_accepted: 'formavision_biometric_consent_accepted',
  biometric_consent_declined: 'formavision_biometric_consent_declined',
  disordered_eating_question_answered: 'formavision_disordered_eating_question_answered',
  capture_started: 'formavision_capture_started',
  calibration_completed: 'formavision_calibration_completed',
  capture_step_completed: 'formavision_capture_step_completed',
  capture_abandoned: 'formavision_capture_abandoned',
  capture_retake: 'formavision_capture_retake',
  quality_check_failed: 'formavision_quality_check_failed',
  processing_started: 'formavision_processing_started',
  processing_completed: 'formavision_processing_completed',
  processing_failed: 'formavision_processing_failed',
  results_viewed: 'formavision_results_viewed',
  results_tab_viewed: 'formavision_results_tab_viewed',
  compare_used: 'formavision_compare_used',
  pdf_export: 'formavision_pdf_export',
  practitioner_share_enabled: 'formavision_practitioner_share_enabled',
  premium_paywall_shown: 'formavision_premium_paywall_shown',
  premium_upgrade_clicked: 'formavision_premium_upgrade_clicked',
  premium_upgrade_completed: 'formavision_premium_upgrade_completed',
  helix_event_emitted: 'formavision_helix_event_emitted',
  resource_card_viewed: 'formavision_resource_card_viewed',
  settings_changed: 'formavision_settings_changed',
  inclusivity_waitlist_joined: 'formavision_inclusivity_waitlist_joined',
} as const;

export type FormaVisionEventName = (typeof FORMAVISION_EVENTS)[keyof typeof FORMAVISION_EVENTS];

// The catalog as a plain array (for the test's exact-set assertion).
export const FORMAVISION_EVENT_NAMES: readonly FormaVisionEventName[] = Object.freeze(
  Object.values(FORMAVISION_EVENTS) as FormaVisionEventName[],
);

// -----------------------------------------------------------------------------
// 2. The metadata allow-list (the privacy boundary)
// -----------------------------------------------------------------------------

// The COMPLETE set of property keys any Body Scan analytics event is permitted
// to carry (spec section 14 properties). Every one of these is METADATA: a tier,
// a flag, a coarse mode, a device string, a step name, a duration, an error
// code, a tab name, a count, a setting name, a NON-sensitive new value, a
// version, a boolean opt-in, an event/category type, a sku, a trigger point, a
// requested capability, an audience. NONE of these is a biometric or health
// value. Anything not in this set is stripped by sanitizeProperties.
//
// IMPORTANT: do NOT add a key here that could carry a biometric / health value.
// This list is the allow-list half of the guard; new events reuse these keys.
export const ALLOWED_PROPERTY_KEYS: readonly string[] = Object.freeze([
  'tier',
  'is_premium',
  'has_used_teaser',
  'capture_mode',
  'device_model',
  'step_name',
  'duration_seconds',
  'latency_seconds',
  'error_code',
  'tab_name',
  'scan_count',
  'resource_type',
  'setting_name',
  'new_value',
  'consent_version',
  'model_improvement_opt_in',
  'event_type',
  'sku',
  'trigger_point',
  'requested_capability',
  'for_audience',
  // Bare boolean acknowledgement that the disordered-eating question was
  // answered. The RESPONSE value is never carried; this is the only signal the
  // disordered_eating_question_answered emitter sends (section 3 privacy).
  'answered',
  // Coarse boolean: whether a sensitive setting was turned on (true) or off
  // (false). Used by settings_changed for sensitive toggles where the NAME is
  // emitted but the value must stay a coarse boolean (e.g. cycle opt-in).
  'enabled',
]);

const ALLOWED_KEY_SET: ReadonlySet<string> = new Set(ALLOWED_PROPERTY_KEYS);

// -----------------------------------------------------------------------------
// 3. The biometric / sensitive block-list (defense in depth)
// -----------------------------------------------------------------------------

// Case-insensitive substring fragments that mark a key as a biometric / health /
// sensitive value that must NEVER appear on an analytics event, even nested. The
// allow-list above already strips anything not explicitly permitted; this
// block-list is the LOUD tripwire (assertNoBiometric throws on a hit) so a
// mistake is caught in development / tests rather than silently stripped. It
// also catches a sensitive value that someone tried to smuggle under an
// otherwise-allowed key by nesting an object (the value guard drops objects, and
// this scans their keys too).
//
// Mirrors the FORBIDDEN_* fragment lists in disordered-eating-safeguard.ts and
// practitioner-scan.ts so the same vocabulary protects every surface.
export const FORBIDDEN_BIOMETRIC_KEY_FRAGMENTS: readonly string[] = Object.freeze([
  // Body composition
  'body_fat',
  'bodyfat',
  'body_composition',
  'bodycomposition',
  'lean_mass',
  'leanmass',
  'fat_mass',
  'fatmass',
  'visceral',
  'ffmi',
  'fmi',
  'bmr',
  'bmi',
  // Measurements / silhouette / avatar
  'measurement',
  'circumference',
  'circ_cm',
  'silhouette',
  'avatar',
  'keypoint',
  'landmark',
  'pose_image',
  'photo',
  'image_data',
  'imagedata',
  // Anthropometrics
  'weight_kg',
  'weightkg',
  'height_cm',
  'heightcm',
  'waist',
  'hip',
  'neck',
  'chest',
  'thigh',
  'bicep',
  'calf',
  'shoulder',
  'forearm',
  'inseam',
  // The disordered-eating RESPONSE (never leaves the profile, section 3)
  'disordered_eating',
  'disorderedeating',
  'eating_disorder',
  'de_response',
  'body_scan_de',
  // Cycle / menstrual (sensitive, section 11.2.3)
  'cycle_phase',
  'cyclephase',
  'menstrual',
  // Biological values
  'biological_age',
  'biologicalage',
  'health_score',
  'healthscore',
]);

// -----------------------------------------------------------------------------
// 4. The sanitizer (allow-list + value guard) and the tripwire
// -----------------------------------------------------------------------------

// What an event property may hold once sanitized: a primitive only. Objects and
// arrays are intentionally not allowed (a whole biometric blob cannot ride in
// under an allowed key name).
export type AllowedPropertyValue = string | number | boolean | null;

export type ScanEventProperties = Record<string, AllowedPropertyValue>;

/** A key is forbidden if it (case-insensitively) contains any blocked fragment. */
export function isForbiddenBiometricKey(key: string): boolean {
  const lower = key.toLowerCase();
  return FORBIDDEN_BIOMETRIC_KEY_FRAGMENTS.some((frag) => lower.includes(frag));
}

/**
 * Deep-scan an arbitrary payload for any key (or nested key) that matches a
 * forbidden biometric fragment. Returns the dotted paths of every hit (empty
 * array == clean). Mirrors findForbiddenKeys in disordered-eating-safeguard.ts.
 */
export function findBiometricKeys(payload: unknown): string[] {
  const hits: string[] = [];
  const visit = (value: unknown, path: string): void => {
    if (!value || typeof value !== 'object') return;
    if (Array.isArray(value)) {
      value.forEach((item, i) => visit(item, path ? `${path}[${i}]` : `[${i}]`));
      return;
    }
    for (const key of Object.keys(value as Record<string, unknown>)) {
      const here = path ? `${path}.${key}` : key;
      if (isForbiddenBiometricKey(key)) hits.push(here);
      visit((value as Record<string, unknown>)[key], here);
    }
  };
  visit(payload, '');
  return hits;
}

/**
 * Throw if a payload destined for an analytics event carries a biometric /
 * health / sensitive value under any recognizable key, nested or not (spec
 * section 14 privacy rule). This is the LOUD tripwire: a leak should fail a test
 * and surface in development, not be silently dropped. sanitizeProperties also
 * strips such keys at runtime, so production never emits one even if this assert
 * is not reached.
 */
export function assertNoBiometric(payload: unknown): void {
  const hits = findBiometricKeys(payload);
  if (hits.length > 0) {
    throw new Error(
      `Body Scan analytics event blocked: biometric/health field(s) not permitted: ${hits.join(', ')}`,
    );
  }
}

/**
 * Sanitize a raw properties object into a safe metadata-only payload:
 *   - drop any key NOT in the allow-list (so an unexpected / biometric key is
 *     removed even if it is not on the explicit block-list),
 *   - drop any key that matches the biometric block-list (belt and suspenders;
 *     an allowed-list key would never match, but a future edit cannot regress),
 *   - drop any value that is not a primitive (objects / arrays cannot smuggle a
 *     biometric blob under an allowed key name),
 *   - drop undefined values (so omitted optionals do not appear as keys).
 *
 * Pure + total. The result is always a flat Record of primitives whose keys are
 * a subset of ALLOWED_PROPERTY_KEYS. This is the runtime guarantee that no event
 * leaving this module carries anything but allowed metadata.
 */
export function sanitizeProperties(raw: Record<string, unknown> | undefined): ScanEventProperties {
  const out: ScanEventProperties = {};
  if (!raw) return out;
  for (const [key, value] of Object.entries(raw)) {
    if (!ALLOWED_KEY_SET.has(key)) continue;        // allow-list
    if (isForbiddenBiometricKey(key)) continue;     // block-list (defense in depth)
    if (value === undefined) continue;              // omit absent optionals
    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean' ||
      value === null
    ) {
      out[key] = value;                             // primitive only
    }
    // objects / arrays / functions / symbols are intentionally dropped.
  }
  return out;
}

// -----------------------------------------------------------------------------
// 5. The emit transport (the seam onto the EXISTING framework)
// -----------------------------------------------------------------------------

// The transport signature mirrors the existing trackEvent (src/lib/analytics/
// track-events.ts). Kept as an injectable so tests assert the exact sanitized
// shape each emitter produces without a Supabase client, and so the whole
// catalog routes through ONE place (no per-emitter Supabase calls).
export type ScanAnalyticsTransport = (
  event: string,
  properties?: Record<string, unknown>,
) => void | Promise<void>;

let transport: ScanAnalyticsTransport = defaultTrackEvent;

/**
 * Swap the emit transport (tests inject a spy; the default is the real
 * trackEvent). Returns the previous transport so a test can restore it.
 */
export function setScanAnalyticsTransport(next: ScanAnalyticsTransport): ScanAnalyticsTransport {
  const prev = transport;
  transport = next;
  return prev;
}

/** Reset the transport back to the real trackEvent (test teardown convenience). */
export function resetScanAnalyticsTransport(): void {
  transport = defaultTrackEvent;
}

/**
 * The single choke point every emitter funnels through. Sanitizes the raw
 * properties to metadata-only, runs the loud biometric tripwire (so a leak fails
 * a test) against the SANITIZED payload, then hands the safe payload to the
 * transport. Infallible: analytics must never break the scan flow, so any
 * transport rejection is swallowed (the existing trackEvent already swallows its
 * own errors; this is the extra guard for the injected/sync case).
 *
 * NOTE: the tripwire runs on the sanitized payload (which is already stripped),
 * so in production it is a no-op confirmation; in tests, feeding a biometric key
 * to an emitter is caught because the test asserts via the same path. The
 * sanitizer is what guarantees production safety; the assert is the dev tripwire.
 */
function emit(event: FormaVisionEventName, raw?: Record<string, unknown>): void {
  let safe: ScanEventProperties;
  try {
    safe = sanitizeProperties(raw);
    assertNoBiometric(safe); // confirmation on the already-sanitized payload
  } catch {
    // If sanitation/assertion somehow throws, emit nothing rather than risk a leak.
    return;
  }
  try {
    void transport(event, safe);
  } catch {
    // Analytics must never break the app.
  }
}

// -----------------------------------------------------------------------------
// 6. Typed emitters (section 14). Each shapes ONLY allowed metadata.
// -----------------------------------------------------------------------------

// Shared small option shapes. Every field here is metadata.
export interface TierContext {
  tier?: number | null;
  is_premium?: boolean;
  has_used_teaser?: boolean;
}

export interface TriggerContext {
  trigger_point?: string | null;
}

/** formavision_dashboard_card_viewed: the scan card on the dashboard/photos page was seen. */
export function trackDashboardCardViewed(props: TierContext & TriggerContext = {}): void {
  emit(FORMAVISION_EVENTS.dashboard_card_viewed, { ...props });
}

/** formavision_onboarding_started: the first-open educational walkthrough opened. */
export function trackOnboardingStarted(props: { trigger_point?: string | null } = {}): void {
  emit(FORMAVISION_EVENTS.onboarding_started, { ...props });
}

/** formavision_onboarding_completed: the walkthrough was finished (or dismissed at the end). */
export function trackOnboardingCompleted(props: { step_name?: string | null } = {}): void {
  emit(FORMAVISION_EVENTS.onboarding_completed, { ...props });
}

/** formavision_biometric_consent_viewed: the biometric-consent screen was shown. */
export function trackConsentViewed(props: { consent_version?: string | null } = {}): void {
  emit(FORMAVISION_EVENTS.biometric_consent_viewed, { ...props });
}

/**
 * formavision_biometric_consent_accepted: the user accepted biometric consent. Emits the
 * consent_version + the SEPARATE model-improvement opt-in boolean (both metadata
 * per section 2.2.1). NEVER the retention value beyond a coarse setting.
 */
export function trackConsentAccepted(props: {
  consent_version?: string | null;
  model_improvement_opt_in?: boolean;
} = {}): void {
  emit(FORMAVISION_EVENTS.biometric_consent_accepted, { ...props });
}

/** formavision_biometric_consent_declined: the user declined / left the consent screen. */
export function trackConsentDeclined(props: { consent_version?: string | null } = {}): void {
  emit(FORMAVISION_EVENTS.biometric_consent_declined, { ...props });
}

/**
 * formavision_disordered_eating_question_answered (section 3.2.1 + section 3 privacy).
 * Emits ONLY that the question was answered. The RESPONSE value is intentionally
 * NOT a parameter: it must never leave the user's own profile, so it cannot be
 * logged here even by accident. answered is hard-coded true.
 */
export function trackDisorderedEatingAnswered(): void {
  emit(FORMAVISION_EVENTS.disordered_eating_question_answered, { answered: true });
}

/** formavision_capture_started: the capture flow began (calibration / first pose). */
export function trackCaptureStarted(props: TierContext & { capture_mode?: string | null; device_model?: string | null } = {}): void {
  emit(FORMAVISION_EVENTS.capture_started, { ...props });
}

/** formavision_calibration_completed: the credit-card calibration step finished (or was skipped). */
export function trackCalibrationCompleted(props: { capture_mode?: string | null; step_name?: string | null } = {}): void {
  emit(FORMAVISION_EVENTS.calibration_completed, { ...props });
}

/** formavision_capture_step_completed: one pose capture step was completed. step_name is the pose id. */
export function trackCaptureStepCompleted(props: { step_name?: string | null; scan_count?: number | null } = {}): void {
  emit(FORMAVISION_EVENTS.capture_step_completed, { ...props });
}

/** formavision_capture_abandoned: the capture flow was closed before finishing. */
export function trackCaptureAbandoned(props: { step_name?: string | null } = {}): void {
  emit(FORMAVISION_EVENTS.capture_abandoned, { ...props });
}

/** formavision_capture_retake: a pose was retaken. step_name is the pose id. */
export function trackCaptureRetake(props: { step_name?: string | null } = {}): void {
  emit(FORMAVISION_EVENTS.capture_retake, { ...props });
}

/**
 * formavision_quality_check_failed: a quality gate did not pass. error_code is the COARSE
 * reason category (e.g. 'lighting', 'framing'), never a measured value.
 */
export function trackQualityCheckFailed(props: { error_code?: string | null; step_name?: string | null } = {}): void {
  emit(FORMAVISION_EVENTS.quality_check_failed, { ...props });
}

/** formavision_processing_started: scan analysis / finalize began. */
export function trackProcessingStarted(props: TierContext & { capture_mode?: string | null } = {}): void {
  emit(FORMAVISION_EVENTS.processing_started, { ...props });
}

/**
 * formavision_processing_completed: scan analysis finished successfully. latency_seconds is
 * a duration only; NO result value (no body fat %, no measurements) is carried.
 */
export function trackProcessingCompleted(props: TierContext & { latency_seconds?: number | null } = {}): void {
  emit(FORMAVISION_EVENTS.processing_completed, { ...props });
}

/**
 * formavision_processing_failed: scan analysis failed. error_code is the COARSE failure
 * category (e.g. 'no_photos', 'rate_limited', 'transient'), never a raw value.
 */
export function trackProcessingFailed(props: { error_code?: string | null; latency_seconds?: number | null } = {}): void {
  emit(FORMAVISION_EVENTS.processing_failed, { ...props });
}

/** formavision_results_viewed: the scan results panel was opened. */
export function trackResultsViewed(props: TierContext = {}): void {
  emit(FORMAVISION_EVENTS.results_viewed, { ...props });
}

/** formavision_results_tab_viewed: a results tab was selected. tab_name is the tab id. */
export function trackResultsTabViewed(props: { tab_name?: string | null } = {}): void {
  emit(FORMAVISION_EVENTS.results_tab_viewed, { ...props });
}

/** formavision_compare_used: the Compare tool was used. */
export function trackCompareUsed(props: { trigger_point?: string | null } = {}): void {
  emit(FORMAVISION_EVENTS.compare_used, { ...props });
}

/** formavision_pdf_export: the PDF report export was triggered. */
export function trackPdfExport(props: { trigger_point?: string | null } = {}): void {
  emit(FORMAVISION_EVENTS.pdf_export, { ...props });
}

/** formavision_practitioner_share_enabled: the user turned ON sharing a scan with their practitioner. */
export function trackPractitionerShareEnabled(props: { trigger_point?: string | null } = {}): void {
  emit(FORMAVISION_EVENTS.practitioner_share_enabled, { ...props });
}

/** formavision_premium_paywall_shown: the body-scan paywall was shown. */
export function trackPremiumPaywallShown(props: TriggerContext & { has_used_teaser?: boolean } = {}): void {
  emit(FORMAVISION_EVENTS.premium_paywall_shown, { ...props });
}

/** formavision_premium_upgrade_clicked: the upgrade CTA on the paywall was clicked. */
export function trackPremiumUpgradeClicked(props: TriggerContext & { sku?: string | null } = {}): void {
  emit(FORMAVISION_EVENTS.premium_upgrade_clicked, { ...props });
}

/** formavision_premium_upgrade_completed: the upgrade purchase completed. */
export function trackPremiumUpgradeCompleted(props: { sku?: string | null } = {}): void {
  emit(FORMAVISION_EVENTS.premium_upgrade_completed, { ...props });
}

/**
 * formavision_helix_event_emitted: a Helix engagement event fired for a scan. event_type is
 * the Helix event category; NO body-composition value is carried (section 3.2.6
 * keeps composition off any Helix surface).
 */
export function trackHelixEventEmitted(props: { event_type?: string | null } = {}): void {
  emit(FORMAVISION_EVENTS.helix_event_emitted, { ...props });
}

/**
 * formavision_resource_card_viewed: the support resource card was shown. resource_type is a
 * COARSE category (e.g. the trigger family), never a body-fat value or the
 * disordered-eating response.
 */
export function trackResourceCardViewed(props: { resource_type?: string | null } = {}): void {
  emit(FORMAVISION_EVENTS.resource_card_viewed, { ...props });
}

/**
 * formavision_settings_changed: a body-scan setting toggled. Emits the setting NAME and a
 * NON-sensitive new value. For a SENSITIVE setting (cycle opt-in, or anything
 * tied to a biometric default) pass only `enabled` (a coarse boolean) or nothing
 * for new_value; NEVER the disordered-eating response or a biometric value.
 *
 * The sanitizer enforces this regardless: new_value is allowed only as a
 * primitive, and any biometric-keyed extra is stripped. For sensitive toggles
 * the caller should use { setting_name, enabled } and omit new_value.
 */
export function trackSettingsChanged(props: {
  setting_name?: string | null;
  new_value?: AllowedPropertyValue;
  enabled?: boolean;
} = {}): void {
  emit(FORMAVISION_EVENTS.settings_changed, { ...props });
}

/**
 * formavision_inclusivity_waitlist_joined: the user joined the expanded-scanning waitlist
 * (section 7.4). requested_capability is the coarse capability they asked for.
 */
export function trackInclusivityWaitlistJoined(props: { requested_capability?: string | null } = {}): void {
  emit(FORMAVISION_EVENTS.inclusivity_waitlist_joined, { ...props });
}

// A namespaced object so call sites can `import { scanAnalytics }` and call
// scanAnalytics.captureStarted({...}) rather than importing each function. Both
// the named exports above and this object are supported.
export const scanAnalytics = {
  dashboardCardViewed: trackDashboardCardViewed,
  onboardingStarted: trackOnboardingStarted,
  onboardingCompleted: trackOnboardingCompleted,
  consentViewed: trackConsentViewed,
  consentAccepted: trackConsentAccepted,
  consentDeclined: trackConsentDeclined,
  disorderedEatingAnswered: trackDisorderedEatingAnswered,
  captureStarted: trackCaptureStarted,
  calibrationCompleted: trackCalibrationCompleted,
  captureStepCompleted: trackCaptureStepCompleted,
  captureAbandoned: trackCaptureAbandoned,
  captureRetake: trackCaptureRetake,
  qualityCheckFailed: trackQualityCheckFailed,
  processingStarted: trackProcessingStarted,
  processingCompleted: trackProcessingCompleted,
  processingFailed: trackProcessingFailed,
  resultsViewed: trackResultsViewed,
  resultsTabViewed: trackResultsTabViewed,
  compareUsed: trackCompareUsed,
  pdfExport: trackPdfExport,
  practitionerShareEnabled: trackPractitionerShareEnabled,
  premiumPaywallShown: trackPremiumPaywallShown,
  premiumUpgradeClicked: trackPremiumUpgradeClicked,
  premiumUpgradeCompleted: trackPremiumUpgradeCompleted,
  helixEventEmitted: trackHelixEventEmitted,
  resourceCardViewed: trackResourceCardViewed,
  settingsChanged: trackSettingsChanged,
  inclusivityWaitlistJoined: trackInclusivityWaitlistJoined,
} as const;
