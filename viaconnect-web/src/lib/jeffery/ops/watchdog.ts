/**
 * Prompt 219H: Jeffery watchdog — missed/stuck job detection, one retry, dead-letter.
 */

import { createAdminClientOrNull } from "@/lib/supabase/admin";
import { safeLog } from "@/lib/utils/safe-log";
import { loadCadenceJobs } from "./cadence";
import { runCadenceJob } from "./jobRunners";
import { logOpsJobRun } from "./logJobRun";
import type { CadenceJob } from "./types";

export interface WatchdogResult {
  checked: number;
  missed: string[];
  retried: string[];
  deadLettered: string[];
  stuck: string[];
}

function minutesSince(iso: string | null, now: Date): number | null {
  if (!iso) return null;
  return (now.getTime() - new Date(iso).getTime()) / 60_000;
}

export async function runWatchdog(now = new Date()): Promise<WatchdogResult> {
  const jobs = await loadCadenceJobs();
  const result: WatchdogResult = {
    checked: 0,
    missed: [],
    retried: [],
    deadLettered: [],
    stuck: [],
  };

  for (const job of jobs) {
    if (!job.enabled || job.job_key === "watchdog.tick") continue;
    result.checked += 1;

    const ageMin = minutesSince(job.last_run_at, now);
    const overdue =
      ageMin === null
        ? true // never run
        : ageMin > job.interval_minutes * 1.5;

    // Stuck: last_status running-like older than timeout (we use failed without heartbeat)
    // Our jobs mark status on complete; treat last_status=failed with recent start as retry candidate
    if (!overdue) continue;

    result.missed.push(job.job_key);

    // First automatic retry
    try {
      safeLog.warn("ops.watchdog", "retrying missed job", { jobKey: job.job_key });
      const run = await runCadenceJob(job);
      result.retried.push(job.job_key);

      if (run.status === "failed") {
        // Second failure path: check dead letter history for this job in last 2h
        const second = await countRecentDeadOrFails(job.job_key);
        if (second >= 1) {
          await writeDeadLetter(job, "retry_exhausted", {
            lastError: run.error,
            detail: run.detail,
          });
          result.deadLettered.push(job.job_key);
        } else {
          // Record first failure marker for next watchdog pass
          await writeDeadLetter(job, "error", {
            firstFailure: true,
            lastError: run.error,
          });
        }
      }
    } catch (err) {
      result.stuck.push(job.job_key);
      await writeDeadLetter(job, "stuck", {
        error: err instanceof Error ? err.message : String(err),
      });
      result.deadLettered.push(job.job_key);
    }
  }

  await logOpsJobRun({
    jobKey: "watchdog.tick",
    agentId: "jeffery",
    status: "ok",
    durationMs: 0,
    detail: result as unknown as Record<string, unknown>,
  });

  // Mark watchdog itself
  try {
    const { markJobRun } = await import("./cadence");
    await markJobRun("watchdog.tick", "ok", 15, now);
  } catch {
    /* open */
  }

  return result;
}

async function countRecentDeadOrFails(jobKey: string): Promise<number> {
  try {
    const supabase = createAdminClientOrNull();
    if (!supabase) return 0;
    const since = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const { data } = await supabase
      .from("agent_job_dead_letters")
      .select("id")
      .eq("job_key", jobKey)
      .gte("created_at", since)
      .limit(5);
    return data?.length ?? 0;
  } catch {
    return 0;
  }
}

export async function writeDeadLetter(
  job: Pick<CadenceJob, "job_key" | "agent_id">,
  failureClass: "retry_exhausted" | "missed_run" | "stuck" | "budget" | "error",
  context: Record<string, unknown>
): Promise<void> {
  try {
    const supabase = createAdminClientOrNull();
    if (!supabase) return;
    await supabase.from("agent_job_dead_letters").insert({
      job_key: job.job_key,
      agent_id: job.agent_id,
      failure_class: failureClass,
      context,
      resolved: false,
    });
  } catch (err) {
    safeLog.warn("ops.watchdog", "dead letter insert failed", {
      jobKey: job.job_key,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

export async function listOpenDeadLetters(limit = 30): Promise<
  Array<{
    id: string;
    job_key: string;
    agent_id: string;
    failure_class: string;
    context: Record<string, unknown>;
    created_at: string;
  }>
> {
  try {
    const supabase = createAdminClientOrNull();
    if (!supabase) return [];
    const { data } = await supabase
      .from("agent_job_dead_letters")
      .select("id, job_key, agent_id, failure_class, context, created_at")
      .eq("resolved", false)
      .order("created_at", { ascending: false })
      .limit(limit);
    return (data as never) ?? [];
  } catch {
    return [];
  }
}
