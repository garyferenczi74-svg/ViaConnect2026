/**
 * Log continuous-ops job runs into pipeline_runs (run_id ops-{job}-{uuid}).
 */

import { createAdminClientOrNull } from "@/lib/supabase/admin";
import { safeLog } from "@/lib/utils/safe-log";
import type { JobRunResult } from "./types";

export async function logOpsJobRun(result: JobRunResult): Promise<string | null> {
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const runId = `ops-${result.jobKey.replace(/\./g, "-")}-${rand}`;
  const now = new Date().toISOString();
  const status =
    result.status === "ok"
      ? "ok"
      : result.status === "partial" || result.status === "budget_queued"
        ? "partial"
        : "failed";

  try {
    const supabase = createAdminClientOrNull();
    if (!supabase) return null;
    const { error } = await supabase.from("pipeline_runs").insert({
      run_id: runId,
      run_date: now.slice(0, 10),
      status,
      started_at: now,
      ended_at: now,
      stages: [
        {
          type: "ops_job",
          job_key: result.jobKey,
          agent: result.agentId,
          outcome: result.status,
          duration_ms: result.durationMs,
          detail: result.detail,
          error: result.error?.slice(0, 240),
        },
      ],
    });
    if (error) {
      safeLog.warn("ops.log", "insert failed", { code: error.code, jobKey: result.jobKey });
      return null;
    }
    return runId;
  } catch (err) {
    safeLog.warn("ops.log", "threw", {
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

export async function fetchOpsJobRuns(limit = 80): Promise<
  Array<{
    runId: string;
    jobKey: string;
    agent: string;
    outcome: string;
    durationMs: number;
    startedAt: string;
    error?: string;
  }>
> {
  try {
    const supabase = createAdminClientOrNull();
    if (!supabase) return [];
    const { data, error } = await supabase
      .from("pipeline_runs")
      .select("run_id, started_at, stages, status")
      .like("run_id", "ops-%")
      .order("started_at", { ascending: false })
      .limit(limit);
    if (error || !data) return [];
    return data.map((row) => {
      const stages = (row.stages as Array<Record<string, unknown>>) ?? [];
      const s = stages.find((x) => x.type === "ops_job") ?? stages[0] ?? {};
      return {
        runId: row.run_id as string,
        jobKey: String(s.job_key ?? ""),
        agent: String(s.agent ?? ""),
        outcome: String(s.outcome ?? row.status),
        durationMs: Number(s.duration_ms ?? 0),
        startedAt: row.started_at as string,
        error: s.error ? String(s.error) : undefined,
      };
    });
  } catch {
    return [];
  }
}
