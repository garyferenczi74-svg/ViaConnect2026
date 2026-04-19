// Prompt #92 Phase 5: Engagement score engine.
//
// Computes a 0..100 composite from four components. The output is the only
// shape practitioners see (per consent). Zero Helix internals leak through
// this engine; there is no import of anything under '@/lib/helix' or any
// '@/types/helix' type. Firewall is enforced by absence.

import type { PricingSupabaseClient } from '@/lib/pricing/supabase-types';

export interface EngagementComponents {
  protocolAdherence: number;       // 0..100
  assessmentEngagement: number;    // 0..100
  trackingConsistency: number;     // 0..100
  outcomeTrajectory: number;       // 0..100
}

export interface EngagementComposite extends EngagementComponents {
  composite: number;               // 0..100
}

/** Weighted composite matching the Prompt #92 specification.
 *  adherence 35% + assessment 20% + tracking 25% + outcome 20% = 100% */
export const COMPONENT_WEIGHTS = {
  protocolAdherence: 0.35,
  assessmentEngagement: 0.20,
  trackingConsistency: 0.25,
  outcomeTrajectory: 0.20,
} as const;

// ----- Pure component normalizers -----------------------------------------

/** Pure: average of per-supplement adherence_percent values. Returns 50
 *  (neutral) when the user has no active supplements. */
export function normalizeProtocolAdherence(perSupplementAdherencePercents: number[]): number {
  if (perSupplementAdherencePercents.length === 0) return 50;
  const clamped = perSupplementAdherencePercents.map((p) => clamp01to100(p));
  const avg = clamped.reduce((s, v) => s + v, 0) / clamped.length;
  return Math.round(avg);
}

/** Pure: CAQ reassessments and lab uploads inside the period.
 *  Up to 40 points for 2+ reassessments, up to 30 for 2+ lab uploads,
 *  remaining 30 split evenly (baseline participation = 30).
 *  Caps at 100. */
export function normalizeAssessmentEngagement(params: {
  reassessmentCount: number;
  labUploadCount: number;
}): number {
  const reassessmentPts = Math.min(40, params.reassessmentCount * 20);
  const labPts = Math.min(30, params.labUploadCount * 15);
  const baseline = 30; // for any authenticated presence in the period
  return Math.min(100, reassessmentPts + labPts + baseline);
}

/** Pure: fraction of days in the period that had at least one log. */
export function normalizeTrackingConsistency(params: {
  uniqueLoggedDays: number;
  totalDaysInPeriod: number;
}): number {
  if (params.totalDaysInPeriod <= 0) return 0;
  const ratio = params.uniqueLoggedDays / params.totalDaysInPeriod;
  return clamp01to100(Math.round(ratio * 100));
}

/** Pure: normalize Bio Optimization Score delta.
 *  +10 points = 100 (excellent), flat = 50 (maintaining), -10 = 0 (regressing). */
export function normalizeOutcomeTrajectory(params: {
  startScore: number | null;
  endScore: number | null;
}): number {
  if (params.startScore === null || params.endScore === null) return 50;
  const delta = params.endScore - params.startScore;
  return clamp01to100(50 + Math.round(delta * 5));
}

/** Pure: weighted average of four components. Rounds to integer. */
export function composeScore(components: EngagementComponents): number {
  const c = components;
  const weighted =
    clamp01to100(c.protocolAdherence)     * COMPONENT_WEIGHTS.protocolAdherence +
    clamp01to100(c.assessmentEngagement)  * COMPONENT_WEIGHTS.assessmentEngagement +
    clamp01to100(c.trackingConsistency)   * COMPONENT_WEIGHTS.trackingConsistency +
    clamp01to100(c.outcomeTrajectory)     * COMPONENT_WEIGHTS.outcomeTrajectory;
  return Math.round(weighted);
}

function clamp01to100(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

// ----- DB-backed aggregates ------------------------------------------------

export interface ComputeRequest {
  userId: string;
  periodStart: Date;
  periodEnd: Date;
}

export interface ComputeResult extends EngagementComposite {
  periodStart: Date;
  periodEnd: Date;
  helixActivityCount: number;
}

/** Compute an engagement score snapshot for the given user + period. */
export async function computeEngagementScore(
  client: PricingSupabaseClient,
  req: ComputeRequest,
): Promise<ComputeResult> {
  const [adherence, assessment, tracking, outcome, helixCount] = await Promise.all([
    computeProtocolAdherence(client, req),
    computeAssessmentEngagement(client, req),
    computeTrackingConsistency(client, req),
    computeOutcomeTrajectory(client, req),
    countHelixActivity(client, req),
  ]);

  const components: EngagementComponents = {
    protocolAdherence: adherence,
    assessmentEngagement: assessment,
    trackingConsistency: tracking,
    outcomeTrajectory: outcome,
  };
  return {
    ...components,
    composite: composeScore(components),
    periodStart: req.periodStart,
    periodEnd: req.periodEnd,
    helixActivityCount: helixCount,
  };
}

async function computeProtocolAdherence(
  client: PricingSupabaseClient,
  req: ComputeRequest,
): Promise<number> {
  // Pull adherence_percent for this user's current supplements (those linked
  // to the user_current_supplements roster).
  const { data: current } = await client
    .from('user_current_supplements')
    .select('supplement_name')
    .eq('user_id', req.userId)
    .eq('is_current', true);
  const names = ((current ?? []) as Array<{ supplement_name: string }>).map((s) => s.supplement_name);
  if (names.length === 0) return normalizeProtocolAdherence([]);

  const { data: adherence } = await client
    .from('supplement_adherence')
    .select('adherence_percent, supplement_name')
    .eq('user_id', req.userId)
    .in('supplement_name', names);

  const percents = ((adherence ?? []) as Array<{ adherence_percent: number | null }>)
    .map((row) => Number(row.adherence_percent ?? 0));
  return normalizeProtocolAdherence(percents);
}

async function computeAssessmentEngagement(
  client: PricingSupabaseClient,
  req: ComputeRequest,
): Promise<number> {
  const startIso = req.periodStart.toISOString();
  const endIso = req.periodEnd.toISOString();
  const { count: reassessmentCount } = await client
    .from('assessment_results')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', req.userId)
    .gte('created_at', startIso)
    .lte('created_at', endIso);
  // Lab uploads: the project doesn't have a canonical `lab_uploads` table yet;
  // count zero for now. Wire this in when the lab upload pipeline lands.
  return normalizeAssessmentEngagement({
    reassessmentCount: reassessmentCount ?? 0,
    labUploadCount: 0,
  });
}

async function computeTrackingConsistency(
  client: PricingSupabaseClient,
  req: ComputeRequest,
): Promise<number> {
  const startIso = req.periodStart.toISOString();
  const endIso = req.periodEnd.toISOString();
  const totalDays = Math.max(
    1,
    Math.ceil((req.periodEnd.getTime() - req.periodStart.getTime()) / (1000 * 60 * 60 * 24)),
  );

  const { data: checkins } = await client
    .from('daily_checkins')
    .select('created_at')
    .eq('user_id', req.userId)
    .gte('created_at', startIso)
    .lte('created_at', endIso);

  const days = new Set<string>();
  for (const row of ((checkins ?? []) as Array<{ created_at: string }>)) {
    days.add(row.created_at.slice(0, 10));
  }

  const { data: meals } = await client
    .from('meal_logs')
    .select('meal_date')
    .eq('user_id', req.userId)
    .gte('meal_date', startIso.slice(0, 10))
    .lte('meal_date', endIso.slice(0, 10));
  for (const row of ((meals ?? []) as Array<{ meal_date: string | null }>)) {
    if (row.meal_date) days.add(row.meal_date);
  }

  return normalizeTrackingConsistency({
    uniqueLoggedDays: days.size,
    totalDaysInPeriod: totalDays,
  });
}

async function computeOutcomeTrajectory(
  client: PricingSupabaseClient,
  req: ComputeRequest,
): Promise<number> {
  const startIso = req.periodStart.toISOString();
  const endIso = req.periodEnd.toISOString();
  const { data } = await client
    .from('bio_optimization_history')
    .select('score, created_at')
    .eq('user_id', req.userId)
    .gte('created_at', startIso)
    .lte('created_at', endIso)
    .order('created_at', { ascending: true });

  const rows = (data ?? []) as Array<{ score: number | null; created_at: string }>;
  if (rows.length < 2) return normalizeOutcomeTrajectory({ startScore: null, endScore: null });
  const startScore = Number(rows[0].score ?? 0);
  const endScore = Number(rows[rows.length - 1].score ?? 0);
  return normalizeOutcomeTrajectory({ startScore, endScore });
}

/** Counts Helix activity as an audit-only metric on the snapshot.
 *  This is the only place the engagement engine touches Helix tables, and
 *  it reads ONLY the count; it never surfaces Helix fields in any response. */
async function countHelixActivity(
  client: PricingSupabaseClient,
  req: ComputeRequest,
): Promise<number> {
  const startIso = req.periodStart.toISOString();
  const endIso = req.periodEnd.toISOString();
  const { count } = await client
    .from('helix_transactions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', req.userId)
    .gte('created_at', startIso)
    .lte('created_at', endIso);
  return count ?? 0;
}

/** Persist a computed score snapshot (upsert on user_id + period_end_date). */
export async function upsertEngagementSnapshot(
  client: PricingSupabaseClient,
  userId: string,
  result: ComputeResult,
): Promise<void> {
  const endDate = result.periodEnd.toISOString().slice(0, 10);
  const startDate = result.periodStart.toISOString().slice(0, 10);
  const { error } = await client.from('engagement_score_snapshots').upsert(
    {
      user_id: userId,
      score: result.composite,
      protocol_adherence_score: result.protocolAdherence,
      assessment_engagement_score: result.assessmentEngagement,
      tracking_consistency_score: result.trackingConsistency,
      outcome_trajectory_score: result.outcomeTrajectory,
      period_start_date: startDate,
      period_end_date: endDate,
      helix_activity_count: result.helixActivityCount,
    } as never,
    { onConflict: 'user_id,period_end_date' },
  );
  if (error) throw new Error(`Failed to upsert engagement snapshot: ${error.message}`);
}
