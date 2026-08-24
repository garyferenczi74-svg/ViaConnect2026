/**
 * Prompt 219H: cadence matrix load/update.
 */

import { createAdminClientOrNull } from "@/lib/supabase/admin";
import { safeLog } from "@/lib/utils/safe-log";
import { DEFAULT_CADENCE_SEED, type CadenceJob } from "./types";

function mapRow(r: Record<string, unknown>): CadenceJob {
  return {
    job_key: String(r.job_key ?? ""),
    agent_id: String(r.agent_id ?? ""),
    label: String(r.label ?? ""),
    interval_minutes: Number(r.interval_minutes ?? 60),
    priority: Number(r.priority ?? 50),
    budget_class: (r.budget_class as CadenceJob["budget_class"]) ?? "B",
    mechanism: (r.mechanism as CadenceJob["mechanism"]) ?? "cron_tick",
    enabled: r.enabled !== false,
    timeout_minutes: Number(r.timeout_minutes ?? 30),
    coalesce_window_sec: Number(r.coalesce_window_sec ?? 300),
    config: (r.config as Record<string, unknown>) ?? {},
    last_run_at: (r.last_run_at as string) ?? null,
    last_status: (r.last_status as string) ?? null,
    next_run_at: (r.next_run_at as string) ?? null,
  };
}

export async function loadCadenceJobs(): Promise<CadenceJob[]> {
  try {
    const supabase = createAdminClientOrNull();
    if (!supabase) {
      return DEFAULT_CADENCE_SEED.map((j) => ({
        ...j,
        last_run_at: null,
        last_status: null,
        next_run_at: null,
      }));
    }
    const { data, error } = await supabase
      .from("agent_cadence_jobs")
      .select("*")
      .order("priority", { ascending: true });
    if (error || !data?.length) {
      safeLog.warn("ops.cadence", "using static seed", { error: error?.message });
      return DEFAULT_CADENCE_SEED.map((j) => ({
        ...j,
        last_run_at: null,
        last_status: null,
        next_run_at: null,
      }));
    }
    return data.map((r) => mapRow(r as Record<string, unknown>));
  } catch (err) {
    safeLog.warn("ops.cadence", "threw; static seed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return DEFAULT_CADENCE_SEED.map((j) => ({
      ...j,
      last_run_at: null,
      last_status: null,
      next_run_at: null,
    }));
  }
}

export function jobsDueNow(jobs: CadenceJob[], now = new Date()): CadenceJob[] {
  return jobs
    .filter((j) => j.enabled && j.mechanism !== "event")
    .filter((j) => {
      // cron_daily jobs are owned by dedicated Vercel crons (sync chain etc.)
      // watchdog still tracks them; ops-tick only runs cron_tick + hybrid.
      if (j.mechanism === "cron_daily" && j.job_key !== "watchdog.tick") {
        return false;
      }
      if (!j.next_run_at && !j.last_run_at) return true;
      const next = j.next_run_at ? new Date(j.next_run_at).getTime() : 0;
      if (next && next <= now.getTime()) return true;
      if (!j.next_run_at && j.last_run_at) {
        const last = new Date(j.last_run_at).getTime();
        return now.getTime() - last >= j.interval_minutes * 60_000;
      }
      return !j.last_run_at;
    })
    .sort((a, b) => a.priority - b.priority);
}

export async function markJobRun(
  jobKey: string,
  status: string,
  intervalMinutes: number,
  now = new Date()
): Promise<void> {
  const next = new Date(now.getTime() + intervalMinutes * 60_000).toISOString();
  try {
    const supabase = createAdminClientOrNull();
    if (!supabase) return;
    await supabase
      .from("agent_cadence_jobs")
      .update({
        last_run_at: now.toISOString(),
        last_status: status,
        next_run_at: next,
        updated_at: now.toISOString(),
      })
      .eq("job_key", jobKey);
  } catch (err) {
    safeLog.warn("ops.cadence", "markJobRun failed open", {
      jobKey,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
