// =============================================================================
// arnold-cross-reference-recommend Edge Function (Prompt #85c Phase G)
// =============================================================================
// Generates ONE Arnold recommendation that cites 1+ of the user's connected data
// sources (body_tracker / supplements / CAQ / genetics). Persists the result to
// body_tracker_recommendations. Mirrors arnold-vision-analyze patterns: corsHeaders,
// userClient/admin split, getCircuitBreaker, withAbortTimeout, safeLog,
// jefferyValidateAnalysisText guardrail.
//
// Request:  POST { regenerate?: boolean }  Bearer JWT required.
// Response: { id, recommendation, sources, confidence_tier, confidence_pct, generated_at }
// =============================================================================

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { withAbortTimeout, isTimeoutError } from '../_shared/with-timeout.ts';
import { safeLog } from '../_shared/safe-log.ts';
import { getCircuitBreaker, isCircuitBreakerError } from '../_shared/circuit-breaker.ts';

const recBreaker = getCircuitBreaker('claude-cross-reference');

const SUPABASE_URL  = Deno.env.get('SUPABASE_URL')!;
const ANON_KEY      = Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE_KEY   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANTHROPIC_KEY = Deno.env.get('ANTHROPIC_API_KEY') ?? '';
const REC_MODEL     = Deno.env.get('ARNOLD_REC_MODEL') ?? 'claude-sonnet-4-6';

const REC_TIMEOUT_MS = 45_000;
// Cache window: skip regenerate within this many minutes unless caller forces
const CACHE_WINDOW_MIN = 60 * 6; // 6 hours

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

const SYSTEM_PROMPT = `You are Arnold, the Body Tracker AI agent for ViaConnect by FarmCeutica Wellness LLC.

You generate ONE personalized recommendation for the user based on the multi-source data block provided in the user message.

Your recommendation MUST:
1. Be 1 to 3 sentences maximum.
2. Use DSHEA structure-function language ("supports", "contributes to", "addresses"). No disease-state claims, no diagnoses, no treatment claims.
3. Reference specific data points from the user's body tracker, supplement protocol, CAQ assessment, genetic profile, or chronic risk tracking to demonstrate cross-reference thinking.
4. Be encouraging and constructive. Frame as a small actionable next step.
5. Cite ONLY the data sources you actually used in the "sources" array.
6. If the user has an Active Journey (weight_loss or muscle_building), frame the recommendation through that journey's lens (caloric deficit, fat reduction, metabolic health for weight_loss; protein synthesis, progressive overload, recovery for muscle_building). Do NOT cite "active_journey" as a source; it is meta context, not data.
7. When chronic risk indicators are present, treat them as risk indicators only; never imply diagnosis or treatment. Use language like "areas to discuss with your healthcare provider".

CRITICAL RULES:
- Never reference Semaglutide, Ozempic, Wegovy, or Rybelsus.
- Never reference non-FarmCeutica supplement brands.
- Never use the bioavailability range "5 to 27" or "5x to 27x"; only "10x to 28x" is approved.
- No medical advice. No disease state reasoning. No prescription mention.

Respond ONLY in JSON, no preamble, no markdown fences, with this exact shape:
{
  "recommendation": "<1 to 3 sentence text>",
  "sources": [<one or more of "body_tracker", "supplements", "caq", "genetics", "chronic_risk">]
}`;

interface RequestBody {
  regenerate?: boolean;
}

type RecommendationSource = 'body_tracker' | 'supplements' | 'caq' | 'genetics' | 'chronic_risk';

interface RecommendationOutput {
  recommendation: string;
  sources: RecommendationSource[];
}

function extractJson(raw: string): unknown {
  let s = raw.trim();
  s = s.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  const first = s.indexOf('{');
  const last  = s.lastIndexOf('}');
  if (first >= 0 && last > first) s = s.slice(first, last + 1);
  return JSON.parse(s);
}

function validateOutput(parsed: unknown): RecommendationOutput {
  if (!parsed || typeof parsed !== 'object') throw new Error('rec response not an object');
  const o = parsed as Record<string, unknown>;
  const text = o.recommendation;
  if (typeof text !== 'string' || text.length < 5 || text.length > 800) {
    throw new Error('recommendation text length out of bounds');
  }
  const sources = o.sources;
  if (!Array.isArray(sources) || sources.length === 0) {
    throw new Error('sources must be a non empty array');
  }
  const allowed = new Set<RecommendationSource>([
    'body_tracker', 'supplements', 'caq', 'genetics', 'chronic_risk',
  ]);
  const cleaned: RecommendationSource[] = [];
  for (const s of sources) {
    if (typeof s === 'string' && allowed.has(s as RecommendationSource)) {
      cleaned.push(s as RecommendationSource);
    }
  }
  if (cleaned.length === 0) throw new Error('no valid sources cited');
  return { recommendation: text.trim(), sources: Array.from(new Set(cleaned)) };
}

// MIRRORED GUARDRAIL — keep in sync with
// supabase/functions/arnold-vision-analyze/index.ts and
// supabase/functions/body-scan-analyze/index.ts
function jefferyValidateAnalysisText(text: string): string[] {
  const haystack = text.toLowerCase();
  const violations: string[] = [];
  const SEMAGLUTIDE = ['semaglutide', 'ozempic', 'wegovy', 'rybelsus'];
  const BLOCKED_BRANDS = ['thorne', 'pure encapsulations', 'designs for health', 'life extension', 'now foods'];
  for (const t of SEMAGLUTIDE) if (haystack.includes(t)) violations.push(`semaglutide:${t}`);
  for (const b of BLOCKED_BRANDS) if (haystack.includes(b)) violations.push(`non_farmceutica:${b}`);
  if (/\b5\s*(?:to|\-|–)\s*27x?\b/i.test(text) || /\b5x?\s*to\s*27x?\b/i.test(text)) {
    violations.push('bioavailability_range');
  }
  return violations;
}

interface UserContext {
  body_tracker_present: boolean;
  body_tracker_summary: string;
  supplements_present: boolean;
  supplements_summary: string;
  caq_present: boolean;
  caq_summary: string;
  genetics_present: boolean;
  genetics_summary: string;
  chronic_risk_present: boolean;
  chronic_risk_summary: string;
  active_journey: 'weight_loss' | 'muscle_building' | null;
  active_journey_summary: string;
}

function tierFromContext(ctx: UserContext): { tier: 1 | 2 | 3; pct: 70 | 86 | 96 } {
  if (ctx.genetics_present) return { tier: 3, pct: 96 };
  if (ctx.supplements_present || ctx.caq_present) return { tier: 2, pct: 86 };
  return { tier: 1, pct: 70 };
}

async function buildUserContext(sb: SupabaseClient, userId: string): Promise<UserContext> {
  const ctx: UserContext = {
    body_tracker_present: true,
    body_tracker_summary: 'No body tracker data yet.',
    supplements_present: false,
    supplements_summary: 'No supplements logged.',
    caq_present: false,
    caq_summary: 'No assessment completed.',
    genetics_present: false,
    genetics_summary: 'No genetic data on file.',
    chronic_risk_present: false,
    chronic_risk_summary: 'No chronic risk assessment yet.',
    active_journey: null,
    active_journey_summary: '',
  };

  const [weightRes, metabRes, suppsRes, caqRes, genRes, chronicRes, userStateRes] = await Promise.all([
    sb.from('body_tracker_weight').select('weight_lbs, body_fat_pct, goal_weight_lbs')
      .eq('user_id', userId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    sb.from('body_tracker_metabolic').select('metabolic_age, resting_hr_bpm, hrv_ms')
      .eq('user_id', userId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    sb.from('user_current_supplements').select('supplement_name, category')
      .eq('user_id', userId).limit(20),
    sb.from('clinical_assessments').select('primary_goals, current_medications, current_conditions, completed')
      .eq('user_id', userId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    sb.from('genetic_profiles').select('mthfr_status, comt_status, cyp2d6_status')
      .eq('user_id', userId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    sb.from('body_tracker_chronic_risk')
      .select('overall_score, overall_grade, conditions, arnold_summary')
      .eq('user_id', userId).order('assessment_date', { ascending: false }).limit(1).maybeSingle(),
    sb.from('body_tracker_user_state')
      .select('active_journey, journey_started_at')
      .eq('user_id', userId).maybeSingle(),
  ]);

  const w = weightRes.data as { weight_lbs?: number; body_fat_pct?: number; goal_weight_lbs?: number } | null;
  const m = metabRes.data as { metabolic_age?: number; resting_hr_bpm?: number; hrv_ms?: number } | null;
  const btParts: string[] = [];
  if (w?.weight_lbs) btParts.push(`weight ${w.weight_lbs} lbs`);
  if (w?.goal_weight_lbs) btParts.push(`goal ${w.goal_weight_lbs} lbs`);
  if (w?.body_fat_pct) btParts.push(`body fat ${w.body_fat_pct} percent`);
  if (m?.metabolic_age) btParts.push(`metabolic age ${m.metabolic_age} years`);
  if (m?.resting_hr_bpm) btParts.push(`resting HR ${m.resting_hr_bpm} bpm`);
  if (m?.hrv_ms) btParts.push(`HRV ${m.hrv_ms} ms`);
  if (btParts.length > 0) ctx.body_tracker_summary = btParts.join('; ');

  const supps = (suppsRes.data as Array<{ supplement_name?: string; category?: string }> | null) ?? [];
  if (supps.length > 0) {
    ctx.supplements_present = true;
    const names = supps.map((s) => s.supplement_name).filter(Boolean).slice(0, 8).join(', ');
    ctx.supplements_summary = `${supps.length} active items including ${names}`;
  }

  const caq = caqRes.data as {
    primary_goals?: unknown;
    current_medications?: unknown;
    current_conditions?: unknown;
    completed?: boolean;
  } | null;
  if (caq?.completed || caq?.primary_goals) {
    ctx.caq_present = true;
    const parts: string[] = [];
    if (Array.isArray(caq.primary_goals) && caq.primary_goals.length > 0) {
      parts.push(`goals ${caq.primary_goals.slice(0, 3).join(', ')}`);
    }
    if (Array.isArray(caq.current_medications) && caq.current_medications.length > 0) {
      parts.push(`on ${caq.current_medications.length} medications`);
    }
    if (Array.isArray(caq.current_conditions) && caq.current_conditions.length > 0) {
      parts.push(`conditions noted`);
    }
    ctx.caq_summary = parts.length > 0 ? parts.join('; ') : 'assessment completed';
  }

  const gen = genRes.data as {
    mthfr_status?: string;
    comt_status?: string;
    cyp2d6_status?: string;
  } | null;
  if (gen && (gen.mthfr_status || gen.comt_status || gen.cyp2d6_status)) {
    ctx.genetics_present = true;
    const parts: string[] = [];
    if (gen.mthfr_status) parts.push(`MTHFR ${gen.mthfr_status}`);
    if (gen.comt_status) parts.push(`COMT ${gen.comt_status}`);
    if (gen.cyp2d6_status) parts.push(`CYP2D6 ${gen.cyp2d6_status}`);
    ctx.genetics_summary = parts.join('; ');
  }

  // Chronic risk: prefer pre-computed arnold_summary; fall back to grade plus
  // count of moderate/high conditions. Treat as derivative source so it does
  // NOT alter the confidence tier (tier reflects ground-truth coverage).
  const chronic = chronicRes.data as {
    overall_score?: number;
    overall_grade?: string;
    conditions?: Array<{ name?: string; severity?: string; riskScore?: number }>;
    arnold_summary?: string;
  } | null;
  if (chronic) {
    ctx.chronic_risk_present = true;
    if (chronic.arnold_summary && chronic.arnold_summary.length > 0) {
      ctx.chronic_risk_summary = chronic.arnold_summary;
    } else {
      const conds = Array.isArray(chronic.conditions) ? chronic.conditions : [];
      const elevated = conds.filter(
        (c) => c?.severity === 'Moderate' || c?.severity === 'High',
      );
      const parts: string[] = [];
      if (chronic.overall_grade) parts.push(`grade ${chronic.overall_grade}`);
      if (typeof chronic.overall_score === 'number') {
        parts.push(`score ${chronic.overall_score} of 100`);
      }
      if (elevated.length > 0) {
        parts.push(`${elevated.length} elevated risk indicator${elevated.length === 1 ? '' : 's'}`);
      }
      ctx.chronic_risk_summary = parts.length > 0
        ? parts.join('; ')
        : 'assessment completed; no elevated risk indicators';
    }
  }

  // Active journey: meta context for narrative framing only (not a citable source).
  const userState = userStateRes.data as {
    active_journey?: 'weight_loss' | 'muscle_building' | null;
    journey_started_at?: string;
  } | null;
  if (userState?.active_journey === 'weight_loss' || userState?.active_journey === 'muscle_building') {
    ctx.active_journey = userState.active_journey;
    const label = userState.active_journey === 'weight_loss' ? 'weight loss' : 'muscle building';
    if (userState.journey_started_at) {
      const startedMs = Date.parse(userState.journey_started_at);
      if (Number.isFinite(startedMs)) {
        const days = Math.max(0, Math.floor((Date.now() - startedMs) / 86_400_000));
        ctx.active_journey_summary = `${label} for ${days} day${days === 1 ? '' : 's'}`;
      } else {
        ctx.active_journey_summary = label;
      }
    } else {
      ctx.active_journey_summary = label;
    }
  }

  return ctx;
}

function userBlock(ctx: UserContext): string {
  const lines: string[] = [];
  lines.push(`Body Tracker (always available): ${ctx.body_tracker_summary}`);
  lines.push(`Supplement Protocol${ctx.supplements_present ? '' : ' (NOT CONNECTED)'}: ${ctx.supplements_summary}`);
  lines.push(`Wellness Assessment (CAQ)${ctx.caq_present ? '' : ' (NOT CONNECTED)'}: ${ctx.caq_summary}`);
  lines.push(`Genetic Profile${ctx.genetics_present ? '' : ' (NOT CONNECTED)'}: ${ctx.genetics_summary}`);
  lines.push(`Chronic Risk Tracking${ctx.chronic_risk_present ? '' : ' (no assessment yet)'}: ${ctx.chronic_risk_summary}`);
  if (ctx.active_journey) {
    lines.push(`Active Journey (meta context, do not cite): ${ctx.active_journey_summary}`);
  }
  return lines.join('\n');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders() });
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);
  if (!ANTHROPIC_KEY) return json({ error: 'recommendation engine unavailable' }, 503);

  const auth = req.headers.get('authorization') ?? '';
  const jwt = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!jwt) return json({ error: 'unauthorized' }, 401);

  const sb = userClient(jwt);
  const { data: userData } = await sb.auth.getUser();
  const user = userData?.user;
  if (!user) return json({ error: 'unauthorized' }, 401);

  let body: RequestBody = {};
  try { body = await req.json(); } catch { /* empty body is fine */ }

  // Cache: return latest non-dismissed within window unless force regenerate
  if (!body.regenerate) {
    const cutoffIso = new Date(Date.now() - CACHE_WINDOW_MIN * 60_000).toISOString();
    const { data: cached } = await sb.from('body_tracker_recommendations')
      .select('id, recommendation_text, source_ids, confidence_tier, confidence_pct, generated_at')
      .eq('user_id', user.id)
      .is('dismissed_at', null)
      .gte('generated_at', cutoffIso)
      .order('generated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (cached) {
      const c = cached as {
        id: string;
        recommendation_text: string;
        source_ids: string[];
        confidence_tier: number;
        confidence_pct: number;
        generated_at: string;
      };
      return json({
        id: c.id,
        recommendation: c.recommendation_text,
        sources: c.source_ids,
        confidence_tier: c.confidence_tier,
        confidence_pct: c.confidence_pct,
        generated_at: c.generated_at,
        cached: true,
      });
    }
  }

  // Build user context from all 4 sources in parallel
  const ctx = await buildUserContext(sb, user.id);
  const tier = tierFromContext(ctx);

  let parsed: RecommendationOutput;
  try {
    const apiResponse = await recBreaker.execute(() =>
      withAbortTimeout(
        (signal) => fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': ANTHROPIC_KEY,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: REC_MODEL,
            max_tokens: 600,
            system: SYSTEM_PROMPT,
            messages: [{
              role: 'user',
              content: [
                { type: 'text', text: `User data block:\n\n${userBlock(ctx)}\n\nGenerate the recommendation now per the system instructions.` },
              ],
            }],
          }),
          signal,
        }),
        REC_TIMEOUT_MS,
        'edge-function.arnold-cross-reference-recommend.claude',
      ),
    );

    if (!apiResponse.ok) {
      const errText = await apiResponse.text().catch(() => '');
      throw new Error(`anthropic ${apiResponse.status}: ${errText.slice(0, 200)}`);
    }
    const recJson = await apiResponse.json() as { content?: Array<{ type: string; text?: string }> };
    const text = recJson.content?.find((c) => c.type === 'text')?.text ?? '';
    if (!text) throw new Error('empty rec response');

    parsed = validateOutput(extractJson(text));

    // Compliance guardrail
    const violations = jefferyValidateAnalysisText(parsed.recommendation);
    if (violations.length > 0) {
      safeLog('warn', 'arnold-cross-reference-recommend guardrail blocked', { user_id: user.id, violations });
      return json({ error: 'recommendation blocked by compliance guardrails' }, 502);
    }
  } catch (e) {
    if (isCircuitBreakerError(e)) {
      safeLog('warn', 'arnold-cross-reference-recommend breaker open', { user_id: user.id });
      return json({ error: 'recommendation engine rate limited; try again shortly' }, 503);
    }
    if (isTimeoutError(e)) {
      safeLog('warn', 'arnold-cross-reference-recommend timeout', { user_id: user.id });
      return json({ error: 'recommendation engine timed out' }, 504);
    }
    safeLog('error', 'arnold-cross-reference-recommend failed', { user_id: user.id, error: String(e) });
    return json({ error: 'recommendation generation failed' }, 502);
  }

  // Persist
  const sa = admin();
  const insertResult = await sa.from('body_tracker_recommendations').insert({
    user_id: user.id,
    recommendation_text: parsed.recommendation,
    source_ids: parsed.sources,
    confidence_tier: tier.tier,
    confidence_pct: tier.pct,
    ai_model: REC_MODEL,
  } as never).select('id, generated_at').single();

  if (insertResult.error || !insertResult.data) {
    safeLog('error', 'arnold-cross-reference-recommend persist failed', {
      user_id: user.id,
      error: insertResult.error?.message ?? 'no data',
    });
    return json({ error: 'persist failed' }, 500);
  }

  const row = insertResult.data as { id: string; generated_at: string };
  return json({
    id: row.id,
    recommendation: parsed.recommendation,
    sources: parsed.sources,
    confidence_tier: tier.tier,
    confidence_pct: tier.pct,
    generated_at: row.generated_at,
    cached: false,
  });
});
