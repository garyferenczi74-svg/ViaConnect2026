/**
 * Prompt 219H: ops-tick orchestrator (every 15 minutes via Vercel cron).
 * Runs: due cadence jobs, event drain, watchdog, backlog resume, freshness measure.
 */

import { loadCadenceJobs, jobsDueNow } from "./cadence";
import { runCadenceJob } from "./jobRunners";
import { processPendingEvents } from "./eventBus";
import { runWatchdog } from "./watchdog";
import { resumeBacklogIfPossible } from "./budgetQueue";
import { measureFreshness } from "./freshness";
import { safeLog } from "@/lib/utils/safe-log";
import type { JobRunResult } from "./types";

export interface OpsTickResult {
  startedAt: string;
  endedAt: string;
  jobsRun: JobRunResult[];
  events: { processed: number; failed: number };
  watchdog: Awaited<ReturnType<typeof runWatchdog>>;
  backlogResumed: number;
  freshness: Awaited<ReturnType<typeof measureFreshness>>;
}

export async function runOpsTick(): Promise<OpsTickResult> {
  const startedAt = new Date().toISOString();
  const jobsRun: JobRunResult[] = [];

  // 0) One-time schema bootstrap (219H tables) when missing
  try {
    const { ensureContinuousOpsSchema } = await import("./ensureSchema");
    const schema = await ensureContinuousOpsSchema();
    if (schema.applied) {
      safeLog.info("ops.tick", "schema bootstrap applied", { reason: schema.reason });
    } else if (!schema.ok) {
      safeLog.warn("ops.tick", "schema bootstrap skipped", { reason: schema.reason });
    }
  } catch (err) {
    safeLog.warn("ops.tick", "schema bootstrap threw", { error: err });
  }

  // 1) Due cadence jobs (priority order), skip pure watchdog (run later)
  const jobs = await loadCadenceJobs();
  const due = jobsDueNow(jobs).filter((j) => j.job_key !== "watchdog.tick");
  // Cap work per tick to stay under maxDuration
  const batch = due.slice(0, 6);
  for (const job of batch) {
    try {
      const r = await runCadenceJob(job);
      jobsRun.push(r);
    } catch (err) {
      safeLog.error("ops.tick", "job threw", {
        jobKey: job.job_key,
        error: err instanceof Error ? err.message : String(err),
      });
      jobsRun.push({
        jobKey: job.job_key,
        agentId: job.agent_id,
        status: "failed",
        durationMs: 0,
        detail: {},
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // 2) Event bus drain
  let events = { processed: 0, failed: 0 };
  try {
    const e = await processPendingEvents();
    events = { processed: e.processed, failed: e.failed };
  } catch (err) {
    safeLog.warn("ops.tick", "event drain failed open", { error: err });
  }

  // 3) Watchdog
  let watchdog: Awaited<ReturnType<typeof runWatchdog>>;
  try {
    watchdog = await runWatchdog();
  } catch (err) {
    safeLog.error("ops.tick", "watchdog failed open", { error: err });
    watchdog = {
      checked: 0,
      missed: [],
      retried: [],
      deadLettered: [],
      stuck: [],
    };
  }

  // 4) Budget backlog resume
  let backlogResumed = 0;
  try {
    const r = await resumeBacklogIfPossible(async (jobKey) => {
      const job = jobs.find((j) => j.job_key === jobKey);
      if (job) await runCadenceJob(job);
    });
    backlogResumed = r.resumed;
  } catch {
    /* open */
  }

  // 5) Freshness
  const freshness = await measureFreshness();

  const endedAt = new Date().toISOString();
  safeLog.info("ops.tick", "complete", {
    jobs: jobsRun.length,
    events: events.processed,
    missed: watchdog.missed.length,
    deadLetters: watchdog.deadLettered.length,
    backlogResumed,
  });

  return {
    startedAt,
    endedAt,
    jobsRun,
    events,
    watchdog,
    backlogResumed,
    freshness,
  };
}
