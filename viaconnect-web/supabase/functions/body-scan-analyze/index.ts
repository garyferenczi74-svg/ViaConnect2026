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
// =============================================================================

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { withAbortTimeout, isTimeoutError } from '../_shared/with-timeout.ts';
import { safeLog } from '../_shared/safe-log.ts';
import { getCircuitBreaker, isCircuitBreakerError } from '../_shared/circuit-breaker.ts';

const visionBreaker = getCircuitBreaker('claude-vision');

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

  // Persist estimates ONLY. Photos are not stored anywhere.
  const sa = admin();
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
  return json({
    status: 'complete',
    scan_id: row.id,
    scan_date: row.scan_date,
    estimates: parsed,
  });
});
