/**
 * Drop malformed ACC enrichment before Agents render.
 * Does not invent roster, task, event, or heartbeat rows.
 * Invalid rows are omitted. Honesty empty is OK.
 */

import { isKnownAgentId } from "./registry";
import type {
  AgentActivityEvent,
  AgentCurrentTask,
  AgentEventSeverity,
  AgentEventType,
  AgentHeartbeat,
  AgentId,
  AgentTaskPriority,
  AgentTaskStatus,
} from "./types";

const EVENT_TYPES = new Set<AgentEventType>([
  "task_started",
  "task_progress",
  "task_completed",
  "task_failed",
  "delegation_sent",
  "delegation_received",
  "gate_passed",
  "gate_failed",
  "heartbeat",
  "info",
]);

const EVENT_SEVERITIES = new Set<AgentEventSeverity>([
  "info",
  "success",
  "warn",
  "error",
]);

const TASK_STATUSES = new Set<AgentTaskStatus>([
  "queued",
  "running",
  "blocked",
  "completed",
  "failed",
  "cancelled",
]);

const TASK_PRIORITIES = new Set<AgentTaskPriority>([
  "low",
  "normal",
  "high",
  "critical",
]);

const HEARTBEAT_STATUSES = new Set<AgentHeartbeat["status"]>([
  "healthy",
  "degraded",
  "error",
  "idle",
  "paused",
]);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asAgentId(value: unknown): AgentId | null {
  return typeof value === "string" && isKnownAgentId(value) ? value : null;
}

function asNonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

/** Clone JSON-safe metadata only. Circular / bigint / function bags drop to {}. */
export function safeMetadata(value: unknown): Record<string, unknown> {
  if (!isPlainObject(value)) return {};
  try {
    const cloned: unknown = JSON.parse(JSON.stringify(value));
    return isPlainObject(cloned) ? cloned : {};
  } catch {
    return {};
  }
}

export function quarantineEvent(row: unknown): AgentActivityEvent | null {
  if (!isPlainObject(row)) return null;
  const id = asNonEmptyString(row.id);
  const agentId = asAgentId(row.agent_id);
  const message = asNonEmptyString(row.message);
  const createdAt = asNonEmptyString(row.created_at);
  if (!id || !agentId || !message || !createdAt) return null;
  const eventType =
    typeof row.event_type === "string" && EVENT_TYPES.has(row.event_type as AgentEventType)
      ? (row.event_type as AgentEventType)
      : "info";
  const severity =
    typeof row.severity === "string" &&
    EVENT_SEVERITIES.has(row.severity as AgentEventSeverity)
      ? (row.severity as AgentEventSeverity)
      : "info";
  return {
    id,
    agent_id: agentId,
    event_type: eventType,
    severity,
    message,
    metadata: safeMetadata(row.metadata),
    correlation_id: typeof row.correlation_id === "string" ? row.correlation_id : null,
    user_id: typeof row.user_id === "string" ? row.user_id : null,
    created_at: createdAt,
  };
}

export function quarantineTask(row: unknown): AgentCurrentTask | null {
  if (!isPlainObject(row)) return null;
  const id = asNonEmptyString(row.id);
  const agentId = asAgentId(row.agent_id);
  const title = asNonEmptyString(row.task_title);
  const createdAt = asNonEmptyString(row.created_at);
  const updatedAt = asNonEmptyString(row.updated_at) ?? createdAt;
  if (!id || !agentId || !title || !createdAt || !updatedAt) return null;
  const status =
    typeof row.task_status === "string" && TASK_STATUSES.has(row.task_status as AgentTaskStatus)
      ? (row.task_status as AgentTaskStatus)
      : null;
  if (!status) return null;
  const priority =
    typeof row.priority === "string" && TASK_PRIORITIES.has(row.priority as AgentTaskPriority)
      ? (row.priority as AgentTaskPriority)
      : "normal";
  const progress =
    typeof row.progress_percent === "number" && Number.isFinite(row.progress_percent)
      ? row.progress_percent
      : 0;
  return {
    id,
    agent_id: agentId,
    task_title: title,
    task_description: typeof row.task_description === "string" ? row.task_description : null,
    task_status: status,
    progress_percent: progress,
    priority,
    assigned_by_agent_id: asAgentId(row.assigned_by_agent_id),
    correlation_id: typeof row.correlation_id === "string" ? row.correlation_id : null,
    metadata: safeMetadata(row.metadata),
    started_at: typeof row.started_at === "string" ? row.started_at : null,
    completed_at: typeof row.completed_at === "string" ? row.completed_at : null,
    created_at: createdAt,
    updated_at: updatedAt,
  };
}

export function quarantineHeartbeat(row: unknown): AgentHeartbeat | null {
  if (!isPlainObject(row)) return null;
  const agentId = asAgentId(row.agent_id);
  if (!agentId) return null;
  const status =
    typeof row.status === "string" &&
    HEARTBEAT_STATUSES.has(row.status as AgentHeartbeat["status"])
      ? (row.status as AgentHeartbeat["status"])
      : "idle";
  const last =
    typeof row.last_heartbeat === "string" ? row.last_heartbeat : "";
  const health =
    typeof row.health_score === "number" && Number.isFinite(row.health_score)
      ? row.health_score
      : 0;
  const errors =
    typeof row.error_count_24h === "number" && Number.isFinite(row.error_count_24h)
      ? row.error_count_24h
      : 0;
  return {
    agent_id: agentId,
    status,
    last_heartbeat: last,
    health_score: health,
    error_count_24h: errors,
    metadata: safeMetadata(row.metadata),
  };
}

export function quarantineEvents(rows: unknown): AgentActivityEvent[] {
  if (!Array.isArray(rows)) return [];
  return rows
    .map(quarantineEvent)
    .filter((row): row is AgentActivityEvent => row !== null);
}

export function quarantineTasks(rows: unknown): AgentCurrentTask[] {
  if (!Array.isArray(rows)) return [];
  return rows
    .map(quarantineTask)
    .filter((row): row is AgentCurrentTask => row !== null);
}

export function quarantineHeartbeats(rows: unknown): AgentHeartbeat[] {
  if (!Array.isArray(rows)) return [];
  return rows
    .map(quarantineHeartbeat)
    .filter((row): row is AgentHeartbeat => row !== null);
}

export function quarantineAgentEnrichment(input: {
  heartbeats: unknown;
  tasks: unknown;
  events: unknown;
}): {
  heartbeats: AgentHeartbeat[];
  tasks: AgentCurrentTask[];
  events: AgentActivityEvent[];
} {
  return {
    heartbeats: quarantineHeartbeats(input.heartbeats),
    tasks: quarantineTasks(input.tasks),
    events: quarantineEvents(input.events),
  };
}
