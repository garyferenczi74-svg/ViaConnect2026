/**
 * Prompt 219J: agent job heartbeats for ACC execution truth.
 *
 * Dual-registry interim rule (Gary):
 * - DISPATCH: Jeffery ops-tick + cadence matrix (this layer)
 * - ACC STATUS: ultrathink_agent_registry.last_heartbeat_at via
 *   ultrathink_agent_heartbeat RPC (same store ACC already reads)
 * - 214d drift guard still compares AGENT_REGISTRY seats vs ultrathink rows
 *
 * Every cadence job writes start + complete/error heartbeats so "Stale"
 * reflects real execution, not a 30s cosmetic timer.
 */

import { createAdminClientOrNull } from "@/lib/supabase/admin";
import { safeLog } from "@/lib/utils/safe-log";
import { AGENT_IDS, type AgentId } from "@/lib/agents/types";
import { AGENT_REGISTRY } from "@/lib/agents/registry";

export type HeartbeatEventType =
  | "heartbeat"
  | "start"
  | "complete"
  | "error"
  | "data_available"
  | "health_check";

/** RFC 4122 UUID string (any version); used for ultrathink p_run_id. */
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuidString(value: string | null | undefined): boolean {
  return typeof value === "string" && UUID_RE.test(value);
}

/**
 * p_run_id must be uuid for ultrathink_agent_heartbeat.
 * Reuse caller UUID when valid; otherwise mint a fresh one.
 * Non-UUID ops run ids stay in payload (ops_run_id / run_id_text).
 */
export function resolveHeartbeatRunId(runId?: string | null): {
  pRunId: string;
  opsRunId: string | null;
} {
  if (isUuidString(runId)) {
    return { pRunId: runId as string, opsRunId: null };
  }
  const opsRunId =
    typeof runId === "string" && runId.trim().length > 0 ? runId : null;
  return { pRunId: crypto.randomUUID(), opsRunId };
}

/** Map cadence agent_id strings onto registry AgentIds. */
export function resolveOpsAgentId(raw: string): AgentId | null {
  const key = raw.trim().toLowerCase();
  if ((AGENT_IDS as readonly string[]).includes(key)) return key as AgentId;
  if (key === "hound_dog") return "hounddog";
  if (key === "hannahai" || key === "hannah_ai") return "hannah";
  return null;
}

/**
 * Write a lifecycle event into ultrathink_agent_registry via SECURITY DEFINER RPC.
 * Fail-open: never block job execution if registry write fails.
 */
export async function writeAgentJobHeartbeat(args: {
  agentId: string;
  eventType: HeartbeatEventType;
  jobKey: string;
  runId?: string;
  status?: string;
  detail?: Record<string, unknown>;
  severity?: "info" | "warning" | "error" | "critical";
}): Promise<boolean> {
  const agent = resolveOpsAgentId(args.agentId);
  if (!agent) {
    safeLog.warn("ops.heartbeat", "unknown agent", { agentId: args.agentId });
    return false;
  }

  const supabase = createAdminClientOrNull();
  if (!supabase) {
    safeLog.warn("ops.heartbeat", "no admin client", { agent });
    return false;
  }

  // Prefer caller runId when UUID; never pass ops-*-style strings as p_run_id.
  const { pRunId, opsRunId } = resolveHeartbeatRunId(args.runId);

  try {
    const { error } = await supabase.rpc("ultrathink_agent_heartbeat", {
      p_agent_name: agent,
      p_run_id: pRunId,
      p_event_type: args.eventType,
      p_payload: {
        message: `${args.jobKey} ${args.eventType}`,
        job_key: args.jobKey,
        status: args.status ?? args.eventType,
        source: "ops_tick",
        ...(opsRunId
          ? { ops_run_id: opsRunId, run_id_text: opsRunId }
          : {}),
        ...(args.detail ?? {}),
      },
      p_severity: args.severity ?? (args.eventType === "error" ? "error" : "info"),
    });
    if (error) {
      safeLog.warn("ops.heartbeat", "rpc failed", {
        agent,
        jobKey: args.jobKey,
        code: error.code,
        message: error.message,
      });
      return false;
    }
    return true;
  } catch (err) {
    safeLog.warn("ops.heartbeat", "threw", {
      agent,
      error: err instanceof Error ? err.message : String(err),
    });
    return false;
  }
}

/**
 * Refresh expected periods on existing ultrathink rows only.
 * Brief 23: never insert invented seats or fake heartbeats for ACC roster
 * members that do not already have an ops row.
 */
export async function ensureAgentRegistrySeats(
  periodByAgent: Record<string, number>
): Promise<{ ensured: number }> {
  const supabase = createAdminClientOrNull();
  if (!supabase) return { ensured: 0 };

  let ensured = 0;
  for (const id of AGENT_IDS) {
    const reg = AGENT_REGISTRY[id];
    if (!reg) continue;
    const period = periodByAgent[id] ?? 60;
    try {
      const { data: existing } = await supabase
        .from("ultrathink_agent_registry")
        .select("id, is_active")
        .eq("agent_name", id)
        .maybeSingle();

      if (!existing?.id) {
        continue;
      }
      await supabase
        .from("ultrathink_agent_registry")
        .update({
          display_name: reg.display_name,
          expected_period_minutes: period,
          runtime_kind: "request_time",
          runtime_handle: "/api/cron/ops-tick",
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
      ensured += 1;
    } catch (err) {
      safeLog.warn("ops.heartbeat", "ensure seat failed", {
        agent: id,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
  return { ensured };
}

/** Agents with is_active=false or health_status=disabled are paused. */
export async function loadPausedAgentIds(): Promise<Set<string>> {
  const paused = new Set<string>();
  const supabase = createAdminClientOrNull();
  if (!supabase) return paused;
  try {
    const { data } = await supabase
      .from("ultrathink_agent_registry")
      .select("agent_name, is_active, health_status")
      .in("agent_name", [...AGENT_IDS]);
    for (const row of data ?? []) {
      const r = row as {
        agent_name?: string;
        is_active?: boolean;
        health_status?: string;
      };
      const name = r.agent_name ?? "";
      if (!name) continue;
      if (r.is_active === false || r.health_status === "disabled") {
        paused.add(name);
      }
    }
  } catch {
    /* open */
  }
  return paused;
}
