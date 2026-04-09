// =============================================================================
// POST /api/advisor/chat  (Prompt #60b — Section 3B)
// =============================================================================
// Single endpoint that handles all 3 advisor roles. Auth + role gate + patient
// assignment check + Jeffery-built context + streamed Claude response.
//
// Body:
//   { message: string, role: 'consumer'|'practitioner'|'naturopath', patientId?: string }
//
// Response: text/event-stream (raw chunks of the assistant's reply)
// =============================================================================

import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { buildAdvisorContext, type AdvisorRole } from "@/lib/jeffery/advisor-context-builder";
import { streamAdvisorResponse } from "@/lib/jeffery/advisor-stream";
import { logAdvisorQuery, persistConversationTurn } from "@/lib/jeffery/advisor-telemetry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_ROLES = new Set(["consumer", "practitioner", "naturopath"]);

function buildServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function POST(req: Request) {
  // ── 1. Parse + validate body ─────────────────────────────────────────
  let body: { message?: string; role?: string; patientId?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }
  const message = (body.message ?? "").trim();
  const role = body.role as string;
  const patientId = body.patientId ?? null;

  if (!message) return new Response(JSON.stringify({ error: "message required" }), { status: 400, headers: { "Content-Type": "application/json" } });
  if (!VALID_ROLES.has(role)) return new Response(JSON.stringify({ error: "role must be consumer|practitioner|naturopath" }), { status: 400, headers: { "Content-Type": "application/json" } });

  // ── 2. Auth ──────────────────────────────────────────────────────────
  const userClient = createServerClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return new Response(JSON.stringify({ error: "Unauthenticated" }), { status: 401, headers: { "Content-Type": "application/json" } });

  // ── 3. Role gate ─────────────────────────────────────────────────────
  // Consumer: any signed-in user can use it for their own data
  // Practitioner / Naturopath: must have a row in naturopath_profiles OR be admin
  if (role !== "consumer") {
    const { data: profile } = await userClient.from("profiles").select("role").eq("id", user.id).maybeSingle();
    const { data: naturoProfile } = await userClient.from("naturopath_profiles").select("id").eq("user_id", user.id).maybeSingle();
    const isProvider = naturoProfile != null || profile?.role === "admin";
    if (!isProvider) {
      return new Response(JSON.stringify({ error: "Provider access required for this advisor" }), { status: 403, headers: { "Content-Type": "application/json" } });
    }
  }

  // ── 4. Patient assignment check (only when patientId is supplied) ────
  if (patientId && role !== "consumer") {
    const { data: share } = await userClient
      .from("protocol_shares")
      .select("id")
      .eq("provider_id", user.id)
      .eq("patient_id", patientId)
      .eq("status", "active")
      .maybeSingle();
    if (!share) {
      return new Response(JSON.stringify({ error: "Patient not assigned to you" }), { status: 403, headers: { "Content-Type": "application/json" } });
    }
  }

  // ── 5. Build context (service-role for cross-table reads) ───────────
  let serviceDb;
  try {
    serviceDb = buildServiceClient();
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }

  let ctx;
  try {
    ctx = await buildAdvisorContext(serviceDb, role as AdvisorRole, user.id, patientId);
  } catch (e) {
    return new Response(JSON.stringify({ error: `Context build failed: ${(e as Error).message}` }), { status: 500, headers: { "Content-Type": "application/json" } });
  }

  // ── 6. Pre-flight telemetry ─────────────────────────────────────────
  await logAdvisorQuery(serviceDb, {
    userId: user.id,
    role: role as AdvisorRole,
    patientId,
    message,
    contextSnapshot: ctx.contextVariables,
  });

  // ── 7. Stream Claude response ───────────────────────────────────────
  const { stream, meta } = streamAdvisorResponse(ctx, message);

  // Post-flight: when meta resolves, persist the conversation turn.
  // This is fire-and-forget — we don't await it inside the response.
  void meta.then(async (m) => {
    try {
      await persistConversationTurn(serviceDb, {
        userId: user.id,
        role: role as AdvisorRole,
        patientId,
        userMessage: message,
        assistantMessage: m.full_text,
        contextSnapshot: ctx.contextVariables,
        durationMs: m.duration_ms,
        inputTokens: m.input_tokens,
        outputTokens: m.output_tokens,
        error: m.error,
      });
    } catch (e) {
      console.warn(`[advisor/chat] persist failed: ${(e as Error).message}`);
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
