// Prompt #94 Phase 5: Archetype classification engine.
//
// Pure scoring functions over a normalized CAQ signal + optional
// behavioral signal. The DB wrapper (classifyUserById, in this file)
// fetches the raw clinical_assessments row + recent behavioral data,
// normalizes them, calls the pure core, and returns the assignment that
// downstream code writes to customer_archetypes.
//
// Algorithm v1 is rule-based per spec. Each archetype's score function
// returns 0..1 from the most stable signals only. Behavioral signals
// nudge the rule-based score in the direction the spec describes (e.g.,
// platinum + GeneX360 Complete + high AOV → longevity_investor +0.15).

import type { SupabaseClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Taxonomy
// ---------------------------------------------------------------------------

export const ARCHETYPE_IDS = [
  'precision_wellness_seeker',
  'biohacker_optimizer',
  'chronic_condition_navigator',
  'preventive_health_parent',
  'performance_athlete',
  'longevity_investor',
  'genetic_curious_explorer',
] as const;
export type ArchetypeId = (typeof ARCHETYPE_IDS)[number];

// ---------------------------------------------------------------------------
// Signal shapes
// ---------------------------------------------------------------------------

export interface CAQSignal {
  age_years: number | null;
  biological_sex: 'male' | 'female' | 'other' | null;
  primary_goals: string[];
  current_conditions: string[];
  diet_type: string | null;
  exercise_frequency: 'never' | 'weekly' | 'few_times_week' | 'daily' | string | null;
  stress_level: 'low' | 'moderate' | 'high' | string | null;
  previous_herbal_experience: boolean | null;
  has_dependent_minors: boolean;
  education_level: 'none' | 'high_school' | 'bachelors' | 'graduate' | string | null;
  income_band:
    | 'under_50k' | '50k_100k' | '100k_250k' | '250k_500k' | 'over_500k' | string | null;
}

export interface BehavioralSignal {
  platinum_subscription: boolean;
  family_subscription: boolean;
  genex360_complete_purchased: boolean;
  genex360_core_purchased: boolean;
  avg_monthly_aov_cents: number;
  protocol_adherence_rate: number;     // 0..1
  practitioner_attached: boolean;
  distinct_supplement_categories: number;
  days_since_signup: number;
}

export interface ScoreInput {
  caq: CAQSignal;
  behavior?: BehavioralSignal;
}

export type ArchetypeScores = Record<ArchetypeId, number>;

// ---------------------------------------------------------------------------
// Per-archetype scoring
// ---------------------------------------------------------------------------

function inAgeRange(age: number | null, lo: number, hi: number): boolean {
  return age !== null && age >= lo && age <= hi;
}

function goalsHave(goals: string[], match: string[]): boolean {
  const set = new Set(goals.map((g) => g.toLowerCase()));
  return match.some((m) => set.has(m.toLowerCase()));
}

function scorePrecisionWellness(caq: CAQSignal): number {
  let s = 0;
  if (inAgeRange(caq.age_years, 30, 50)) s += 0.20;
  if (caq.education_level === 'graduate' || caq.education_level === 'bachelors') s += 0.15;
  if (goalsHave(caq.primary_goals, ['optimize_wellness', 'optimize', 'precision', 'data', 'personalization'])) s += 0.30;
  if (goalsHave(caq.primary_goals, ['prevention'])) s += 0.10;
  if (goalsHave(caq.primary_goals, ['longevity'])) s += 0.10;
  return clamp01(s);
}

function scoreBiohacker(caq: CAQSignal): number {
  let s = 0;
  if (inAgeRange(caq.age_years, 25, 45)) s += 0.20;
  if (caq.biological_sex === 'male') s += 0.10;
  if (goalsHave(caq.primary_goals, ['cognition', 'cognitive', 'nootropics', 'peak_performance'])) s += 0.30;
  if (goalsHave(caq.primary_goals, ['performance', 'recovery'])) s += 0.20;
  if (caq.exercise_frequency === 'daily' || caq.exercise_frequency === 'few_times_week') s += 0.10;
  return clamp01(s);
}

function scoreChronicConditionNavigator(caq: CAQSignal): number {
  let s = 0;
  if (caq.current_conditions.length > 0) s += 0.40;
  if (caq.current_conditions.length >= 2) s += 0.10;
  if (goalsHave(caq.primary_goals, ['symptom_relief', 'root_cause', 'manage_condition'])) s += 0.25;
  if (caq.stress_level === 'high') s += 0.05;
  if (inAgeRange(caq.age_years, 35, 65)) s += 0.10;
  return clamp01(s);
}

function scorePreventiveHealthParent(caq: CAQSignal): number {
  let s = 0;
  if (caq.has_dependent_minors) s += 0.35;
  if (inAgeRange(caq.age_years, 30, 50)) s += 0.15;
  if (goalsHave(caq.primary_goals, ['family_wellness', 'family', 'kids_health', 'pediatric'])) s += 0.30;
  if (goalsHave(caq.primary_goals, ['prevention', 'clean_ingredients'])) s += 0.10;
  return clamp01(s);
}

function scorePerformanceAthlete(caq: CAQSignal): number {
  let s = 0;
  if (caq.exercise_frequency === 'daily') s += 0.30;
  else if (caq.exercise_frequency === 'few_times_week') s += 0.15;
  if (goalsHave(caq.primary_goals, ['performance', 'recovery', 'endurance', 'strength', 'body_composition'])) s += 0.30;
  if (inAgeRange(caq.age_years, 18, 55)) s += 0.10;
  if (goalsHave(caq.primary_goals, ['athlete'])) s += 0.10;
  return clamp01(s);
}

function scoreLongevityInvestor(caq: CAQSignal): number {
  let s = 0;
  if ((caq.age_years ?? 0) >= 45) s += 0.25;
  if (goalsHave(caq.primary_goals, ['longevity', 'healthspan', 'biomarkers', 'cutting_edge'])) s += 0.35;
  if (caq.income_band === 'over_500k' || caq.income_band === '250k_500k') s += 0.20;
  if (caq.education_level === 'graduate') s += 0.05;
  return clamp01(s);
}

function scoreGeneticCurious(caq: CAQSignal): number {
  let s = 0;
  if (goalsHave(caq.primary_goals, ['genetic_insight', 'curiosity', 'genetic', 'discovery'])) s += 0.30;
  // Lower-engagement signals relative to other archetypes
  if (caq.current_conditions.length === 0 && caq.exercise_frequency === null) s += 0.10;
  if (caq.previous_herbal_experience !== true) s += 0.05;
  // Mild positive baseline so it appears even without strong genetic-curiosity goals
  s += 0.05;
  return clamp01(s);
}

// ---------------------------------------------------------------------------
// Behavioral nudges (small, additive; never exceed 0.20 cumulative)
// ---------------------------------------------------------------------------

function applyBehaviorAdjustments(
  scores: ArchetypeScores,
  b: BehavioralSignal,
): ArchetypeScores {
  const next = { ...scores };

  const longevityBoost =
    (b.platinum_subscription ? 0.05 : 0) +
    (b.genex360_complete_purchased ? 0.10 : 0) +
    (b.avg_monthly_aov_cents >= 30_000 ? 0.05 : 0);
  next.longevity_investor = clamp01(next.longevity_investor + longevityBoost);

  const biohackerBoost =
    (b.distinct_supplement_categories >= 5 ? 0.07 : 0) +
    (b.genex360_complete_purchased ? 0.05 : 0) +
    (b.avg_monthly_aov_cents >= 25_000 && b.avg_monthly_aov_cents < 35_000 ? 0.03 : 0);
  next.biohacker_optimizer = clamp01(next.biohacker_optimizer + biohackerBoost);

  const chronicBoost =
    (b.practitioner_attached ? 0.10 : 0) +
    (b.protocol_adherence_rate >= 0.8 ? 0.05 : 0);
  next.chronic_condition_navigator = clamp01(next.chronic_condition_navigator + chronicBoost);

  const familyBoost =
    (b.family_subscription ? 0.15 : 0);
  next.preventive_health_parent = clamp01(next.preventive_health_parent + familyBoost);

  const precisionBoost =
    (b.platinum_subscription ? 0.05 : 0) +
    (b.protocol_adherence_rate >= 0.7 ? 0.05 : 0);
  next.precision_wellness_seeker = clamp01(next.precision_wellness_seeker + precisionBoost);

  return next;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function scoreArchetypes(input: ScoreInput): ArchetypeScores {
  const base: ArchetypeScores = {
    precision_wellness_seeker:    scorePrecisionWellness(input.caq),
    biohacker_optimizer:          scoreBiohacker(input.caq),
    chronic_condition_navigator:  scoreChronicConditionNavigator(input.caq),
    preventive_health_parent:     scorePreventiveHealthParent(input.caq),
    performance_athlete:          scorePerformanceAthlete(input.caq),
    longevity_investor:           scoreLongevityInvestor(input.caq),
    genetic_curious_explorer:     scoreGeneticCurious(input.caq),
  };
  return input.behavior
    ? applyBehaviorAdjustments(base, input.behavior)
    : base;
}

export interface ArchetypeAssignment {
  archetype_id: ArchetypeId;
  score: number;
}

export interface ClassificationResult {
  primary: ArchetypeAssignment;
  secondary: ArchetypeAssignment[];   // top 2 runners-up
  confidence: number;                  // primary.score - runner-up.score, 0..1
  signal_payload: {
    caq: CAQSignal;
    behavior: BehavioralSignal | null;
    scores: ArchetypeScores;
  };
}

export function classifyFromSignals(input: ScoreInput): ClassificationResult {
  const scores = scoreArchetypes(input);
  const ranked = (Object.entries(scores) as Array<[ArchetypeId, number]>)
    .sort((a, b) => b[1] - a[1])
    .map(([id, score]) => ({ archetype_id: id, score }));
  const top = ranked[0];
  const runnerUp = ranked[1] ?? { archetype_id: top.archetype_id, score: 0 };
  const confidence = Number((top.score - runnerUp.score).toFixed(3));
  return {
    primary: top,
    secondary: ranked.slice(1, 3),
    confidence,
    signal_payload: {
      caq: input.caq,
      behavior: input.behavior ?? null,
      scores,
    },
  };
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

// ---------------------------------------------------------------------------
// DB wrappers
// ---------------------------------------------------------------------------

export interface ClassifyUserDeps {
  supabase: SupabaseClient | unknown;
}

function ageFromDob(dob: string | null): number | null {
  if (!dob) return null;
  const d = new Date(`${dob}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return null;
  const ms = Date.now() - d.getTime();
  return Math.floor(ms / (365.25 * 24 * 60 * 60 * 1000));
}

/**
 * Reads the user's most recent completed CAQ + minimal behavioral signals
 * and returns the full classification result. Caller persists to
 * customer_archetypes.
 */
export async function classifyUserById(
  userId: string,
  options: { includeBehavior: boolean } = { includeBehavior: false },
  deps: ClassifyUserDeps,
): Promise<ClassificationResult | null> {
  const sb = deps.supabase as any;

  const { data: caqRow } = await sb
    .from('clinical_assessments')
    .select('biological_sex, primary_goals, current_conditions, diet_type, exercise_frequency, stress_level, previous_herbal_experience, date_of_birth, completed')
    .eq('user_id', userId)
    .eq('completed', true)
    .order('completed_at', { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();

  if (!caqRow) return null;

  // Best-effort enrichment from profiles for fields not on clinical_assessments.
  const { data: profileRow } = await sb
    .from('profiles')
    .select('education_level, income_band, has_dependent_minors')
    .eq('id', userId)
    .maybeSingle();

  const caq: CAQSignal = {
    age_years: ageFromDob((caqRow.date_of_birth as string | null) ?? null),
    biological_sex: (caqRow.biological_sex as CAQSignal['biological_sex']) ?? null,
    primary_goals: (caqRow.primary_goals as string[] | null) ?? [],
    current_conditions: (caqRow.current_conditions as string[] | null) ?? [],
    diet_type: (caqRow.diet_type as string | null) ?? null,
    exercise_frequency: (caqRow.exercise_frequency as string | null) ?? null,
    stress_level: (caqRow.stress_level as string | null) ?? null,
    previous_herbal_experience: (caqRow.previous_herbal_experience as boolean | null) ?? null,
    has_dependent_minors: (profileRow?.has_dependent_minors as boolean | undefined) ?? false,
    education_level: (profileRow?.education_level as string | null | undefined) ?? null,
    income_band: (profileRow?.income_band as string | null | undefined) ?? null,
  };

  let behavior: BehavioralSignal | undefined;
  if (options.includeBehavior) {
    behavior = await loadBehavioralSignal(userId, deps);
  }

  return classifyFromSignals({ caq, behavior });
}

async function loadBehavioralSignal(
  userId: string,
  deps: ClassifyUserDeps,
): Promise<BehavioralSignal> {
  const sb = deps.supabase as any;

  const [{ data: membership }, { data: family }, { data: genexRows }, { data: orderRows }, { data: practitioner }] = await Promise.all([
    sb.from('memberships').select('tier_id, status').eq('user_id', userId).order('started_at', { ascending: false }).limit(1).maybeSingle(),
    sb.from('family_members').select('id').eq('primary_user_id', userId).eq('is_active', true).limit(1),
    sb.from('genex360_purchases').select('product_id').eq('user_id', userId).eq('payment_status', 'paid'),
    sb.from('shop_orders').select('total_cents, created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(12),
    sb.from('practitioner_patients').select('id').eq('patient_id', userId).eq('status', 'active').limit(1),
  ]);

  const platinum_subscription = membership?.tier_id?.startsWith('platinum') ?? false;
  const family_subscription = (family ?? []).length > 0;
  const genex_ids = (genexRows ?? []).map((r: { product_id: string }) => r.product_id);
  const genex360_complete_purchased = genex_ids.includes('genex360_complete');
  const genex360_core_purchased = genex_ids.includes('genex360_core');
  const orders = (orderRows ?? []) as Array<{ total_cents: number; created_at: string }>;
  const totalCents = orders.reduce((s, o) => s + (o.total_cents ?? 0), 0);
  const months = Math.max(1, Math.min(12, orders.length));
  const avg_monthly_aov_cents = Math.round(totalCents / months);

  return {
    platinum_subscription,
    family_subscription,
    genex360_complete_purchased,
    genex360_core_purchased,
    avg_monthly_aov_cents,
    protocol_adherence_rate: 0,            // wired post-launch from supplement_adherence rollup
    practitioner_attached: (practitioner ?? []).length > 0,
    distinct_supplement_categories: 0,     // wired post-launch from shop_order_items
    days_since_signup: 0,                  // caller may override
  };
}
