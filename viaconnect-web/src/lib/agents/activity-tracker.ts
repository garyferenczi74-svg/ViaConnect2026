/**
 * Activity-tracker adapter (Prompt #126).
 * Bridges existing ultrathink_agent_registry + ultrathink_agent_events rows
 * to the panel's canonical types. The UI never touches the ultrathink
 * tables directly; it only sees AgentActivityEvent / AgentHeartbeat shapes.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AgentActivityEvent,
  AgentCurrentTask,
  AgentEventSeverity,
  AgentEventType,
  AgentHeartbeat,
  AgentId,
} from "./types";
import { AGENT_IDS } from "./types";
import { AGENT_REGISTRY } from "./registry";

// ── Event-type mapping ──────────────────────────────────────────────────────
// ultrathink_agent_events.event_type enum:
//   'heartbeat' | 'start' | 'complete' | 'error' | 'data_available' | 'health_check'
// maps to the spec's AgentEventType.
const EVENT_TYPE_MAP: Record<string, AgentEventType> = {
  heartbeat:      "heartbeat",
  start:          "task_started",
  complete:       "task_completed",
  error:          "task_failed",
  data_available: "info",
  health_check:   "heartbeat",
};

// ultrathink severity enum: 'info' | 'warning' | 'error' | 'critical'
const SEVERITY_MAP: Record<string, AgentEventSeverity> = {
  info:     "info",
  warning:  "warn",
  error:    "error",
  critical: "error",
};

// ultrathink health_status enum: 'healthy' | 'degraded' | 'unhealthy' | 'unknown' | 'disabled'
const HEALTH_STATUS_MAP: Record<string, AgentHeartbeat["status"]> = {
  healthy:   "healthy",
  degraded:  "degraded",
  unhealthy: "error",
  unknown:   "idle",
  disabled:  "paused",
};

export interface UltrathinkEventRow {
  id: string;
  agent_name: string;
  event_type: string;
  run_id: string | null;
  payload: Record<string, unknown>;
  severity: string;
  created_at: string;
}

export interface UltrathinkRegistryRow {
  agent_name: string;
  display_name: string;
  health_status: string;
  last_heartbeat_at: string | null;
  consecutive_misses: number;
  is_active: boolean;
}

export function mapUltrathinkEvent(row: UltrathinkEventRow): AgentActivityEvent | null {
  if (!AGENT_IDS.includes(row.agent_name as AgentId)) return null;
  const message = typeof row.payload?.message === "string"
    ? (row.payload.message as string)
    : humanizeEvent(row.event_type, row.agent_name);
  return {
    id: row.id,
    agent_id: row.agent_name as AgentId,
    event_type: EVENT_TYPE_MAP[row.event_type] ?? "info",
    severity: SEVERITY_MAP[row.severity] ?? "info",
    message,
    metadata: row.payload ?? {},
    correlation_id: row.run_id,
    user_id: null,
    created_at: row.created_at,
  };
}

export function mapUltrathinkRegistry(row: UltrathinkRegistryRow): AgentHeartbeat | null {
  if (!AGENT_IDS.includes(row.agent_name as AgentId)) return null;
  return {
    agent_id: row.agent_name as AgentId,
    status: HEALTH_STATUS_MAP[row.health_status] ?? "idle",
    last_heartbeat: row.last_heartbeat_at ?? new Date(0).toISOString(),
    health_score: row.health_status === "healthy" ? 100 : row.health_status === "degraded" ? 60 : 0,
    error_count_24h: row.consecutive_misses ?? 0,
    metadata: {},
  };
}

function humanizeEvent(eventType: string, agentName: string): string {
  const display = AGENT_REGISTRY[agentName as AgentId]?.display_name ?? agentName;
  switch (eventType) {
    case "heartbeat":      return `${display} heartbeat`;
    case "start":          return `${display} task started`;
    case "complete":       return `${display} task completed`;
    case "error":          return `${display} reported an error`;
    case "data_available": return `${display} produced new data`;
    case "health_check":   return `${display} health check`;
    default:               return `${display}: ${eventType}`;
  }
}

export async function fetchRecentEvents(
  db: SupabaseClient,
  agentId: AgentId,
  limit: number = 100,
): Promise<AgentActivityEvent[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = db as any;
  const { data } = await client
    .from("ultrathink_agent_events")
    .select("id, agent_name, event_type, run_id, payload, severity, created_at")
    .eq("agent_name", agentId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return ((data ?? []) as UltrathinkEventRow[])
    .map(mapUltrathinkEvent)
    .filter((e): e is AgentActivityEvent => e !== null);
}

export async function fetchHeartbeats(db: SupabaseClient): Promise<AgentHeartbeat[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = db as any;
  const { data } = await client
    .from("ultrathink_agent_registry")
    .select("agent_name, display_name, health_status, last_heartbeat_at, consecutive_misses, is_active")
    .in("agent_name", AGENT_IDS);
  return ((data ?? []) as UltrathinkRegistryRow[])
    .map(mapUltrathinkRegistry)
    .filter((h): h is AgentHeartbeat => h !== null);
}

export async function fetchCurrentTasks(db: SupabaseClient): Promise<AgentCurrentTask[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = db as any;
  const { data } = await client
    .from("jeffery_agent_panel_tasks")
    .select("*")
    .in("agent_id", AGENT_IDS)
    .in("task_status", ["queued", "running", "blocked"])
    .order("updated_at", { ascending: false });
  return (data ?? []) as AgentCurrentTask[];
}

// ── Server-side write helpers (used by Jeffery/Arnold edge functions) ──────
export async function logAgentEvent(
  db: SupabaseClient,
  agentId: AgentId,
  eventType: "heartbeat" | "start" | "complete" | "error" | "data_available" | "health_check",
  payload: Record<string, unknown> = {},
  severity: "info" | "warning" | "error" | "critical" = "info",
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = db as any;
  try {
    await client.rpc("ultrathink_agent_heartbeat", {
      p_agent_name: agentId,
      p_run_id: null,
      p_event_type: eventType,
      p_payload: payload,
      p_severity: severity,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn(`[agents/activity-tracker] logEvent failed: ${(err as Error).message}`);
  }
}

export async function upsertTask(
  db: SupabaseClient,
  task: Partial<AgentCurrentTask> & { agent_id: AgentId; task_title: string },
): Promise<string | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = db as any;
  const now = new Date().toISOString();
  const row = {
    ...task,
    started_at: task.task_status === "running" ? (task.started_at ?? now) : task.started_at ?? null,
    completed_at: task.task_status === "completed" ? now : task.completed_at ?? null,
    progress_percent: task.task_status === "completed" ? 100 : task.progress_percent ?? 0,
  };
  const { data, error } = await client.from("jeffery_agent_panel_tasks").insert(row).select("id").single();
  if (error) {
    // eslint-disable-next-line no-console
    console.warn(`[agents/activity-tracker] upsertTask failed: ${error.message}`);
    return null;
  }
  return (data as { id: string }).id;
}
