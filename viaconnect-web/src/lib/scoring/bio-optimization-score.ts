// Bio Optimization Score canonical compute entry point.
//
// Phase C of bundled Prompts #159 + #161. Sequence:
//   1. Cooldown check (skipped for BYPASS_SOURCES or bypassCooldown=true).
//   2. Gather all 9 sources in parallel.
//   3. Derive tier from diagnostic foundation presence.
//   4. Resolve user's display name from profiles for Hannah addressing.
//   5. Call Hannah via Anthropic forced-tool-use; validate output;
//      retry exactly once on validation failure.
//   6. Persist via the SSOT RPC compute_bio_optimization_score.
//   7. Log fire-and-forget telemetry.
//   8. Return BOSResult.
//
// Service-role client choice: createAdminClient from @/lib/supabase/admin
// is the only server-side service-role helper in the codebase (used by
// 50+ other server routes for write paths). It bypasses RLS, which is
// required to invoke the SECURITY DEFINER RPC and to read the per-user
// source slices server-side.
//
// Retry policy: only one retry on Hannah validation failure. The
// Anthropic SDK already retries 429/500 responses internally; no
// additional backoff loop is implemented here.

import Anthropic from '@anthropic-ai/sdk';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/admin';

import { isInCooldown } from './cooldown';
import { logBOSWrite } from './telemetry';
import { getCAQSource } from './sources/caq-source';
import { getLabsSource } from './sources/labs-source';
import { getGeneticsSource } from './sources/genetics-source';
import { getNutritionSource } from './sources/nutrition-source';
import { getSupplementsSource } from './sources/supplements-source';
import { getBodyTrackerSource } from './sources/body-tracker-source';
import { getWearableSource } from './sources/wearable-source';
import { getPlugInsSource } from './sources/plug-ins-source';
import { getHelixChallengesSource } from './sources/helix-challenges-source';
// Prompt 171b Phase 1: 10th source slice (caffeine timing).
import { getCaffeineTimingSource } from './sources/caffeine-timing-source';
import {
  HANNAH_SYSTEM_PROMPT,
  buildHannahUserMessage,
  type HannahInputBundle,
} from './hannah-prompt';
import {
  HANNAH_TOOL_NAME,
  HANNAH_TOOL_SCHEMA,
  validateHannahOutput,
  HannahOutputValidationError,
  type HannahOutput,
} from './hannah-output-schema';

import type {
  BOSResult,
  BOSTier,
  BOSTriggerEvent,
  BOSTriggerSource,
  BOSBreakdownJSONB,
} from './types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const COMPUTE_VERSION = '2.0.0';
// #161c Item 10: v2.0.0 -> v2.0.1 to reflect the prompt-content change (decay
// numbers now template-substituted from HALF_LIFE_DAYS / FULL_DECAY_DAYS).
// 171b Phase 1: v2.0.1 -> v2.1.0 to reflect the caffeine_timing signal added
// to the bundle + the Hannah system prompt extension.
const PROMPT_VERSION = 'hannah.bos.v2.1.0';
const DEFAULT_MODEL = 'claude-sonnet-4-5';
const MAX_TOKENS = 1024;

/**
 * Trigger sources that bypass the 30-minute cooldown by default.
 * Per #161 §0 decision 2: 'caq_completed' bypasses because the initial
 * CAQ submission is a foundation-changing event that must always
 * recompute. Labs and Genetics events should arrive via 'manual_recalc'
 * or 'admin_recalc' until those sources are added to the
 * bos_compute_queue source CHECK enum (out of scope for #161).
 */
export const BYPASS_SOURCES: BOSTriggerSource[] = ['caq_completed'];

// ---------------------------------------------------------------------------
// Error classes
// ---------------------------------------------------------------------------

export class BOSCooldownError extends Error {
  public readonly userId: string;
  public readonly minutesRemaining: number;
  constructor(userId: string, minutesRemaining: number) {
    super(
      `BOS compute in cooldown for user ${userId}: ${minutesRemaining} minute(s) remaining`,
    );
    this.name = 'BOSCooldownError';
    this.userId = userId;
    this.minutesRemaining = minutesRemaining;
  }
}

export class BOSPreflightError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BOSPreflightError';
  }
}

export class BOSPersistError extends Error {
  constructor(message: string) {
    super(`BOS persist failed: ${message}`);
    this.name = 'BOSPersistError';
  }
}

export class BOSHannahError extends Error {
  public readonly reason: string;
  constructor(reason: string) {
    super(`Hannah compute failed after retry: ${reason}`);
    this.name = 'BOSHannahError';
    this.reason = reason;
  }
}

// ---------------------------------------------------------------------------
// Small helpers (exported for tests)
// ---------------------------------------------------------------------------

export function tierToConfidence(tier: BOSTier): number {
  if (tier === 1) return 0.720;
  if (tier === 2) return 0.860;
  return 0.960;
}

export function mapTriggerSourceToHistorySource(
  source: BOSTriggerSource,
): 'caq_initial' | 'daily' | 'recalculation' {
  switch (source) {
    case 'caq_completed':
      return 'caq_initial';
    case 'daily_log':
    case 'nutrition_log':
    case 'wearable_sync':
      return 'daily';
    case 'manual_recalc':
    case 'admin_recalc':
    case 'recommendation_pipeline':
      return 'recalculation';
    default: {
      // Exhaustiveness check; TypeScript flags any newly-added enum
      // member at compile time so the switch cannot silently drop a case.
      const _exhaustive: never = source;
      throw new Error(`unhandled BOSTriggerSource: ${String(_exhaustive)}`);
    }
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

interface PreviousBOSRow {
  score: number | null;
  computed_at: string | null;
  compute_version: string | null;
}

async function getPreviousBOS(userId: string, supabase: SupabaseClient): Promise<PreviousBOSRow> {
  try {
    // Phase F-patch (Fix 2): order by (date DESC, compute_seq DESC) to ride
    // bos_history_user_date_seq_key (user_id, date, compute_seq). Same
    // pattern as cooldown.ts.
    const { data, error } = await supabase
      .from('bio_optimization_history')
      .select('score, date, compute_seq, computed_at, compute_version')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .order('compute_seq', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error || !data) {
      return { score: null, computed_at: null, compute_version: null };
    }
    const row = data as Record<string, unknown>;
    return {
      score: typeof row.score === 'number' ? row.score : null,
      computed_at: typeof row.computed_at === 'string' ? row.computed_at : null,
      compute_version: typeof row.compute_version === 'string' ? row.compute_version : null,
    };
  } catch {
    return { score: null, computed_at: null, compute_version: null };
  }
}

/**
 * Server-side display-name resolution. Mirrors
 * src/lib/jeffery/advisor-context-builder.ts so naming stays consistent.
 */
async function fetchDisplayName(supabase: SupabaseClient, userId: string): Promise<string> {
  try {
    const { data } = await supabase
      .from('profiles')
      .select('full_name, username')
      .eq('id', userId)
      .maybeSingle();
    const row = (data ?? null) as { full_name?: string | null; username?: string | null } | null;
    if (row?.full_name) return row.full_name.split(' ')[0];
    if (row?.username) return row.username;
    return 'there';
  } catch {
    return 'there';
  }
}

interface CAQSourceLike {
  completed: boolean;
  completed_at: string | null;
  baseline_score: number | null;
  version_number: number | null;
}
interface LabsSourceLike {
  present: boolean;
  uploaded_at: string | null;
  panel_count: number;
}
interface GeneticsSourceLike {
  present: boolean;
  processed_at: string | null;
  panel: string | null;
}
interface EngagementSourceLike {
  last_engaged_at: string | null;
  recent_events_7d: number;
  recent_events_30d: number;
}

interface CallHannahArgs {
  anthropic: Anthropic;
  model: string;
  bundle: HannahInputBundle;
  baseline: number;
  retryHint?: string;
}

interface CallHannahResult {
  output: HannahOutput;
  apiId: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
}

async function callHannahOnce(args: CallHannahArgs): Promise<CallHannahResult> {
  const systemBase = HANNAH_SYSTEM_PROMPT;
  const system = args.retryHint
    ? `${systemBase}\n\nRetry note: ${args.retryHint}`
    : systemBase;

  const response = await args.anthropic.messages.create({
    model: args.model,
    max_tokens: MAX_TOKENS,
    system,
    tools: [HANNAH_TOOL_SCHEMA],
    tool_choice: { type: 'tool', name: HANNAH_TOOL_NAME },
    messages: [{ role: 'user', content: buildHannahUserMessage(args.bundle) }],
  });

  const toolBlock = (response.content as Array<{ type: string; name?: string; input?: unknown }>).find(
    (b) => b.type === 'tool_use' && b.name === HANNAH_TOOL_NAME,
  );
  if (!toolBlock) {
    throw new HannahOutputValidationError('no tool_use block in response');
  }
  const output = validateHannahOutput(toolBlock.input, args.baseline);

  const usage = (response as { usage?: { input_tokens?: number; output_tokens?: number } }).usage;
  return {
    output,
    apiId: typeof response.id === 'string' ? response.id : null,
    inputTokens: typeof usage?.input_tokens === 'number' ? usage.input_tokens : null,
    outputTokens: typeof usage?.output_tokens === 'number' ? usage.output_tokens : null,
  };
}

async function callHannahWithRetry(args: CallHannahArgs): Promise<CallHannahResult> {
  try {
    return await callHannahOnce(args);
  } catch (e) {
    if (!(e instanceof HannahOutputValidationError)) {
      throw e;
    }
    const reason = e.reason;
    try {
      return await callHannahOnce({
        ...args,
        retryHint: `Your previous output failed validation: ${reason}. Return a corrected tool call.`,
      });
    } catch (retryErr) {
      if (retryErr instanceof HannahOutputValidationError) {
        throw new BOSHannahError(retryErr.reason);
      }
      throw retryErr;
    }
  }
}

// ---------------------------------------------------------------------------
// Build BOSBreakdownJSONB from gathered sources + Hannah output
// ---------------------------------------------------------------------------

interface BuildBreakdownArgs {
  caq: CAQSourceLike;
  labs: LabsSourceLike;
  genetics: GeneticsSourceLike;
  hannah: HannahOutput;
  trigger: BOSTriggerEvent;
  startedAt: string;
  finishedAt: string;
  cooldownStatus: 'fresh' | 'bypassed' | 'expired';
  computeDurationMs: number;
  apiId: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  model: string;
  bundle: HannahInputBundle;
  previous: PreviousBOSRow;
}

// #161c Item 11: BOSBreakdownJSONB was widened to its canonical 7-key shape
// so the prior intersection cast is now redundant. The function returns the
// canonical type directly.
function buildBreakdown(args: BuildBreakdownArgs): BOSBreakdownJSONB {
  return {
    hannah_output: args.hannah,
    // Q4 (Gary 2026-05-11) locks the read API contract on these keys.
    // The bundle snapshot is persisted alongside the compact diagnostic
    // so /api/bos/current can derive accuracy + engagement pill state
    // without re-reading the source tables.
    diagnostic_foundation: args.bundle.diagnostic_foundation,
    engagement_state: args.bundle.engagement_state,
    previous: args.previous,
    tier: args.bundle.tier,
    trigger: args.bundle.trigger,
    _compute_meta: {
      compute_version: COMPUTE_VERSION,
      triggered_by: args.trigger.source,
      event_id: args.trigger.eventId,
      bypass_cooldown: args.trigger.bypassCooldown ?? false,
      started_at: args.startedAt,
      finished_at: args.finishedAt,
      cooldown_status: args.cooldownStatus,
      model: args.model,
      prompt_version: PROMPT_VERSION,
      compute_duration_ms: args.computeDurationMs,
      input_token_count: args.inputTokens,
      output_token_count: args.outputTokens,
      api_request_id: args.apiId,
    },
  };
}

// ---------------------------------------------------------------------------
// Anthropic client construction
// ---------------------------------------------------------------------------

function buildAnthropic(): { client: Anthropic; model: string } {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY required for compute module');
  }
  const model = process.env.HANNAH_MODEL ?? DEFAULT_MODEL;
  return { client: new Anthropic({ apiKey }), model };
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export async function computeBOS(
  userId: string,
  triggerEvent: BOSTriggerEvent,
): Promise<BOSResult> {
  const startTime = Date.now();
  const startedAt = new Date(startTime).toISOString();
  const supabase = createAdminClient();

  // 1. Cooldown check.
  const bypass = triggerEvent.bypassCooldown === true || BYPASS_SOURCES.includes(triggerEvent.source);
  let cooldownStatus: 'fresh' | 'bypassed' | 'expired' = 'fresh';
  if (!bypass) {
    const cooldown = await isInCooldown(userId, supabase);
    if (cooldown.in_cooldown) {
      throw new BOSCooldownError(userId, cooldown.minutes_remaining);
    }
    cooldownStatus = cooldown.last_compute_at ? 'expired' : 'fresh';
  } else {
    cooldownStatus = 'bypassed';
  }

  // 2. Gather all 10 sources in parallel + previous BOS row.
  //    Prompt 171b Phase 1: caffeine_timing is the 10th source slice; sibling
  //    to the six engagement levers (not itself a lever).
  const [caq, labs, genetics, nutrition, supplements, body_tracker, wearable, plug_ins, helix_challenges, caffeine_timing, previous] =
    await Promise.all([
      getCAQSource(userId, supabase),
      getLabsSource(userId, supabase),
      getGeneticsSource(userId, supabase),
      getNutritionSource(userId, supabase),
      getSupplementsSource(userId, supabase),
      getBodyTrackerSource(userId, supabase),
      getWearableSource(userId, supabase),
      getPlugInsSource(userId, supabase),
      getHelixChallengesSource(userId, supabase),
      getCaffeineTimingSource(userId, supabase),
      getPreviousBOS(userId, supabase),
    ]);

  // 3. Preflight: CAQ required for any compute.
  if (!caq.completed) {
    throw new BOSPreflightError('CAQ not completed; cannot compute BOS');
  }

  // 4. Derive tier from diagnostic foundation.
  let tier: BOSTier;
  if (labs.present && genetics.present) {
    tier = 3;
  } else if (labs.present !== genetics.present) {
    tier = 2;
  } else {
    tier = 1;
  }
  const confidence = tierToConfidence(tier);

  // 5. Resolve display name + assemble Hannah bundle.
  const display_name = await fetchDisplayName(supabase, userId);

  // CAQ baseline: in Phase B the source returns null. Until Hannah's
  // baseline derivation lands in a follow-on prompt, fall back to a
  // conservative floor of 50 so validation has a real floor to test
  // against. Hannah computes the true baseline_from_caq inside the tool
  // call and reports it; the validator enforces score >= baseline.
  const baselineFromCaq = typeof caq.baseline_score === 'number' ? caq.baseline_score : 50;

  const bundle: HannahInputBundle = {
    user_id: userId,
    display_name,
    trigger: {
      source: triggerEvent.source,
      event_id: triggerEvent.eventId,
      bypass_cooldown: triggerEvent.bypassCooldown === true,
    },
    tier,
    diagnostic_foundation: {
      caq: {
        completed: caq.completed,
        completed_at: caq.completed_at,
        baseline_score: typeof caq.baseline_score === 'number' ? caq.baseline_score : null,
        version_number: caq.version_number,
      },
      labs: {
        present: labs.present,
        uploaded_at: labs.uploaded_at,
        panel_count: labs.panel_count,
      },
      genetics: {
        present: genetics.present,
        processed_at: genetics.processed_at,
        panel: genetics.panel,
      },
    },
    engagement_state: {
      nutrition: pickEngagement(nutrition),
      supplements: pickEngagement(supplements),
      body_tracker: pickEngagement(body_tracker),
      wearable: pickEngagement(wearable),
      plug_ins: pickEngagement(plug_ins),
      helix_challenges: pickEngagement(helix_challenges),
    },
    previous: {
      score: previous.score,
      computed_at: previous.computed_at,
      compute_version: previous.compute_version,
    },
    // Prompt 171b Phase 1: caffeine timing signal passed through.
    caffeine_timing,
  };

  // 6. Call Hannah with one retry on validation failure.
  const { client: anthropic, model } = buildAnthropic();
  const hannahResult = await callHannahWithRetry({
    anthropic,
    model,
    bundle,
    baseline: baselineFromCaq,
  });
  const hannah = hannahResult.output;

  const finishedAt = new Date().toISOString();
  const computeDurationMs = Date.now() - startTime;

  // 7. Build breakdown.
  const breakdown = buildBreakdown({
    caq,
    labs,
    genetics,
    hannah,
    trigger: triggerEvent,
    startedAt,
    finishedAt,
    cooldownStatus,
    computeDurationMs,
    apiId: hannahResult.apiId,
    inputTokens: hannahResult.inputTokens,
    outputTokens: hannahResult.outputTokens,
    model,
    bundle,
    previous,
  });

  // 8. Persist via SSOT RPC.
  const historySource = mapTriggerSourceToHistorySource(triggerEvent.source);
  const { data, error } = await supabase.rpc('compute_bio_optimization_score', {
    p_user_id: userId,
    p_score: hannah.score,
    p_tier: tier,
    p_confidence: confidence,
    p_breakdown: breakdown,
    p_compute_version: COMPUTE_VERSION,
    p_source: historySource,
  });

  // 9. Telemetry (fire-and-forget; never throws).
  await logBOSWrite({
    caller_module: 'lib/scoring/bio-optimization-score.ts',
    write_target: 'compute_bio_optimization_score_rpc',
    is_canonical: true,
    success: !error,
    error_message: error ? String(error.message ?? error) : undefined,
    user_id: userId,
    supabase,
  });

  if (error) {
    throw new BOSPersistError(String(error.message ?? error));
  }

  // 10. Return BOSResult.
  return {
    id: typeof data === 'string' ? data : String(data),
    userId,
    date: new Date().toISOString().slice(0, 10),
    score: hannah.score,
    tier,
    confidence,
    breakdown,
    computeVersion: COMPUTE_VERSION,
    computeSeq: 1, // RPC auto-increments; we return 1 as a placeholder.
    computedAt: finishedAt,
  };
}

function pickEngagement(s: EngagementSourceLike): {
  last_engaged_at: string | null;
  recent_events_7d: number;
  recent_events_30d: number;
} {
  return {
    last_engaged_at: s.last_engaged_at,
    recent_events_7d: s.recent_events_7d,
    recent_events_30d: s.recent_events_30d,
  };
}
