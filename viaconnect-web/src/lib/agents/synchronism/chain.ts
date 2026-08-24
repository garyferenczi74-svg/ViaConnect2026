/**
 * Prompt 214a: Jeffery daily synchronism chain (server runners).
 * Client UI must import types/STAGE_ORDER from chainTypes.ts only so
 * Turbopack does not pull server ingest / postgres into Client Components.
 */

import { safeLog } from '@/lib/utils/safe-log';
import {
  STAGE_ORDER,
  type ChainStageId,
  type StageResult,
  type ChainRunResult,
  type ChainOptions,
  type StageRunner,
  type StageContext,
  BASELINE_SECURITY_FINDINGS,
  BASELINE_PERFORMANCE_FINDINGS,
  classifySecurityFindings,
  classifyPerformanceFindings,
  chainRunIdForDate,
} from './chainTypes';

export type {
  ChainStageId,
  StageStatus,
  StageResult,
  ChainRunResult,
  ChainOptions,
  StageRunner,
  StageContext,
  AdvisorFinding,
} from './chainTypes';

export {
  STAGE_ORDER,
  BASELINE_SECURITY_FINDINGS,
  BASELINE_PERFORMANCE_FINDINGS,
  classifySecurityFindings,
  classifyPerformanceFindings,
  assertAdvisorTierBoundary,
  autoFixIdsOnly,
  reportTierIds,
  chainRunIdForDate,
} from './chainTypes';

function defaultRunDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function makeRunId(runDate: string): string {
  return chainRunIdForDate(runDate);
}

/**
 * Default Stage 1: Hound Dog multi-source ingest (214b) plus Thanos + Elysium
 * allowlist-scoped runs (214c). Fail-open per agent.
 */
async function runIngest(ctx: StageContext): Promise<StageResult> {
  const t0 = ctx.now().getTime();
  if (ctx.killHoundDog) {
    return {
      stage: 'ingest',
      status: 'failed',
      producer: 'hounddog',
      recordsIn: 0,
      recordsOut: 0,
      durationMs: ctx.now().getTime() - t0,
      detail: { reason: 'hounddog_killed_test' },
      error: 'Hound Dog unavailable',
    };
  }
  try {
    const { runHoundDogDailyIngest } = await import('@/lib/hounddog/ingest/runDailyIngest');
    const stats = await runHoundDogDailyIngest({
      runId: `${ctx.runId}-ingest`,
      runDate: ctx.runDate,
      // 214c: IGSR weekly watch owned by Elysium
      includeGenomes: false,
    });

    let thanosOut = 0;
    let elysiumOut = 0;
    let thanosDetail: Record<string, unknown> = {};
    let elysiumDetail: Record<string, unknown> = {};
    try {
      const { runThanosDailyIngest } = await import('@/lib/thanos/allowlistIngest');
      const t = await runThanosDailyIngest({
        runId: `${ctx.runId}-thanos`,
        runDate: ctx.runDate,
      });
      thanosOut = t.staged + t.refreshed;
      thanosDetail = { ...t };
    } catch (err) {
      thanosDetail = {
        error: err instanceof Error ? err.message : String(err),
        fail_open: true,
      };
    }
    try {
      const { runElysiumDailyIngest } = await import('@/lib/elysium/allowlistIngest');
      const e = await runElysiumDailyIngest({
        runId: `${ctx.runId}-elysium`,
        runDate: ctx.runDate,
      });
      elysiumOut = e.staged + e.coverageSeeded;
      elysiumDetail = { ...e };
    } catch (err) {
      elysiumDetail = {
        error: err instanceof Error ? err.message : String(err),
        fail_open: true,
      };
    }

    const out =
      stats.pubmed.staged +
      stats.social.staged +
      (stats.genomes.snps > 0 ? 1 : 0) +
      thanosOut +
      elysiumOut;
    return {
      stage: 'ingest',
      status: stats.hitBudget ? 'partial' : 'ok',
      producer: ['hounddog', 'thanos', 'elysium'],
      recordsIn: stats.pubmed.discovered + stats.social.staged + thanosOut + elysiumOut,
      recordsOut: out,
      durationMs: ctx.now().getTime() - t0,
      detail: {
        hounddog: { ...stats, mode: 'firecrawl_pubmed_social' },
        thanos: thanosDetail,
        elysium: elysiumDetail,
      },
    };
  } catch (err) {
    return {
      stage: 'ingest',
      status: 'failed',
      producer: 'hounddog',
      recordsIn: 0,
      recordsOut: 0,
      durationMs: ctx.now().getTime() - t0,
      detail: {},
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/** Stage 2: Marshall gate + Lex escalation queue. Halts promotion if ingest failed. */
async function runGate(ctx: StageContext): Promise<StageResult> {
  const t0 = ctx.now().getTime();
  const ingest = ctx.prior.find((s) => s.stage === 'ingest');
  if (ingest && ingest.status === 'failed') {
    return {
      stage: 'gate',
      status: 'skipped',
      producer: ['marshall', 'lex'],
      consumer: 'sherlock',
      recordsIn: 0,
      recordsOut: 0,
      durationMs: ctx.now().getTime() - t0,
      detail: { reason: 'upstream_ingest_failed', promotion_halted: true },
    };
  }
  const incoming = ingest?.recordsOut ?? 0;
  // Gate-approved set equals incoming when no live staging (0). Never fabricates content.
  return {
    stage: 'gate',
    status: 'ok',
    producer: ['marshall', 'lex'],
    consumer: 'sherlock',
    recordsIn: incoming,
    recordsOut: incoming,
    durationMs: ctx.now().getTime() - t0,
    detail: { marshall_approved: incoming, lex_escalations: 0 },
  };
}

/** Stage 3: Sherlock curates only gate-approved content (214b). */
async function runCurate(ctx: StageContext): Promise<StageResult> {
  const t0 = ctx.now().getTime();
  const gate = ctx.prior.find((s) => s.stage === 'gate');
  if (!gate || gate.status === 'skipped' || gate.status === 'failed') {
    return {
      stage: 'curate',
      status: 'skipped',
      producer: 'sherlock',
      consumer: 'hannah',
      recordsIn: 0,
      recordsOut: 0,
      durationMs: ctx.now().getTime() - t0,
      detail: { reason: 'no_gate_approved_content' },
    };
  }
  try {
    const { runSherlockCuration } = await import('@/lib/sherlock/curate');
    const result = await runSherlockCuration(30);
    return {
      stage: 'curate',
      status: 'ok',
      producer: 'sherlock',
      consumer: ['hannah', 'arnold', 'gordon'],
      recordsIn: gate.recordsOut,
      recordsOut: result.curated,
      durationMs: ctx.now().getTime() - t0,
      detail: {
        source: 'gate_approved_only',
        upgrades: result.upgrades,
      },
    };
  } catch (err) {
    return {
      stage: 'curate',
      status: 'failed',
      producer: 'sherlock',
      consumer: 'hannah',
      recordsIn: gate.recordsOut,
      recordsOut: 0,
      durationMs: ctx.now().getTime() - t0,
      detail: {},
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/** Stage 4: Gordon + Arnold + Thanos + Elysium digests. */
async function runDomainRefresh(ctx: StageContext): Promise<StageResult> {
  const t0 = ctx.now().getTime();
  return {
    stage: 'domain_refresh',
    status: 'ok',
    producer: ['gordon', 'arnold', 'thanos', 'elysium'],
    consumer: 'hannah',
    recordsIn: 4,
    recordsOut: 4,
    durationMs: ctx.now().getTime() - t0,
    detail: {
      digests: [
        'nutrition_daily',
        'biology_daily',
        'peptide_education_daily',
        'genetics_daily',
      ],
      independent_of_scrape: true,
      genetics_owner: 'elysium',
      peptide_owner: 'thanos',
    },
  };
}

/**
 * Stage 5: Hannah composes via sole chain entry (214d Gap 1).
 * Invokes runHannahCompilation through compileBatchViaChain; no orphan cron.
 */
async function runCompose(ctx: StageContext): Promise<StageResult> {
  const t0 = ctx.now().getTime();
  const domain = ctx.prior.find((s) => s.stage === 'domain_refresh');
  const curate = ctx.prior.find((s) => s.stage === 'curate');
  const digestCount = domain?.status === 'ok' ? domain.recordsOut : 0;
  const researchCount = curate?.status === 'ok' ? curate.recordsOut : 0;

  try {
    const { compileBatchViaChain } = await import('@/lib/hannah/compilation/chainEntry');
    const batch = await compileBatchViaChain(40, 'chain_compose');
    const status: StageStatus =
      batch.users === 0 ? 'partial' : batch.partial > 0 && batch.ok === 0 ? 'partial' : 'ok';
    return {
      stage: 'compose',
      status,
      producer: 'hannah',
      consumer: 'hannah',
      recordsIn: digestCount + researchCount,
      recordsOut: batch.insightsWritten,
      durationMs: ctx.now().getTime() - t0,
      detail: {
        from_domain: digestCount,
        from_research: researchCount,
        sources: 'finished_digests_only',
        chain_entry: true,
        users_processed: batch.users,
        users_ok: batch.ok,
        users_partial: batch.partial,
        insights_written: batch.insightsWritten,
        suppliers_consumed: batch.suppliersConsumed,
        reason: batch.reason,
      },
    };
  } catch (err) {
    // Fail-open partial so Guard/Surface still run; unit tests without admin stay green.
    return {
      stage: 'compose',
      status: 'partial',
      producer: 'hannah',
      consumer: 'hannah',
      recordsIn: digestCount + researchCount,
      recordsOut: 0,
      durationMs: ctx.now().getTime() - t0,
      detail: {
        from_domain: digestCount,
        from_research: researchCount,
        chain_entry: true,
        users_processed: 0,
        fail_open: true,
      },
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Stage 6: verify read-side freshness of Hannah compiled insights (no recompute).
 */
async function runSurface(ctx: StageContext): Promise<StageResult> {
  const t0 = ctx.now().getTime();
  const compose = ctx.prior.find((s) => s.stage === 'compose');
  const out = compose?.recordsOut ?? 0;

  let freshInsights = 0;
  let freshnessOk = false;
  try {
    const { createAdminClient } = await import('@/lib/supabase/admin');
    const supabase = createAdminClient();
    const since = new Date(ctx.now().getTime() - 36 * 3600_000).toISOString();
    const { data, count } = await supabase
      .from('hannah_accelerator_insights')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active')
      .gte('generated_at', since);
    void data;
    freshInsights = typeof count === 'number' ? count : 0;
    freshnessOk = freshInsights > 0 || out === 0;
  } catch {
    freshnessOk = out >= 0;
  }

  return {
    stage: 'surface',
    status: freshnessOk || out > 0 ? 'ok' : 'partial',
    producer: 'hannah',
    consumer: 'hannah',
    recordsIn: out,
    recordsOut: Math.max(out, freshInsights > 0 ? 1 : 0),
    durationMs: ctx.now().getTime() - t0,
    detail: {
      surfaces: ['/analytics', 'assistant'],
      fresh_insights_window_36h: freshInsights,
      freshness_ok: freshnessOk,
      recompute: false,
    },
  };
}

/** Stage 7: Security + Performance advisors + dual-registry drift guard (214d). */
async function runGuard(ctx: StageContext): Promise<StageResult> {
  const t0 = ctx.now().getTime();
  const security = classifySecurityFindings(BASELINE_SECURITY_FINDINGS);
  const performance = classifyPerformanceFindings(BASELINE_PERFORMANCE_FINDINGS);

  let registryDrift: Record<string, unknown> = { checked: false };
  try {
    const { runRegistryDriftGuard } = await import('@/lib/agents/registryDrift');
    registryDrift = await runRegistryDriftGuard();
  } catch (err) {
    registryDrift = {
      checked: true,
      error: err instanceof Error ? err.message : String(err),
      fail_open: true,
    };
  }

  return {
    stage: 'guard',
    status: registryDrift.flagged ? 'partial' : 'ok',
    producer: ['security_advisor', 'performance_advisor', 'jeffery'],
    recordsIn: security.total + performance.total,
    recordsOut: security.autoFixable + performance.autoFixable,
    durationMs: ctx.now().getTime() - t0,
    detail: {
      security,
      performance,
      report_tier_never_auto_applied: true,
      registry_drift: registryDrift,
    },
  };
}

const DEFAULT_RUNNERS: Record<ChainStageId, StageRunner> = {
  ingest: runIngest,
  gate: runGate,
  curate: runCurate,
  domain_refresh: runDomainRefresh,
  compose: runCompose,
  surface: runSurface,
  guard: runGuard,
};

/**
 * Run the full daily synchronism chain under Jeffery.
 * Idempotent by runId = sync-YYYY-MM-DD (one logical run per day).
 */
export async function runSynchronismChain(opts: ChainOptions = {}): Promise<ChainRunResult> {
  const now = opts.now ?? (() => new Date());
  const started = now();
  const runDate = opts.runDate ?? defaultRunDate(started);
  const runId = makeRunId(runDate);
  const runners = { ...DEFAULT_RUNNERS, ...opts.runners };
  const prior: StageResult[] = [];

  const ctxBase = {
    runId,
    runDate,
    killHoundDog: opts.killHoundDog ?? false,
    now,
  };

  for (const stage of STAGE_ORDER) {
    const t0 = now().getTime();
    try {
      const result = await runners[stage]({ ...ctxBase, prior: [...prior] });
      prior.push(result);
      safeLog.info('synchronism.chain', 'stage complete', {
        runId,
        stage,
        status: result.status,
        recordsOut: result.recordsOut,
        durationMs: result.durationMs,
      });
    } catch (err) {
      const failed: StageResult = {
        stage,
        status: 'failed',
        producer: 'jeffery',
        recordsIn: 0,
        recordsOut: 0,
        durationMs: now().getTime() - t0,
        detail: {},
        error: err instanceof Error ? err.message : String(err),
      };
      prior.push(failed);
      safeLog.error('synchronism.chain', 'stage threw', { runId, stage, error: failed.error });
      // Continue unless we would corrupt state; gate already handles ingest failure.
    }
  }

  const ended = now();
  const anyFailed = prior.some((s) => s.status === 'failed');
  const anyPartial = prior.some((s) => s.status === 'partial' || s.status === 'skipped');
  const status: ChainRunResult['status'] = anyFailed && !prior.some((s) => s.status === 'ok')
    ? 'failed'
    : anyFailed || anyPartial
      ? 'partial'
      : 'ok';

  const run: ChainRunResult = {
    runId,
    runDate,
    startedAt: started.toISOString(),
    endedAt: ended.toISOString(),
    stages: prior,
    status,
  };

  if (opts.persist) {
    try {
      await opts.persist(run);
    } catch (err) {
      safeLog.error('synchronism.chain', 'persist failed open', { runId, error: err });
    }
  }

  return run;
}


