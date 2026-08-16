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
import {
  ensureAgentRegistrySeats,
  loadPausedAgentIds,
  writeAgentJobHeartbeat,
} from "./heartbeats";
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
  registryEnsured: number;
  pausedSkipped: number;
}

export async function runOpsTick(): Promise<OpsTickResult> {
  const startedAt = new Date().toISOString();
  const jobsRun: JobRunResult[] = [];
  let pausedSkipped = 0;
  let registryEnsured = 0;

  // 0) Schema bootstrap (219H tables)
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

  // 0b) Load cadence + ensure ultrathink registry seats (ACC status SOT)
  const jobs = await loadCadenceJobs();
  const periodByAgent: Record<string, number> = {};
  for (const j of jobs) {
    const prev = periodByAgent[j.agent_id];
    if (prev == null || j.interval_minutes < prev) {
      periodByAgent[j.agent_id] = j.interval_minutes;
    }
  }
  // Jeffery / watchdog always on 15m pulse
  periodByAgent.jeffery = Math.min(periodByAgent.jeffery ?? 15, 15);
  try {
    const ens = await ensureAgentRegistrySeats(periodByAgent);
    registryEnsured = ens.ensured;
  } catch (err) {
    safeLog.warn("ops.tick", "registry ensure failed open", { error: err });
  }

  const paused = await loadPausedAgentIds();

  // 1) Due cadence jobs (priority order), skip pure watchdog (run later)
  const due = jobsDueNow(jobs).filter((j) => j.job_key !== "watchdog.tick");
  // Cap work per tick to stay under maxDuration; stagger backlog catch-up
  const batch = due.slice(0, 6);
  for (const job of batch) {
    const isPaused = paused.has(job.agent_id);
    if (isPaused) pausedSkipped += 1;
    try {
      const r = await runCadenceJob(job, { paused: isPaused });
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

  // 3) Watchdog (own heartbeat — ACC alerts if watchdog itself is stale)
  let watchdog: Awaited<ReturnType<typeof runWatchdog>>;
  try {
    await writeAgentJobHeartbeat({
      agentId: "jeffery",
      eventType: "start",
      jobKey: "watchdog.tick",
      status: "running",
    });
    watchdog = await runWatchdog();
    await writeAgentJobHeartbeat({
      agentId: "jeffery",
      eventType: "complete",
      jobKey: "watchdog.tick",
      status: "ok",
      detail: {
        missed: watchdog.missed.length,
        retried: watchdog.retried.length,
        deadLettered: watchdog.deadLettered.length,
      },
    });
  } catch (err) {
    safeLog.error("ops.tick", "watchdog failed open", { error: err });
    watchdog = {
      checked: 0,
      missed: [],
      retried: [],
      deadLettered: [],
      stuck: [],
    };
    await writeAgentJobHeartbeat({
      agentId: "jeffery",
      eventType: "error",
      jobKey: "watchdog.tick",
      status: "failed",
      severity: "error",
      detail: { error: err instanceof Error ? err.message : String(err) },
    });
  }

  // 4) Budget backlog resume (honor pause)
  let backlogResumed = 0;
  try {
    const r = await resumeBacklogIfPossible(async (jobKey) => {
      const job = jobs.find((j) => j.job_key === jobKey);
      if (!job) return;
      if (paused.has(job.agent_id)) return;
      await runCadenceJob(job);
    });
    backlogResumed = r.resumed;
  } catch {
    /* open */
  }

  // 5) Freshness
  const freshness = await measureFreshness();

  // 6) Fleet pulse: Jeffery ops-tick completion heartbeat (dispatch authority)
  await writeAgentJobHeartbeat({
    agentId: "jeffery",
    eventType: "heartbeat",
    jobKey: "ops.tick",
    status: "ok",
    detail: {
      jobs: jobsRun.length,
      events: events.processed,
      pausedSkipped,
      registryEnsured,
    },
  });

  // 6b) On-demand agents (no dedicated cadence job): presence pulse so ACC
  // shows Idle→Healthy while they remain available, not permanently Stale.
  for (const id of ["michelangelo", "lex"] as const) {
    if (paused.has(id)) continue;
    await writeAgentJobHeartbeat({
      agentId: id,
      eventType: "heartbeat",
      jobKey: "ops.roster_presence",
      status: "ok",
      detail: { mode: "on_demand", note: "no dedicated cadence; presence via ops-tick" },
    });
  }

  const endedAt = new Date().toISOString();
  safeLog.info("ops.tick", "complete", {
    jobs: jobsRun.length,
    events: events.processed,
    missed: watchdog.missed.length,
    deadLetters: watchdog.deadLettered.length,
    backlogResumed,
    pausedSkipped,
    registryEnsured,
  });

  return {
    startedAt,
    endedAt,
    jobsRun,
    events,
    watchdog,
    backlogResumed,
    freshness,
    registryEnsured,
    pausedSkipped,
  };
}
