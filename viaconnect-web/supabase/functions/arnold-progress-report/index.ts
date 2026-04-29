// =============================================================================
// arnold-progress-report Edge Function (Prompt #86B)
// =============================================================================
// Generates a comprehensive progress report comparing two analyzed photo
// sessions plus body_tracker metric deltas between the two session dates.
// Pure text Claude call; no Vision API.
//
// Request:  POST { before_session_id: string, after_session_id: string }
// Response: { status: 'complete' | 'failed', report?: {...} }
// =============================================================================

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { withTimeout, withAbortTimeout, isTimeoutError } from '../_shared/with-timeout.ts';
import { safeLog } from '../_shared/safe-log.ts';
import { getCircuitBreaker, isCircuitBreakerError } from '../_shared/circuit-breaker.ts';

const claudeBreaker = getCircuitBreaker('claude-api');

const SUPABASE_URL   = Deno.env.get('SUPABASE_URL')!;
const ANON_KEY       = Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE_KEY    = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANTHROPIC_KEY  = Deno.env.get('ANTHROPIC_API_KEY') ?? '';
const MODEL          = Deno.env.get('ARNOLD_REPORT_MODEL') ?? 'claude-sonnet-4-6';

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
  return createClient(SUPABASE_URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
}
function userClient(jwt: string): SupabaseClient {
  return createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function extractJson(raw: string): unknown {
  let s = raw.trim();
  s = s.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  const f = s.indexOf('{'); const l = s.lastIndexOf('}');
  if (f >= 0 && l > f) s = s.slice(f, l + 1);
  return JSON.parse(s);
}

const SYSTEM_PROMPT = `
You are Arnold, a body composition expert writing a progress report comparing two dated photo
sessions. Base your report on: (1) the pre analyzed visual assessments from both sessions, (2) the
numerical metric deltas between the sessions, (3) the active goals. Be specific, evidence based,
and encouraging without being dishonest.

Return VALID JSON ONLY, no prose outside the JSON, matching this schema:

{
  "periodSummary": "string",
  "visual": {
    "fatLossAreas": [ "string" ],
    "muscleGainAreas": [ "string" ],
    "unchangedAreas": [ "string" ],
    "overallTrajectory": "string"
  },
  "scenarioMatch": "scale_stall_visual_change" | "scale_down_no_visual_change" | "scale_up_looks_better" | "fast_initial_then_plateau" | "uneven_fat_loss" | "cyclical_appearance" | "other",
  "scenarioExplanation": "string",
  "recommendations": {
    "continue": [ "string" ],
    "adjust":   [ "string" ],
    "focus":    [ "string" ],
    "nextPhotoSession": "string"
  },
  "projections": {
    "if_continue_current":  { "bodyFat4weeks": number, "weight4weeks": number },
    "if_increase_training": { "bodyFat4weeks": number, "weight4weeks": number },
    "goalAchievementProjection": "string"
  },
  "confidence": 0.0
}

Rules:
- Keep recommendations specific and actionable, not generic.
- Flag scenario patterns honestly (e.g., scale stall with visible change = recomposition).
- For projections, extrapolate current trajectory; be conservative not aggressive.
- If less than 2 weeks between sessions, say so and note that changes within that window are mostly noise.
`.trim();

function round2(n: number | null): number | null {
  if (n === null || !Number.isFinite(n)) return null;
  return Math.round(n * 100) / 100;
}

async function loadMetricAt(db: SupabaseClient, userId: string, date: string) {
  // Pull the most recent body_tracker_weight, segmental_fat, segmental_muscle on or before `date`
  const { data: w } = await db
    .from('body_tracker_weight')
    .select('weight_lbs, body_fat_pct, waist_in, hips_in, created_at, entry_id')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(5);
  const { data: f } = await db
    .from('body_tracker_segmental_fat')
    .select('total_body_fat_pct, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(5);
  const { data: m } = await db
    .from('body_tracker_segmental_muscle')
    .select('total_muscle_mass_lbs, skeletal_muscle_mass_lbs, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(5);

  const targetTs = new Date(date).getTime();
  function pick<T extends { created_at: string }>(rows: T[] | null): T | null {
    if (!rows || rows.length === 0) return null;
    const onOrBefore = rows.filter((r) => new Date(r.created_at).getTime() <= targetTs);
    return onOrBefore[0] ?? rows[rows.length - 1];
  }

  const weight   = pick(w as Array<{ created_at: string; weight_lbs: number | null; body_fat_pct: number | null; waist_in: number | null; hips_in: number | null }> | null);
  const fat      = pick(f as Array<{ created_at: string; total_body_fat_pct: number | null }> | null);
  const muscle   = pick(m as Array<{ created_at: string; total_muscle_mass_lbs: number | null; skeletal_muscle_mass_lbs: number | null }> | null);

  return {
    weight_lbs:      weight?.weight_lbs ?? null,
    body_fat_pct:    fat?.total_body_fat_pct ?? weight?.body_fat_pct ?? null,
    waist_in:        weight?.waist_in ?? null,
    hips_in:         weight?.hips_in ?? null,
    muscle_mass_lbs: muscle?.total_muscle_mass_lbs ?? null,
    smm_lbs:         muscle?.skeletal_muscle_mass_lbs ?? null,
  };
}

function dayDelta(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return json({ ok: true });
  if (req.method !== 'POST') return json({ error: 'POST required' }, 405);

  try {
    if (!ANTHROPIC_KEY) return json({ error: 'ANTHROPIC_API_KEY not configured' }, 500);
    const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer /i, '');
    if (!jwt) return json({ error: 'Missing JWT' }, 401);

    const body = await req.json().catch(() => ({}));
    const beforeId = body.before_session_id as string | undefined;
    const afterId  = body.after_session_id as string | undefined;
    if (!beforeId || !afterId) return json({ error: 'before_session_id and after_session_id required' }, 400);

    const uc = userClient(jwt);
    const { data: userInfo } = await uc.auth.getUser();
    const userId = userInfo.user?.id;
    if (!userId) return json({ error: 'Invalid JWT' }, 401);

    const db = admin();
    const { data: sessions } = await db
      .from('body_photo_sessions')
      .select('id, user_id, session_date, arnold_analysis, arnold_status')
      .in('id', [beforeId, afterId]);

    const rows = (sessions ?? []) as Array<{
      id: string; user_id: string; session_date: string; arnold_analysis: unknown; arnold_status: string;
    }>;
    const before = rows.find((r) => r.id === beforeId);
    const after  = rows.find((r) => r.id === afterId);
    if (!before || !after) return json({ error: 'Sessions not found' }, 404);
    if (before.user_id !== userId || after.user_id !== userId) return json({ error: 'Forbidden' }, 403);
    if (before.arnold_status !== 'complete' || after.arnold_status !== 'complete') {
      return json({ error: 'Both sessions must be analyzed before generating a report.' }, 400);
    }
    if (new Date(after.session_date).getTime() <= new Date(before.session_date).getTime()) {
      return json({ error: 'after_session must be more recent than before_session' }, 400);
    }

    const [beforeMetrics, afterMetrics] = await Promise.all([
      loadMetricAt(db, userId, before.session_date),
      loadMetricAt(db, userId, after.session_date),
    ]);

    const { data: goals } = await db
      .from('body_tracker_milestones')
      .select('title, target_value, target_unit, status')
      .eq('user_id', userId)
      .eq('status', 'active')
      .limit(5);

    const days = dayDelta(before.session_date, after.session_date);

    const userPrompt = [
      `PERIOD: ${before.session_date} to ${after.session_date} (${days} days)`,
      '',
      'BEFORE VISUAL ANALYSIS (JSON):',
      JSON.stringify(before.arnold_analysis, null, 2),
      '',
      'AFTER VISUAL ANALYSIS (JSON):',
      JSON.stringify(after.arnold_analysis, null, 2),
      '',
      'METRIC DELTAS (after minus before; nulls mean data missing at that date):',
      JSON.stringify({
        weight_lbs:      round2((afterMetrics.weight_lbs ?? 0) - (beforeMetrics.weight_lbs ?? 0)),
        body_fat_pct:    round2((afterMetrics.body_fat_pct ?? 0) - (beforeMetrics.body_fat_pct ?? 0)),
        waist_in:        round2((afterMetrics.waist_in ?? 0) - (beforeMetrics.waist_in ?? 0)),
        muscle_mass_lbs: round2((afterMetrics.muscle_mass_lbs ?? 0) - (beforeMetrics.muscle_mass_lbs ?? 0)),
        smm_lbs:         round2((afterMetrics.smm_lbs ?? 0) - (beforeMetrics.smm_lbs ?? 0)),
        raw_before: beforeMetrics,
        raw_after: afterMetrics,
      }, null, 2),
      '',
      'ACTIVE GOALS:',
      JSON.stringify(goals ?? [], null, 2),
      '',
      'Generate the progress report JSON now.',
    ].join('\n');

    let apiResponse: Response;
    try {
      apiResponse = await claudeBreaker.execute(() =>
        withAbortTimeout(
          (signal) => fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: { 'content-type': 'application/json', 'x-api-key': ANTHROPIC_KEY, 'anthropic-version': '2023-06-01' },
            body: JSON.stringify({
              model: MODEL,
              max_tokens: 2000,
              system: SYSTEM_PROMPT,
              messages: [{ role: 'user', content: userPrompt }],
            }),
            signal,
          }),
          15000,
          'edge-function.arnold-progress-report.claude-api',
        )
      );
    } catch (apiErr) {
      if (isCircuitBreakerError(apiErr)) {
        safeLog.warn('arnold.progress-report', 'claude circuit open', { userId, error: apiErr });
        return json({ status: 'failed', error: 'AI service temporarily unavailable. Please retry shortly.' }, 503);
      }
      if (isTimeoutError(apiErr)) {
        safeLog.warn('arnold.progress-report', 'claude timeout', { userId, error: apiErr });
        return json({ status: 'failed', error: 'Report generation timed out. Please try again.' }, 504);
      }
      safeLog.error('arnold.progress-report', 'claude fetch failed', { userId, error: apiErr });
      return json({ status: 'failed', error: 'AI service error.' }, 502);
    }

    if (!apiResponse.ok) {
      const errTxt = await apiResponse.text();
      safeLog.error('arnold.progress-report', 'claude non-2xx', { userId, status: apiResponse.status, errTxt: errTxt.slice(0, 200) });
      return json({ status: 'failed', error: `Report API ${apiResponse.status}: ${errTxt.slice(0, 500)}` }, 502);
    }

    const apiJson = await apiResponse.json();
    const text = (apiJson?.content?.[0]?.text ?? '') as string;
    let report: unknown;
    try { report = extractJson(text); }
    catch (e) {
      const msg = e instanceof Error ? e.message : 'parse error';
      return json({ status: 'failed', error: `Parse failure: ${msg}`, raw: text.slice(0, 500) }, 500);
    }

    return json({
      status: 'complete',
      report,
      period: { start: before.session_date, end: after.session_date, days },
      metricsBefore: beforeMetrics,
      metricsAfter: afterMetrics,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    safeLog.error('arnold.progress-report', 'fatal', { error: e });
    return json({ status: 'failed', error: msg }, 500);
  }
});
