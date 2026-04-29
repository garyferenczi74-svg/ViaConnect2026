// =============================================================================
// archetype-refinement-tick Edge Function
// =============================================================================
// Daily sweep over customer_archetypes that:
//   1. Picks rows assigned at least 7 days ago whose assigned_from is NOT
//      'manual_admin_override' (those are sticky).
//   2. Re-classifies the user using CAQ + behavioral signals.
//   3. Applies shouldUpdatePrimaryArchetype: only swap the primary when the
//      refined run has gap > REFINEMENT_CONFIDENCE_GAP and the refined
//      primary differs from the current one. Otherwise touch-update the
//      existing row's confidence + signal_payload.
//
// Heartbeats to ultrathink_agent_registry on every run for Jeffery.
// =============================================================================

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { isTimeoutError } from '../_shared/with-timeout.ts';
import { safeLog } from '../_shared/safe-log.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const REFINEMENT_CONFIDENCE_GAP = 0.15;
const BATCH_SIZE = 250;
const MIN_AGE_DAYS_BEFORE_REFINEMENT = 7;

const ARCHETYPE_IDS = [
  'precision_wellness_seeker',
  'biohacker_optimizer',
  'chronic_condition_navigator',
  'preventive_health_parent',
  'performance_athlete',
  'longevity_investor',
  'genetic_curious_explorer',
] as const;
type ArchetypeId = typeof ARCHETYPE_IDS[number];
type ArchetypeScores = Record<ArchetypeId, number>;

function admin(): SupabaseClient {
  return createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'authorization, content-type',
    },
  });
}

async function heartbeat(
  db: SupabaseClient,
  runId: string,
  ok: boolean,
  payload: Record<string, unknown>,
) {
  try {
    await db.rpc('ultrathink_agent_heartbeat', {
      p_agent_name: 'archetype-refinement-tick',
      p_run_id: runId,
      p_event_type: ok ? 'heartbeat' : 'error',
      p_payload: payload,
      p_severity: ok ? 'info' : 'warning',
    });
  } catch (e) {
    console.warn('[archetype-refinement-tick] heartbeat failed', (e as Error).message);
  }
}

// ---------------------------------------------------------------------------
// Inline copies of pure scoring + refinement logic. We inline because Deno
// edge runtime does not consume @/lib paths from the Next.js app. Keep
// numerics in lockstep with src/lib/analytics/archetype-engine.ts +
// behavioral-refinement.ts.
// ---------------------------------------------------------------------------

interface CAQSignal {
  age_years: number | null;
  biological_sex: string | null;
  primary_goals: string[];
  current_conditions: string[];
  diet_type: string | null;
  exercise_frequency: string | null;
  stress_level: string | null;
  previous_herbal_experience: boolean | null;
  has_dependent_minors: boolean;
  education_level: string | null;
  income_band: string | null;
}

interface BehavioralSignal {
  platinum_subscription: boolean;
  family_subscription: boolean;
  genex360_complete_purchased: boolean;
  genex360_core_purchased: boolean;
  avg_monthly_aov_cents: number;
  protocol_adherence_rate: number;
  practitioner_attached: boolean;
  distinct_supplement_categories: number;
  days_since_signup: number;
}

const clamp01 = (n: number) => Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 0;
const inAgeRange = (age: number | null, lo: number, hi: number) => age !== null && age >= lo && age <= hi;
const goalsHave = (goals: string[], match: string[]) => {
  const set = new Set(goals.map((g) => g.toLowerCase()));
  return match.some((m) => set.has(m.toLowerCase()));
};

function scoreArchetypes(caq: CAQSignal, b?: BehavioralSignal): ArchetypeScores {
  const s: ArchetypeScores = {
    precision_wellness_seeker: 0,
    biohacker_optimizer: 0,
    chronic_condition_navigator: 0,
    preventive_health_parent: 0,
    performance_athlete: 0,
    longevity_investor: 0,
    genetic_curious_explorer: 0,
  };

  // precision_wellness_seeker
  let pw = 0;
  if (inAgeRange(caq.age_years, 30, 50)) pw += 0.20;
  if (caq.education_level === 'graduate' || caq.education_level === 'bachelors') pw += 0.15;
  if (goalsHave(caq.primary_goals, ['optimize_wellness', 'optimize', 'precision', 'data', 'personalization'])) pw += 0.30;
  if (goalsHave(caq.primary_goals, ['prevention'])) pw += 0.10;
  if (goalsHave(caq.primary_goals, ['longevity'])) pw += 0.10;
  s.precision_wellness_seeker = clamp01(pw);

  // biohacker_optimizer
  let bo = 0;
  if (inAgeRange(caq.age_years, 25, 45)) bo += 0.20;
  if (caq.biological_sex === 'male') bo += 0.10;
  if (goalsHave(caq.primary_goals, ['cognition', 'cognitive', 'nootropics', 'peak_performance'])) bo += 0.30;
  if (goalsHave(caq.primary_goals, ['performance', 'recovery'])) bo += 0.20;
  if (caq.exercise_frequency === 'daily' || caq.exercise_frequency === 'few_times_week') bo += 0.10;
  s.biohacker_optimizer = clamp01(bo);

  // chronic_condition_navigator
  let cc = 0;
  if (caq.current_conditions.length > 0) cc += 0.40;
  if (caq.current_conditions.length >= 2) cc += 0.10;
  if (goalsHave(caq.primary_goals, ['symptom_relief', 'root_cause', 'manage_condition'])) cc += 0.25;
  if (caq.stress_level === 'high') cc += 0.05;
  if (inAgeRange(caq.age_years, 35, 65)) cc += 0.10;
  s.chronic_condition_navigator = clamp01(cc);

  // preventive_health_parent
  let ph = 0;
  if (caq.has_dependent_minors) ph += 0.35;
  if (inAgeRange(caq.age_years, 30, 50)) ph += 0.15;
  if (goalsHave(caq.primary_goals, ['family_wellness', 'family', 'kids_health', 'pediatric'])) ph += 0.30;
  if (goalsHave(caq.primary_goals, ['prevention', 'clean_ingredients'])) ph += 0.10;
  s.preventive_health_parent = clamp01(ph);

  // performance_athlete
  let pa = 0;
  if (caq.exercise_frequency === 'daily') pa += 0.30;
  else if (caq.exercise_frequency === 'few_times_week') pa += 0.15;
  if (goalsHave(caq.primary_goals, ['performance', 'recovery', 'endurance', 'strength', 'body_composition'])) pa += 0.30;
  if (inAgeRange(caq.age_years, 18, 55)) pa += 0.10;
  if (goalsHave(caq.primary_goals, ['athlete'])) pa += 0.10;
  s.performance_athlete = clamp01(pa);

  // longevity_investor
  let li = 0;
  if ((caq.age_years ?? 0) >= 45) li += 0.25;
  if (goalsHave(caq.primary_goals, ['longevity', 'healthspan', 'biomarkers', 'cutting_edge'])) li += 0.35;
  if (caq.income_band === 'over_500k' || caq.income_band === '250k_500k') li += 0.20;
  if (caq.education_level === 'graduate') li += 0.05;
  s.longevity_investor = clamp01(li);

  // genetic_curious_explorer
  let gc = 0;
  if (goalsHave(caq.primary_goals, ['genetic_insight', 'curiosity', 'genetic', 'discovery'])) gc += 0.30;
  if (caq.current_conditions.length === 0 && caq.exercise_frequency === null) gc += 0.10;
  if (caq.previous_herbal_experience !== true) gc += 0.05;
  gc += 0.05;
  s.genetic_curious_explorer = clamp01(gc);

  if (b) {
    s.longevity_investor = clamp01(s.longevity_investor +
      (b.platinum_subscription ? 0.05 : 0) +
      (b.genex360_complete_purchased ? 0.10 : 0) +
      (b.avg_monthly_aov_cents >= 30_000 ? 0.05 : 0));
    s.biohacker_optimizer = clamp01(s.biohacker_optimizer +
      (b.distinct_supplement_categories >= 5 ? 0.07 : 0) +
      (b.genex360_complete_purchased ? 0.05 : 0) +
      (b.avg_monthly_aov_cents >= 25_000 && b.avg_monthly_aov_cents < 35_000 ? 0.03 : 0));
    s.chronic_condition_navigator = clamp01(s.chronic_condition_navigator +
      (b.practitioner_attached ? 0.10 : 0) +
      (b.protocol_adherence_rate >= 0.8 ? 0.05 : 0));
    s.preventive_health_parent = clamp01(s.preventive_health_parent +
      (b.family_subscription ? 0.15 : 0));
    s.precision_wellness_seeker = clamp01(s.precision_wellness_seeker +
      (b.platinum_subscription ? 0.05 : 0) +
      (b.protocol_adherence_rate >= 0.7 ? 0.05 : 0));
  }

  return s;
}

interface RankedAssignment { archetype_id: ArchetypeId; score: number }

function rank(scores: ArchetypeScores): RankedAssignment[] {
  return (Object.entries(scores) as Array<[ArchetypeId, number]>)
    .sort((a, b) => b[1] - a[1])
    .map(([id, score]) => ({ archetype_id: id, score }));
}

function ageFromDob(dob: string | null): number | null {
  if (!dob) return null;
  const d = new Date(`${dob}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return null;
  return Math.floor((Date.now() - d.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
}

async function loadCAQ(db: SupabaseClient, userId: string): Promise<CAQSignal | null> {
  const { data: caq } = await db
    .from('clinical_assessments')
    .select('biological_sex, primary_goals, current_conditions, diet_type, exercise_frequency, stress_level, previous_herbal_experience, date_of_birth')
    .eq('user_id', userId)
    .eq('completed', true)
    .order('completed_at', { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();
  if (!caq) return null;
  const { data: profile } = await db
    .from('profiles')
    .select('education_level, income_band, has_dependent_minors')
    .eq('id', userId)
    .maybeSingle();
  return {
    age_years: ageFromDob((caq.date_of_birth as string | null) ?? null),
    biological_sex: (caq.biological_sex as string | null) ?? null,
    primary_goals: (caq.primary_goals as string[] | null) ?? [],
    current_conditions: (caq.current_conditions as string[] | null) ?? [],
    diet_type: (caq.diet_type as string | null) ?? null,
    exercise_frequency: (caq.exercise_frequency as string | null) ?? null,
    stress_level: (caq.stress_level as string | null) ?? null,
    previous_herbal_experience: (caq.previous_herbal_experience as boolean | null) ?? null,
    has_dependent_minors: (profile?.has_dependent_minors as boolean | undefined) ?? false,
    education_level: (profile?.education_level as string | null | undefined) ?? null,
    income_band: (profile?.income_band as string | null | undefined) ?? null,
  };
}

async function loadBehavior(db: SupabaseClient, userId: string): Promise<BehavioralSignal> {
  const [{ data: m }, { data: f }, { data: g }, { data: o }, { data: p }] = await Promise.all([
    db.from('memberships').select('tier_id').eq('user_id', userId).order('started_at', { ascending: false }).limit(1).maybeSingle(),
    db.from('family_members').select('id').eq('primary_user_id', userId).eq('is_active', true).limit(1),
    db.from('genex360_purchases').select('product_id').eq('user_id', userId).eq('payment_status', 'paid'),
    db.from('shop_orders').select('total_cents, created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(12),
    db.from('practitioner_patients').select('id').eq('patient_id', userId).eq('status', 'active').limit(1),
  ]);
  const orders = (o ?? []) as Array<{ total_cents: number }>;
  const totalCents = orders.reduce((acc, x) => acc + (x.total_cents ?? 0), 0);
  const months = Math.max(1, Math.min(12, orders.length));
  const genexIds = ((g ?? []) as Array<{ product_id: string }>).map((x) => x.product_id);
  return {
    platinum_subscription: ((m as any)?.tier_id as string | undefined)?.startsWith('platinum') ?? false,
    family_subscription: (f ?? []).length > 0,
    genex360_complete_purchased: genexIds.includes('genex360_complete'),
    genex360_core_purchased: genexIds.includes('genex360_core'),
    avg_monthly_aov_cents: Math.round(totalCents / months),
    protocol_adherence_rate: 0,
    practitioner_attached: (p ?? []).length > 0,
    distinct_supplement_categories: 0,
    days_since_signup: 0,
  };
}

interface CARow {
  id: string;
  user_id: string;
  archetype_id: string;
  confidence_score: number;
  signal_payload: Record<string, unknown>;
  assigned_from: string;
  assigned_at: string;
}

async function refineUser(db: SupabaseClient, row: CARow): Promise<{ refined: boolean; updated: boolean; reason: string }> {
  const caq = await loadCAQ(db, row.user_id);
  if (!caq) return { refined: false, updated: false, reason: 'no_caq' };
  const behavior = await loadBehavior(db, row.user_id);
  const scores = scoreArchetypes(caq, behavior);
  const ranked = rank(scores);
  const top = ranked[0];
  const runnerUp = ranked[1] ?? { archetype_id: top.archetype_id, score: 0 };
  const gap = Number((top.score - runnerUp.score).toFixed(3));
  const newPayload = {
    caq,
    behavior,
    scores,
    refined_at: new Date().toISOString(),
  };

  if (top.archetype_id === row.archetype_id) {
    await db.from('customer_archetypes')
      .update({
        confidence_score: gap,
        signal_payload: newPayload,
        assigned_from: 'caq_refined_with_behavior',
        assigned_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', row.id);
    return { refined: true, updated: false, reason: 'same_primary_touch_updated' };
  }

  if (gap <= REFINEMENT_CONFIDENCE_GAP) {
    return { refined: true, updated: false, reason: `gap_${gap}_below_threshold_${REFINEMENT_CONFIDENCE_GAP}` };
  }

  await db.from('customer_archetypes')
    .update({ is_primary: false, updated_at: new Date().toISOString() })
    .eq('id', row.id);
  await db.from('customer_archetypes').insert({
    user_id: row.user_id,
    archetype_id: top.archetype_id,
    confidence_score: gap,
    assigned_from: 'caq_refined_with_behavior',
    signal_payload: newPayload,
    is_primary: true,
  });
  return { refined: true, updated: true, reason: `swapped_to_${top.archetype_id}` };
}

async function sweep(db: SupabaseClient): Promise<{ scanned: number; touched: number; swapped: number; skipped_no_caq: number; skipped_below_threshold: number }> {
  const cutoff = new Date(Date.now() - MIN_AGE_DAYS_BEFORE_REFINEMENT * 86_400_000).toISOString();
  const { data } = await db
    .from('customer_archetypes')
    .select('id, user_id, archetype_id, confidence_score, signal_payload, assigned_from, assigned_at')
    .eq('is_primary', true)
    .neq('assigned_from', 'manual_admin_override')
    .lt('assigned_at', cutoff)
    .order('assigned_at', { ascending: true })
    .limit(BATCH_SIZE);
  const rows = (data ?? []) as CARow[];

  let touched = 0, swapped = 0, skippedNoCaq = 0, skippedBelow = 0;
  for (const r of rows) {
    try {
      const result = await refineUser(db, r);
      if (!result.refined) skippedNoCaq++;
      else if (result.updated) swapped++;
      else if (result.reason.includes('below_threshold')) skippedBelow++;
      else touched++;
    } catch (e) {
      console.warn('[archetype-refinement-tick] user failed', r.user_id, (e as Error).message);
    }
  }

  return { scanned: rows.length, touched, swapped, skipped_no_caq: skippedNoCaq, skipped_below_threshold: skippedBelow };
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { status: 200 });

  const db = admin();
  const runId = crypto.randomUUID();
  const startedAt = Date.now();

  try {
    const stats = await sweep(db);
    await heartbeat(db, runId, true, { ...stats, durationMs: Date.now() - startedAt });
    return json({ status: 'ok', runId, ...stats });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    await heartbeat(db, runId, false, { error: msg });
    return json({ status: 'failed', error: msg }, 500);
  }
});
