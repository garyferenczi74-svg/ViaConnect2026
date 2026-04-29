// =============================================================================
// GET /api/ultrathink/agents/status  (Prompt #60 v2 — Layer 1)
// =============================================================================
// Returns the current Ultrathink agent fleet health snapshot:
//   - Total counts by tier and health status
//   - Critical agents (always shown by name)
//   - Stale agents (last_heartbeat_at older than 3x expected_period_minutes)
//   - The 20 most recent events from ultrathink_agent_events
//
// Used by:
//   - The future admin dashboard (Prompt #61)
//   - Internal monitoring / scripts
//
// Auth: any authenticated user can read (RLS-gated by ut_read_authenticated).
// =============================================================================

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { withTimeout, isTimeoutError } from "@/lib/utils/with-timeout";
import { safeLog } from "@/lib/utils/safe-log";

export async function GET() {
  try {
    const supabase = createClient();

    let user;
    try {
      const authResult = await withTimeout(supabase.auth.getUser(), 5000, "api.ultrathink.agents.status.auth");
      user = authResult.data.user;
    } catch (err) {
      if (isTimeoutError(err)) {
        safeLog.error("api.ultrathink.agents.status", "auth timeout", { error: err });
        return NextResponse.json({ error: "Authentication check timed out." }, { status: 503 });
      }
      throw err;
    }
    if (!user) {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }

    const { data: agents, error: agentsErr } = await withTimeout(
      (async () => supabase
        .from("ultrathink_agent_registry")
        .select("agent_name, display_name, tier, agent_type, health_status, is_critical, is_active, last_heartbeat_at, expected_period_minutes, runtime_kind, runtime_handle")
        .eq("is_active", true)
        .order("tier")
        .order("agent_name"))(),
      8000,
      "api.ultrathink.agents.status.fetch",
    );
    if (agentsErr) {
      safeLog.error("api.ultrathink.agents.status", "agents fetch failed", { error: agentsErr });
      return NextResponse.json({ error: agentsErr.message }, { status: 500 });
    }

  const allAgents = agents ?? [];

  // ── Tier + status rollup ──────────────────────────────────────────────
  const byTier: Record<number, { total: number; healthy: number; degraded: number; unhealthy: number; unknown: number }> = {
    1: { total: 0, healthy: 0, degraded: 0, unhealthy: 0, unknown: 0 },
    2: { total: 0, healthy: 0, degraded: 0, unhealthy: 0, unknown: 0 },
    3: { total: 0, healthy: 0, degraded: 0, unhealthy: 0, unknown: 0 },
    4: { total: 0, healthy: 0, degraded: 0, unhealthy: 0, unknown: 0 },
  };
  for (const a of allAgents) {
    const t = a.tier as 1|2|3|4;
    byTier[t].total++;
    const status = (a.health_status as keyof typeof byTier[1]) ?? "unknown";
    if (status in byTier[t]) byTier[t][status]++;
  }

  const critical = allAgents.filter(a => a.is_critical);
  const unhealthy = allAgents.filter(a => a.health_status === "unhealthy");
  const stale = allAgents.filter(a => {
    if (!a.expected_period_minutes || !a.last_heartbeat_at) return false;
    const cutoff = Date.now() - a.expected_period_minutes * 3 * 60_000;
    return new Date(a.last_heartbeat_at).getTime() < cutoff;
  });

    let events: any[] = [];
    try {
      const eventsRes = await withTimeout(
        (async () => supabase
          .from("ultrathink_agent_events")
          .select("agent_name, event_type, severity, payload, created_at")
          .order("created_at", { ascending: false })
          .limit(20))(),
        5000,
        "api.ultrathink.agents.status.events",
      );
      events = eventsRes.data ?? [];
    } catch (eventsErr) {
      safeLog.warn("api.ultrathink.agents.status", "events fetch failed (non-blocking)", { error: eventsErr });
    }

    return NextResponse.json({
      ok: true,
      snapshot_at: new Date().toISOString(),
      totals: {
        registered: allAgents.length,
        critical: critical.length,
        unhealthy: unhealthy.length,
        stale: stale.length,
      },
      by_tier: byTier,
      critical_agents: critical.map(c => ({ name: c.agent_name, status: c.health_status })),
      unhealthy_agents: unhealthy.map(u => ({ name: u.agent_name, last_seen: u.last_heartbeat_at })),
      stale_agents: stale.map(s => ({ name: s.agent_name, last_seen: s.last_heartbeat_at, expected_minutes: s.expected_period_minutes })),
      recent_events: events,
    });
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.error("api.ultrathink.agents.status", "database timeout", { error: err });
      return NextResponse.json({ error: "Database operation timed out." }, { status: 503 });
    }
    safeLog.error("api.ultrathink.agents.status", "unexpected error", { error: err });
    return NextResponse.json({ error: "An unexpected error occurred." }, { status: 500 });
  }
}
