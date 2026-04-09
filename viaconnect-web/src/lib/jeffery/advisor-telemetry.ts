/**
 * Jeffery Advisor Telemetry (Prompt #60b — Section 3B)
 *
 * Two responsibilities:
 *   1. Pre-flight: log the incoming query into ultrathink_advisor_query_log
 *      and return a query id the route handler can correlate with later.
 *   2. Post-flight: write the user message + assistant response into
 *      ultrathink_advisor_conversations once the stream finishes (called
 *      from a fire-and-forget waitUntil so it never blocks the response).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { AdvisorRole } from "./advisor-context-builder";

export interface QueryLogPayload {
  userId: string;
  role: AdvisorRole;
  patientId: string | null;
  message: string;
  contextSnapshot: Record<string, string>;
}

/**
 * Pre-flight: log the user query for Jeffery's weekly analysis.
 * Returns the query id (for correlation with assistant message).
 */
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
    console.warn(`[advisor-telemetry] log query failed: ${error.message}`);
    return null;
  }
  return (data as { id: string }).id;
}

/**
 * Post-flight: persist the user turn + the assistant response into the
 * conversation history. Called via waitUntil after the stream resolves.
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
): Promise<void> {
  // user turn
  await db.from("ultrathink_advisor_conversations").insert({
    user_id: args.userId,
    advisor_role: args.role,
    patient_id: args.patientId,
    message_role: "user",
    content: args.userMessage,
    response_length: args.userMessage.length,
    context_snapshot: args.contextSnapshot,
  });

  // assistant turn
  await db.from("ultrathink_advisor_conversations").insert({
    user_id: args.userId,
    advisor_role: args.role,
    patient_id: args.patientId,
    message_role: "assistant",
    content: args.assistantMessage,
    response_length: args.assistantMessage.length,
    context_snapshot: { tokens_in: String(args.inputTokens), tokens_out: String(args.outputTokens), duration_ms: String(args.durationMs) },
    escalated: !!args.error,
  });

  // Update the query log row with completion data (best-effort upsert by latest)
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
}
