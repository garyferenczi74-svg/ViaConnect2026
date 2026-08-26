/**
 * Agent activity panel types (Prompt #126 + #214 + Brief 23).
 * Source-of-truth heartbeat/registry data comes from ultrathink_agent_registry
 * and ultrathink_agent_events; these types present the spec's canonical shape
 * to the UI via the mapper in activity-tracker.ts.
 */

/**
 * Brief 23 Grok Command Center roster (17 seats). Jeffery-approved lock.
 * Kelsey is retired as a live AgentId; historical slug maps via aliases to lex.
 * Gordon remains a nutrition product owner, not a Command Center seat.
 * security_advisor / performance_advisor are not Grok agents.
 * Thanos = Peptide Education; Elysium = My Genetics (genetics handoff from Arnold).
 * HannahAI uses the existing `hannah` slug.
 */
export type AgentId =
  | "jeffery"
  | "picasso"
  | "michelangelo"
  | "conan"
  | "hermes"
  | "gene"
  | "elysium"
  | "marshall"
  | "martha"
  | "hannah"
  | "thanos"
  | "elizabeth"
  | "lex"
  | "sherlock"
  | "watson"
  | "arnold"
  | "hounddog";

export const AGENT_IDS: readonly AgentId[] = [
  "jeffery",
  "picasso",
  "michelangelo",
  "conan",
  "hermes",
  "gene",
  "elysium",
  "marshall",
  "martha",
  "hannah",
  "thanos",
  "elizabeth",
  "lex",
  "sherlock",
  "watson",
  "arnold",
  "hounddog",
] as const;

/** Brief 39: one seat authority on /admin/jeffery. Header Agents digit. Not ultrathink. */
export const ACC_SEAT_COUNT = AGENT_IDS.length;

/**
 * Maps registry / event agent_name values onto panel AgentIds.
 * Includes legacy Kelsey → Lex and name-mismatch aliases from Prompt 214.
 * Advisor / Gordon names do not resolve to Command Center seats.
 */
export const AGENT_NAME_ALIASES: Readonly<Record<string, AgentId>> = {
  jeffery: "jeffery",
  jeffery_master: "jeffery",
  picasso: "picasso",
  michelangelo: "michelangelo",
  conan: "conan",
  hermes: "hermes",
  gene: "gene",
  elysium: "elysium",
  my_genetics: "elysium",
  marshall: "marshall",
  martha: "martha",
  hannah: "hannah",
  hannahai: "hannah",
  hannah_ai: "hannah",
  thanos: "thanos",
  peptide_education: "thanos",
  elizabeth: "elizabeth",
  lex: "lex",
  // Prompt 214a: Kelsey retired; historical events still resolve for ACC.
  kelsey: "lex",
  sherlock: "sherlock",
  sherlock_research_hub: "sherlock",
  watson: "watson",
  arnold: "arnold",
  hounddog: "hounddog",
  hound_dog: "hounddog",
  marshall_hounddog: "hounddog",
  // Brief 27 ingest aliases for in-app turns (not extra seats).
  jeffery_directive_processor: "jeffery",
  michelangelo_pipeline: "michelangelo",
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
