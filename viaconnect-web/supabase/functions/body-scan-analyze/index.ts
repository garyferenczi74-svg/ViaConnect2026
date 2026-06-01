// =============================================================================
// body-scan-analyze Edge Function (Prompt #85c Phase B)
// =============================================================================
// Ephemeral 4-photo body composition analyzer. Photos arrive as base64 in the
// request body, are streamed to Claude Vision, and DISCARDED. Only the parsed
// body composition estimates are persisted to body_tracker_photo_scans.
//
// Distinct from arnold-vision-analyze (#86B) which works on stored photo
// sessions in the body-progress-photos bucket. This function intentionally
// does not touch storage.
//
// Request:  POST { photos: { front, back, left_side, right_side }, media_type? }
//           Bearer JWT required.
// Response: { status: 'complete', scan_id, scan_date, estimates }
//
// Prompt #169 Phase 1 additions (ADDITIVE ONLY):
//   - Optional inputs: quality_scores, calibration, fused_keypoints, tier,
//     device_model, device_os, depth_sensor_type, scan_reported_demographics.
//   - Persistence: body_scan_quality, body_scan_tier_log, body_scan_composition
//     (CI columns), calibration into body_photo_sessions.
//   - CAQ delta flag: checks assessment_results phase=1 demographics.
//   - Personal baseline drift: upserts body_scan_personal_baselines; outlier
//     flag appended to body_photo_sessions.quality_issues.
//   - Helix event: emitted by DB trigger (trg_emit_helix_body_scan_event);
//     NOT emitted directly from this function.
//   - All new logic is fail-open; the primary scan result is never blocked.
// =============================================================================

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { withAbortTimeout, withTimeout, isTimeoutError } from '../_shared/with-timeout.ts';
import { safeLog } from '../_shared/safe-log.ts';
import { getCircuitBreaker, isCircuitBreakerError } from '../_shared/circuit-breaker.ts';
import {
  persistQuality,
  persistTierLog,
  persistComposition,
  persistCalibration,
  checkAndFlagCaqDelta,
  updatePersonalBaseline,
  type Phase1Inputs,
  type QualityScores,
  type CalibrationInput,
  type FusedKeypoint,
  type ScanDemographics,
  type DepthSensorType,
} from './quality-persistence.ts';
import {
  resolveBodyScanEntitlement,
  verifyPractitionerManaged,
  resolveAgeGate,
  resolveScanFrequency,
  type BodyScanPremiumStatus,
} from './entitlement.ts';

const visionBreaker = getCircuitBreaker('claude-vision');

// Model-version stamp (Prompt #169b, Task 19, spec section 16.5). The CANONICAL
// source of these identifiers is src/lib/body-tracker/body-scan-model-versions.ts
// (CURRENT_MODEL_VERSIONS); this Deno edge function cannot import from the app
// src/ tree, so the values are MIRRORED here. Keep the two in sync: when an
// engine version is bumped in the canonical module, bump it here too. Stamped on
// the body_photo_sessions finalize so an older scan can surface a model-version
// badge once any engine changes. (composition_engine omits the visual blend
// detail of the in-app pipeline because this ephemeral path is Claude-vision-only,
// but the headline identifier is kept identical so the badge token matches.)
const CURRENT_MODEL_VERSIONS: Record<string, string> = {
  landmark: 'mediapipe-pose-lite-v1',
  composition_engine: 'navy+cunbae+visual-v1',
  calibration: 'credit-card-iso7810+tape-v1',
  measurement: 'silhouette-contour-v1',
};

const SUPABASE_URL  = Deno.env.get('SUPABASE_URL')!;
const ANON_KEY      = Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE_KEY   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANTHROPIC_KEY = Deno.env.get('ANTHROPIC_API_KEY') ?? '';
const VISION_MODEL  = Deno.env.get('ARNOLD_VISION_MODEL') ?? 'claude-sonnet-4-6';

// 8 MB per photo cap on the base64 string length (~6 MB of binary).
const MAX_PHOTO_BYTES = 8_000_000;
const VISION_TIMEOUT_MS = 60_000;

// Anthropic Vision accepts image/jpeg, image/png, image/gif, and image/webp.
// We allow the three common photographic formats and reject anything else
// at the boundary so an attacker cannot smuggle a non image media_type into
// the upstream call.
const ALLOWED_MEDIA_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

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

function userClient(jwt: string): SupabaseClient {
  return createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

const SYSTEM_PROMPT = `You are analyzing 4 body photos (front, back, left side, right side) to estimate body composition.

Based on visible body proportions, muscle definition, fat distribution patterns, and body geometry, provide your best estimates for:

1. Estimated body fat percentage (range, e.g. 18 to 22 percent)
2. Body type classification (ectomorph, mesomorph, endomorph, or combination)
3. Visible muscle development rating per region (arms, chest, back, core, legs) on a 1 to 5 scale
4. Fat distribution pattern (android, gynoid, or balanced)
5. Estimated waist to hip ratio (range from visible proportions)
6. Confidence level (low, medium, high)

CRITICAL RULES:
- These are ESTIMATES only. Always present body fat and waist to hip as RANGES, never exact numbers.
- Photo-based estimation has significant limitations versus clinical measurement; reflect this in confidence.
- Never make health diagnoses from photos.
- Never reference Semaglutide, Ozempic, Wegovy, or Rybelsus.
- Never reference non FarmCeutica supplement brands.
- Never use the bioavailability range "5 to 27" or "5x to 27x"; only "10x to 28x" is approved.

Respond ONLY in JSON, no preamble, no markdown fences, with EXACTLY this shape:
{
  "estimated_body_fat_min": <number>,
  "estimated_body_fat_max": <number>,
  "body_type": "<string>",
  "fat_distribution": "android" | "gynoid" | "balanced",
  "estimated_whr_min": <number>,
  "estimated_whr_max": <number>,
  "muscle_development": {
    "arms": <1-5>,
    "chest": <1-5>,
    "back": <1-5>,
    "core": <1-5>,
    "legs": <1-5>
  },
  "ai_confidence": "low" | "medium" | "high"
}`;

interface BodyScanRequest {
  photos: {
    front: string;
    back: string;
    left_side: string;
    right_side: string;
  };
  media_type?: string;
  // --- Prompt #169 Phase 1 optional fields ---
  // Pre-computed client-side by T3/T4 libs. All optional; absence = no-op.
  quality_scores?:           QualityScores;
  calibration?:              CalibrationInput;
  fused_keypoints?:          FusedKeypoint[];
  tier?:                     1 | 2 | 3;
  device_model?:             string;
  device_os?:                string;
  depth_sensor_type?:        DepthSensorType;
  scan_reported_demographics?: ScanDemographics | null;
  // --- Prompt #169a premium gating fields ---
  // session_id: the body_photo_sessions row this scan finalizes. When present,
  //   the premium status is stamped on it and scan_status is set to 'complete'
  //   (which fires the Helix trigger). Absent in the legacy ephemeral flow.
  // patient_user_id: the scan subject when a practitioner finalizes a scan on
  //   behalf of a managed patient. The practitioner-managed bypass is granted
  //   ONLY after server-side verification (verifyPractitionerManaged) confirms
  //   an active practitioner relationship between the authenticated caller and
  //   this patient. Absent / unverified => normal consumer premium/teaser path.
  session_id?:               string;
  patient_user_id?:          string;
  // --- Prompt #169b age gate (spec section 4.3) ---
  // clinical_override_reason: when a VERIFIED practitioner finalizes a scan for a
  //   managed patient who is a minor, this mandatory reason bypasses the age gate
  //   and is recorded on body_photo_sessions.clinical_override_reason. It is
  //   honored ONLY when verifyPractitionerManaged confirms the relationship; a
  //   consumer cannot self-supply it to defeat the age gate (a self-scan is never
  //   practitioner-managed). A blank/whitespace reason does not override.
  clinical_override_reason?: string;
  // --- Prompt #169b network resilience (Task 20, spec section 16.3) ---
  // processing_key: a DETERMINISTIC key derived client-side from the capture
  //   payload (session id + captured inputs) by computeProcessingKey in
  //   src/lib/body-tracker/pending-scan-sync.ts. The SAME capture always yields
  //   the SAME key, so a retried finalize (after an offline / network drop) can be
  //   deduped to the same scan idempotently. Optional + additive: the finalize is
  //   ALSO idempotent at the DB layer (the body_photo_sessions UPDATE is gated on
  //   scan_status not already 'complete'), so absence is safe; this key is the
  //   client-correlatable idempotency token for logging / future server dedup.
  processing_key?: string;
}

interface BodyScanEstimate {
  estimated_body_fat_min: number;
  estimated_body_fat_max: number;
  body_type: string;
  fat_distribution: string;
  estimated_whr_min: number;
  estimated_whr_max: number;
  muscle_development: Record<string, number>;
  ai_confidence: 'low' | 'medium' | 'high';
}

function extractJson(raw: string): unknown {
  let s = raw.trim();
  s = s.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  const first = s.indexOf('{');
  const last  = s.lastIndexOf('}');
  if (first >= 0 && last > first) s = s.slice(first, last + 1);
  return JSON.parse(s);
}

// MIRRORED GUARDRAIL — keep in sync with
// src/lib/agents/jeffery/guardrails.ts validateRecommendationText()
// and supabase/functions/arnold-vision-analyze/index.ts jefferyValidateAnalysisText.
// Returns null on pass, or a list of violation codes on block.
function jefferyValidateAnalysisText(text: string): string[] {
  const haystack = text.toLowerCase();
  const violations: string[] = [];

  const SEMAGLUTIDE = ['semaglutide', 'ozempic', 'wegovy', 'rybelsus'];
  const BLOCKED_BRANDS = [
    'thorne', 'pure encapsulations', 'designs for health', 'life extension', 'now foods',
  ];

  for (const t of SEMAGLUTIDE) {
    if (haystack.includes(t)) violations.push(`semaglutide:${t}`);
  }
  for (const b of BLOCKED_BRANDS) {
    if (haystack.includes(b)) violations.push(`non_farmceutica:${b}`);
  }
  if (/\b5\s*(?:to|\-|–)\s*27x?\b/i.test(text) || /\b5x?\s*to\s*27x?\b/i.test(text)) {
    violations.push('bioavailability_range');
  }
  return violations;
}

function collectAnalysisStrings(node: unknown, out: string[]): void {
  if (typeof node === 'string') {
    out.push(node);
  } else if (Array.isArray(node)) {
    for (const v of node) collectAnalysisStrings(v, out);
  } else if (node && typeof node === 'object') {
    for (const v of Object.values(node)) collectAnalysisStrings(v, out);
  }
}

function validateEstimate(parsed: unknown): BodyScanEstimate {
  if (!parsed || typeof parsed !== 'object') throw new Error('vision response not an object');
  const o = parsed as Record<string, unknown>;
  const num = (k: string) => {
    const v = o[k];
    if (typeof v !== 'number' || !Number.isFinite(v)) throw new Error(`field ${k} not a number`);
    return v;
  };
  const str = (k: string) => {
    const v = o[k];
    if (typeof v !== 'string' || !v) throw new Error(`field ${k} not a string`);
    return v;
  };
  const conf = str('ai_confidence');
  if (conf !== 'low' && conf !== 'medium' && conf !== 'high') {
    throw new Error('ai_confidence not low/medium/high');
  }
  const md = o.muscle_development;
  if (!md || typeof md !== 'object') throw new Error('muscle_development not an object');
  return {
    estimated_body_fat_min: num('estimated_body_fat_min'),
    estimated_body_fat_max: num('estimated_body_fat_max'),
    body_type: str('body_type'),
    fat_distribution: str('fat_distribution'),
    estimated_whr_min: num('estimated_whr_min'),
    estimated_whr_max: num('estimated_whr_max'),
    muscle_development: md as Record<string, number>,
    ai_confidence: conf,
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders() });
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);

  if (!ANTHROPIC_KEY) return json({ error: 'vision unavailable' }, 503);

  const auth = req.headers.get('authorization') ?? '';
  const jwt = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!jwt) return json({ error: 'unauthorized' }, 401);

  const sb = userClient(jwt);
  const { data: userData } = await sb.auth.getUser();
  const user = userData?.user;
  if (!user) return json({ error: 'unauthorized' }, 401);

  let body: BodyScanRequest;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'invalid body' }, 400);
  }

  const p = body?.photos;
  if (!p || !p.front || !p.back || !p.left_side || !p.right_side) {
    return json({ error: 'all 4 photos required' }, 400);
  }
  for (const pos of ['front', 'back', 'left_side', 'right_side'] as const) {
    if (p[pos].length > MAX_PHOTO_BYTES) {
      return json({ error: `photo ${pos} too large` }, 413);
    }
  }
  const mediaType = body.media_type ?? 'image/jpeg';
  if (!ALLOWED_MEDIA_TYPES.has(mediaType)) {
    return json({ error: 'unsupported media_type; allowed: image/jpeg, image/png, image/webp' }, 400);
  }

  // Cost monitoring: log the base64 payload size pre Anthropic call.
  // Vision pricing is dominated by image bytes, so this lets ops correlate
  // spend spikes to specific user_ids and photo dimensions.
  const totalBase64Bytes = p.front.length + p.back.length + p.left_side.length + p.right_side.length;
  safeLog.info('body-scan-analyze', 'egress', {
    user_id: user.id,
    media_type: mediaType,
    total_base64_bytes: totalBase64Bytes,
    per_photo_bytes: {
      front: p.front.length,
      back: p.back.length,
      left_side: p.left_side.length,
      right_side: p.right_side.length,
    },
  });

  let parsed: BodyScanEstimate;
  try {
    // ── PHI EGRESS POINT ──────────────────────────────────────────────────
    // The 4 base64 encoded body photos are PHI. Although they are NEVER
    // stored in Supabase or any bucket and are discarded immediately after
    // this fetch resolves, they still leave our infrastructure and reach
    // Anthropic. Production launch requires a signed Business Associate
    // Agreement (BAA) on file with Anthropic covering this ephemeral data
    // flow. Verify before enabling Body Scan in production (June 2026
    // launch). Mirrors the same disclosure on arnold-vision-analyze.
    // Owner: gary@farmceuticawellness.com.
    // ──────────────────────────────────────────────────────────────────────
    const apiResponse = await visionBreaker.execute(() =>
      withAbortTimeout(
        (signal) => fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': ANTHROPIC_KEY,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: VISION_MODEL,
            max_tokens: 1500,
            system: SYSTEM_PROMPT,
            messages: [{
              role: 'user',
              content: [
                { type: 'image', source: { type: 'base64', media_type: mediaType, data: p.front } },
                { type: 'image', source: { type: 'base64', media_type: mediaType, data: p.back } },
                { type: 'image', source: { type: 'base64', media_type: mediaType, data: p.left_side } },
                { type: 'image', source: { type: 'base64', media_type: mediaType, data: p.right_side } },
                { type: 'text', text: 'Analyze these 4 photos per the system instructions and respond ONLY in the specified JSON format.' },
              ],
            }],
          }),
          signal,
        }),
        VISION_TIMEOUT_MS,
        'edge-function.body-scan-analyze.claude-vision',
      ),
    );

    if (!apiResponse.ok) {
      const errText = await apiResponse.text().catch(() => '');
      throw new Error(`anthropic ${apiResponse.status}: ${errText.slice(0, 200)}`);
    }
    const visionJson = await apiResponse.json() as { content?: Array<{ type: string; text?: string }> };
    const text = visionJson.content?.find((c) => c.type === 'text')?.text ?? '';
    if (!text) throw new Error('empty vision response');

    parsed = validateEstimate(extractJson(text));

    // Guardrail: scan ALL parsed string values for compliance violations
    const collected: string[] = [];
    collectAnalysisStrings(parsed as unknown, collected);
    const violations = jefferyValidateAnalysisText(collected.join(' '));
    if (violations.length > 0) {
      safeLog.warn('body-scan-analyze', 'guardrail blocked', {
        user_id: user.id,
        violations,
      });
      return json({ error: 'analysis blocked by compliance guardrails' }, 502);
    }
  } catch (e) {
    if (isCircuitBreakerError(e)) {
      safeLog.warn('body-scan-analyze', 'breaker open', { user_id: user.id });
      return json({ error: 'vision rate limited; try again shortly' }, 503);
    }
    if (isTimeoutError(e)) {
      safeLog.warn('body-scan-analyze', 'timeout', { user_id: user.id });
      return json({ error: 'vision timed out' }, 504);
    }
    safeLog.error('body-scan-analyze', 'failed', { user_id: user.id, error: String(e) });
    return json({ error: 'analysis failed' }, 502);
  }

  const sa = admin();

  // =========================================================================
  // Prompt #169a, realigned to the #169f TIER MODEL: entitlement gating at the
  // finalize/persist point.
  //
  // The entitlement gate runs AFTER a successful analysis and BEFORE the scan
  // is persisted/marked complete, so a failed analysis never finalizes. Under
  // #169f, Body Scan is Platinum-and-above only and the free teaser is RETIRED.
  // Server-side paths (mirroring the SQL resolver fn_resolve_body_scan_tier_status):
  //   entitled (Platinum or above, own or via accepted family link)
  //                         -> stamp the resolved tier status (holder > member >
  //                            own-platinum) + subscription id, finalize
  //   practitioner_managed  -> stamp 'practitioner_managed', finalize (bypass);
  //                            granted ONLY on server-verified active relationship
  //   not entitled          -> REJECT (402); do NOT persist, do NOT mark the
  //                            session complete; capture state is preserved for
  //                            retry/upgrade. There is NO teaser claim.
  //
  // This function runs as service_role, and the finalize trigger TRUSTS a
  // service_role pre-stamp of premium_status_at_scan without re-resolving it, so
  // the value resolved here MUST be a valid new-enum value (the resolver
  // guarantees that).
  // =========================================================================
  // SECURITY (Prompt #169a review fix): practitioner_managed is determined
  // SERVER-SIDE, never read from a client boolean. A non-entitled consumer could
  // otherwise send { practitioner_managed: true } to defeat the entitlement gate.
  // verifyPractitionerManaged returns true ONLY when an active practitioner
  // relationship exists between the authenticated caller (the practitioner
  // acting on behalf) and body.patient_user_id (the scan subject). It is
  // fail-closed: no patient id, a self-scan, or a query error/timeout all
  // resolve to false, routing the request into the consumer entitlement logic
  // below.
  const practitionerManaged = await verifyPractitionerManaged(
    sa,
    user.id,
    body.patient_user_id,
  );

  // The scan SUBJECT: in a verified practitioner-managed scan this is the managed
  // patient; otherwise it is the caller (the ordinary consumer self-scan). The
  // age gate and the frequency limiter are evaluated against the subject's data.
  const subjectUserId = practitionerManaged && body.patient_user_id
    ? body.patient_user_id
    : user.id;

  // =========================================================================
  // Prompt #169b: AGE GATE (spec section 4) + 24h FREQUENCY LIMITER (3.2.3).
  // Both run AFTER a successful analysis and BEFORE persist/finalize, alongside
  // the #169a entitlement gate, so a rejected scan never consumes the teaser and
  // is never persisted/marked complete. Both reject WITHOUT persisting.
  //
  // Age gate (section 4 + 4.3): reject a PROVEN minor at capture time unless a
  // VERIFIED practitioner (practitionerManaged, server-derived) supplied a
  // mandatory clinical_override_reason, in which case the gate is bypassed and
  // the reason is recorded on body_photo_sessions.clinical_override_reason. A
  // consumer can never self-grant the override: a self-scan is not
  // practitioner-managed, so clinical_override_reason is ignored for them.
  // =========================================================================
  const ageDecision = await resolveAgeGate(
    sa,
    subjectUserId,
    practitionerManaged,
    body.clinical_override_reason,
  );
  if (!ageDecision.allowed) {
    safeLog.info('body-scan-analyze', 'age gate blocked', {
      user_id:    user.id,
      subject_user_id: subjectUserId,
      stage:      'ageGate',
      age_years:  ageDecision.ageYears,
      practitioner_managed: practitionerManaged,
      session_id: body.session_id ?? null,
    });
    // Reject WITHOUT persisting or marking the session complete.
    return json(
      {
        error: 'age_restricted',
        message: 'Body Scan is available to members who are 18 or older. Please talk to your healthcare provider about any body composition questions.',
      },
      403,
    );
  }
  if (ageDecision.overrodeMinor) {
    safeLog.info('body-scan-analyze', 'age gate practitioner override', {
      user_id:    user.id,
      subject_user_id: subjectUserId,
      stage:      'ageGate',
      age_years:  ageDecision.ageYears,
      session_id: body.session_id ?? null,
    });
  }

  // 24h frequency limiter (section 3.2.3): at most one completed scan per 24h per
  // user. Keyed on user.id (the caller), which is the owner of the
  // body_photo_sessions rows this function creates/finalizes, so the limiter
  // matches the rows it queries. Reject WITHOUT persisting when the most recent
  // completed scan is within the window.
  const frequency = await resolveScanFrequency(sa, user.id);
  if (!frequency.allowed) {
    const hoursLeft = Math.ceil(frequency.msUntilAllowed / (60 * 60 * 1000));
    safeLog.info('body-scan-analyze', 'frequency limited', {
      user_id:    user.id,
      stage:      'frequencyLimit',
      ms_until_allowed: frequency.msUntilAllowed,
      session_id: body.session_id ?? null,
    });
    return json(
      {
        error: 'scan_rate_limited',
        message: `You have already completed a Body Scan today. Your body changes gradually, so the next scan will be available in about ${hoursLeft} hour${hoursLeft === 1 ? '' : 's'}.`,
        retry_after_ms: frequency.msUntilAllowed,
      },
      429,
    );
  }

  const entitlement = await resolveBodyScanEntitlement(sa, user.id, practitionerManaged);

  // Under #169f there is no free teaser: a non-entitled user is REJECTED. The
  // resolver returns a valid new-enum stamp for an entitled user (or a managed
  // scan) and null otherwise.
  if (entitlement.statusForScan === null) {
    safeLog.info('body-scan-analyze', 'premium required; not entitled (Platinum required)', {
      user_id: user.id,
      stage:   'entitlement',
      session_id: body.session_id ?? null,
    });
    // Reject the finalize WITHOUT persisting or marking the session complete.
    return json(
      {
        error: 'premium_required',
        message: 'Body Scan requires a Platinum membership.',
      },
      402,
    );
  }
  const premiumStatusAtScan: BodyScanPremiumStatus = entitlement.statusForScan;

  safeLog.info('body-scan-analyze', 'entitlement resolved', {
    user_id:                 user.id,
    stage:                   'entitlement',
    premium_status_at_scan:  premiumStatusAtScan,
    has_subscription:        entitlement.subscriptionId !== null,
    practitioner_managed:    practitionerManaged,
    patient_user_id:         body.patient_user_id ?? null,
    session_id:              body.session_id ?? null,
  });

  // Persist estimates ONLY. Photos are not stored anywhere.
  const insertResult = await sa.from('body_tracker_photo_scans').insert({
    user_id: user.id,
    estimated_body_fat_min: parsed.estimated_body_fat_min,
    estimated_body_fat_max: parsed.estimated_body_fat_max,
    body_type: parsed.body_type,
    fat_distribution: parsed.fat_distribution,
    estimated_whr_min: parsed.estimated_whr_min,
    estimated_whr_max: parsed.estimated_whr_max,
    muscle_development: parsed.muscle_development,
    ai_confidence: parsed.ai_confidence,
    ai_model: VISION_MODEL,
    full_response: parsed as unknown as Record<string, unknown>,
  } as never).select('id, scan_date').single();

  if (insertResult.error || !insertResult.data) {
    safeLog.error('body-scan-analyze', 'insert failed', {
      user_id: user.id,
      error: insertResult.error?.message ?? 'no data',
    });
    return json({ error: 'persist failed' }, 500);
  }

  const row = insertResult.data as { id: string; scan_date: string };
  const scanId = row.id;

  // =========================================================================
  // Prompt #169 Phase 1: ancillary persistence (all fail-open).
  // The primary scan result (scanId + estimates) is already committed above.
  // None of the operations below may throw to the caller.
  // Structured log lines include { scan_id, user_id, tier, stage }.
  // =========================================================================

  // Derive Phase 1 optional inputs from body (already parsed above).
  const p169: Phase1Inputs = {
    quality_scores:            body.quality_scores,
    calibration:               body.calibration,
    fused_keypoints:           body.fused_keypoints,
    tier:                      body.tier,
    device_model:              body.device_model,
    device_os:                 body.device_os,
    depth_sensor_type:         body.depth_sensor_type,
    scan_reported_demographics: body.scan_reported_demographics,
  };

  // We have no session_id from body_photo_sessions because the legacy flow
  // writes to body_tracker_photo_scans (a different table). The T2 tables
  // (body_scan_quality, body_scan_tier_log, body_scan_composition) reference
  // body_photo_sessions.id via FK.
  //
  // Phase 1 wiring: the client must create or provide a body_photo_sessions
  // row before calling this function and pass its id as session_id. Until T7
  // (PhotoSessionCapture) ships, the ancillary tables need a session_id.
  // If session_id is absent we skip ancillary persistence but still attempt
  // the body_photo_sessions-independent paths.
  //
  // For the composition values, derive mid-point estimates from the vision output.
  const bodyFatMid = (parsed.estimated_body_fat_min + parsed.estimated_body_fat_max) / 2;
  const tier       = p169.tier ?? 1;

  safeLog.info('body-scan-analyze', 'p169 ancillary start', {
    scan_id:     scanId,
    user_id:     user.id,
    tier,
    has_quality: !!p169.quality_scores,
    has_calib:   !!p169.calibration,
    has_demog:   !!p169.scan_reported_demographics,
  });

  // Run all ancillary persistence in parallel (each is internally fail-open).
  // body_photo_sessions FK operations use scanId as a proxy until a
  // session_id field is wired through. In the legacy flow this function
  // inserts into body_tracker_photo_scans, which has its own PK (scanId).
  // The T2 tables key off body_photo_sessions.id. Treat scanId as that id
  // for Phase 1; when T7 ships, the client will send a real session_id.

  const ancillaryOps: Promise<void>[] = [];

  if (p169.quality_scores) {
    ancillaryOps.push(persistQuality(sa, scanId, user.id, p169.quality_scores));
  }

  ancillaryOps.push(
    persistTierLog(
      sa,
      scanId,
      user.id,
      tier,
      p169.device_model,
      p169.device_os,
      p169.depth_sensor_type,
    ),
  );

  // Composition: persist the vision-derived body fat + lean/fat mass (if derivable).
  // lean_mass_kg and fat_mass_kg require height and weight from demographics.
  let leanMassKg: number | null = null;
  let fatMassKg:  number | null = null;
  if (p169.scan_reported_demographics) {
    const { weight_kg } = p169.scan_reported_demographics;
    fatMassKg  = (bodyFatMid / 100) * weight_kg;
    leanMassKg = weight_kg - fatMassKg;
  }

  ancillaryOps.push(
    persistComposition(sa, scanId, user.id, {
      bodyFatPct:       Number.isFinite(bodyFatMid) ? bodyFatMid : null,
      leanMassKg,
      fatMassKg,
      waistNavelCircCm: null, // populated by body_scan_measurements; not available here
    }),
  );

  if (p169.calibration) {
    ancillaryOps.push(persistCalibration(sa, scanId, user.id, p169.calibration));
  }

  if (p169.scan_reported_demographics) {
    ancillaryOps.push(
      checkAndFlagCaqDelta(sa, scanId, user.id, p169.scan_reported_demographics),
    );
  }

  // After composition is persisted, run baseline drift update.
  // We race all ops with a 30 s timeout so a hung DB call never blocks.
  const timeout30s = new Promise<void>((resolve) => setTimeout(resolve, 30_000));

  try {
    await Promise.race([
      Promise.allSettled(ancillaryOps),
      timeout30s,
    ]);
  } catch {
    // Promise.race/allSettled should not throw but guard regardless.
  }

  // Baseline drift update runs after composition is (hopefully) committed.
  try {
    await Promise.race([
      updatePersonalBaseline(
        sa,
        scanId,
        user.id,
        Number.isFinite(bodyFatMid) ? bodyFatMid : null,
        null, // waist_navel not available in ephemeral scan path
      ),
      new Promise<void>((resolve) => setTimeout(resolve, 10_000)),
    ]);
  } catch {
    // Fail-open.
  }

  safeLog.info('body-scan-analyze', 'p169 ancillary complete', {
    scan_id:  scanId,
    user_id:  user.id,
    tier,
    stage:    'complete',
  });

  // =========================================================================
  // Prompt #169a: finalize the body_photo_sessions row (when provided).
  // Stamp the resolved premium status + subscription id and transition
  // scan_status to 'complete'. The transition to 'complete' is what fires the
  // Helix trigger (trg_emit_helix_body_scan_event); we do NOT emit the Helix
  // event directly. Runs after the T2 child rows are persisted so the
  // trigger's tier lookup resolves. Best-effort with an 8s timeout; the scan
  // result is already committed above and is returned regardless.
  //
  // Idempotent (review fix): the .neq('scan_status','complete') precondition
  // makes re-finalizing an already-complete session an explicit no-op, so a
  // replayed request cannot re-stamp premium_status_at_scan. Defense-in-depth;
  // the DB trigger already prevents a duplicate Helix re-fire.
  // =========================================================================
  if (body.session_id) {
    try {
      // Prompt #169b: when a verified practitioner overrode the age gate for a
      // minor, record the mandatory clinical_override_reason and the acting
      // practitioner on the session (spec section 4.3). These fields are set only
      // on the override path; ordinary adult scans leave them untouched.
      const finalizePatch: Record<string, unknown> = {
        premium_status_at_scan:  premiumStatusAtScan,
        premium_subscription_id: entitlement.subscriptionId,
        scan_status:             'complete',
        // Model-version stamp (Prompt #169b, section 16.5): record the engine
        // versions on the session at finalize, mirroring runScanAnalysis. Lets an
        // older scan surface a model-version badge once an engine is bumped.
        model_versions:          { ...CURRENT_MODEL_VERSIONS },
      };
      if (ageDecision.overrodeMinor && ageDecision.overrideReason) {
        finalizePatch.clinical_override_reason = ageDecision.overrideReason;
        finalizePatch.practitioner_id          = user.id;
      }
      const { error: finalizeError } = await withTimeout(
        sa
          .from('body_photo_sessions')
          .update(finalizePatch as never)
          .eq('id', body.session_id)
          .eq('user_id', user.id)
          .neq('scan_status', 'complete'),
        8_000,
        'edge-function.body-scan-analyze.finalize-session',
      );
      if (finalizeError) {
        safeLog.error('body-scan-analyze', 'session finalize failed', {
          user_id:    user.id,
          session_id: body.session_id,
          stage:      'finalizeSession',
          error:      finalizeError.message,
        });
      } else {
        safeLog.info('body-scan-analyze', 'session finalized', {
          user_id:                user.id,
          session_id:             body.session_id,
          stage:                  'finalizeSession',
          premium_status_at_scan: premiumStatusAtScan,
        });
      }
    } catch (e) {
      safeLog.error('body-scan-analyze', 'session finalize exception', {
        user_id:    user.id,
        session_id: body.session_id,
        stage:      'finalizeSession',
        error:      String(e),
      });
    }
  }

  // Helix event is emitted by DB trigger trg_emit_helix_body_scan_event when
  // body_photo_sessions.scan_status transitions to 'complete'. Do NOT emit
  // directly from this function.

  return json({
    status: 'complete',
    scan_id: scanId,
    scan_date: row.scan_date,
    estimates: parsed,
  });
});
