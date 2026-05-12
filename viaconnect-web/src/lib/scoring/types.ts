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
// Persisted breakdown JSONB shape
// -----------------------------------------------------------------------------

/**
 * Canonical shape of the `breakdown` jsonb column on
 * bio_optimization_history. Stored verbatim by the SSOT RPC. The
 * `_compute_meta` sub-object carries the compute pipeline's audit
 * trail and is preserved by every consumer.
 */
export interface BOSBreakdownJSONB {
  diagnostic: DiagnosticFoundation;
  engagement: EngagementContribution;
  _compute_meta: {
    compute_version: string;
    triggered_by: BOSTriggerSource;
    event_id?: string;
    bypass_cooldown: boolean;
    started_at: string;
    finished_at: string;
    cooldown_status: 'fresh' | 'bypassed' | 'expired';
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
  compute_version: string;
  accuracy_pills: AccuracyPill[];
  engagement_pills: EngagementPill[];
  hannah_explanation: string;
}
