// =============================================================================
// POST /api/advisor/chat  (Prompt #60b — Section 3B; Prompt 219F harden)
// =============================================================================
// Auth (awaited createClient) + role gate + patient assignment check +
// Jeffery-built context + streamed Claude response + rate limit.
// =============================================================================

import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { buildAdvisorContext, type AdvisorRole } from "@/lib/jeffery/advisor-context-builder";
import { streamAdvisorResponse } from "@/lib/jeffery/advisor-stream";
import { logAdvisorQuery, persistConversationTurn } from "@/lib/jeffery/advisor-telemetry";
import { checkAdvisorRateLimit } from "@/lib/jeffery/advisor-rate-limit";
import { emitJefferyMessage } from "@/lib/jeffery/message-bus";
import { scanAiOutput } from "@/lib/compliance/adapters/ai_output";
import { withTimeout, isTimeoutError } from "@/lib/utils/with-timeout";
import { safeLog } from "@/lib/utils/safe-log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const VALID_ROLES = new Set(["consumer", "practitioner", "naturopath"]);

function buildServiceClientOrNull() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  // Prefer classic service role; some Vercel projects map it as SUPABASE_SECRET_KEY
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    "";
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

function jsonError(message: string, status: number, extra?: Record<string, unknown>) {
  return new Response(JSON.stringify({ error: message, ...extra }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function POST(req: Request) {
  // ── 1. Parse + validate body ─────────────────────────────────────────
  let body: { message?: string; role?: string; patientId?: string };
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }
  const message = (body.message ?? "").trim();
  const role = body.role as string;
  const patientId = body.patientId ?? null;

  if (!message) return jsonError("message required", 400);
  if (!VALID_ROLES.has(role)) {
    return jsonError("role must be consumer|practitioner|naturopath", 400);
  }

  // ── 2. Auth (MUST await createClient — it is async) ──────────────────
  let userClient;
  try {
    userClient = await createServerClient();
  } catch (e) {
    safeLog.error("api.advisor.chat", "createClient failed", { error: e });
    return jsonError("Session unavailable. Please refresh and try again.", 503);
  }

  let user;
  try {
    const authResult = await withTimeout(userClient.auth.getUser(), 5000, "api.advisor.chat.auth");
    user = authResult.data.user;
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.error("api.advisor.chat", "auth timeout", { error: err });
      return jsonError("Authentication check timed out.", 503);
    }
    safeLog.error("api.advisor.chat", "auth failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return jsonError("Authentication failed. Please sign in again.", 401);
  }
  if (!user) return jsonError("Unauthenticated", 401);

  // ── 3. Rate limit ────────────────────────────────────────────────────
  const rl = checkAdvisorRateLimit(user.id);
  if (!rl.allowed) {
    safeLog.warn("api.advisor.chat", "rate limited", {
      userId: user.id,
      retryAfterSec: rl.retryAfterSec,
    });
    return jsonError(
      `You are sending messages a bit quickly. Please wait about ${rl.retryAfterSec} seconds and try again.`,
      429,
      { retryAfterSec: rl.retryAfterSec }
    );
  }

  // ── 4. Role gate ─────────────────────────────────────────────────────
  if (role !== "consumer") {
    const { data: profile } = await userClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    const { data: naturoProfile } = await userClient
      .from("naturopath_profiles")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    const isProvider = naturoProfile != null || profile?.role === "admin";
    if (!isProvider) {
      return jsonError("Provider access required for this advisor", 403);
    }
  }

  // ── 5. Patient assignment check ──────────────────────────────────────
  if (patientId && role !== "consumer") {
    const { data: share } = await userClient
      .from("protocol_shares")
      .select("id")
      .eq("provider_id", user.id)
      .eq("patient_id", patientId)
      .eq("status", "active")
      .maybeSingle();
    if (!share) {
      return jsonError("Patient not assigned to you", 403);
    }
  }

  // ── 6. Build context (service-role preferred; consumer can use user client) ──
  const serviceDb = buildServiceClientOrNull();
  const contextDb = serviceDb ?? userClient;
  if (!serviceDb) {
    safeLog.warn("api.advisor.chat", "service role missing; using user client for context", {
      userId: user.id,
      role,
    });
  }

  let ctx;
  try {
    ctx = await withTimeout(
      buildAdvisorContext(contextDb, role as AdvisorRole, user.id, patientId),
      12000,
      "api.advisor.chat.context-build"
    );
  } catch (e) {
    if (isTimeoutError(e)) {
      safeLog.error("api.advisor.chat", "context build timeout", {
        userId: user.id,
        role,
      });
      return jsonError("Loading your context took too long. Please try again.", 504);
    }
    safeLog.error("api.advisor.chat", "context build failed", {
      userId: user.id,
      role,
      error: e instanceof Error ? e.message : String(e),
    });
    return jsonError(
      "I could not assemble your wellness context. Please try again in a moment.",
      500
    );
  }

  // ── 7. Pre-flight telemetry (metadata only in logs) ─────────────────
  safeLog.info("api.advisor.chat", "turn start", {
    userId: user.id,
    role,
    promptSource: ctx.promptSource,
    msgLen: message.length,
  });
  // Telemetry DB: service role when available, else user client (RLS allows own inserts)
  const telemetryDb = serviceDb ?? userClient;

  await logAdvisorQuery(telemetryDb, {
    userId: user.id,
    role: role as AdvisorRole,
    patientId,
    message,
    contextSnapshot: ctx.contextVariables,
  });

  // ── 8. Stream Claude response; persist inside onComplete ────────────
  const { stream, meta } = streamAdvisorResponse(ctx, message, {
    onComplete: async (fullText, m) => {
      try {
        const ids = await persistConversationTurn(telemetryDb, {
          userId: user.id,
          role: role as AdvisorRole,
          patientId,
          userMessage: message,
          assistantMessage: fullText,
          contextSnapshot: ctx.contextVariables,
          durationMs: m.duration_ms,
          inputTokens: m.input_tokens,
          outputTokens: m.output_tokens,
          error: m.error,
        });
        return ids.assistantMessageId;
      } catch (e) {
        safeLog.warn("api.advisor.chat", "persist failed", {
          error: e instanceof Error ? e.message : String(e),
        });
        return null;
      }
    },
  });

  // Post-flight compliance + Jeffery bus (fire-and-forget; no message content in logs)
  void meta.then(async (m) => {
    try {
      const agentLabel =
        role === "consumer"
          ? "hannah"
          : role === "naturopath"
            ? "hannah_naturopath"
            : "hannah_practitioner";
      await scanAiOutput({
        agent: agentLabel,
        userId: user.id,
        userRole: role,
        text: m.full_text ?? "",
        patientId,
      });
    } catch (e) {
      safeLog.warn("api.advisor.chat", "marshall scan failed", {
        error: e instanceof Error ? e.message : String(e),
      });
    }
    if (!serviceDb) return;
    try {
      const sourceAgent =
        role === "consumer"
          ? "hannah"
          : role === "naturopath"
            ? "hannah_naturopath"
            : "hannah_practitioner";
      if (m.error) {
        await emitJefferyMessage(
          {
            category: "error_escalation",
            severity: "critical",
            title: `Advisor chat error (${role})`,
            summary: m.error.slice(0, 240),
            detail: {
              role,
              userId: user.id,
              patientId,
              durationMs: m.duration_ms,
              inputTokens: m.input_tokens,
              outputTokens: m.output_tokens,
              error: m.error,
            },
            sourceAgent,
          },
          serviceDb
        );
      } else {
        await emitJefferyMessage(
          {
            category: "advisor_insight",
            severity: "advisory",
            title: `Advisor turn (${role})`,
            summary: `Hannah reply generated in ${m.duration_ms}ms.`,
            detail: {
              role,
              userId: user.id,
              patientId,
              durationMs: m.duration_ms,
              inputTokens: m.input_tokens,
              outputTokens: m.output_tokens,
              // Content intentionally omitted from bus detail for 219F log hygiene
              userMsgLen: message.length,
              assistantMsgLen: (m.full_text ?? "").length,
            },
            sourceAgent,
          },
          serviceDb
        );
      }
    } catch (e) {
      safeLog.warn("api.advisor.chat", "jeffery emit failed", {
        error: e instanceof Error ? e.message : String(e),
      });
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
      "X-Advisor-Prompt-Source": ctx.promptSource,
    },
  });
}
