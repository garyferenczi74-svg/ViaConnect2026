/**
 * Prompt 219G: capability call logging to pipeline_runs.
 * Each call is a distinct run_id (cap-{uuid}) with a single stage payload.
 * Never log message content / PHI / API keys.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { safeLog } from "@/lib/utils/safe-log";
import type { CapabilityUsageRecord } from "./types";

function newCapRunId(): string {
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return `cap-${rand}`;
}

export async function logCapabilityUsage(usage: CapabilityUsageRecord): Promise<string | null> {
  const runId = newCapRunId();
  const now = new Date().toISOString();
  const runDate = now.slice(0, 10);
  const status =
    usage.outcome === "ok"
      ? "ok"
      : usage.outcome === "partial"
        ? "partial"
        : "failed";

  const stage = {
    type: "capability_call",
    agent: usage.agent,
    capability: usage.capability,
    query_shape: usage.queryShape.slice(0, 200),
    credits: usage.credits,
    tokens: usage.tokens,
    outcome: usage.outcome,
    reason: usage.reason?.slice(0, 200),
    duration_ms: usage.durationMs,
    user_id_present: Boolean(usage.userId),
    meta: usage.meta ?? {},
  };

  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from("pipeline_runs").insert({
      run_id: runId,
      run_date: runDate,
      status,
      started_at: now,
      ended_at: now,
      stages: [stage],
    });
    if (error) {
      safeLog.warn("capability.log", "pipeline_runs insert failed", {
        code: error.code,
        agent: usage.agent,
        capability: usage.capability,
      });
      return null;
    }
    safeLog.info("capability.log", "usage recorded", {
      runId,
      agent: usage.agent,
      capability: usage.capability,
      outcome: usage.outcome,
      credits: usage.credits,
      tokens: usage.tokens,
    });
    return runId;
  } catch (err) {
    safeLog.warn("capability.log", "threw", {
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

export interface CapabilityUsageRow {
  runId: string;
  runDate: string;
  status: string;
  agent: string;
  capability: string;
  queryShape: string;
  credits: number;
  tokens: number;
  outcome: string;
  reason?: string;
  durationMs: number;
  startedAt: string;
}

/** Read recent capability_call stages for Admin Command Center. */
export async function fetchCapabilityUsage(limit = 50): Promise<CapabilityUsageRow[]> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("pipeline_runs")
      .select("run_id, run_date, status, started_at, stages")
      .like("run_id", "cap-%")
      .order("started_at", { ascending: false })
      .limit(limit);
    if (error || !data) {
      safeLog.warn("capability.log", "fetch failed open", { error: error?.message });
      return [];
    }
    const rows: CapabilityUsageRow[] = [];
    for (const row of data) {
      const stages = (row.stages as Array<Record<string, unknown>>) ?? [];
      const stage = stages.find((s) => s.type === "capability_call") ?? stages[0];
      if (!stage) continue;
      rows.push({
        runId: row.run_id as string,
        runDate: String(row.run_date),
        status: row.status as string,
        agent: String(stage.agent ?? "unknown"),
        capability: String(stage.capability ?? "unknown"),
        queryShape: String(stage.query_shape ?? ""),
        credits: Number(stage.credits ?? 0),
        tokens: Number(stage.tokens ?? 0),
        outcome: String(stage.outcome ?? row.status),
        reason: stage.reason ? String(stage.reason) : undefined,
        durationMs: Number(stage.duration_ms ?? 0),
        startedAt: row.started_at as string,
      });
    }
    return rows;
  } catch (err) {
    safeLog.warn("capability.log", "fetch threw", { error: err });
    return [];
  }
}
