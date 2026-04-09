// =============================================================================
// POST /api/ultrathink/agents/register  (Prompt #60 v2 — Layer 1)
// =============================================================================
// Future #61+ agents register themselves into ultrathink_agent_registry by
// POSTing here. The orchestrator's health sweep then automatically begins
// monitoring them on the next 10-min tick.
//
// Auth: requires SUPABASE_SERVICE_ROLE_KEY in the X-Service-Role-Key header.
// (We do NOT require user JWT — agents may run server-to-server with no user
// context. The service-role header is the gate.)
// =============================================================================

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { registerAgent, type RegisterPayload } from "@/lib/ultrathink/agentRegistry";

const VALID_AGENT_TYPES = new Set([
  "data","safety","scoring","analytics","infra","engagement",
  "protocol","research","ai","learning","perf","control",
]);
const VALID_RUNTIME_KINDS = new Set(["edge_function","pg_cron","request_time","table","external"]);

export async function POST(req: Request) {
  // ── auth ──────────────────────────────────────────────────────────────
  const providedKey = req.headers.get("x-service-role-key");
  const expectedKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!expectedKey || !providedKey || providedKey !== expectedKey) {
    return NextResponse.json({ error: "Unauthorized — service role key required" }, { status: 401 });
  }

  // ── parse + validate ──────────────────────────────────────────────────
  let body: Partial<RegisterPayload>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const required = ["agent_name", "display_name", "agent_type", "tier", "description", "runtime_kind"] as const;
  for (const k of required) {
    if (body[k] === undefined || body[k] === null || body[k] === "") {
      return NextResponse.json({ error: `Missing required field: ${k}` }, { status: 400 });
    }
  }
  if (!VALID_AGENT_TYPES.has(String(body.agent_type))) {
    return NextResponse.json({ error: `Invalid agent_type: ${body.agent_type}` }, { status: 400 });
  }
  if (!VALID_RUNTIME_KINDS.has(String(body.runtime_kind))) {
    return NextResponse.json({ error: `Invalid runtime_kind: ${body.runtime_kind}` }, { status: 400 });
  }
  if (![1, 2, 3, 4].includes(Number(body.tier))) {
    return NextResponse.json({ error: "tier must be 1, 2, 3, or 4" }, { status: 400 });
  }
  if (!/^[a-z][a-z0-9_]+$/.test(String(body.agent_name))) {
    return NextResponse.json({ error: "agent_name must be lowercase snake_case" }, { status: 400 });
  }

  // ── upsert ────────────────────────────────────────────────────────────
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });

  const db = createClient(url, expectedKey, { auth: { autoRefreshToken: false, persistSession: false } });

  try {
    const result = await registerAgent(db, body as RegisterPayload);
    return NextResponse.json({
      ok: true,
      created: result.created,
      agent: result.agent,
      next_step: "Agent will be picked up by orchestrator health sweep on the next 10-min tick.",
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
