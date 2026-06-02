// =============================================================================
// telemetry-event-relay Edge Function (Prompt #171, spec section 12 + 14)
// =============================================================================
// A single, PII-guarded choke point for SERVER-SIDE body-scan telemetry,
// mirroring the client emit() in src/lib/body-tracker/scan-analytics.ts.
//
// WHY THIS EXISTS
//   Section 12 calls for one trusted-backend relay so other edge functions
//   (e.g. body-scan-analyze) can record a body_scan_ analytics event server-side
//   WITHOUT each function re-implementing the privacy guard. This function is
//   that choke point: it validates the event name against the section 14 catalog,
//   sanitizes the properties to metadata-only (the same 3-layer guard the client
//   uses), and writes a row to the EXISTING public.analytics_events table
//   (introduced in Prompt #140, shared with the client trackEvent).
//
// TRUST MODEL (the thing the security review checks hardest)
//   This is NOT a public client endpoint. It is a trusted-backend relay called by
//   OTHER edge functions, which already run as service_role. So the only accepted
//   caller is one presenting the service_role key as the bearer token. A non
//   service-role caller (any consumer JWT, an anon key, a missing/garbage token)
//   is rejected with 401 BEFORE any work. The service-role key is a server-only
//   secret; a browser never holds it, so this endpoint is not reachable from a
//   client even though edge functions are publicly routable.
//
// THE ONE HARD PRIVACY RULE (mirrors scan-analytics.ts)
//   A server event can NEVER carry biometric / health data (body fat,
//   measurements, weight, images, silhouette, avatar, SNPs, the disordered-eating
//   response, cycle phase, ...). This is enforced in DEPTH by the same 3 layers
//   the client uses, reimplemented inline below (Deno cannot import the Next.js
//   client module). See the IN-SYNC comments on each layer.
//
// FAIL-OPEN (section 14 edge-function rules)
//   Telemetry must NEVER block or break a scan. Every failure path (bad auth is
//   the one exception, since a wrong caller is a real error to surface) returns a
//   small ok/skipped JSON and swallows the error after a structured log line. A
//   DB timeout, a malformed body, an unknown event, or an insert error all return
//   200 { ok:false, skipped:'<reason>' } so the calling edge function treats this
//   as fire-and-forget and continues. The only non-200 is 401 for a non
//   service-role caller (a programming/deployment error, not a runtime telemetry
//   hiccup).
// =============================================================================

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { withTimeout } from '../_shared/with-timeout.ts';
import { safeLog } from '../_shared/safe-log.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Fire-and-forget: a DB insert that hangs must never delay the caller's scan.
const DB_TIMEOUT_MS = 4_000;

const SCOPE = 'edge-function.telemetry-event-relay';

// -----------------------------------------------------------------------------
// 1. The body_scan_ event-name catalog (spec section 14)
// -----------------------------------------------------------------------------
// MUST STAY IN SYNC WITH src/lib/body-tracker/scan-analytics.ts BODY_SCAN_EVENTS.
// Deno cannot import the Next.js client module, so these names are MIRRORED here.
// When an event is added/renamed/removed in scan-analytics.ts, mirror the change
// here (and vice versa). An event not in this set is rejected (skipped), so a
// typo'd or off-catalog server event is never written.
const BODY_SCAN_EVENT_NAMES: ReadonlySet<string> = new Set([
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
]);

// -----------------------------------------------------------------------------
// 2. The metadata allow-list (the privacy boundary)
// -----------------------------------------------------------------------------
// MUST STAY IN SYNC WITH scan-analytics.ts ALLOWED_PROPERTY_KEYS (the 17-plus key
// allow-list). Every key here is METADATA (a tier, a flag, a coarse mode, a step
// name, a duration, an error code, a tab name, a count, a setting name, a NON
// sensitive new value, a version, a boolean opt-in, an event/category type, a
// sku, a trigger point, a requested capability, an audience, plus the two coarse
// booleans answered/enabled). NONE is a biometric or health value. Any key not in
// this set is stripped. Do NOT add a key that could carry a biometric/health
// value. MIRRORED from the client; keep both lists identical.
const ALLOWED_KEY_SET: ReadonlySet<string> = new Set([
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
  // Bare boolean acknowledgement that the disordered-eating question was answered
  // (the RESPONSE value is never carried; section 3 privacy).
  'answered',
  // Coarse boolean: whether a sensitive setting was turned on/off.
  'enabled',
]);

// -----------------------------------------------------------------------------
// 3. The biometric / sensitive block-list (defense in depth)
// -----------------------------------------------------------------------------
// MUST STAY IN SYNC WITH scan-analytics.ts FORBIDDEN_BIOMETRIC_KEY_FRAGMENTS.
// Case-insensitive substring fragments that mark a key as a biometric / health /
// sensitive value that must NEVER appear on an analytics event, even nested. The
// allow-list above already strips anything not explicitly permitted; this
// block-list is belt-and-suspenders so a future edit cannot regress a biometric
// key in under an allowed name. MIRRORED from the client; keep both lists
// identical.
const FORBIDDEN_BIOMETRIC_KEY_FRAGMENTS: readonly string[] = [
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
];

/** A key is forbidden if it (case-insensitively) contains any blocked fragment. */
function isForbiddenBiometricKey(key: string): boolean {
  const lower = key.toLowerCase();
  return FORBIDDEN_BIOMETRIC_KEY_FRAGMENTS.some((frag) => lower.includes(frag));
}

type AllowedPropertyValue = string | number | boolean | null;

/**
 * Sanitize a raw properties object into a safe metadata-only payload. Mirrors
 * sanitizeProperties in scan-analytics.ts EXACTLY (allow-list -> block-list ->
 * primitives-only -> drop undefined). Pure + total; the result is always a flat
 * Record of primitives whose keys are a subset of ALLOWED_KEY_SET. This is the
 * runtime guarantee that no server event carries anything but allowed metadata.
 * It fails TOWARD dropping a field (a key it is unsure about is dropped, never
 * passed through), so it can never leak a biometric value.
 */
function sanitizeProperties(
  raw: Record<string, unknown> | undefined | null,
): Record<string, AllowedPropertyValue> {
  const out: Record<string, AllowedPropertyValue> = {};
  if (!raw || typeof raw !== 'object') return out;
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
    // objects / arrays / functions / symbols are intentionally dropped, so a whole
    // biometric blob cannot ride in under an allowed key name.
  }
  return out;
}

// -----------------------------------------------------------------------------
// 4. Plumbing (Supabase admin client + response shape, matching the project)
// -----------------------------------------------------------------------------

function corsHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: corsHeaders() });
}

function admin(): SupabaseClient {
  return createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

interface TelemetryRelayRequest {
  event: string;
  properties?: Record<string, unknown>;
  sessionId?: string;
  userId?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders() });
  if (req.method !== 'POST') return json({ ok: false, skipped: 'method_not_allowed' }, 405);

  // -- AUTH: service_role bearer ONLY ------------------------------------------
  // This relay is a trusted-backend choke point called by other edge functions,
  // which run as service_role. The ONLY accepted caller presents the service_role
  // key as the bearer token. A non service-role caller (consumer JWT, anon key,
  // missing/garbage token) is rejected here, before any work. This is the one
  // path that returns a real error code (401) rather than failing open, because a
  // wrong caller is a deployment/programming error, not a runtime telemetry hiccup.
  //
  // The comparison is a direct equality against a server-only secret (SERVICE_KEY
  // never reaches a browser; it is a high-entropy key, so timing-attack resistance
  // over network jitter is not a practical concern, matching the bearer-token
  // checks in the other edge functions). If the key is unset at deploy time the
  // relay cannot authenticate anyone and rejects all callers (fail-closed on auth).
  const auth = req.headers.get('authorization') ?? '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (!SERVICE_KEY || !token || token !== SERVICE_KEY) {
    safeLog.warn(SCOPE, 'rejected non service-role caller', {
      stage: 'auth',
      has_token: token.length > 0,
    });
    return json({ ok: false, error: 'unauthorized' }, 401);
  }

  // -- Everything below FAILS OPEN: a telemetry write must never block a scan. --
  let body: TelemetryRelayRequest;
  try {
    body = await req.json();
  } catch {
    safeLog.info(SCOPE, 'skipped: invalid json body', { stage: 'parse' });
    return json({ ok: false, skipped: 'invalid_body' });
  }

  const event = typeof body?.event === 'string' ? body.event : '';

  // VALIDATE: only a known body_scan_ catalog event is written. Unknown -> skip.
  if (!event || !BODY_SCAN_EVENT_NAMES.has(event)) {
    safeLog.info(SCOPE, 'skipped: unknown event name', {
      stage: 'validate',
      event: event || null,
    });
    return json({ ok: false, skipped: 'unknown_event' });
  }

  // SANITIZE: strip to metadata-only via the 3-layer guard (in sync with client).
  const safeProperties = sanitizeProperties(body.properties);

  // user_id / session_id are optional. user_id must be a string (a uuid the
  // caller already resolved); a non-string is dropped to null so a bad value can
  // never violate the analytics_events.user_id FK and fail the insert. The values
  // here are identifiers/metadata only, never biometric.
  const userId    = typeof body.userId === 'string' && body.userId ? body.userId : null;
  const sessionId = typeof body.sessionId === 'string' && body.sessionId ? body.sessionId : null;

  // WRITE: insert into public.analytics_events. device/page are null for a server
  // event (no browser context). timestamp now() is applied by the column default,
  // but we set it explicitly to match the client trackEvent write shape.
  try {
    const sa = admin();
    const { error } = await withTimeout(
      sa.from('analytics_events').insert({
        user_id: userId,
        event,
        properties: safeProperties,
        timestamp: new Date().toISOString(),
        page: null,
        device: null,
        session_id: sessionId,
      } as never),
      DB_TIMEOUT_MS,
      `${SCOPE}.insert`,
    );

    if (error) {
      // FAIL OPEN: log and return ok=false; never throw to the calling function.
      safeLog.error(SCOPE, 'analytics_events insert failed', {
        stage: 'write',
        event,
        error: error.message,
      });
      return json({ ok: false, skipped: 'write_failed' });
    }

    safeLog.info(SCOPE, 'event recorded', {
      stage: 'write',
      event,
      has_user_id: userId !== null,
      property_count: Object.keys(safeProperties).length,
    });
    return json({ ok: true });
  } catch (e) {
    // FAIL OPEN: a timeout or any unexpected throw is swallowed. The scan that
    // called this relay is already complete and is never blocked by telemetry.
    safeLog.error(SCOPE, 'relay exception (failed open)', {
      stage: 'write',
      event,
      error: String(e),
    });
    return json({ ok: false, skipped: 'exception' });
  }
});
