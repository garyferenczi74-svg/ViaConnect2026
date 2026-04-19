// Prompt #92 Phase 5: daily engagement score snapshot job.
//
// POST with an admin/service JWT (or wire to pg_cron via pg_net) to compute a
// fresh 30 day engagement score for every user with an active paid membership
// and upsert it into engagement_score_snapshots.
//
// The function does NOT return any Helix internals in its response; the
// response shape is intentionally minimal.

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

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

serve(async (req) => {
  if (req.method === 'OPTIONS') return json({ ok: true });
  if (req.method !== 'POST') return json({ error: 'POST required' }, 405);

  if (!SUPABASE_URL || !SERVICE_KEY) {
    return json({ error: 'Service credentials not configured' }, 500);
  }

  const db = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const periodEnd = new Date();
  const periodStart = new Date(periodEnd);
  periodStart.setUTCDate(periodStart.getUTCDate() - 30);
  const startIso = periodStart.toISOString();
  const endIso = periodEnd.toISOString();

  const { data: members, error: memberErr } = await db
    .from('memberships')
    .select('user_id, status')
    .in('status', ['active', 'trialing', 'gift_active']);

  if (memberErr) {
    return json({ error: `Failed to list members: ${memberErr.message}` }, 500);
  }

  const userIds = Array.from(new Set(((members ?? []) as Array<{ user_id: string }>).map((m) => m.user_id)));
  let ok = 0;
  let failed = 0;
  const errors: Array<{ userId: string; error: string }> = [];

  for (const userId of userIds) {
    try {
      const result = await computeFor(db, userId, startIso, endIso);
      await db.from('engagement_score_snapshots').upsert(
        {
          user_id: userId,
          score: result.composite,
          protocol_adherence_score: result.protocolAdherence,
          assessment_engagement_score: result.assessmentEngagement,
          tracking_consistency_score: result.trackingConsistency,
          outcome_trajectory_score: result.outcomeTrajectory,
          period_start_date: startIso.slice(0, 10),
          period_end_date: endIso.slice(0, 10),
          helix_activity_count: result.helixActivityCount,
        },
        { onConflict: 'user_id,period_end_date' },
      );
      ok += 1;
    } catch (err) {
      failed += 1;
      errors.push({ userId, error: err instanceof Error ? err.message : 'unknown' });
    }
  }

  return json({
    processed: userIds.length,
    ok,
    failed,
    period_start: startIso,
    period_end: endIso,
    errors: errors.slice(0, 10),
  });
});

// ---- score computation (inlined for Deno isolation) ------------------------

interface ComputeResult {
  composite: number;
  protocolAdherence: number;
  assessmentEngagement: number;
  trackingConsistency: number;
  outcomeTrajectory: number;
  helixActivityCount: number;
}

const WEIGHTS = {
  protocolAdherence: 0.35,
  assessmentEngagement: 0.20,
  trackingConsistency: 0.25,
  outcomeTrajectory: 0.20,
};

function clamp(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

async function computeFor(db: SupabaseClient, userId: string, startIso: string, endIso: string): Promise<ComputeResult> {
  const [adherence, assessment, tracking, outcome, helixCount] = await Promise.all([
    computeAdherence(db, userId),
    computeAssessment(db, userId, startIso, endIso),
    computeTracking(db, userId, startIso, endIso),
    computeOutcome(db, userId, startIso, endIso),
    countHelix(db, userId, startIso, endIso),
  ]);
  const composite = Math.round(
    clamp(adherence) * WEIGHTS.protocolAdherence +
    clamp(assessment) * WEIGHTS.assessmentEngagement +
    clamp(tracking) * WEIGHTS.trackingConsistency +
    clamp(outcome) * WEIGHTS.outcomeTrajectory,
  );
  return {
    composite,
    protocolAdherence: Math.round(adherence),
    assessmentEngagement: Math.round(assessment),
    trackingConsistency: Math.round(tracking),
    outcomeTrajectory: Math.round(outcome),
    helixActivityCount: helixCount,
  };
}

async function computeAdherence(db: SupabaseClient, userId: string): Promise<number> {
  const { data: current } = await db
    .from('user_current_supplements')
    .select('supplement_name')
    .eq('user_id', userId)
    .eq('is_current', true);
  const names = ((current ?? []) as Array<{ supplement_name: string }>).map((s) => s.supplement_name);
  if (names.length === 0) return 50;
  const { data } = await db
    .from('supplement_adherence')
    .select('adherence_percent')
    .eq('user_id', userId)
    .in('supplement_name', names);
  const percents = ((data ?? []) as Array<{ adherence_percent: number | null }>).map((r) => Number(r.adherence_percent ?? 0));
  if (percents.length === 0) return 50;
  const avg = percents.reduce((s, v) => s + clamp(v), 0) / percents.length;
  return avg;
}

async function computeAssessment(db: SupabaseClient, userId: string, startIso: string, endIso: string): Promise<number> {
  const { count } = await db
    .from('assessment_results')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', startIso)
    .lte('created_at', endIso);
  const reassessmentPts = Math.min(40, (count ?? 0) * 20);
  return Math.min(100, reassessmentPts + 30); // baseline 30
}

async function computeTracking(db: SupabaseClient, userId: string, startIso: string, endIso: string): Promise<number> {
  const totalDays = Math.max(1, Math.ceil((new Date(endIso).getTime() - new Date(startIso).getTime()) / 86_400_000));
  const days = new Set<string>();
  const { data: c } = await db.from('daily_checkins').select('created_at').eq('user_id', userId).gte('created_at', startIso).lte('created_at', endIso);
  for (const r of ((c ?? []) as Array<{ created_at: string }>)) days.add(r.created_at.slice(0, 10));
  const { data: m } = await db.from('meal_logs').select('meal_date').eq('user_id', userId).gte('meal_date', startIso.slice(0, 10)).lte('meal_date', endIso.slice(0, 10));
  for (const r of ((m ?? []) as Array<{ meal_date: string | null }>)) if (r.meal_date) days.add(r.meal_date);
  return clamp((days.size / totalDays) * 100);
}

async function computeOutcome(db: SupabaseClient, userId: string, startIso: string, endIso: string): Promise<number> {
  const { data } = await db
    .from('bio_optimization_history')
    .select('score, created_at')
    .eq('user_id', userId)
    .gte('created_at', startIso)
    .lte('created_at', endIso)
    .order('created_at', { ascending: true });
  const rows = (data ?? []) as Array<{ score: number | null }>;
  if (rows.length < 2) return 50;
  const delta = Number(rows[rows.length - 1].score ?? 0) - Number(rows[0].score ?? 0);
  return clamp(50 + Math.round(delta * 5));
}

async function countHelix(db: SupabaseClient, userId: string, startIso: string, endIso: string): Promise<number> {
  const { count } = await db
    .from('helix_transactions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', startIso)
    .lte('created_at', endIso);
  return count ?? 0;
}
