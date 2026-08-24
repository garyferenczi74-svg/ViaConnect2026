/**
 * Client-safe synchronism chain types and pure helpers.
 * Must NOT import server-only modules (ingest, postgres, job runners).
 * UI panels import from here; runSynchronismChain stays in chain.ts.
 */

import type { AgentId } from "@/lib/agents/types";

export type ChainStageId =
  | "ingest"
  | "gate"
  | "curate"
  | "domain_refresh"
  | "compose"
  | "surface"
  | "guard";

export type StageStatus = "ok" | "skipped" | "failed" | "partial";

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
  status: "ok" | "partial" | "failed";
}

export interface StageContext {
  runId: string;
  runDate: string;
  prior: StageResult[];
  killHoundDog: boolean;
  now: () => Date;
}

export type StageRunner = (ctx: StageContext) => Promise<StageResult>;

export interface ChainOptions {
  runDate?: string;
  runners?: Partial<Record<ChainStageId, StageRunner>>;
  killHoundDog?: boolean;
  persist?: (run: ChainRunResult) => Promise<void>;
  now?: () => Date;
}

export const STAGE_ORDER: ChainStageId[] = [
  "ingest",
  "gate",
  "curate",
  "domain_refresh",
  "compose",
  "surface",
  "guard",
];

export interface AdvisorFinding {
  id: string;
  title: string;
  severity: "info" | "warn" | "critical";
  tier: "auto" | "report";
  category: string;
}

export const BASELINE_SECURITY_FINDINGS: AdvisorFinding[] = [
  {
    id: "sec-rls-audit-batch",
    title: "Confirm RLS enabled on all public tables with policies",
    severity: "warn",
    tier: "report",
    category: "rls",
  },
  {
    id: "sec-function-search-path",
    title: "Set search_path on SECURITY DEFINER functions (mechanical)",
    severity: "info",
    tier: "auto",
    category: "function_search_path",
  },
  {
    id: "sec-auth-exposure",
    title: "Review auth flow and permissive policy tradeoffs",
    severity: "critical",
    tier: "report",
    category: "auth",
  },
];

export const BASELINE_PERFORMANCE_FINDINGS: AdvisorFinding[] = [
  {
    id: "perf-fk-index-scan",
    title: "Unindexed foreign keys candidate batch",
    severity: "info",
    tier: "auto",
    category: "missing_index",
  },
  {
    id: "perf-slow-query-rewrite",
    title: "Slow query requires application rewrite",
    severity: "warn",
    tier: "report",
    category: "slow_query",
  },
];

export function classifySecurityFindings(findings: AdvisorFinding[]) {
  const auto = findings.filter((f) => f.tier === "auto");
  const report = findings.filter((f) => f.tier === "report");
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

export function assertAdvisorTierBoundary(findings: AdvisorFinding[]): boolean {
  return findings.every((f) => f.tier === "auto" || f.tier === "report");
}

export function autoFixIdsOnly(findings: AdvisorFinding[]): string[] {
  return findings.filter((f) => f.tier === "auto").map((f) => f.id);
}

export function reportTierIds(findings: AdvisorFinding[]): string[] {
  return findings.filter((f) => f.tier === "report").map((f) => f.id);
}

export function chainRunIdForDate(runDate: string): string {
  return `sync-${runDate}`;
}
