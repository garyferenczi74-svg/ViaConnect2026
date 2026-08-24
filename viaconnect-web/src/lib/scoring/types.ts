// Bio Optimization Score (BOS) SSOT type module
//
// Paired with supabase/migrations/20260512020236_bos_compute_v2.sql.
// Q4 (Gary 2026-05-11) locks the persisted column name to `breakdown`
// on bio_optimization_history. Every #161 spec reference to `inputs`
// is substituted with `breakdown` in this module: BOSBreakdownJSONB
// (not BOSInputsJSONB), BOSResult.breakdown (not BOSResult.inputs).
//
// This file is pure types only. No imports from Anthropic SDK or
// Supabase. Phase B will add the source modules that consume these
// types.

// -----------------------------------------------------------------------------
// Decay policy constants (#161c Item 10)
// -----------------------------------------------------------------------------

/**
 * Hannah decay policy parameters. Half-life is the number of days after which
 * a lever contribution decays to 50% of its current value if not refreshed.
 * Full decay is the number of days after which a lever contribution decays to
 * approximately 0%. These are referenced by Hannah's system prompt (lockstep
 * via template substitution) and by any future server-side decay validators.
 * Changing either value requires a Hannah voice review and a prompt_version bump.
 */
export const HALF_LIFE_DAYS = 7;
export const FULL_DECAY_DAYS = 14;

// -----------------------------------------------------------------------------
// Score band classification
// -----------------------------------------------------------------------------

/**
 * Bio Optimization tier band. Mapped from the 0 to 100 score at compute
 * time and persisted alongside the score for downstream renderers.
 * Tier values:
 *   1 = baseline (confidence 0.720)
 *   2 = engaged (confidence 0.860)
 *   3 = precision (confidence 0.960)
 */
export type BOSTier = 1 | 2 | 3;

// -----------------------------------------------------------------------------
// Trigger taxonomy
// -----------------------------------------------------------------------------

/**
 * Event source identifier for a compute trigger. Mirrors the
 * bos_compute_queue.source CHECK enum and the bio_optimization_history.source
 * column's adjacent enum.
 */
export type BOSTriggerSource =
  | 'caq_completed'
  | 'daily_log'
  | 'nutrition_log'
  | 'wearable_sync'
  | 'manual_recalc'
  | 'admin_recalc'
  | 'recommendation_pipeline';

/**
 * Concrete trigger event with the originating user and the optional
 * cooldown bypass flag. Consumed by the compute worker that drains
 * bos_compute_queue.
 */
export interface BOSTriggerEvent {
  userId: string;
  source: BOSTriggerSource;
  eventId?: string;
  bypassCooldown?: boolean;
  payload: Record<string, unknown>;
}

/**
 * Row shape for bos_compute_queue. Mirrors the migration's CREATE TABLE
 * columns from 20260512020236_bos_compute_v2.sql §10. Consumed by the
 * Phase B queue helper module.
 */
export interface QueuedEvent {
  id: string;
  user_id: string;
  source: BOSTriggerSource;
  event_id: string | null;
  payload: Record<string, unknown>;
  enqueued_at: string;
  processed_at: string | null;
  processing_error: string | null;
  bypass_cooldown: boolean;
  retry_count: number;
}

// -----------------------------------------------------------------------------
// Diagnostic foundation
// -----------------------------------------------------------------------------

/**
 * Snapshot of the diagnostic inputs that anchor a compute. The
 * `breakdown` jsonb column on bio_optimization_history stores this
 * shape merged with EngagementContribution.
 */
export interface DiagnosticFoundation {
  caqCompletedAt: string | null;
  bmiAtCompute: number | null;
  ageAtCompute: number | null;
  symptomLoad: {
    physical: number;
    neurological: number;
    emotional: number;
  };
  chronicRiskFlags: string[];
  geneticsCoverage: 'none' | 'genex360' | 'full_panel';
}

// -----------------------------------------------------------------------------
// Engagement levers
// -----------------------------------------------------------------------------

/**
 * Key identifying one of the engagement levers the user can move to
 * raise the BOS via daily actions. The set is exhaustive for Phase A.
 */
export type EngagementLeverKey =
  | 'sleep'
  | 'exercise'
  | 'nutrition'
  | 'stress'
  | 'supplements'
  | 'hydration'
  | 'movement';

/**
 * Snapshot of a single engagement lever as it stood at the moment of
 * compute. `value` is the 0 to 100 lever score; `weight` is the
 * lever's contribution weight as a fraction of 1.
 */
export interface EngagementLeverState {
  key: EngagementLeverKey;
  value: number;
  weight: number;
  freshness: 'fresh' | 'stale' | 'missing';
}

/**
 * Aggregated engagement contribution. Sums to a single 0 to 100 number
 * blended into the final BOS via the temporal blend rule.
 */
export interface EngagementContribution {
  total: number;
  levers: EngagementLeverState[];
  blendRatio: number;
}

// -----------------------------------------------------------------------------
// Persisted breakdown JSONB shape (#161c Item 11)
// -----------------------------------------------------------------------------

/**
 * Diagnostic foundation snapshot persisted alongside the BOS row. Mirrors
 * the bundle shape passed into Hannah (caq + labs + genetics sub-objects),
 * which is what /api/bos/current reads when assembling accuracy pills.
 */
export interface BreakdownDiagnosticFoundation {
  caq: {
    completed: boolean;
    completed_at: string | null;
    baseline_score: number | null;
    version_number: number | null;
  };
  labs: {
    present: boolean;
    uploaded_at: string | null;
    panel_count: number;
  };
  genetics: {
    present: boolean;
    processed_at: string | null;
    panel: string | null;
  };
}

/**
 * Per-lever last-engaged snapshot persisted alongside the BOS row. Mirrors
 * the bundle shape passed into Hannah for the six engagement levers, which
 * is what /api/bos/current reads when assembling engagement pills.
 */
export interface BreakdownEngagementLever {
  last_engaged_at: string | null;
  recent_events_7d: number;
  recent_events_30d: number;
}

export interface BreakdownEngagementState {
  nutrition: BreakdownEngagementLever;
  supplements: BreakdownEngagementLever;
  body_tracker: BreakdownEngagementLever;
  wearable: BreakdownEngagementLever;
  plug_ins: BreakdownEngagementLever;
  helix_challenges: BreakdownEngagementLever;
}

/**
 * Hannah agent tool-call output as persisted in the breakdown. Mirrors the
 * runtime-validated HannahOutput shape from hannah-output-schema.ts but
 * stays in this pure-types module (no zod import). The route handler reads
 * .explanation and .engagement off this shape.
 */
export interface BreakdownHannahOutput {
  score: number;
  baseline_from_caq: number;
  engagement_total: number;
  engagement: Record<
    'nutrition' | 'supplements' | 'body_tracker' | 'wearable' | 'plug_ins' | 'helix_challenges',
    {
      current_contribution_pct: number;
      velocity_pct: number;
      ceiling_pct: number;
      state: 'unused' | 'in_use' | 'at_ceiling';
    }
  >;
  decay_applied: Array<{
    lever: string;
    days_since_engagement: number;
    decay_factor: number;
  }>;
  explanation: string;
}

/**
 * Previous-row snapshot embedded in the breakdown. Mirrors the
 * PreviousBOSRow helper shape in bio-optimization-score.ts.
 */
export interface BreakdownPrevious {
  score: number | null;
  computed_at: string | null;
  compute_version: string | null;
}

/**
 * Trigger snapshot embedded in the breakdown. Mirrors the trigger sub-object
 * the bundle carries; bypass_cooldown is snake_case here because that is
 * what the bundle persists.
 */
export interface BreakdownTrigger {
  source: BOSTriggerSource;
  event_id?: string;
  bypass_cooldown: boolean;
}

/**
 * Canonical shape of the `breakdown` jsonb column on
 * bio_optimization_history. Stored verbatim by the SSOT RPC.
 *
 * Shape widened by #161c Item 11 (Jeffery phase-review): the prior
 * narrow shape (diagnostic + engagement + _compute_meta) was a subset
 * of what buildBreakdown actually persists. The route handler at
 * /api/bos/current reads diagnostic_foundation, engagement_state,
 * hannah_output, previous, tier, and trigger directly, so all seven
 * keys are now part of the canonical type. The buildBreakdown
 * intersection cast is removed as redundant.
 */
export interface BOSBreakdownJSONB {
  diagnostic_foundation: BreakdownDiagnosticFoundation;
  engagement_state: BreakdownEngagementState;
  hannah_output: BreakdownHannahOutput;
  previous: BreakdownPrevious;
  tier: BOSTier;
  trigger: BreakdownTrigger;
  _compute_meta: {
    compute_version: string;
    triggered_by: BOSTriggerSource;
    event_id?: string;
    bypass_cooldown: boolean;
    started_at: string;
    finished_at: string;
    cooldown_status: 'fresh' | 'bypassed' | 'expired';
    model: string;
    prompt_version: string;
    compute_duration_ms: number;
    input_token_count: number | null;
    output_token_count: number | null;
    api_request_id: string | null;
  };
  // Pre-SSOT rows carry a sentinel marker injected by the migration's
  // backfill step. New rows authored by the SSOT RPC do not include
  // this key.
  _sentinel?: 'pre_ssot_unknown';
}

// -----------------------------------------------------------------------------
// Compute output
// -----------------------------------------------------------------------------

/**
 * Hannah agent compute output. Returned by the BOS compute pipeline
 * and serialized into the SSOT RPC call by the worker.
 */
export interface HannahComputeOutput {
  score: number;
  tier: BOSTier;
  confidence: number;
  breakdown: BOSBreakdownJSONB;
  computeVersion: string;
  source: 'caq_initial' | 'daily' | 'recalculation';
}

/**
 * Result returned from the SSOT RPC compute_bio_optimization_score.
 * `id` is the newly inserted bio_optimization_history row's uuid.
 */
export interface BOSResult {
  id: string;
  userId: string;
  date: string;
  score: number;
  tier: BOSTier;
  confidence: number;
  breakdown: BOSBreakdownJSONB;
  computeVersion: string;
  computeSeq: number;
  computedAt: string;
}

// -----------------------------------------------------------------------------
// Phase D: worker drain result shape
// -----------------------------------------------------------------------------

/**
 * Per-user result emitted by the BOS worker drain (GET /api/bos/worker).
 * Status values mirror the worker's branching logic:
 *   'computed'         compute_bio_optimization_score ran and persisted
 *   'skipped_cooldown' cooldown active and no bypass flag in the batch
 *   'error'            compute or persist threw; events left for retry
 */
export type WorkerUserResult =
  | { userId: string; status: 'computed'; event_count: number }
  | { userId: string; status: 'skipped_cooldown'; minutes_remaining: number }
  | { userId: string; status: 'error'; error: string };

// -----------------------------------------------------------------------------
// Phase D: read API response shape (BOSCurrentResponse)
// -----------------------------------------------------------------------------

/**
 * Accuracy pill (3 entries: CAQ, Labs, Genetics). Surfaces the
 * diagnostic foundation state to the consumer dashboard.
 */
export interface AccuracyPill {
  key: 'caq' | 'labs' | 'genetics';
  label: string;
  state: 'complete' | 'incomplete' | 'awaiting_results';
  destination_key: string | null;
  confidence_unlocked_pct: 72 | 86 | 96;
}

/**
 * Engagement pill (6 entries). Mirrors Hannah's per-lever contribution
 * snapshot plus the most recent engagement timestamp.
 */
export interface EngagementPill {
  key:
    | 'nutrition'
    | 'supplements'
    | 'body_tracker'
    | 'wearable'
    | 'plug_ins'
    | 'helix_challenges';
  label: string;
  state: 'unused' | 'in_use' | 'at_ceiling';
  velocity_pct: number;
  ceiling_pct: number;
  current_contribution_pct: number;
  last_engaged_at: string | null;
  destination_key: string;
}

/**
 * A named source that actually contributed to the displayed Bio
 * Optimization Score. Empty means the score is not honest to show,
 * even if a finite number was persisted (Brief 24).
 */
export type BosNamedContributorKey =
  | 'caq'
  | 'labs'
  | 'genetics'
  | 'nutrition'
  | 'supplements'
  | 'body_tracker'
  | 'wearable'
  | 'plug_ins'
  | 'helix_challenges';

export interface BosNamedContributor {
  key: BosNamedContributorKey;
  label: string;
}

/**
 * Response payload for GET /api/bos/current. The pre-compute shape
 * returns score = null, baseline = null, tier = 1, confidence = 0.720
 * and the default Hannah explanation, with every accuracy pill in
 * 'incomplete' state and every engagement pill in 'unused' state.
 */
export interface BOSCurrentResponse {
  score: number | null;
  baseline: number | null;
  tier: BOSTier;
  confidence: number;
  confidence_display: '72%' | '86%' | '96%';
  computed_at: string | null;
  /** Difference vs a persisted score from ~7 days earlier. Null when missing. */
  weekly_delta: number | null;
  compute_version: string;
  accuracy_pills: AccuracyPill[];
  engagement_pills: EngagementPill[];
  /** Named sources that produced the score. Empty when the score must stay empty. */
  contributors: BosNamedContributor[];
  hannah_explanation: string;
}
