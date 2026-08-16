/**
 * Jeffery Advisor Telemetry (Prompt #60b — Section 3B; Prompt 219F)
 *
 * Pre-flight query log + post-flight conversation persist.
 * Returns assistant message id so the client can wire thumbs feedback.
 * Structured logs never include plaintext message content.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { AdvisorRole } from "./advisor-context-builder";
import { safeLog } from "@/lib/utils/safe-log";

export interface QueryLogPayload {
  userId: string;
  role: AdvisorRole;
  patientId: string | null;
  message: string;
  contextSnapshot: Record<string, string>;
}

export async function logAdvisorQuery(
  db: SupabaseClient,
  payload: QueryLogPayload
): Promise<string | null> {
  const { data, error } = await db
    .from("ultrathink_advisor_query_log")
    .insert({
      user_id: payload.userId,
      advisor_role: payload.role,
      patient_id: payload.patientId,
      message: payload.message,
      context_snapshot: payload.contextSnapshot,
      model_used: "claude-sonnet-4-6",
    })
    .select("id")
    .single();
  if (error) {
    safeLog.warn("advisor.telemetry", "log query failed", { code: error.code });
    return null;
  }
  return (data as { id: string }).id;
}

export interface PersistTurnResult {
  userMessageId: string | null;
  assistantMessageId: string | null;
}

/**
 * Post-flight: persist user + assistant turns. Returns ids for feedback wiring.
 */
export async function persistConversationTurn(
  db: SupabaseClient,
  args: {
    userId: string;
    role: AdvisorRole;
    patientId: string | null;
    userMessage: string;
    assistantMessage: string;
    contextSnapshot: Record<string, string>;
    durationMs: number;
    inputTokens: number;
    outputTokens: number;
    error?: string;
  }
): Promise<PersistTurnResult> {
  let userMessageId: string | null = null;
  let assistantMessageId: string | null = null;

  const { data: userRow, error: userErr } = await db
    .from("ultrathink_advisor_conversations")
    .insert({
      user_id: args.userId,
      advisor_role: args.role,
      patient_id: args.patientId,
      message_role: "user",
      content: args.userMessage,
      response_length: args.userMessage.length,
      context_snapshot: args.contextSnapshot,
    })
    .select("id")
    .single();

  if (userErr) {
    safeLog.warn("advisor.telemetry", "persist user turn failed", { code: userErr.code });
  } else {
    userMessageId = (userRow as { id: string }).id;
  }

  const { data: asstRow, error: asstErr } = await db
    .from("ultrathink_advisor_conversations")
    .insert({
      user_id: args.userId,
      advisor_role: args.role,
      patient_id: args.patientId,
      message_role: "assistant",
      content: args.assistantMessage,
      response_length: args.assistantMessage.length,
      context_snapshot: {
        tokens_in: String(args.inputTokens),
        tokens_out: String(args.outputTokens),
        duration_ms: String(args.durationMs),
      },
      escalated: !!args.error,
    })
    .select("id")
    .single();

  if (asstErr) {
    safeLog.warn("advisor.telemetry", "persist assistant turn failed", { code: asstErr.code });
  } else {
    assistantMessageId = (asstRow as { id: string }).id;
  }

  // Best-effort completion metadata on latest matching query log row
  try {
    await db
      .from("ultrathink_advisor_query_log")
      .update({
        response_time_ms: args.durationMs,
        tokens_used: args.inputTokens + args.outputTokens,
      })
      .eq("user_id", args.userId)
      .eq("advisor_role", args.role)
      .eq("message", args.userMessage)
      .order("created_at", { ascending: false })
      .limit(1);
  } catch {
    /* ignore */
  }

  safeLog.info("advisor.telemetry", "turn persisted", {
    userId: args.userId,
    role: args.role,
    durationMs: args.durationMs,
    hasAssistantId: !!assistantMessageId,
    hadError: !!args.error,
  });

  return { userMessageId, assistantMessageId };
}
