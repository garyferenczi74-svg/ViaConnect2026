// =============================================================================
// arnold-chronic-risk-compute Edge Function (Prompt #85c Phase 5b)
// =============================================================================
// Conservative seed compute pipeline. Reads CAQ + user_health_profile +
// body_tracker + genetic_profiles, counts indicator flags per condition,
// derives a deterministic riskScore + severity bucket. NOT a clinical
// scoring engine. Spec §8.1 INFORMATIONAL ONLY: never diagnose, never
// prescribe. All UI copy uses "areas to discuss with your healthcare provider".
//
// Hannah is the owner of any future scoring formula refinement; this V1
// is intentionally simple so it can be replaced without UI churn.
//
// Request:  POST {}  Bearer JWT required.
// Response: { id, assessment_date, overall_score, overall_grade, conditions, sources_used }
// =============================================================================

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { safeLog } from '../_shared/safe-log.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const ANON_KEY     = Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

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

type Severity = 'None' | 'Low' | 'Moderate' | 'High';
type Trend = 'up' | 'down' | 'stable';
type DataSource = 'body_tracker' | 'caq' | 'genex360' | 'lab_results';

interface TrackedCondition {
  name: string;
  riskScore: number;
  severity: Severity;
  trend: Trend;
  indicators: string[];
}

const POINTS_PER_INDICATOR = 25;

function severityFromScore(score: number): Severity {
  if (score <= 0) return 'None';
  if (score <= 25) return 'Low';
  if (score <= 50) return 'Moderate';
  return 'High';
}

function gradeFromOverallScore(score: number): string {
  if (score >= 95) return 'A+';
  if (score >= 90) return 'A';
  if (score >= 85) return 'A-';
  if (score >= 80) return 'B+';
  if (score >= 75) return 'B';
  if (score >= 70) return 'B-';
  if (score >= 65) return 'C+';
  if (score >= 60) return 'C';
  if (score >= 55) return 'C-';
  if (score >= 50) return 'D+';
  if (score >= 45) return 'D';
  return 'F';
}

// Tolerant string-match against a JSONB array of strings.
function arrayMatchesAny(arr: unknown, needles: string[]): boolean {
  if (!Array.isArray(arr)) return false;
  for (const item of arr) {
    if (typeof item !== 'string') continue;
    const hay = item.toLowerCase();
    for (const n of needles) {
      if (hay.includes(n)) return true;
    }
  }
  return false;
}

interface ContextInputs {
  family_history: unknown;
  existing_conditions: unknown;
  caq_current_conditions: unknown;
  weight_lbs: number | null;
  body_fat_pct: number | null;
  resting_hr_bpm: number | null;
  hrv_ms: number | null;
  metabolic_age: number | null;
  has_genetics: boolean;
  has_caq: boolean;
  has_body_tracker: boolean;
  has_health_profile: boolean;
}

function buildConditions(ctx: ContextInputs): TrackedCondition[] {
  const conditions: TrackedCondition[] = [];

  // Type 2 Diabetes
  {
    const ind: string[] = [];
    if (arrayMatchesAny(ctx.family_history, ['diabetes', 'type 2', 't2d'])) ind.push('family history of diabetes');
    if (arrayMatchesAny(ctx.existing_conditions, ['diabetes', 'prediabetes'])) ind.push('existing diabetes related condition');
    if (arrayMatchesAny(ctx.caq_current_conditions, ['diabetes', 'prediabetes'])) ind.push('CAQ noted diabetes related condition');
    if (ctx.body_fat_pct !== null && ctx.body_fat_pct >= 32) ind.push('body fat above 32 percent');
    const score = Math.min(100, ind.length * POINTS_PER_INDICATOR);
    conditions.push({
      name: 'Type 2 Diabetes',
      riskScore: score,
      severity: severityFromScore(score),
      trend: 'stable',
      indicators: ind,
    });
  }

  // Cardiovascular
  {
    const ind: string[] = [];
    if (arrayMatchesAny(ctx.family_history, ['heart disease', 'stroke', 'cardiovascular', 'hypertension'])) ind.push('family history of cardiovascular disease');
    if (arrayMatchesAny(ctx.existing_conditions, ['hypertension', 'high blood pressure', 'heart disease'])) ind.push('existing cardiovascular condition');
    if (arrayMatchesAny(ctx.caq_current_conditions, ['hypertension', 'high blood pressure', 'heart disease'])) ind.push('CAQ noted cardiovascular condition');
    if (ctx.resting_hr_bpm !== null && ctx.resting_hr_bpm > 80) ind.push('elevated resting heart rate');
    const score = Math.min(100, ind.length * POINTS_PER_INDICATOR);
    conditions.push({
      name: 'Cardiovascular Disease',
      riskScore: score,
      severity: severityFromScore(score),
      trend: 'stable',
      indicators: ind,
    });
  }

  // Metabolic Syndrome
  {
    const ind: string[] = [];
    if (arrayMatchesAny(ctx.family_history, ['metabolic syndrome', 'obesity'])) ind.push('family history of metabolic concerns');
    if (arrayMatchesAny(ctx.existing_conditions, ['metabolic syndrome'])) ind.push('existing metabolic syndrome');
    if (ctx.body_fat_pct !== null && ctx.body_fat_pct >= 32) ind.push('body fat above 32 percent');
    if (ctx.hrv_ms !== null && ctx.hrv_ms < 30) ind.push('reduced heart rate variability');
    if (ctx.metabolic_age !== null && ctx.metabolic_age >= 45) ind.push('elevated metabolic age reading');
    const score = Math.min(100, ind.length * POINTS_PER_INDICATOR);
    conditions.push({
      name: 'Metabolic Syndrome',
      riskScore: score,
      severity: severityFromScore(score),
      trend: 'stable',
      indicators: ind,
    });
  }

  // Cognitive Health (Alzheimer's adjacent)
  {
    const ind: string[] = [];
    if (arrayMatchesAny(ctx.family_history, ['alzheimer', 'dementia', 'cognitive'])) ind.push('family history of cognitive decline');
    if (arrayMatchesAny(ctx.existing_conditions, ['alzheimer', 'dementia', 'cognitive'])) ind.push('existing cognitive condition');
    if (ctx.hrv_ms !== null && ctx.hrv_ms < 30) ind.push('reduced heart rate variability');
    const score = Math.min(100, ind.length * POINTS_PER_INDICATOR);
    conditions.push({
      name: 'Cognitive Health',
      riskScore: score,
      severity: severityFromScore(score),
      trend: 'stable',
      indicators: ind,
    });
  }

  // Bone Density
  {
    const ind: string[] = [];
    if (arrayMatchesAny(ctx.family_history, ['osteoporosis', 'osteopenia', 'bone'])) ind.push('family history of bone density concerns');
    if (arrayMatchesAny(ctx.existing_conditions, ['osteoporosis', 'osteopenia'])) ind.push('existing bone density condition');
    const score = Math.min(100, ind.length * POINTS_PER_INDICATOR);
    conditions.push({
      name: 'Bone Density',
      riskScore: score,
      severity: severityFromScore(score),
      trend: 'stable',
      indicators: ind,
    });
  }

  return conditions;
}

function summarize(conditions: TrackedCondition[], overallScore: number, sources: DataSource[]): string {
  const elevated = conditions.filter((c) => c.severity === 'Moderate' || c.severity === 'High');
  if (elevated.length === 0) {
    return `Indicators show no elevated areas across ${conditions.length} tracked conditions, drawn from ${sources.length} data source${sources.length === 1 ? '' : 's'}. Areas to discuss with your healthcare provider at routine checkups.`;
  }
  const names = elevated.map((c) => c.name).join(', ');
  return `${elevated.length} tracked condition${elevated.length === 1 ? '' : 's'} flagged moderate or higher: ${names}. These are areas to discuss with your healthcare provider; not a diagnosis.`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders() });
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);

  const auth = req.headers.get('authorization') ?? '';
  const jwt = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!jwt) return json({ error: 'unauthorized' }, 401);

  const sb = userClient(jwt);
  const { data: userData } = await sb.auth.getUser();
  const user = userData?.user;
  if (!user) return json({ error: 'unauthorized' }, 401);

  try {
    const [healthRes, caqRes, weightRes, metabRes, genRes] = await Promise.all([
      sb.from('user_health_profile')
        .select('family_history, existing_conditions')
        .eq('user_id', user.id).maybeSingle(),
      sb.from('clinical_assessments')
        .select('current_conditions, completed')
        .eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      sb.from('body_tracker_weight')
        .select('weight_lbs, body_fat_pct')
        .eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      sb.from('body_tracker_metabolic')
        .select('metabolic_age, resting_hr_bpm, hrv_ms')
        .eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      sb.from('genetic_profiles')
        .select('mthfr_status, comt_status, cyp2d6_status')
        .eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    ]);

    const health = healthRes.data as { family_history?: unknown; existing_conditions?: unknown } | null;
    const caq = caqRes.data as { current_conditions?: unknown; completed?: boolean } | null;
    const weight = weightRes.data as { weight_lbs?: number; body_fat_pct?: number } | null;
    const metab = metabRes.data as { metabolic_age?: number; resting_hr_bpm?: number; hrv_ms?: number } | null;
    const gen = genRes.data as { mthfr_status?: string; comt_status?: string; cyp2d6_status?: string } | null;

    const inputs: ContextInputs = {
      family_history: health?.family_history ?? [],
      existing_conditions: health?.existing_conditions ?? [],
      caq_current_conditions: caq?.current_conditions ?? [],
      weight_lbs: weight?.weight_lbs ?? null,
      body_fat_pct: weight?.body_fat_pct ?? null,
      resting_hr_bpm: metab?.resting_hr_bpm ?? null,
      hrv_ms: metab?.hrv_ms ?? null,
      metabolic_age: metab?.metabolic_age ?? null,
      has_genetics: Boolean(gen && (gen.mthfr_status || gen.comt_status || gen.cyp2d6_status)),
      has_caq: Boolean(caq?.completed),
      has_body_tracker: Boolean(weight || metab),
      has_health_profile: Boolean(health),
    };

    const sources: DataSource[] = [];
    if (inputs.has_body_tracker) sources.push('body_tracker');
    if (inputs.has_caq || inputs.has_health_profile) sources.push('caq');
    if (inputs.has_genetics) sources.push('genex360');
    // lab_results intentionally omitted: stub per Gary 2026-05-07 directive.

    const conditions = buildConditions(inputs);
    const avgRisk = conditions.length > 0
      ? conditions.reduce((acc, c) => acc + c.riskScore, 0) / conditions.length
      : 0;
    const overallScore = Math.max(0, Math.min(100, Math.round(100 - avgRisk)));
    const overallGrade = gradeFromOverallScore(overallScore);
    const arnoldSummary = summarize(conditions, overallScore, sources);

    // Persist via admin client; UNIQUE(user_id, assessment_date) means a same-day
    // recompute upserts the row.
    const sa = admin();
    const today = new Date().toISOString().slice(0, 10);
    const upsertResult = await sa.from('body_tracker_chronic_risk').upsert({
      user_id: user.id,
      assessment_date: today,
      overall_score: overallScore,
      overall_grade: overallGrade,
      conditions,
      data_sources_used: sources,
      arnold_summary: arnoldSummary,
    } as never, { onConflict: 'user_id,assessment_date' } as never)
      .select('id, assessment_date')
      .single();

    if (upsertResult.error || !upsertResult.data) {
      safeLog.error('arnold-chronic-risk-compute', 'persist failed', {
        user_id: user.id,
        error: upsertResult.error?.message ?? 'no data',
      });
      return json({ error: 'persist failed' }, 500);
    }

    const row = upsertResult.data as { id: string; assessment_date: string };
    safeLog.info('arnold-chronic-risk-compute', 'computed', {
      user_id: user.id,
      overall_score: overallScore,
      condition_count: conditions.length,
      sources_used: sources,
    });

    return json({
      id: row.id,
      assessment_date: row.assessment_date,
      overall_score: overallScore,
      overall_grade: overallGrade,
      conditions,
      sources_used: sources,
      arnold_summary: arnoldSummary,
    });
  } catch (e) {
    safeLog.error('arnold-chronic-risk-compute', 'failed', {
      user_id: user.id,
      error: String(e),
    });
    return json({ error: 'compute failed' }, 502);
  }
});
