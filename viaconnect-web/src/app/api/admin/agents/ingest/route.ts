/**
 * POST /api/admin/agents/ingest
 * Brief 27: admin-only write path for a real Grok / Jeffery / Michelangelo
 * turn, brief, or PR onto that ACC seat.
 */
import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { withTimeout, isTimeoutError } from "@/lib/utils/with-timeout";
import { safeLog } from "@/lib/utils/safe-log";
import {
  persistCommandCenterIngest,
  type CommandCenterIngestKind,
  type CommandCenterIngestPhase,
} from "@/lib/agents/command-center-ingest";
import { resolveAgentId } from "@/lib/agents/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const KINDS: readonly CommandCenterIngestKind[] = ["turn", "brief", "pr"];
const PHASES: readonly CommandCenterIngestPhase[] = ["start", "complete", "error"];

function isKind(v: string): v is CommandCenterIngestKind {
  return (KINDS as readonly string[]).includes(v);
}

function isPhase(v: string): v is CommandCenterIngestPhase {
  return (PHASES as readonly string[]).includes(v);
}

export async function POST(req: Request) {
  try {
    const userClient = await createServerClient();
    const {
      data: { user },
    } = await withTimeout(userClient.auth.getUser(), 5000, "api.agents.ingest.auth");
    if (!user) {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }

    const profileRes = await withTimeout(
      (async () =>
        userClient.from("profiles").select("role").eq("id", user.id).maybeSingle())(),
      5000,
      "api.agents.ingest.profile",
    );
    const role = (profileRes.data as { role?: string } | null)?.role;
    if (role !== "admin") {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }

    let body: {
      agentId?: string;
      kind?: string;
      phase?: string;
      message?: string;
      title?: string;
      correlationKey?: string;
      metadata?: Record<string, unknown>;
    };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const agentRaw = typeof body.agentId === "string" ? body.agentId : "";
    if (!resolveAgentId(agentRaw)) {
      return NextResponse.json({ error: "unknown_or_non_acc_seat" }, { status: 400 });
    }
    if (!body.kind || !isKind(body.kind)) {
      return NextResponse.json({ error: "kind must be turn, brief, or pr" }, { status: 400 });
    }
    if (!body.phase || !isPhase(body.phase)) {
      return NextResponse.json({ error: "phase must be start, complete, or error" }, { status: 400 });
    }
    if (typeof body.message !== "string" || body.message.trim().length === 0) {
      return NextResponse.json({ error: "message required" }, { status: 400 });
    }

    const result = await persistCommandCenterIngest({
      agentRaw,
      kind: body.kind,
      phase: body.phase,
      message: body.message.trim(),
      title: typeof body.title === "string" ? body.title : undefined,
      correlationKey:
        typeof body.correlationKey === "string" ? body.correlationKey : undefined,
      metadata: body.metadata,
    });

    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: result.reason ?? "ingest_failed", agentId: result.agentId },
        { status: result.reason === "unknown_or_non_acc_seat" ? 400 : 503 },
      );
    }

    return NextResponse.json({
      ok: true,
      agentId: result.agentId,
      reason: result.reason ?? "ingested",
    });
  } catch (err) {
    if (isTimeoutError(err)) {
      return NextResponse.json({ error: "Database operation timed out." }, { status: 503 });
    }
    safeLog.error("api.agents.ingest", "unexpected", { error: err });
    return NextResponse.json({ error: "An unexpected error occurred." }, { status: 500 });
  }
}
