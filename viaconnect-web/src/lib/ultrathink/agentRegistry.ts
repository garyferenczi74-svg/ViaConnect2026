/**
 * Ultrathink Agent Registry helpers (Prompt #60 v2 — Layer 1)
 *
 * Thin client for the public.ultrathink_agent_registry table. Used by:
 *   - Edge Functions calling heartbeat
 *   - The /api/ultrathink/agents/register route (future agent self-registration)
 *   - The admin dashboard (future Prompt #61) to read fleet status
 *
 * For Edge Function callers that don't have @supabase/supabase-js installed via
 * npm, the heartbeat helper accepts any client object that exposes .rpc(), so
 * the same code path works in both Deno and Node environments.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type AgentTier = 1 | 2 | 3 | 4;
export type AgentType =
  | "data" | "safety" | "scoring" | "analytics" | "infra"
  | "engagement" | "protocol" | "research" | "ai" | "learning"
  | "perf" | "control";
export type RuntimeKind = "edge_function" | "pg_cron" | "request_time" | "table" | "external";
export type HealthStatus = "healthy" | "degraded" | "unhealthy" | "unknown" | "disabled";
export type EventType = "heartbeat" | "start" | "complete" | "error" | "data_available" | "health_check";
export type Severity = "info" | "warning" | "error" | "critical";

export interface AgentRecord {
  id: string;
  agent_name: string;
  display_name: string;
  origin_prompt: string | null;
  agent_type: AgentType;
  tier: AgentTier;
  description: string;
  reports: string | null;
  runtime_kind: RuntimeKind;
  runtime_handle: string | null;
  expected_period_minutes: number | null;
  health_check_query: string | null;
  health_status: HealthStatus;
  last_heartbeat_at: string | null;
  last_health_check_at: string | null;
  consecutive_misses: number;
  is_critical: boolean;
  is_active: boolean;
}

export interface RegisterPayload {
  agent_name: string;
  display_name: string;
  origin_prompt?: string;
  agent_type: AgentType;
  tier: AgentTier;
  description: string;
  reports?: string;
  runtime_kind: RuntimeKind;
  runtime_handle?: string;
  expected_period_minutes?: number | null;
  health_check_query?: string;
  is_critical?: boolean;
}

/** Build a service-role client from env (server-side only). */
export function buildServiceClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

/** Idempotent register-or-update for a new agent. Used by /api/ultrathink/agents/register. */
export async function registerAgent(
  db: SupabaseClient,
  payload: RegisterPayload
): Promise<{ created: boolean; agent: AgentRecord }> {
  const { data: existing } = await db
    .from("ultrathink_agent_registry")
    .select("id")
    .eq("agent_name", payload.agent_name)
    .maybeSingle();

  const row = {
    ...payload,
    is_critical: payload.is_critical ?? false,
    is_active: true,
    updated_at: new Date().toISOString(),
  };

  if (existing) {
    const { data, error } = await db
      .from("ultrathink_agent_registry")
      .update(row)
      .eq("id", existing.id)
      .select("*")
      .single();
    if (error) throw error;
    return { created: false, agent: data as AgentRecord };
  } else {
    const { data, error } = await db
      .from("ultrathink_agent_registry")
      .insert(row)
      .select("*")
      .single();
    if (error) throw error;
    return { created: true, agent: data as AgentRecord };
  }
}

/** Emit a heartbeat / lifecycle event for an agent. Calls the SECURITY DEFINER RPC. */
export async function heartbeat(
  db: SupabaseClient,
  agentName: string,
  eventType: EventType,
  payload: Record<string, unknown> = {},
  severity: Severity = "info",
  runId?: string
): Promise<void> {
  await db.rpc("ultrathink_agent_heartbeat", {
    p_agent_name: agentName,
    p_run_id: runId ?? null,
    p_event_type: eventType,
    p_payload: payload,
    p_severity: severity,
  });
}

/** Read current registry rows for the admin dashboard. */
export async function listAgents(db: SupabaseClient): Promise<AgentRecord[]> {
  const { data, error } = await db
    .from("ultrathink_agent_registry")
    .select("*")
    .order("tier")
    .order("agent_name");
  if (error) throw error;
  return (data as AgentRecord[]) ?? [];
}

/** Trigger a health sweep across the fleet (orchestrator helper). */
export async function runHealthSweep(db: SupabaseClient): Promise<Array<{ agent_name: string; new_status: HealthStatus }>> {
  const { data, error } = await db.rpc("ultrathink_agent_health_sweep");
  if (error) throw error;
  return (data as Array<{ agent_name: string; new_status: HealthStatus }>) ?? [];
}
