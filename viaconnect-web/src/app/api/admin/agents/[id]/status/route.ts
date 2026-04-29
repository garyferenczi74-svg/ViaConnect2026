import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { isKnownAgentId } from "@/lib/agents/registry";
import { withTimeout, isTimeoutError } from "@/lib/utils/with-timeout";
import { safeLog } from "@/lib/utils/safe-log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("missing supabase env");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    if (!isKnownAgentId(id)) {
      return NextResponse.json({ error: "Unknown agent" }, { status: 400 });
    }

    const userClient = createServerClient();
    const { data: { user } } = await withTimeout(userClient.auth.getUser(), 5000, 'api.agents.status.auth');
    if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

    const profileRes = await withTimeout(
      (async () => userClient
        .from("profiles")
        .select("role, full_name")
        .eq("id", user.id)
        .maybeSingle())(),
      5000,
      'api.agents.status.load-profile',
    );
    const profile = profileRes.data as { role?: string; full_name?: string } | null;
    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }

    let body: { action?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    const action = body.action;
    if (action !== "pause" && action !== "resume") {
      return NextResponse.json({ error: "action must be pause or resume" }, { status: 400 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const svc = serviceClient() as any;
    const nextHealth = action === "pause" ? "disabled" : "unknown";

    await withTimeout(
      (async () => svc
        .from("ultrathink_agent_registry")
        .update({ health_status: nextHealth, updated_at: new Date().toISOString() })
        .eq("agent_name", id))(),
      8000,
      'api.agents.status.update-registry',
    );

    // Emit an event for the activity feed so the action is visible in realtime.
    try {
      await withTimeout(
        (async () => svc.rpc("ultrathink_agent_heartbeat", {
          p_agent_name: id,
          p_run_id: null,
          p_event_type: action === "pause" ? "error" : "heartbeat",
          p_payload: {
            message: `${action === "pause" ? "Agent paused" : "Agent resumed"} by ${profile.full_name ?? "admin"}`,
            action,
            actor_user_id: user.id,
          },
          p_severity: action === "pause" ? "warning" : "info",
        }))(),
        5000,
        'api.agents.status.heartbeat',
      );
    } catch {
      // best-effort
    }

    return NextResponse.json({ ok: true, agentId: id, action, nextHealth });
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.error('api.agents.status', 'database timeout', { id, error: err });
      return NextResponse.json({ error: 'Database operation timed out. Please try again.' }, { status: 503 });
    }
    safeLog.error('api.agents.status', 'unexpected error', { id, error: err });
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
