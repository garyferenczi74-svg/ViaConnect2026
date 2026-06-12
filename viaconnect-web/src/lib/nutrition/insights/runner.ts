// Prompt 192 Task 3: shared insight engine runner.
//
// The single entry point every trigger funnels through: the daily and
// weekly cron route and the manual refresh route. Owns the
// nutrition_insight_runs ledger lifecycle (running -> done | failed), the
// supersede pass on prior active rows, and the service role INSERT into
// nutrition_insights (the table has no INSERT policy, so this code path
// is the only writer and sets user_id explicitly). Returns a plain
// { error } instead of throwing so an insights outage can never break a
// caller.
//
// Trigger aware generation: the engine always computes everything and the
// runner filters the result by horizon. 'daily' keeps daily rows (the
// dormant 'meal' horizon counts as daily, matching the engine's expiry
// and cap semantics), 'weekly' keeps weekly rows, 'manual' keeps both.
// Caps are already per horizon inside the engine's rank stage.

import Anthropic from '@anthropic-ai/sdk';
import type { SupabaseClient } from '@supabase/supabase-js';
import { safeLog } from '@/lib/utils/safe-log';
import { withTimeout } from '@/lib/utils/with-timeout';
import { claudeComposer, templateComposer } from './compose';
import { runInsightEngine } from './engine';
import { loadDetectorInput } from './loader';
import type { DetectorInput, InsightComposer, PersistableInsight } from './types';

const SCOPE = 'insights.runner';
const DB_TIMEOUT_MS = 6000;
const COMPOSE_TIMEOUT_MS = 5000;

export type InsightRunTrigger = 'daily' | 'weekly' | 'manual';

export type RunInsightsResult =
  | { runId: string; inserted: number }
  | { error: string };

function buildComposer(): InsightComposer {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return templateComposer;
  // maxRetries 0 plus a short timeout: a slow model falls back to the
  // deterministic template composer per fact (engine contract) instead of
  // stalling the run.
  return claudeComposer(new Anthropic({ apiKey, timeout: COMPOSE_TIMEOUT_MS, maxRetries: 0 }));
}

function horizonMatchesTrigger(
  horizon: PersistableInsight['horizon'],
  trigger: InsightRunTrigger,
): boolean {
  if (trigger === 'manual') return true;
  if (trigger === 'weekly') return horizon === 'weekly';
  return horizon !== 'weekly';
}

function errMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

// Best effort: marking a run failed must never throw past this helper.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function markRunFailed(sb: any, runId: string, reason: string): Promise<void> {
  try {
    const { error } = await withTimeout(
      Promise.resolve(
        sb
          .from('nutrition_insight_runs')
          .update({
            status: 'failed',
            failure_reason: reason.slice(0, 500),
            finished_at: new Date().toISOString(),
          })
          .eq('id', runId),
      ),
      DB_TIMEOUT_MS,
      `${SCOPE}.mark-failed`,
    );
    if (error) throw new Error(error.message);
  } catch (err) {
    safeLog.warn(SCOPE, 'could not mark run failed', { runId, err });
  }
}

export async function runInsightsForUser(
  admin: SupabaseClient,
  userId: string,
  trigger: InsightRunTrigger,
): Promise<RunInsightsResult> {
  const startedAt = Date.now();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = admin as any;

  // 1. Open the run ledger row (powers the 202 run id and the manual
  // refresh rate limit window).
  let runId = '';
  try {
    const { data, error } = await withTimeout(
      Promise.resolve(
        sb
          .from('nutrition_insight_runs')
          .insert({ user_id: userId, trigger, status: 'running' })
          .select('id')
          .single(),
      ),
      DB_TIMEOUT_MS,
      `${SCOPE}.run-insert`,
    );
    if (error || !data?.id) throw new Error(error?.message ?? 'no run id returned');
    runId = String(data.id);
  } catch (err) {
    safeLog.error(SCOPE, 'run row insert failed', {
      trigger,
      userId,
      durationMs: Date.now() - startedAt,
      err,
    });
    return { error: `run_insert_failed: ${errMessage(err)}` };
  }

  const fail = async (reason: string): Promise<RunInsightsResult> => {
    await markRunFailed(sb, runId, reason);
    safeLog.error(SCOPE, 'run failed', {
      trigger,
      userId,
      runId,
      durationMs: Date.now() - startedAt,
      reason,
    });
    return { error: reason };
  };

  // 2. Load detector input (each loader query carries its own timeout and
  // fails open; this catch covers anything unexpected).
  let input: DetectorInput;
  try {
    input = await loadDetectorInput(admin, userId);
  } catch (err) {
    return fail(`load_failed: ${errMessage(err)}`);
  }

  // 3. Run the engine, then filter to the trigger's horizon.
  let generated: PersistableInsight[];
  let droppedCount = 0;
  try {
    const result = await runInsightEngine(input, buildComposer());
    droppedCount = result.dropped.length;
    generated = result.insights.filter((row) => horizonMatchesTrigger(row.horizon, trigger));
  } catch (err) {
    return fail(`engine_failed: ${errMessage(err)}`);
  }

  // 4. Supersede pass, before insert.
  const nowIso = new Date().toISOString();
  try {
    // 4a. Anything new of the same (insight_type, horizon) replaces the
    // prior active row: the engine's fingerprint dedup already suppressed
    // unchanged facts, so a regenerated pair means the fact moved. One
    // UPDATE per distinct pair (at most 8) keeps the match exact instead
    // of an .in() cross product.
    const pairs = new Map<string, { type: string; horizon: string }>();
    for (const row of generated) {
      pairs.set(`${row.insight_type}|${row.horizon}`, {
        type: row.insight_type,
        horizon: row.horizon,
      });
    }
    for (const pair of pairs.values()) {
      const { error } = await withTimeout(
        Promise.resolve(
          sb
            .from('nutrition_insights')
            .update({ status: 'expired' })
            .eq('user_id', userId)
            .eq('status', 'active')
            .eq('insight_type', pair.type)
            .eq('horizon', pair.horizon),
        ),
        DB_TIMEOUT_MS,
        `${SCOPE}.supersede-pair`,
      );
      if (error) throw new Error(error.message);
    }

    // 4b. Expiry sweep: active rows past expires_at flip to expired here
    // (the GET route only filters them out; this is the status writer).
    const { error: staleError } = await withTimeout(
      Promise.resolve(
        sb
          .from('nutrition_insights')
          .update({ status: 'expired' })
          .eq('user_id', userId)
          .eq('status', 'active')
          .lte('expires_at', nowIso),
      ),
      DB_TIMEOUT_MS,
      `${SCOPE}.supersede-stale`,
    );
    if (staleError) throw new Error(staleError.message);
  } catch (err) {
    return fail(`supersede_failed: ${errMessage(err)}`);
  }

  // 5. Insert the new rows with explicit user_id (service role only path).
  if (generated.length > 0) {
    try {
      const rows = generated.map((row) => ({ ...row, user_id: userId }));
      const { error } = await withTimeout(
        Promise.resolve(sb.from('nutrition_insights').insert(rows)),
        DB_TIMEOUT_MS,
        `${SCOPE}.insights-insert`,
      );
      if (error) throw new Error(error.message);
    } catch (err) {
      return fail(`insert_failed: ${errMessage(err)}`);
    }
  }

  // 6. Close the ledger row.
  try {
    const { error } = await withTimeout(
      Promise.resolve(
        sb
          .from('nutrition_insight_runs')
          .update({
            status: 'done',
            inserted_count: generated.length,
            finished_at: new Date().toISOString(),
          })
          .eq('id', runId),
      ),
      DB_TIMEOUT_MS,
      `${SCOPE}.run-finalize`,
    );
    if (error) throw new Error(error.message);
  } catch (err) {
    return fail(`finalize_failed: ${errMessage(err)}`);
  }

  safeLog.info(SCOPE, 'run complete', {
    trigger,
    userId,
    runId,
    durationMs: Date.now() - startedAt,
    inserted: generated.length,
    dropped: droppedCount,
  });
  return { runId, inserted: generated.length };
}
