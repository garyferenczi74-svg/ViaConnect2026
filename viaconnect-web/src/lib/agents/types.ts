/**
 * Agent activity panel types (Prompt #126 + #214 + #214a).
 * Source-of-truth heartbeat/registry data comes from ultrathink_agent_registry
 * and ultrathink_agent_events; these types present the spec's canonical shape
 * to the UI via the mapper in activity-tracker.ts.
 */

/**
 * Prompt 214c thirteen-agent roster (canonical).
 * Kelsey is retired as a live AgentId; historical slug maps via aliases to lex.
 * Thanos = Peptide Education; Elysium = My Genetics (genetics handoff from Arnold).
 */
export type AgentId =
  | "jeffery"
  | "hannah"
  | "gordon"
  | "arnold"
  | "michelangelo"
  | "hounddog"
  | "sherlock"
  | "marshall"
  | "lex"
  | "security_advisor"
  | "performance_advisor"
  | "thanos"
  | "elysium";

export const AGENT_IDS: readonly AgentId[] = [
  "jeffery",
  "hannah",
  "gordon",
  "arnold",
  "michelangelo",
  "hounddog",
  "sherlock",
  "marshall",
  "lex",
  "security_advisor",
  "performance_advisor",
  "thanos",
  "elysium",
] as const;

/**
 * Maps registry / event agent_name values onto panel AgentIds.
 * Includes legacy Kelsey → Lex and name-mismatch aliases from Prompt 214.
 */
export const AGENT_NAME_ALIASES: Readonly<Record<string, AgentId>> = {
  jeffery: "jeffery",
  jeffery_master: "jeffery",
  hannah: "hannah",
  gordon: "gordon",
  gordan: "gordon",
  arnold: "arnold",
  michelangelo: "michelangelo",
  hounddog: "hounddog",
  hound_dog: "hounddog",
  marshall_hounddog: "hounddog",
  sherlock: "sherlock",
  sherlock_research_hub: "sherlock",
  marshall: "marshall",
  lex: "lex",
  // Prompt 214a: Kelsey retired; historical events still resolve for ACC.
  kelsey: "lex",
  security_advisor: "security_advisor",
  performance_advisor: "performance_advisor",
  security: "security_advisor",
  performance: "performance_advisor",
  // Prompt 214c
  thanos: "thanos",
  elysium: "elysium",
  my_genetics: "elysium",
  peptide_education: "thanos",
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
