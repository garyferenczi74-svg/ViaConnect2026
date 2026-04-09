/**
 * Jeffery Message Bus (Prompt #60c — Section 5)
 *
 * The single canonical interface for emitting messages into the Jeffery
 * Admin Command Center. Every agent (including Jeffery himself) calls
 * `emitJefferyMessage` to surface an action or proposal to Gary.
 *
 * Behavior:
 *   - severity = info | advisory       → auto-applied (status='auto_applied')
 *   - severity = review_required       → held in pending queue
 *   - severity = critical              → held in pending + Realtime broadcast
 *
 * Auto-apply uses the SECURITY DEFINER `jeffery_emit_message` RPC so the
 * service-role logic is centralized in Postgres (and the security advisor
 * keeps seeing pinned search_paths).
 *
 * Server-side only — uses the service-role client.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { MessageCategory, MessageSeverity } from "./severity-rules";
import { categorizeLesson } from "./severity-rules";

export type { MessageCategory, MessageSeverity };

export interface ProposedAction {
  type: string;
  target: string;
  diff: Record<string, unknown>;
}

export interface JefferyMessageInput {
  category: MessageCategory;
  severity: MessageSeverity;
  title: string;
  summary: string;
  detail?: Record<string, unknown>;
  sourceAgent?: string;
  sourceContext?: Record<string, unknown>;
  proposedAction?: ProposedAction;
}

function buildServiceClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

/**
 * Emit a Jeffery message. Uses the SECURITY DEFINER RPC for the insert so the
 * auto-apply gate (info|advisory → auto_applied) lives in one place.
 */
export async function emitJefferyMessage(msg: JefferyMessageInput, db?: SupabaseClient): Promise<string | null> {
  const client = db ?? buildServiceClient();

  const { data, error } = await client.rpc("jeffery_emit_message", {
    p_category: msg.category,
    p_severity: msg.severity,
    p_title: msg.title,
    p_summary: msg.summary,
    p_detail: msg.detail ?? {},
    p_source_agent: msg.sourceAgent ?? null,
    p_source_context: msg.sourceContext ?? null,
    p_proposed_action: msg.proposedAction ?? null,
  });

  if (error) {
    console.warn(`[message-bus] emit failed: ${error.message}`);
    return null;
  }

  // Critical messages trigger an explicit Realtime broadcast on top of the
  // table INSERT (which is also published) so the admin UI can show a banner.
  if (msg.severity === "critical") {
    try {
      await client.channel("jeffery-critical").send({
        type: "broadcast",
        event: "critical_message",
        payload: { id: data, title: msg.title, summary: msg.summary },
      });
    } catch {
      /* broadcast best-effort */
    }
  }

  return data as string;
}

/**
 * Approve a pending message. If `modifications` is supplied, the applied
 * action is the merge of the original proposal + the admin's edits, and a
 * row is added to jeffery_learning_log so Jeffery can self-review later.
 */
export async function approveMessage(
  messageId: string,
  adminId: string,
  modifications?: Record<string, unknown>,
  db?: SupabaseClient
): Promise<{ ok: true } | { ok: false; error: string }> {
  const client = db ?? buildServiceClient();

  const { data: msg, error: fetchErr } = await client
    .from("jeffery_messages")
    .select("proposed_action, category, title")
    .eq("id", messageId)
    .single();
  if (fetchErr || !msg) return { ok: false, error: fetchErr?.message ?? "message not found" };

  const proposed = (msg.proposed_action as Record<string, unknown> | null) ?? {};
  const appliedAction = modifications ? { ...proposed, ...modifications } : proposed;

  const { error: updErr } = await client
    .from("jeffery_messages")
    .update({
      status: "approved",
      applied_action: appliedAction,
      applied_at: new Date().toISOString(),
      reviewed_at: new Date().toISOString(),
      reviewed_by: adminId,
    })
    .eq("id", messageId);
  if (updErr) return { ok: false, error: updErr.message };

  if (modifications) {
    await client.from("jeffery_learning_log").insert({
      source_type: "message_modification",
      source_id: messageId,
      lesson: `Admin modified proposed action on "${msg.title}". Original: ${JSON.stringify(proposed)}. Applied: ${JSON.stringify(appliedAction)}.`,
      lesson_category: categorizeLesson(msg.category as MessageCategory),
      config_changes: { original: proposed, modified: appliedAction },
      applied_to_agents: [(proposed as { target?: string }).target ?? "global"],
    });
  }

  return { ok: true };
}

/**
 * Reject a pending message. Logs the rejection as a learning event so Jeffery
 * can avoid similar proposals in future.
 */
export async function rejectMessage(
  messageId: string,
  adminId: string,
  reason: string,
  db?: SupabaseClient
): Promise<{ ok: true } | { ok: false; error: string }> {
  const client = db ?? buildServiceClient();

  const { data: msg } = await client
    .from("jeffery_messages")
    .select("proposed_action, category, title")
    .eq("id", messageId)
    .single();

  const { error: updErr } = await client
    .from("jeffery_messages")
    .update({
      status: "rejected",
      reviewed_at: new Date().toISOString(),
      reviewed_by: adminId,
    })
    .eq("id", messageId);
  if (updErr) return { ok: false, error: updErr.message };

  if (msg) {
    await client.from("jeffery_learning_log").insert({
      source_type: "message_rejection",
      source_id: messageId,
      lesson: `Admin rejected: "${msg.title}". Reason: ${reason}. Avoid similar proposals.`,
      lesson_category: categorizeLesson(msg.category as MessageCategory),
      config_changes: null,
      applied_to_agents: [(msg.proposed_action as { target?: string } | null)?.target ?? "global"],
    });
  }

  return { ok: true };
}

/**
 * Flag a message for deeper investigation. Doesn't apply or reject —
 * keeps it in the pending queue with a 'flagged' status.
 */
export async function flagMessage(
  messageId: string,
  adminId: string,
  db?: SupabaseClient
): Promise<{ ok: true } | { ok: false; error: string }> {
  const client = db ?? buildServiceClient();
  const { error } = await client
    .from("jeffery_messages")
    .update({
      status: "flagged",
      reviewed_at: new Date().toISOString(),
      reviewed_by: adminId,
    })
    .eq("id", messageId);
  return error ? { ok: false, error: error.message } : { ok: true };
}
