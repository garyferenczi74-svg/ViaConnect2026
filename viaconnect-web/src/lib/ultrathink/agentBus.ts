/**
 * Ultrathink Agent Event Bus (Prompt #60 v2 — Layer 1)
 *
 * Thin wrapper around public.ultrathink_agent_events for emitters and the
 * Supabase Realtime channel for subscribers (admin dashboard, future #61).
 *
 * Server-side emitters call `emitEvent()` to insert into the table.
 * Browser-side subscribers call `subscribeToAgentEvents()` to listen via
 * Supabase Realtime (the table is in the supabase_realtime publication).
 */

import type { SupabaseClient, RealtimeChannel } from "@supabase/supabase-js";

export type EventType = "heartbeat" | "start" | "complete" | "error" | "data_available" | "health_check";
export type Severity = "info" | "warning" | "error" | "critical";

export interface AgentEvent {
  id: string;
  agent_name: string;
  event_type: EventType;
  run_id: string | null;
  payload: Record<string, unknown>;
  severity: Severity;
  created_at: string;
}

/**
 * Emit an event to the bus. Idempotent — duplicate events for the same
 * (agent, run, event_type) at the same timestamp are intentionally allowed
 * since clock skew and retries are real.
 */
export async function emitEvent(
  db: SupabaseClient,
  agent_name: string,
  event_type: EventType,
  payload: Record<string, unknown> = {},
  severity: Severity = "info",
  run_id?: string
): Promise<void> {
  // Prefer the SECURITY DEFINER RPC so we also bump last_heartbeat_at on the
  // registry row in one call.
  const { error } = await db.rpc("ultrathink_agent_heartbeat", {
    p_agent_name: agent_name,
    p_run_id: run_id ?? null,
    p_event_type: event_type,
    p_payload: payload,
    p_severity: severity,
  });
  if (error) {
    // Fall back to a direct insert (no registry update) so events are never lost
    await db.from("ultrathink_agent_events").insert({
      agent_name, event_type, run_id: run_id ?? null, payload, severity,
    });
  }
}

/**
 * Subscribe to live agent events via Supabase Realtime.
 * Returns the channel — caller must `.unsubscribe()` when done.
 *
 * Filters supported:
 *   - agent_name (exact match)
 *   - severity   (exact match — useful for showing only errors)
 */
export function subscribeToAgentEvents(
  db: SupabaseClient,
  onEvent: (e: AgentEvent) => void,
  filters: { agent_name?: string; severity?: Severity } = {}
): RealtimeChannel {
  const filterParts: string[] = [];
  if (filters.agent_name) filterParts.push(`agent_name=eq.${filters.agent_name}`);
  if (filters.severity) filterParts.push(`severity=eq.${filters.severity}`);

  const channel = db
    .channel(`ut-agent-events-${Math.random().toString(36).slice(2, 8)}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "ultrathink_agent_events",
        filter: filterParts.length > 0 ? filterParts.join(",") : undefined,
      },
      (msg: { new: AgentEvent }) => onEvent(msg.new)
    )
    .subscribe();

  return channel;
}

/**
 * Convenience: build a typed start/complete/error trio for a single agent run.
 * Edge Functions can use these as the entire heartbeat surface area.
 */
export function makeRunReporter(db: SupabaseClient, agentName: string, runId: string) {
  return {
    start: (payload: Record<string, unknown> = {}) => emitEvent(db, agentName, "start", payload, "info", runId),
    heartbeat: (payload: Record<string, unknown> = {}) => emitEvent(db, agentName, "heartbeat", payload, "info", runId),
    complete: (payload: Record<string, unknown> = {}) => emitEvent(db, agentName, "complete", payload, "info", runId),
    error: (msg: string, payload: Record<string, unknown> = {}) =>
      emitEvent(db, agentName, "error", { error: msg, ...payload }, "error", runId),
    dataAvailable: (payload: Record<string, unknown> = {}) =>
      emitEvent(db, agentName, "data_available", payload, "info", runId),
  };
}
