/**
 * Agent activity panel types (Prompt #126).
 * Source-of-truth heartbeat/registry data comes from ultrathink_agent_registry
 * and ultrathink_agent_events; these types present the spec's canonical shape
 * to the UI via the mapper in activity-tracker.ts.
 */

// Prompt 214: full nine-agent roster (gordon + kelsey join the fleet panel).
// Baseline: Jeffery, Hannah, Michelangelo, Sherlock, Arnold, Gordon, Kelsey,
// Marshall, Lex. Hounddog remains a Marshall bridge product surface, not a
// ninth panel seat (Gary ruling if that changes).
export type AgentId =
  | "jeffery"
  | "hannah"
  | "michelangelo"
  | "sherlock"
  | "arnold"
  | "gordon"
  | "kelsey"
  | "marshall"
  | "lex";

export const AGENT_IDS: readonly AgentId[] = [
  "jeffery",
  "hannah",
  "michelangelo",
  "sherlock",
  "arnold",
  "gordon",
  "kelsey",
  "marshall",
  "lex",
] as const;

/**
 * Maps ultrathink_agent_registry / event agent_name values onto panel AgentIds.
 * Name mismatches (sherlock_research_hub, jeffery_master) previously dropped
 * live heartbeats from the Admin Command Center (Prompt 214 finding).
 */
export const AGENT_NAME_ALIASES: Readonly<Record<string, AgentId>> = {
  jeffery: "jeffery",
  jeffery_master: "jeffery",
  hannah: "hannah",
  michelangelo: "michelangelo",
  sherlock: "sherlock",
  sherlock_research_hub: "sherlock",
  arnold: "arnold",
  gordon: "gordon",
  kelsey: "kelsey",
  marshall: "marshall",
  lex: "lex",
};

export function resolveAgentId(raw: string): AgentId | null {
  const key = raw.trim().toLowerCase();
  return AGENT_NAME_ALIASES[key] ?? null;
}

export type AgentStatus = "healthy" | "degraded" | "error" | "idle" | "paused" | "stale";

export type AgentEventType =
  | "task_started"
  | "task_progress"
  | "task_completed"
  | "task_failed"
  | "delegation_sent"
  | "delegation_received"
  | "gate_passed"
  | "gate_failed"
  | "heartbeat"
  | "info";

export type AgentEventSeverity = "info" | "success" | "warn" | "error";

export type AgentTaskStatus =
  | "queued"
  | "running"
  | "blocked"
  | "completed"
  | "failed"
  | "cancelled";

export type AgentTaskPriority = "low" | "normal" | "high" | "critical";

export interface AgentRegistryRow {
  agent_id: AgentId;
  display_name: string;
  role_label: string;
  description: string;
  icon_name: string;
  accent_color: string;
  sort_order: number;
  is_active: boolean;
}

export interface AgentActivityEvent {
  id: string;
  agent_id: AgentId;
  event_type: AgentEventType;
  severity: AgentEventSeverity;
  message: string;
  metadata: Record<string, unknown>;
  correlation_id: string | null;
  user_id: string | null;
  created_at: string;
}

export interface AgentCurrentTask {
  id: string;
  agent_id: AgentId;
  task_title: string;
  task_description: string | null;
  task_status: AgentTaskStatus;
  progress_percent: number;
  priority: AgentTaskPriority;
  assigned_by_agent_id: AgentId | null;
  correlation_id: string | null;
  metadata: Record<string, unknown>;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AgentHeartbeat {
  agent_id: AgentId;
  status: Exclude<AgentStatus, "stale">;
  last_heartbeat: string;
  health_score: number;
  error_count_24h: number;
  metadata: Record<string, unknown>;
}

export interface AgentMetricsSnapshot {
  id: string;
  agent_id: AgentId;
  snapshot_at: string;
  tasks_completed: number;
  tasks_failed: number;
  avg_task_duration_ms: number | null;
  tokens_consumed: number;
  api_calls: number;
}
