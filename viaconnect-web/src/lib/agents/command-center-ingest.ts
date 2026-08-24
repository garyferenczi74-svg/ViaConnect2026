/**
 * Brief 27: Command Center ingest.
 *
 * READ path (unchanged): activity-tracker maps ultrathink_agent_registry +
 * ultrathink_agent_events + jeffery_agent_panel_tasks onto ACC seats.
 *
 * WRITE path: a real Grok / Jeffery / Michelangelo turn, brief, or PR writes
 * an ACC ops row (if missing) plus an activity event, and a panel task only
 * when that event is real work. No invented tasks, tokens, or failure rates.
 * Idle ops rows stay unknown / no heartbeat.
 */

import { createAdminClientOrNull } from "@/lib/supabase/admin";
import { safeLog } from "@/lib/utils/safe-log";
import { withAbortTimeout } from "@/lib/utils/with-timeout";
import { getCircuitBreaker } from "@/lib/utils/circuit-breaker";
import { AGENT_REGISTRY } from "./registry";
import { ACC_OWNED_CADENCE_JOB, GROK_ONLY_IDLE_SEATS, agentHasOwnedCadenceJob } from "./runners";
import {
  AGENT_IDS,
  resolveAgentId,
  type AgentId,
  type AgentTaskStatus,
} from "./types";

export type CommandCenterIngestKind = "turn" | "brief" | "pr";
export type CommandCenterIngestPhase = "start" | "complete" | "error";

export interface CommandCenterIngestInput {
  agentRaw: string;
  kind: CommandCenterIngestKind;
  phase: CommandCenterIngestPhase;
  message: string;
  title?: string;
  correlationKey?: string;
  metadata?: Record<string, unknown>;
  occurredAt?: string;
}

export interface AccOpsRow {
  agent_id: AgentId;
  health_status: "unknown";
  last_heartbeat_at: string | null;
}

export interface IngestStoreEvent {
  id: string;
  agent_id: AgentId;
  event_type: CommandCenterIngestPhase;
  message: string;
  created_at: string;
  correlation_key: string | null;
  metadata: Record<string, unknown>;
}

export interface IngestStoreTask {
  id: string;
  agent_id: AgentId;
  task_title: string;
  task_status: AgentTaskStatus;
  created_at: string;
  completed_at: string | null;
  correlation_key: string | null;
}

export interface CommandCenterStore {
  opsRows: Partial<Record<AgentId, AccOpsRow>>;
  events: IngestStoreEvent[];
  tasks: IngestStoreTask[];
}

export interface IngestApplyResult {
  store: CommandCenterStore;
  accepted: boolean;
  agentId: AgentId | null;
  reason?: string;
  wroteEvent: boolean;
  wroteTask: boolean;
}

export function emptyCommandCenterStore(): CommandCenterStore {
  return { opsRows: {}, events: [], tasks: [] };
}

/** Idle ops row: present, unknown health, no heartbeat. Never Healthy. */
export function makeIdleOpsRow(agentId: AgentId): AccOpsRow {
  return {
    agent_id: agentId,
    health_status: "unknown",
    last_heartbeat_at: null,
  };
}

export function ensureStoreOpsRow(
  store: CommandCenterStore,
  agentId: AgentId,
): CommandCenterStore {
  if (store.opsRows[agentId]) return store;
  return {
    ...store,
    opsRows: { ...store.opsRows, [agentId]: makeIdleOpsRow(agentId) },
  };
}

export function ensureAllAccOpsRows(store: CommandCenterStore): CommandCenterStore {
  let next = store;
  for (const id of AGENT_IDS) {
    next = ensureStoreOpsRow(next, id);
  }
  return next;
}

function phaseToTaskStatus(phase: CommandCenterIngestPhase): AgentTaskStatus {
  if (phase === "start") return "running";
  if (phase === "error") return "failed";
  return "completed";
}

function ingestEventType(
  phase: CommandCenterIngestPhase,
): "start" | "complete" | "error" {
  return phase;
}

/**
 * Attribute work only from an explicit seat label or ACC slug in a path.
 * Free-text name mentions are ignored so docs that name Picasso do not
 * invent Picasso work.
 */
export function resolveSeatFromWorkText(text: string): AgentId | null {
  const labeled =
    /\b(?:agent|seat|owner)\s*[:=]\s*([a-zA-Z][a-zA-Z0-9_]*)/i.exec(text);
  if (labeled?.[1]) {
    return resolveAgentId(labeled[1]);
  }
  const slugs = AGENT_IDS.join("|");
  const pathRe = new RegExp(
    `(?:^|/)(${slugs})(?:[-_/]|$)`,
    "i",
  );
  const pathHit = pathRe.exec(text);
  if (pathHit?.[1]) return resolveAgentId(pathHit[1]);
  return null;
}

export function applyCommandCenterIngest(
  store: CommandCenterStore,
  input: CommandCenterIngestInput,
  nowIso: string = new Date().toISOString(),
): IngestApplyResult {
  const agentId = resolveAgentId(input.agentRaw);
  if (!agentId) {
    return {
      store,
      accepted: false,
      agentId: null,
      reason: "unknown_or_non_acc_seat",
      wroteEvent: false,
      wroteTask: false,
    };
  }

  let next = ensureStoreOpsRow(store, agentId);
  const key = input.correlationKey?.trim() || null;
  if (key) {
    const dup = next.events.some(
      (e) => e.agent_id === agentId && e.correlation_key === key,
    );
    if (dup) {
      return {
        store: next,
        accepted: true,
        agentId,
        reason: "duplicate",
        wroteEvent: false,
        wroteTask: false,
      };
    }
  }

  const occurredAt = input.occurredAt ?? nowIso;
  const eventId = key ? `evt:${agentId}:${key}` : `evt:${agentId}:${occurredAt}`;
  const taskId = key ? `task:${agentId}:${key}` : `task:${agentId}:${occurredAt}`;
  const title =
    (input.title && input.title.trim()) ||
    `${input.kind} ${input.phase}`;
  const metadata: Record<string, unknown> = {
    ...(input.metadata ?? {}),
    kind: input.kind,
    phase: input.phase,
    source: "command_center_ingest",
    message: input.message,
  };

  const event: IngestStoreEvent = {
    id: eventId,
    agent_id: agentId,
    event_type: ingestEventType(input.phase),
    message: input.message,
    created_at: occurredAt,
    correlation_key: key,
    metadata,
  };

  const status = phaseToTaskStatus(input.phase);
  const task: IngestStoreTask = {
    id: taskId,
    agent_id: agentId,
    task_title: title.slice(0, 200),
    task_status: status,
    created_at: occurredAt,
    completed_at: status === "running" ? null : occurredAt,
    correlation_key: key,
  };

  next = {
    ...next,
    events: [event, ...next.events],
    tasks: [task, ...next.tasks],
  };

  return {
    store: next,
    accepted: true,
    agentId,
    wroteEvent: true,
    wroteTask: true,
  };
}

export function countSeatActivity24h(
  store: CommandCenterStore,
  agentId: AgentId,
  nowMs: number = Date.now(),
): number {
  const since = nowMs - 24 * 60 * 60 * 1000;
  return store.events.filter((e) => {
    if (e.agent_id !== agentId) return false;
    const t = Date.parse(e.created_at);
    return Number.isFinite(t) && t >= since;
  }).length;
}

export function countSeatTasks24h(
  store: CommandCenterStore,
  agentId: AgentId,
  nowMs: number = Date.now(),
): number {
  const since = nowMs - 24 * 60 * 60 * 1000;
  return store.tasks.filter((t) => {
    if (t.agent_id !== agentId) return false;
    const at = Date.parse(t.completed_at ?? t.created_at);
    return Number.isFinite(at) && at >= since;
  }).length;
}

export interface AccOpsInsertRow {
  agent_name: AgentId;
  display_name: string;
  origin_prompt: string;
  agent_type:
    | "data"
    | "safety"
    | "scoring"
    | "analytics"
    | "infra"
    | "engagement"
    | "protocol"
    | "research"
    | "ai"
    | "learning"
    | "perf"
    | "control";
  tier: 1 | 2 | 3 | 4;
  description: string;
  reports: string;
  runtime_kind: "edge_function" | "pg_cron" | "request_time" | "table" | "external";
  runtime_handle: string | null;
  expected_period_minutes: number | null;
  health_status: "unknown";
  last_heartbeat_at: null;
  is_critical: false;
  is_active: true;
}

const ACC_AGENT_TYPE: Record<AgentId, AccOpsInsertRow["agent_type"]> = {
  jeffery: "control",
  picasso: "ai",
  michelangelo: "ai",
  conan: "ai",
  hermes: "research",
  gene: "ai",
  elysium: "research",
  marshall: "safety",
  martha: "ai",
  hannah: "ai",
  thanos: "research",
  elizabeth: "research",
  lex: "safety",
  sherlock: "research",
  watson: "ai",
  arnold: "scoring",
  hounddog: "data",
};

export function buildAccOpsInsert(agentId: AgentId): AccOpsInsertRow {
  const reg = AGENT_REGISTRY[agentId];
  const owned = agentHasOwnedCadenceJob(agentId);
  return {
    agent_name: agentId,
    display_name: reg.display_name,
    origin_prompt: "Brief 27 ACC ops row",
    agent_type: ACC_AGENT_TYPE[agentId],
    tier: agentId === "jeffery" || agentId === "marshall" ? 1 : 2,
    description: reg.description,
    reports: "jeffery",
    runtime_kind: owned ? "request_time" : "external",
    runtime_handle: owned
      ? `/api/admin/agents/${agentId}/run-now`
      : null,
    expected_period_minutes: owned ? 60 : null,
    health_status: "unknown",
    last_heartbeat_at: null,
    is_critical: false,
    is_active: true,
  };
}

export function isGrokOnlyIdleSeat(id: AgentId): boolean {
  return GROK_ONLY_IDLE_SEATS.includes(id);
}

export function ownedCadenceJobFor(id: AgentId): string | undefined {
  return ACC_OWNED_CADENCE_JOB[id];
}

interface RegistryIdRow {
  id: string;
}

interface ExistingEventRow {
  id: string;
}

export async function ensureAccOpsRow(agentId: AgentId): Promise<boolean> {
  const supabase = createAdminClientOrNull();
  if (!supabase) return false;
  try {
    const found = await supabase
      .from("ultrathink_agent_registry")
      .select("id")
      .eq("agent_name", agentId)
      .maybeSingle();
    if (found.error) {
      safeLog.warn("acc.ingest", "ensure lookup failed", {
        agentId,
        message: found.error.message,
      });
      return false;
    }
    const existing = found.data as RegistryIdRow | null;
    if (existing?.id) return true;
    const row = buildAccOpsInsert(agentId);
    const inserted = await supabase.from("ultrathink_agent_registry").insert(row);
    if (inserted.error) {
      safeLog.warn("acc.ingest", "ensure insert failed", {
        agentId,
        message: inserted.error.message,
      });
      return false;
    }
    return true;
  } catch (err) {
    safeLog.warn("acc.ingest", "ensure threw", {
      agentId,
      error: err instanceof Error ? err.message : String(err),
    });
    return false;
  }
}

export async function ensureAllAccOpsRowsPersisted(): Promise<{ ensured: number }> {
  let ensured = 0;
  for (const id of AGENT_IDS) {
    if (await ensureAccOpsRow(id)) ensured += 1;
  }
  return { ensured };
}

function heartbeatEventType(
  phase: CommandCenterIngestPhase,
): "start" | "complete" | "error" {
  return phase;
}

export async function persistCommandCenterIngest(
  input: CommandCenterIngestInput,
): Promise<{
  ok: boolean;
  agentId: AgentId | null;
  reason?: string;
}> {
  const applied = applyCommandCenterIngest(emptyCommandCenterStore(), input);
  if (!applied.accepted || !applied.agentId) {
    return { ok: false, agentId: null, reason: applied.reason };
  }
  if (applied.reason === "duplicate") {
    return { ok: true, agentId: applied.agentId, reason: "duplicate" };
  }

  const supabase = createAdminClientOrNull();
  if (!supabase) {
    return { ok: false, agentId: applied.agentId, reason: "no_admin_client" };
  }

  await ensureAccOpsRow(applied.agentId);

  const runId = crypto.randomUUID();
  const payload: Record<string, unknown> = {
    message: input.message,
    kind: input.kind,
    phase: input.phase,
    source: "command_center_ingest",
    ...(input.correlationKey ? { correlation_key: input.correlationKey } : {}),
    ...(input.metadata ?? {}),
  };

  try {
    if (input.correlationKey) {
      const existing = await supabase
        .from("ultrathink_agent_events")
        .select("id")
        .eq("agent_name", applied.agentId)
        .contains("payload", { correlation_key: input.correlationKey })
        .maybeSingle();
      const row = existing.data as ExistingEventRow | null;
      if (row?.id) {
        return { ok: true, agentId: applied.agentId, reason: "duplicate" };
      }
    }
  } catch {
    /* open — still write */
  }

  try {
    const { error } = await supabase.rpc("ultrathink_agent_heartbeat", {
      p_agent_name: applied.agentId,
      p_run_id: runId,
      p_event_type: heartbeatEventType(input.phase),
      p_payload: payload,
      p_severity: input.phase === "error" ? "error" : "info",
    });
    if (error) {
      safeLog.warn("acc.ingest", "heartbeat rpc failed", {
        agentId: applied.agentId,
        message: error.message,
      });
    }
  } catch (err) {
    safeLog.warn("acc.ingest", "heartbeat threw", {
      agentId: applied.agentId,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  const status = phaseToTaskStatus(input.phase);
  const now = input.occurredAt ?? new Date().toISOString();
  const title =
    (input.title && input.title.trim()) || `${input.kind} ${input.phase}`;
  try {
    const { error } = await supabase.from("jeffery_agent_panel_tasks").insert({
      agent_id: applied.agentId,
      task_title: title.slice(0, 200),
      task_description: input.message.slice(0, 500),
      task_status: status,
      progress_percent: status === "completed" ? 100 : status === "running" ? 10 : 0,
      priority: "normal",
      assigned_by_agent_id: "jeffery",
      metadata: {
        kind: input.kind,
        source: "command_center_ingest",
        ...(input.correlationKey ? { correlation_key: input.correlationKey } : {}),
      },
      started_at: now,
      completed_at: status === "running" ? null : now,
    });
    if (error) {
      safeLog.warn("acc.ingest", "panel task insert failed", {
        agentId: applied.agentId,
        message: error.message,
      });
    }
  } catch (err) {
    safeLog.warn("acc.ingest", "panel task threw", {
      agentId: applied.agentId,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  return { ok: true, agentId: applied.agentId };
}

export interface GithubPrShape {
  number: number;
  title: string;
  body?: string | null;
  html_url?: string;
  head?: { ref?: string };
}

export function githubPrToIngestInput(pr: GithubPrShape): CommandCenterIngestInput | null {
  const blob = [pr.head?.ref ?? "", pr.title, pr.body ?? ""].join("\n");
  const seat = resolveSeatFromWorkText(blob);
  if (!seat) return null;
  return {
    agentRaw: seat,
    kind: "pr",
    phase: "complete",
    message: `PR #${pr.number}: ${pr.title}`,
    title: pr.title,
    correlationKey: `pr:${pr.number}`,
    metadata: {
      pr_number: pr.number,
      html_url: pr.html_url ?? null,
    },
  };
}

const githubBreaker = getCircuitBreaker("github-acc-ingest", {
  failureThreshold: 3,
  resetTimeoutMs: 60_000,
  halfOpenMaxAttempts: 1,
});

export async function pollGithubPrsForCommandCenter(): Promise<{
  ingested: number;
  reason?: string;
}> {
  const token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
  if (!token) return { ingested: 0, reason: "no_token" };

  try {
    const items = await githubBreaker.execute(async () => {
      const res = await withAbortTimeout(
        (signal) =>
          fetch(
            "https://api.github.com/repos/garyferenczi74-svg/ViaConnect2026/pulls?state=all&per_page=20&sort=updated&direction=desc",
            {
              headers: {
                Authorization: `Bearer ${token}`,
                Accept: "application/vnd.github+json",
                "X-GitHub-Api-Version": "2022-11-28",
                "User-Agent": "ViaConnect-ACC-ingest",
              },
              signal,
            },
          ),
        8000,
        "acc.ingest.github.prs",
      );
      if (!res.ok) throw new Error(`github HTTP ${res.status}`);
      return (await res.json()) as GithubPrShape[];
    });

    let ingested = 0;
    for (const pr of items) {
      const input = githubPrToIngestInput(pr);
      if (!input) continue;
      const r = await persistCommandCenterIngest(input);
      if (r.ok && r.reason !== "duplicate") ingested += 1;
    }
    return { ingested };
  } catch (err) {
    safeLog.warn("acc.ingest", "github poll failed open", {
      error: err instanceof Error ? err.message : String(err),
    });
    return { ingested: 0, reason: "poll_failed" };
  }
}
