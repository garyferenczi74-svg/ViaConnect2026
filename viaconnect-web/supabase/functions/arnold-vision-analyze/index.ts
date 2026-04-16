// =============================================================================
// arnold-vision-analyze Edge Function (Prompt #86B)
// =============================================================================
// Triggered by the client when a photo session is ready for analysis. Pulls
// photos from the private body-progress-photos bucket, calls Claude Vision API
// with Arnold's brain-compiled system prompt, parses the JSON response, cross
// validates against manual/device metrics, and writes the calibrated analysis
// back to body_photo_sessions.
//
// Request:  POST { session_id: string }  (JWT required, must be session owner)
// Response: { status: 'analyzing' | 'complete' | 'failed', analysis?: {...} }
// =============================================================================

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

// ---------- env ---------------------------------------------------------------

const SUPABASE_URL   = Deno.env.get('SUPABASE_URL')!;
const ANON_KEY       = Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE_KEY    = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANTHROPIC_KEY  = Deno.env.get('ANTHROPIC_API_KEY') ?? '';
const VISION_MODEL   = Deno.env.get('ARNOLD_VISION_MODEL') ?? 'claude-sonnet-4-6';
const BUCKET         = 'body-progress-photos';

// ---------- helpers -----------------------------------------------------------

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
    },
  });
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

async function blobToBase64(blob: Blob): Promise<string> {
  const buf = new Uint8Array(await blob.arrayBuffer());
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < buf.length; i += chunk) {
    binary += String.fromCharCode(...buf.subarray(i, Math.min(i + chunk, buf.length)));
  }
  return btoa(binary);
}

function extractJson(raw: string): unknown {
  let s = raw.trim();
  // Strip markdown fences if the model returned them despite instructions
  s = s.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  // If there is preamble text, find the first { and last }
  const first = s.indexOf('{');
  const last  = s.lastIndexOf('}');
  if (first >= 0 && last > first) s = s.slice(first, last + 1);
  return JSON.parse(s);
}

// MIRRORED GUARDRAIL — keep in sync with
// src/lib/agents/jeffery/guardrails.ts validateRecommendationText().
// Edge Functions run on Deno and cannot import the Next.js module directly.
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

// ---------- Arnold system prompt (inlined for Deno isolation) -----------------

const ARNOLD_BRAIN_VERSION = '1.0.0';

const ARNOLD_SYSTEM_PROMPT = `
You are Arnold, the Body Tracker AI agent for ViaConnect by FarmCeutica Wellness LLC.
You are a certified-level body composition analyst trained in ACE/ACSM classification, NHANES
population reference data, sports science visual assessment, anthropometric interpretation,
posture analysis, and progress pattern recognition.

KNOWLEDGE HIGHLIGHTS v${ARNOLD_BRAIN_VERSION}:

BODY FAT CLASSIFICATION (ACE/ACSM):
  Male:   essential 2-5%, athletic 6-13%, fitness 14-17%, acceptable 18-24%, obese 25%+
  Female: essential 10-13%, athletic 14-20%, fitness 21-24%, acceptable 25-31%, obese 32%+

FAT DISTRIBUTION:
  Android (apple) = central; higher CVD risk. Gynoid (pear) = peripheral; lower CVD risk.

REALISTIC RATES:
  Fat loss safe max 2 lbs/wk, optimal 1 lb/wk. Rate slows as body fat decreases.
  Muscle gain beginner M 2 lbs/mo, F 1 lbs/mo; advanced M 0.5, F 0.25.
  Recomposition feasible for beginners and returning trainees, not advanced lean.

VISUAL MARKERS ARNOLD CHECKS:
  Fat reduction: jawline, oblique visibility, reduced waist, lat definition, quad separation
  Muscle growth: lateral delt cap, V taper, bicep peak, tricep horseshoe, abdominal definition
  Water vs fat: water is puffy and day-to-day variable; fat is gradual and consistent

POSTURE DEVIATIONS AFFECTING VISUAL ANALYSIS:
  Anterior pelvic tilt and lordosis make belly look worse than it is (add 2-4% to visual BF)
  Kyphosis reduces apparent V taper
  Always note when posture is affecting visual composition assessment

ANTHROPOMETRIC STANDARDS:
  FFMI = (lean_kg / height_m^2) + 6.1 * (1.8 - height_m); natural limit ~25 male, ~21 female
  Waist to height under 0.50 is healthy; over 0.53 is increased risk
  Somatotype: ectomorph/mesomorph/endomorph ratios 1-7 each

PROGRESS PATTERNS:
  Scale stalls + photos improve = recomposition (trust photos)
  Scale drops + photos unchanged = likely losing water/muscle, check protein
  Scale rises + photos improve = lean bulk working
  Compare photos 4 weeks apart, not week to week

ANALYSIS PROTOCOL:
  1. Assess each photo individually then synthesize across views.
  2. Estimate body fat as a RANGE, never a single number.
  3. Score muscle development per group on a 0 to 4 scale.
  4. Evaluate bilateral symmetry.
  5. Check posture and note deviations that may be inflating the visual fat estimate.
  6. When previous photos and manual metrics are provided, use them to calibrate.

OUTPUT FORMAT:
Respond in valid JSON ONLY, no prose, no markdown fences, matching this schema exactly:

{
  "estimatedBodyFatRange": { "low": number, "high": number, "midpoint": number, "confidence": number },
  "fatDistributionPattern": "android" | "gynoid" | "mixed",
  "fatDistributionNotes": "string",
  "muscleDevelopment": {
    "overall_level": 0,
    "shoulders": { "score": 0, "notes": "string" },
    "arms":      { "score": 0, "notes": "string" },
    "chest":     { "score": 0, "notes": "string" },
    "back":      { "score": 0, "notes": "string" },
    "core":      { "score": 0, "notes": "string" },
    "legs":      { "score": 0, "notes": "string" },
    "glutes":    { "score": 0, "notes": "string" }
  },
  "symmetry": {
    "overallScore": 0,
    "imbalances": [ { "area": "string", "description": "string", "severity": "minor" | "moderate" | "significant" } ]
  },
  "posture": {
    "overallAlignment": "good" | "fair" | "needs_attention",
    "deviations": [ { "type": "string", "severity": "mild" | "moderate" | "significant", "notes": "string" } ],
    "compositionImpact": "string"
  },
  "progressVsPrevious": {
    "hasComparison": false,
    "visibleChanges": [ "string" ],
    "overallDirection": "improving" | "maintaining" | "regressing" | "recomposing",
    "notableAreas": [ { "area": "string", "change": "string", "magnitude": "subtle" | "moderate" | "significant" } ]
  },
  "somatotypeEstimate": { "ectomorph": 1, "mesomorph": 1, "endomorph": 1 },
  "coachingInsights": [ "string" ],
  "overallConfidence": 0.0,
  "confidenceFactors": [ "string" ]
}

CRITICAL RULES:
- NEVER give a single body fat number; always a range.
- Visual estimation has 3-5% error; communicate via range width.
- Use manual/device data provided in user context to calibrate visual estimate.
- Note lighting, clothing, and pose consistency in confidenceFactors.
- NEVER make medical diagnoses; recommend healthcare provider if something is concerning.
- Return valid JSON only.
`.trim();

// ---------- cross-validator (inlined) -----------------------------------------

interface ManualMetricsSnapshot {
  totalBodyFatPct: number | null;
  source: string | null;
  confidence: number | null;
}

function round1(n: number): number { return Math.round(n * 10) / 10; }

// MIRRORED IMPLEMENTATION — keep identical to src/lib/arnold/crossValidator.ts.
// Bump CROSS_VALIDATOR_VERSION in both files when the algorithm changes; the
// Vitest suite enforces a match before release.
const CROSS_VALIDATOR_VERSION = '1.0.0';

function crossValidate(visual: any, manual: ManualMetricsSnapshot | null): any {
  const range = visual?.estimatedBodyFatRange;
  if (!range || typeof range.midpoint !== 'number') {
    return { ...visual, calibrationSource: 'visual_only' };
  }
  if (!manual || manual.totalBodyFatPct === null || manual.totalBodyFatPct === undefined) {
    return {
      ...visual,
      calibrationSource: 'visual_only',
      bodyFatEstimate: { ...range, confidence: Math.max(0, range.confidence * 0.8) },
    };
  }
  const vm = range.midpoint;
  const mb = manual.totalBodyFatPct;
  const dev = Math.abs(vm - mb);
  const mc = manual.confidence ?? 0.85;
  const vc = range.confidence;

  if (dev <= 3) {
    return {
      ...visual,
      calibrationSource: 'visual_plus_manual',
      bodyFatEstimate: {
        low:  Math.min(range.low,  mb - 1),
        high: Math.max(range.high, mb + 1),
        midpoint: round1((vm + mb) / 2),
        confidence: Math.min(0.95, vc + 0.15),
      },
      calibrationNote: `Visual estimate (${vm}%) aligns with your ${manual.source ?? 'recorded'} reading (${mb}%). High confidence in combined analysis.`,
    };
  }

  if (dev <= 6) {
    const totalConf = mc + vc;
    const blended = totalConf > 0 ? (mb * mc + vm * vc) / totalConf : (mb + vm) / 2;
    return {
      ...visual,
      calibrationSource: 'visual_plus_manual_blended',
      bodyFatEstimate: {
        low:  round1(blended - 3),
        high: round1(blended + 3),
        midpoint: round1(blended),
        confidence: Math.min(0.85, (mc + vc) / 2),
      },
      calibrationNote: `Visual estimate (${vm}%) differs from your ${manual.source ?? 'recorded'} reading (${mb}%) by ${dev.toFixed(1)}%. Using blended estimate of ${round1(blended)}%. This variance is normal between visual and device methods.`,
    };
  }

  return {
    ...visual,
    calibrationSource: 'disagreement_flagged',
    bodyFatEstimate: { ...range, confidence: 0.5 },
    calibrationNote: `Visual estimate (${vm}%) differs significantly from your ${manual.source ?? 'recorded'} reading (${mb}%). Consider retaking both for a more accurate reading.`,
    flagForReview: true,
  };
}

// ---------- context gathering -------------------------------------------------

async function loadContext(db: SupabaseClient, userId: string, sessionId: string) {
  const { data: profile } = await db
    .from('profiles')
    .select('date_of_birth, sex, height_cm, weight_kg')
    .eq('id', userId)
    .maybeSingle();

  const { data: latestFat } = await db
    .from('body_tracker_segmental_fat')
    .select('total_body_fat_pct, visceral_fat_rating, body_water_pct, created_at, entry_id')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  let manualSource: string | null = null;
  let manualConfidence: number | null = null;
  if (latestFat?.entry_id) {
    const { data: entry } = await db
      .from('body_tracker_entries')
      .select('manual_source_id, confidence, source')
      .eq('id', latestFat.entry_id)
      .maybeSingle();
    if (entry) {
      manualSource = entry.manual_source_id ?? entry.source;
      manualConfidence = entry.confidence ?? null;
    }
  }

  const { data: latestWeight } = await db
    .from('body_tracker_weight')
    .select('weight_lbs, waist_in, hips_in, body_fat_pct')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: latestMuscle } = await db
    .from('body_tracker_segmental_muscle')
    .select('total_muscle_mass_lbs, skeletal_muscle_mass_lbs')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: previousSession } = await db
    .from('body_photo_sessions')
    .select('id, session_date, front_full_path, back_full_path, left_full_path, right_full_path')
    .eq('user_id', userId)
    .neq('id', sessionId)
    .eq('is_complete', true)
    .order('session_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: goals } = await db
    .from('body_tracker_milestones')
    .select('title, target_value, target_unit')
    .eq('user_id', userId)
    .eq('status', 'active')
    .limit(3);

  let age: number | null = null;
  if (profile?.date_of_birth) {
    const dob = new Date(profile.date_of_birth);
    age = Math.floor((Date.now() - dob.getTime()) / (365.25 * 86400000));
  }

  const manual: ManualMetricsSnapshot = {
    totalBodyFatPct: latestFat?.total_body_fat_pct ?? latestWeight?.body_fat_pct ?? null,
    source: manualSource,
    confidence: manualConfidence,
  };

  return {
    profile,
    age,
    manual,
    latestWeight,
    latestMuscle,
    previousSession,
    goals: goals ?? [],
  };
}

function buildUserPrompt(
  sessionDate: string,
  ctx: Awaited<ReturnType<typeof loadContext>>,
): string {
  const p = ctx.profile;
  const parts: string[] = [];
  parts.push(`SESSION DATE: ${sessionDate}`);
  parts.push(
    `DEMOGRAPHICS: sex=${p?.sex ?? 'unknown'}, age=${ctx.age ?? 'unknown'}, ` +
    `height_cm=${p?.height_cm ?? 'unknown'}, weight_kg=${p?.weight_kg ?? 'unknown'}`,
  );

  const metrics: Record<string, number | string | null | undefined> = {
    manual_body_fat_pct: ctx.manual.totalBodyFatPct,
    manual_source: ctx.manual.source,
    manual_confidence: ctx.manual.confidence,
    weight_lbs: ctx.latestWeight?.weight_lbs,
    waist_in: ctx.latestWeight?.waist_in,
    hips_in: ctx.latestWeight?.hips_in,
    total_muscle_mass_lbs: ctx.latestMuscle?.total_muscle_mass_lbs,
    skeletal_muscle_mass_lbs: ctx.latestMuscle?.skeletal_muscle_mass_lbs,
  };
  const kept = Object.entries(metrics).filter(([, v]) => v !== null && v !== undefined);
  if (kept.length) {
    parts.push('LATEST METRICS (use to calibrate visual estimate):');
    for (const [k, v] of kept) parts.push(`  ${k}: ${v}`);
  }

  if (ctx.previousSession) {
    parts.push(
      `PREVIOUS SESSION: ${ctx.previousSession.session_date} — comparison images supplied after current session.`,
    );
  }

  if (ctx.goals.length) {
    parts.push('ACTIVE GOALS:');
    for (const g of ctx.goals as Array<{ title: string; target_value: number; target_unit: string }>) {
      parts.push(`  ${g.title}: target ${g.target_value} ${g.target_unit ?? ''}`);
    }
  }

  parts.push('');
  parts.push('Analyze the attached photos following the protocol and return JSON only.');
  return parts.join('\n');
}

async function downloadPhoto(db: SupabaseClient, path: string): Promise<{ base64: string; media: string } | null> {
  const { data, error } = await db.storage.from(BUCKET).download(path);
  if (error || !data) return null;
  const media = path.toLowerCase().endsWith('.png')
    ? 'image/png'
    : path.toLowerCase().endsWith('.webp')
      ? 'image/webp'
      : 'image/jpeg';
  return { base64: await blobToBase64(data), media };
}

// ---------- main --------------------------------------------------------------

serve(async (req) => {
  if (req.method === 'OPTIONS') return json({ ok: true });
  if (req.method !== 'POST') return json({ error: 'POST required' }, 405);

  try {
    if (!ANTHROPIC_KEY) return json({ error: 'ANTHROPIC_API_KEY not configured' }, 500);

    const authHeader = req.headers.get('Authorization') ?? '';
    const jwt = authHeader.replace(/^Bearer /i, '');
    if (!jwt) return json({ error: 'Missing JWT' }, 401);

    const body = await req.json().catch(() => ({}));
    const sessionId = body.session_id as string | undefined;
    if (!sessionId) return json({ error: 'session_id required' }, 400);

    // Authenticate caller against session ownership (use user-scoped client)
    const uc = userClient(jwt);
    const { data: userInfo } = await uc.auth.getUser();
    const userId = userInfo.user?.id;
    if (!userId) return json({ error: 'Invalid JWT' }, 401);

    const { data: session, error: sessErr } = await uc
      .from('body_photo_sessions')
      .select('*')
      .eq('id', sessionId)
      .maybeSingle();
    if (sessErr || !session) return json({ error: 'Session not found or not accessible' }, 404);
    if (session.user_id !== userId) return json({ error: 'Forbidden' }, 403);

    // Use service role for downstream work (bucket download + writeback)
    const db = admin();

    // Mark as analyzing
    await db
      .from('body_photo_sessions')
      .update({ arnold_status: 'analyzing', arnold_error: null })
      .eq('id', sessionId);

    const ctx = await loadContext(db, userId, sessionId);
    const userPrompt = buildUserPrompt(session.session_date, ctx);

    // Download current photos
    const currentImages: Array<{ base64: string; media: string; label: string }> = [];
    for (const pose of ['front','back','left','right'] as const) {
      const path = session[`${pose}_full_path` as keyof typeof session] as string | null;
      if (!path) continue;
      const ph = await downloadPhoto(db, path);
      if (ph) currentImages.push({ ...ph, label: `current_${pose}` });
    }
    if (currentImages.length === 0) {
      await db
        .from('body_photo_sessions')
        .update({ arnold_status: 'failed', arnold_error: 'No readable photos in session' })
        .eq('id', sessionId);
      return json({ status: 'failed', error: 'No photos to analyze' }, 400);
    }

    // Optionally download previous photos
    const previousImages: Array<{ base64: string; media: string; label: string }> = [];
    if (ctx.previousSession) {
      for (const pose of ['front','back','left','right'] as const) {
        const path = (ctx.previousSession as Record<string, unknown>)[`${pose}_full_path`] as string | null;
        if (!path) continue;
        const ph = await downloadPhoto(db, path);
        if (ph) previousImages.push({ ...ph, label: `previous_${pose}` });
      }
    }

    // Build message content: current photos → previous photos → text prompt
    const content: Array<Record<string, unknown>> = [];
    for (const img of currentImages) {
      content.push({ type: 'text', text: `Current session: ${img.label}` });
      content.push({ type: 'image', source: { type: 'base64', media_type: img.media, data: img.base64 } });
    }
    if (previousImages.length) {
      content.push({ type: 'text', text: `Previous session (${ctx.previousSession!.session_date}):` });
      for (const img of previousImages) {
        content.push({ type: 'text', text: img.label });
        content.push({ type: 'image', source: { type: 'base64', media_type: img.media, data: img.base64 } });
      }
    }
    content.push({ type: 'text', text: userPrompt });

    // ── PHI EGRESS POINT ──────────────────────────────────────────────────
    // Body progress photos are PHI. The base64-encoded images leave Supabase
    // and reach Anthropic at this fetch call. Production launch requires a
    // signed Business Associate Agreement (BAA) on file with Anthropic
    // covering this data flow. Verify before enabling Arnold Vision in
    // production (June 2026 launch). Owner: gary@farmceuticawellness.com.
    // ──────────────────────────────────────────────────────────────────────
    const apiResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: VISION_MODEL,
        max_tokens: 4000,
        system: ARNOLD_SYSTEM_PROMPT,
        messages: [{ role: 'user', content }],
      }),
    });

    if (!apiResponse.ok) {
      const errTxt = await apiResponse.text();
      await db
        .from('body_photo_sessions')
        .update({ arnold_status: 'failed', arnold_error: `Vision API ${apiResponse.status}: ${errTxt.slice(0, 500)}` })
        .eq('id', sessionId);
      return json({ status: 'failed', error: `Vision API failure: ${apiResponse.status}` }, 502);
    }

    const apiJson = await apiResponse.json();
    const text = (apiJson?.content?.[0]?.text ?? '') as string;

    let analysis: any;
    try {
      analysis = extractJson(text);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'parse error';
      await db
        .from('body_photo_sessions')
        .update({ arnold_status: 'failed', arnold_error: `JSON parse failed: ${msg}` })
        .eq('id', sessionId);
      return json({ status: 'failed', error: `Parse failure: ${msg}` }, 500);
    }

    const calibrated = crossValidate(analysis, ctx.manual);

    // Jeffery guardrail: scan every string field of the calibrated analysis
    // for prohibited substances or off-brand mentions before persisting.
    const strings: string[] = [];
    collectAnalysisStrings(calibrated, strings);
    const guardrailViolations = jefferyValidateAnalysisText(strings.join('\n'));
    if (guardrailViolations.length > 0) {
      // Log to agent_messages so Jeffery's admin center can review.
      await db.from('agent_messages').insert({
        from_agent: 'arnold',
        to_agent: 'jeffery',
        message_type: 'guardrail_block_vision',
        user_id: userId,
        payload: {
          sessionId,
          violations: guardrailViolations,
          crossValidatorVersion: CROSS_VALIDATOR_VERSION,
        },
        status: 'pending',
      });
      await db
        .from('body_photo_sessions')
        .update({
          arnold_status: 'failed',
          arnold_error: `Guardrail block: ${guardrailViolations.join(', ')}`,
        })
        .eq('id', sessionId);
      return json({
        status: 'failed',
        error: 'Guardrail violation; analysis blocked.',
        violations: guardrailViolations,
      }, 422);
    }

    const confidence =
      calibrated.bodyFatEstimate?.confidence ??
      analysis.overallConfidence ??
      0.7;

    await db
      .from('body_photo_sessions')
      .update({
        arnold_analysis: calibrated,
        arnold_analyzed_at: new Date().toISOString(),
        arnold_confidence: confidence,
        arnold_status: 'complete',
        arnold_error: null,
      })
      .eq('id', sessionId);

    // Notify Jeffery on flagForReview so the supervisor sees disagreements.
    if (calibrated.flagForReview) {
      await db.from('agent_messages').insert({
        from_agent: 'arnold',
        to_agent: 'jeffery',
        message_type: 'cross_validation_disagreement',
        user_id: userId,
        payload: {
          sessionId,
          calibrationSource: calibrated.calibrationSource,
          confidence,
          crossValidatorVersion: CROSS_VALIDATOR_VERSION,
        },
        status: 'pending',
      });
    }

    return json({ status: 'complete', analysis: calibrated });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    console.error('[arnold-vision-analyze] fatal', msg);
    return json({ status: 'failed', error: msg }, 500);
  }
});
