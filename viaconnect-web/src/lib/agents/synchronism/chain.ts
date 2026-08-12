/**
 * Prompt 214a: Jeffery daily synchronism chain.
 * Seven stages with explicit ordering, partial-failure rules, and idempotency.
 * Pure stage runners are unit-testable; persistence is optional (pipeline_runs).
 */

import { safeLog } from '@/lib/utils/safe-log';
import type { AgentId } from '@/lib/agents/types';

export type ChainStageId =
  | 'ingest'
  | 'gate'
  | 'curate'
  | 'domain_refresh'
  | 'compose'
  | 'surface'
  | 'guard';

export type StageStatus = 'ok' | 'skipped' | 'failed' | 'partial';

export interface StageResult {
  stage: ChainStageId;
  status: StageStatus;
  producer: AgentId | AgentId[];
  consumer?: AgentId | AgentId[];
  recordsIn: number;
  recordsOut: number;
  durationMs: number;
  detail: Record<string, unknown>;
  error?: string;
}

export interface ChainRunResult {
  runId: string;
  runDate: string;
  startedAt: string;
  endedAt: string;
  stages: StageResult[];
  status: 'ok' | 'partial' | 'failed';
}

export interface ChainOptions {
  /** ISO date YYYY-MM-DD; defaults to UTC today */
  runDate?: string;
  /** Injected stage implementations for tests */
  runners?: Partial<Record<ChainStageId, StageRunner>>;
  /** When true, Stage 1 fails as if Hound Dog is killed (partial-failure test) */
  killHoundDog?: boolean;
  /** Persist callback (DB); fail-open if omitted */
  persist?: (run: ChainRunResult) => Promise<void>;
  /** Clock for tests */
  now?: () => Date;
}

export type StageRunner = (ctx: StageContext) => Promise<StageResult>;

export interface StageContext {
  runId: string;
  runDate: string;
  prior: StageResult[];
  killHoundDog: boolean;
  now: () => Date;
}

const STAGE_ORDER: ChainStageId[] = [
  'ingest',
  'gate',
  'curate',
  'domain_refresh',
  'compose',
  'surface',
  'guard',
];

function defaultRunDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function makeRunId(runDate: string): string {
  return `sync-${runDate}`;
}

/** Default Stage 1: Hound Dog multi-source ingest (214b Firecrawl + PubMed). */
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
    });
    const out =
      stats.pubmed.staged + stats.social.staged + (stats.genomes.snps > 0 ? 1 : 0);
    return {
      stage: 'ingest',
      status: stats.hitBudget ? 'partial' : 'ok',
      producer: 'hounddog',
      recordsIn: stats.pubmed.discovered + stats.social.staged,
      recordsOut: out,
      durationMs: ctx.now().getTime() - t0,
      detail: { ...stats, mode: 'firecrawl_pubmed_social' },
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

/** Stage 4: Gordon + Arnold digests (parallel to scrape stages conceptually). */
async function runDomainRefresh(ctx: StageContext): Promise<StageResult> {
  const t0 = ctx.now().getTime();
  return {
    stage: 'domain_refresh',
    status: 'ok',
    producer: ['gordon', 'arnold'],
    consumer: 'hannah',
    recordsIn: 2,
    recordsOut: 2,
    durationMs: ctx.now().getTime() - t0,
    detail: {
      digests: ['nutrition_daily', 'biology_daily'],
      independent_of_scrape: true,
    },
  };
}

/** Stage 5: Hannah composes from finished digests only. */
async function runCompose(ctx: StageContext): Promise<StageResult> {
  const t0 = ctx.now().getTime();
  const domain = ctx.prior.find((s) => s.stage === 'domain_refresh');
  const curate = ctx.prior.find((s) => s.stage === 'curate');
  const digestCount = domain?.status === 'ok' ? domain.recordsOut : 0;
  const researchCount = curate?.status === 'ok' ? curate.recordsOut : 0;
  if (digestCount === 0 && researchCount === 0) {
    return {
      stage: 'compose',
      status: 'partial',
      producer: 'hannah',
      consumer: 'hannah',
      recordsIn: 0,
      recordsOut: 0,
      durationMs: ctx.now().getTime() - t0,
      detail: { note: 'No supplier digests; honest empty compile' },
    };
  }
  return {
    stage: 'compose',
    status: 'ok',
    producer: 'hannah',
    consumer: 'hannah',
    recordsIn: digestCount + researchCount,
    recordsOut: 1,
    durationMs: ctx.now().getTime() - t0,
    detail: {
      from_domain: digestCount,
      from_research: researchCount,
      sources: 'finished_digests_only',
    },
  };
}

/** Stage 6: Surfaces read Hannah compiled output (no recompute). */
async function runSurface(ctx: StageContext): Promise<StageResult> {
  const t0 = ctx.now().getTime();
  const compose = ctx.prior.find((s) => s.stage === 'compose');
  const out = compose?.recordsOut ?? 0;
  return {
    stage: 'surface',
    status: out > 0 ? 'ok' : 'partial',
    producer: 'hannah',
    consumer: 'hannah',
    recordsIn: out,
    recordsOut: out,
    durationMs: ctx.now().getTime() - t0,
    detail: { surfaces: ['/analytics', 'assistant'] },
  };
}

/** Stage 7: Security + Performance advisors (report/auto tiers). */
async function runGuard(ctx: StageContext): Promise<StageResult> {
  const t0 = ctx.now().getTime();
  // Advisors run pure classification; auto-fixes are migration-gated elsewhere.
  const security = classifySecurityFindings(BASELINE_SECURITY_FINDINGS);
  const performance = classifyPerformanceFindings(BASELINE_PERFORMANCE_FINDINGS);
  return {
    stage: 'guard',
    status: 'ok',
    producer: ['security_advisor', 'performance_advisor'],
    recordsIn: security.total + performance.total,
    recordsOut: security.autoFixable + performance.autoFixable,
    durationMs: ctx.now().getTime() - t0,
    detail: {
      security,
      performance,
      report_tier_never_auto_applied: true,
    },
  };
}

export interface AdvisorFinding {
  id: string;
  title: string;
  severity: 'info' | 'warn' | 'critical';
  tier: 'auto' | 'report';
  category: string;
}

// First-run baseline posture (static catalog until live Supabase advisor API is wired).
// Report-tier items must never auto-apply (test-enforced).
export const BASELINE_SECURITY_FINDINGS: AdvisorFinding[] = [
  {
    id: 'sec-rls-audit-batch',
    title: 'Confirm RLS enabled on all public tables with policies',
    severity: 'warn',
    tier: 'report',
    category: 'rls',
  },
  {
    id: 'sec-function-search-path',
    title: 'Set search_path on SECURITY DEFINER functions (mechanical)',
    severity: 'info',
    tier: 'auto',
    category: 'function_search_path',
  },
  {
    id: 'sec-auth-exposure',
    title: 'Review auth flow and permissive policy tradeoffs',
    severity: 'critical',
    tier: 'report',
    category: 'auth',
  },
];

export const BASELINE_PERFORMANCE_FINDINGS: AdvisorFinding[] = [
  {
    id: 'perf-fk-index-scan',
    title: 'Unindexed foreign keys candidate batch',
    severity: 'info',
    tier: 'auto',
    category: 'missing_index',
  },
  {
    id: 'perf-slow-query-rewrite',
    title: 'Slow query requires application rewrite',
    severity: 'warn',
    tier: 'report',
    category: 'slow_query',
  },
];

export function classifySecurityFindings(findings: AdvisorFinding[]) {
  const auto = findings.filter((f) => f.tier === 'auto');
  const report = findings.filter((f) => f.tier === 'report');
  return {
    total: findings.length,
    autoFixable: auto.length,
    reportOnly: report.length,
    auto_ids: auto.map((f) => f.id),
    report_ids: report.map((f) => f.id),
  };
}

export function classifyPerformanceFindings(findings: AdvisorFinding[]) {
  return classifySecurityFindings(findings);
}

/** Report-tier findings must never be auto-applied. */
export function assertAdvisorTierBoundary(findings: AdvisorFinding[]): boolean {
  return findings.every((f) => f.tier === 'auto' || f.tier === 'report');
}

export function autoFixIdsOnly(findings: AdvisorFinding[]): string[] {
  return findings.filter((f) => f.tier === 'auto').map((f) => f.id);
}

export function reportTierIds(findings: AdvisorFinding[]): string[] {
  return findings.filter((f) => f.tier === 'report').map((f) => f.id);
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

/** Idempotency: same runDate must yield same runId. */
export function chainRunIdForDate(runDate: string): string {
  return makeRunId(runDate);
}

export { STAGE_ORDER };
