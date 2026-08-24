/**
 * Prompt 213a / 216d: end-to-end daily compilation for one user.
 * 216d adds Hannah daily note persist (distinct from status read).
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { safeLog } from '@/lib/utils/safe-log';
import { ALL_DIGEST_FNS } from './digests';
import { composeAcceleratorInsights, composePersonalizedRead } from './compose';
import { composeHannahNote } from './hannahNote';
import type { CompilationResult, SupplierDigest } from './types';

function runIdFor(userId: string, runDate: string): string {
  return `hannah-compile-${runDate}-${userId.slice(0, 8)}`;
}

function sinceIsoFromDate(runDate: string): string {
  // 36h lookback window for digests
  const d = new Date(`${runDate}T12:00:00.000Z`);
  d.setUTCHours(d.getUTCHours() - 36);
  return d.toISOString();
}

async function resolveDisplayName(
  userId: string,
  override?: string,
): Promise<string> {
  if (override && override.trim().length > 0) return override.trim().split(/\s+/)[0];
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from('profiles')
      .select('full_name, first_name')
      .eq('id', userId)
      .maybeSingle();
    const row = data as { full_name?: string | null; first_name?: string | null } | null;
    const raw = row?.first_name || row?.full_name;
    if (raw && String(raw).trim()) return String(raw).trim().split(/\s+/)[0];
  } catch {
    /* fail-open */
  }
  return '';
}

export interface RunCompilationOpts {
  userId: string;
  runDate?: string;
  displayName?: string;
  /** Inject digests for tests */
  digests?: SupplierDigest[];
  /** Skip DB writes */
  dryRun?: boolean;
}

export async function runHannahCompilation(
  opts: RunCompilationOpts,
): Promise<CompilationResult> {
  const started = new Date();
  const runDate = opts.runDate ?? started.toISOString().slice(0, 10);
  const runId = runIdFor(opts.userId, runDate);
  const sinceIso = sinceIsoFromDate(runDate);

  let digests: SupplierDigest[];
  if (opts.digests) {
    digests = opts.digests;
  } else {
    digests = await Promise.all(
      ALL_DIGEST_FNS.map((fn) => fn(opts.userId, sinceIso)),
    );
  }

  const displayName = await resolveDisplayName(opts.userId, opts.displayName);

  const insights = composeAcceleratorInsights(digests, 4);
  const personalized = composePersonalizedRead(
    digests,
    insights,
    displayName,
  );

  // Prompt 216d: personal note from same digests; distinct from status read material.
  const noteComposed = composeHannahNote(digests, insights, displayName, {
    analysis: personalized.analysis,
    recommendation: personalized.recommendation,
  });

  const anySkip = digests.some((d) => d.skipped);
  const status: CompilationResult['status'] =
    insights.length === 0 && anySkip
      ? 'partial'
      : insights.length === 0
        ? 'partial'
        : anySkip
          ? 'partial'
          : 'ok';

  const ended = new Date();
  const generatedAt = ended.toISOString();
  const result: CompilationResult = {
    runId,
    userId: opts.userId,
    runDate,
    status,
    digests,
    insights,
    personalized,
    hannahNote: {
      noteText: noteComposed.noteText,
      noteKind: noteComposed.noteKind,
      sourceRefs: noteComposed.sourceRefs,
      supplierAgents: noteComposed.supplierAgents,
      readTodaySnapshot: noteComposed.readTodaySnapshot,
      generatedAt,
    },
    startedAt: started.toISOString(),
    endedAt: generatedAt,
  };

  if (opts.dryRun) return result;

  try {
    const supabase = createAdminClient();
    const expires = new Date(Date.now() + 36 * 3600_000).toISOString();

    // Upsert accelerator insights (idempotent on user_id + insight_key)
    for (const ins of insights) {
      await supabase.from('hannah_accelerator_insights').upsert(
        {
          user_id: opts.userId,
          insight_key: ins.insightKey,
          title: ins.title,
          description: ins.description,
          category: `${ins.category}|supplement`,
          source_hub: ins.sourceHub,
          supplier_agent: ins.supplierAgent,
          source_refs: ins.sourceRefs,
          estimated_impact: ins.estimatedImpact,
          priority: ins.priority,
          status: 'active',
          generated_at: ended.toISOString(),
          expires_at: expires,
          run_id: runId,
        },
        { onConflict: 'user_id,insight_key' },
      );

      // Mirror into journey_recommendations for legacy readers
      await supabase.from('journey_recommendations').upsert(
        {
          user_id: opts.userId,
          insight_key: ins.insightKey,
          title: ins.title,
          description: ins.description,
          category: `${ins.category}|supplement`,
          estimated_impact: ins.estimatedImpact,
          priority: ins.priority,
          status: 'active',
          source_hub: ins.sourceHub,
          supplier_agent: ins.supplierAgent,
          source_refs: ins.sourceRefs,
          generated_at: ended.toISOString(),
          expires_at: expires,
        },
        { onConflict: 'user_id,insight_key' },
      );
    }

    // Personalized weekly read (same material)
    await supabase.from('hannah_trend_insights').upsert(
      {
        user_id: opts.userId,
        time_range: '7D',
        greeting: personalized.greeting,
        analysis: personalized.analysis,
        recommendation: personalized.recommendation,
        focus_area: personalized.focusArea,
        estimated_impact: { points: personalized.estimatedImpact },
        expires_at: new Date(Date.now() + 6 * 3600_000).toISOString(),
        model_version: '213a-compile',
      },
      { onConflict: 'user_id,time_range' },
    );

    // Prompt 216d: daily personal note (overwrite same day on recompile)
    const { error: noteErr } = await supabase.from('hannah_daily_notes').upsert(
      {
        user_id: opts.userId,
        run_date: runDate,
        run_id: runId,
        note_text: noteComposed.noteText,
        note_kind: noteComposed.noteKind,
        source_refs: noteComposed.sourceRefs,
        supplier_agents: noteComposed.supplierAgents,
        read_today_snapshot: noteComposed.readTodaySnapshot,
        generated_at: generatedAt,
        compile_ended_at: generatedAt,
        updated_at: generatedAt,
      },
      { onConflict: 'user_id,run_date' },
    );
    if (noteErr) {
      // Fail-open: leave any prior note; log structured warning (never blank invent).
      safeLog.warn('hannah.compilation', 'note persist failed open; prior note retained if any', {
        runId,
        error: noteErr.message,
      });
    }

    await supabase.from('hannah_compile_runs').upsert(
      {
        run_id: runId,
        user_id: opts.userId,
        run_date: runDate,
        status,
        suppliers: Object.fromEntries(
          digests.map((d) => [
            d.supplier,
            { ok: d.ok, skipped: d.skipped, items: d.items.length, ms: d.durationMs },
          ]),
        ),
        insights_written: insights.length,
        started_at: result.startedAt,
        ended_at: result.endedAt,
      },
      { onConflict: 'user_id,run_date' },
    );

    safeLog.info('hannah.compilation', 'run complete', {
      runId,
      userId: opts.userId,
      insights: insights.length,
      noteKind: noteComposed.noteKind,
      status,
    });
  } catch (err) {
    safeLog.error('hannah.compilation', 'persist failed open', {
      runId,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  return result;
}

/** Batch compile for recently active users (cron). */
export async function runHannahCompilationBatch(limit = 50): Promise<{
  users: number;
  ok: number;
  partial: number;
}> {
  const supabase = createAdminClient();
  const since = new Date(Date.now() - 14 * 24 * 3600_000).toISOString();

  // Active users: recent nutrition or composition activity
  const userIds = new Set<string>();

  const { data: mealUsers } = await supabase
    .from('nutrition_logs')
    .select('user_id')
    .gte('logged_at', since)
    .limit(limit);

  if (Array.isArray(mealUsers)) {
    for (const r of mealUsers) {
      const id = (r as { user_id?: string }).user_id;
      if (id) userIds.add(id);
    }
  }

  const { data: bodyUsers } = await supabase
    .from('body_tracker_composition')
    .select('user_id')
    .gte('recorded_at', since)
    .limit(limit);

  if (Array.isArray(bodyUsers)) {
    for (const r of bodyUsers) {
      const id = (r as { user_id?: string }).user_id;
      if (id) userIds.add(id);
    }
  }

  // Always include users with profiles if still empty (launch sparse)
  if (userIds.size === 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id')
      .limit(Math.min(limit, 20));
    if (Array.isArray(profiles)) {
      for (const p of profiles) {
        const id = (p as { id?: string }).id;
        if (id) userIds.add(id);
      }
    }
  }

  let ok = 0;
  let partial = 0;
  for (const userId of [...userIds].slice(0, limit)) {
    const res = await runHannahCompilation({ userId });
    if (res.status === 'ok') ok += 1;
    else partial += 1;
  }

  return { users: Math.min(userIds.size, limit), ok, partial };
}
